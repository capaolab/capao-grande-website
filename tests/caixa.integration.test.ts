import net from 'net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

// Integração do ciclo da conta de mesa (docs/features/caixa-contas-fechadas.md):
// fechada (itens editáveis, recalculados) → pagamento (serviço/desconto do
// caixa, valores congelados) → paga. PULADO quando o Postgres está
// inalcançável, como as demais suítes de integração.

const DEV_DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
const databaseUri = process.env.DATABASE_URI ?? DEV_DATABASE_URI
process.env.DATABASE_URI = databaseUri
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'test-secret-for-integration-caixa'

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

describe.skipIf(!dbAvailable)('ciclo da conta do caixa (Payload + Postgres)', () => {
  let payload: Payload
  let contaId: number | undefined
  let secaoId: number | undefined
  const itemIds: number[] = []

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    if (contaId) await payload?.delete({ collection: 'caixa', id: contaId }).catch(() => {})
    for (const id of itemIds) await payload?.delete({ collection: 'cardapio', id }).catch(() => {})
    if (secaoId) await payload?.delete({ collection: 'secoes-cardapio', id: secaoId }).catch(() => {})
    if (payload) await payload.destroy()
  }, 120_000)

  it(
    'fechada recalcula itens; pagamento congela valores; não volta para fechada',
    async () => {
      secaoId = (
        await payload.create({
          collection: 'secoes-cardapio',
          data: { nome: `Caixa ${runId}`, tipo: 'comum' },
        })
      ).id
      for (const [nome, preco] of [
        ['Suco', 10],
        ['Cerveja', 8],
      ] as const) {
        const item = await payload.create({
          collection: 'cardapio',
          data: { secao: secaoId, nome: `${nome} ${runId}`, preco, ativo: true },
        })
        itemIds.push(item.id)
      }
      const [suco, cerveja] = itemIds

      // Fechar: sempre `fechada`, sem serviço/desconto (definidos pelo caixa).
      const criada = await payload.create({
        collection: 'caixa',
        data: {
          mesa: '5',
          itens: [{ item: suco, quantidade: 2 }],
          servico: true,
          desconto: 5,
          status: 'paga',
        },
      })
      contaId = criada.id
      expect(criada.status).toBe('fechada')
      expect(criada.subtotal).toBe(20)
      expect(criada.servico).toBe(false)
      expect(criada.desconto).toBe(0)
      expect(criada.total).toBe(20)

      // Reabrir e incluir itens: recalcula com o preço ATUAL (RN-CF04).
      await payload.update({ collection: 'cardapio', id: suco, data: { preco: 12 } })
      const editada = await payload.update({
        collection: 'caixa',
        id: contaId,
        data: {
          itens: [
            { item: suco, quantidade: 2 },
            { item: cerveja, quantidade: 1 },
          ],
        },
      })
      expect(editada.status).toBe('fechada')
      expect(editada.subtotal).toBe(32)
      expect(editada.total).toBe(32)

      // Rateio só depois de seguir para o pagamento.
      await expect(
        payload.update({
          collection: 'caixa',
          id: contaId,
          data: { pagamentos: [{ valor: 32, forma: 'pix', pago: true }] },
        }),
      ).rejects.toThrow(/Siga para o pagamento/)

      // Seguir para o pagamento com serviço e desconto do caixa (RN-CF05).
      const emPagamento = await payload.update({
        collection: 'caixa',
        id: contaId,
        data: { status: 'pagamento', servico: true, desconto: 2 },
      })
      expect(emPagamento.status).toBe('pagamento')
      expect(emPagamento.subtotal).toBe(32)
      expect(emPagamento.taxaServico).toBe(3.2)
      expect(emPagamento.desconto).toBe(2)
      expect(emPagamento.total).toBe(33.2)

      // Congelada: mudar itens ou preços não altera a conta.
      await payload.update({ collection: 'cardapio', id: cerveja, data: { preco: 100 } })
      const congelada = await payload.update({
        collection: 'caixa',
        id: contaId,
        data: { itens: [{ item: cerveja, quantidade: 5 }] },
      })
      expect(congelada.total).toBe(33.2)
      expect(congelada.itens).toHaveLength(2)

      // Não volta para fechada (RN-CF06).
      await expect(
        payload.update({ collection: 'caixa', id: contaId, data: { status: 'fechada' } }),
      ).rejects.toThrow(/não pode voltar a ser fechada/)

      // Pagamento completo: paga (RN-C07).
      const paga = await payload.update({
        collection: 'caixa',
        id: contaId,
        data: { pagamentos: [{ valor: 33.2, forma: 'pix', pago: true }] },
      })
      expect(paga.status).toBe('paga')
    },
    120_000,
  )
})
