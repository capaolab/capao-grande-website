import net from 'net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

// Integração da trava de concorrência do funil (dashboard-pedidos.md) no hook
// de `pedidos-pimenta` (mesmo helper do delivery): o funcionário só avança
// para a próxima etapa; admin corrige livremente. PULADO quando o Postgres
// está inalcançável, como as demais suítes de integração.

const DEV_DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
const databaseUri = process.env.DATABASE_URI ?? DEV_DATABASE_URI
process.env.DATABASE_URI = databaseUri
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'test-secret-for-integration-transicao'

function isPortOpen(uri: string, timeoutMs = 1500): Promise<boolean> {
  let host = 'localhost'
  let port = 5432
  try {
    const u = new URL(uri)
    host = u.hostname || host
    port = Number(u.port) || port
  } catch {
    // mantém o padrão
  }
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

const dbAvailable = await isPortOpen(databaseUri)
const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe.skipIf(!dbAvailable)('trava de transição de status (Payload + Postgres)', () => {
  let payload: Payload
  let produtoId: number | undefined
  let pedidoId: number | undefined
  const funcionario = { role: 'funcionario' } as never
  const admin = { role: 'admin' } as never

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    if (pedidoId) await payload?.delete({ collection: 'pedidos-pimenta', id: pedidoId }).catch(() => {})
    if (produtoId) await payload?.delete({ collection: 'produtos-pimenta', id: produtoId }).catch(() => {})
    if (payload) await payload.destroy()
  }, 120_000)

  it(
    'funcionário avança uma etapa por vez; tela desatualizada recebe 409; admin é livre',
    async () => {
      produtoId = (
        await payload.create({
          collection: 'produtos-pimenta',
          data: { nome: `Pimenta ${runId}`, preco: 30, ativo: true },
        })
      ).id
      pedidoId = (
        await payload.create({
          collection: 'pedidos-pimenta',
          data: {
            nome: `Trava ${runId}`,
            telefone: '11988887777',
            estabelecimento: 'Teste',
            modalidade: 'retirada',
            itens: [{ produto: produtoId, quantidade: 1 }],
          } as never, // codigo/subtotal/status vêm do hook e dos defaults
        })
      ).id
      const avancar = (status: string, user: never) =>
        payload.update({
          collection: 'pedidos-pimenta',
          id: pedidoId!,
          data: { status } as never,
          user,
        })

      expect((await avancar('validado', funcionario)).status).toBe('validado')
      expect((await avancar('pago', funcionario)).status).toBe('pago')

      // Tela desatualizada ainda mostrava "validado" e clica "Marcar como pago"
      // de novo: status igual, sem retrocesso — aceito sem efeito.
      expect((await avancar('pago', funcionario)).status).toBe('pago')

      // Pular etapa ou voltar no funil: 409.
      await expect(avancar('finalizado', funcionario)).rejects.toMatchObject({ status: 409 })
      await expect(avancar('validado', funcionario)).rejects.toMatchObject({ status: 409 })

      // Admin corrige manualmente em qualquer direção.
      expect((await avancar('pendente', admin)).status).toBe('pendente')
    },
    60_000,
  )
})
