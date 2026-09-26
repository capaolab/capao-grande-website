import net from 'net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

// Teste de integração do hook de destaque único (task 4.3).
//
// Exercita a invariante de unicidade de destaque da Colecao_Informes
// (Requisito 5.5) de ponta a ponta usando a Payload Local API contra um
// Postgres real:
//   1. Inicializa o Payload com a config do projeto (getPayload({ config })),
//      que faz push do schema em dev.
//   2. Cria 3 informes via payload.create (um deles já com destaque: true).
//   3. Marca OUTRO informe com destaque: true via payload.update e verifica que
//      exatamente UM informe fica em destaque (o recém-atualizado) e todos os
//      demais ficam com destaque: false (Req 5.5).
//   4. Idempotência: re-atualizar o mesmo informe para destaque: true mantém
//      exatamente um destaque (o mesmo).
//   5. Limpa: remove todos os informes criados e destrói a instância do Payload.
//
// Esta suíte depende de infraestrutura externa (Postgres + push de schema).
// Ela é PULADA (skip) quando DATABASE_URI está ausente ou o banco está
// inalcançável, imprimindo o motivo — mas RODA e PASSA de verdade quando o
// Postgres do docker-compose (serviço `db`) está de pé.

// Valores padrão de desenvolvimento (mesmos do .env.example). Só são usados
// como fallback quando a env não define nada — nunca são segredos reais.
const DEV_DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
const DEV_PAYLOAD_SECRET = 'test-secret-for-integration-informes-destaque'

const databaseUri = process.env.DATABASE_URI ?? DEV_DATABASE_URI
// A config exige DATABASE_URI e PAYLOAD_SECRET no import. Garantimos ambos
// antes de importar a config dinamicamente dentro do beforeAll.
process.env.DATABASE_URI = databaseUri
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? DEV_PAYLOAD_SECRET

// Extrai host/porta da connection string para o probe de disponibilidade.
function parseHostPort(uri: string): { host: string; port: number } {
  try {
    const u = new URL(uri)
    return { host: u.hostname || 'localhost', port: Number(u.port) || 5432 }
  } catch {
    return { host: 'localhost', port: 5432 }
  }
}

// Probe TCP rápido: o Postgres está aceitando conexões nesta porta?
function isPortOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const done = (ok: boolean) => {
      if (settled) return
      settled = true
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

const { host, port } = parseHostPort(databaseUri)
const dbAvailable = await isPortOpen(host, port)

if (!dbAvailable) {
  // eslint-disable-next-line no-console
  console.warn(
    `[informes-destaque.integration] Postgres inalcançável em ${host}:${port} — ` +
      'teste de integração PULADO. Suba o banco com `docker compose -f docker-compose.yml up -d db` ' +
      'e defina DATABASE_URI para executá-lo.',
  )
}

// Sufixo único por execução para evitar colisões de slug entre rodadas
// (o slug é gerado do titulo e é único na coleção).
const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe.skipIf(!dbAvailable)('hook de destaque único (Payload + Postgres)', () => {
  let payload: Payload
  const createdIds: (number | string)[] = []
  let etiquetaId: number | undefined

  // Conta quantos informes, entre os criados por este teste, estão em destaque,
  // relendo o estado direto do banco (depth 0 para evitar joins desnecessários).
  async function contarDestaquesEntreCriados(): Promise<{
    destacados: (number | string)[]
    total: number
  }> {
    const destacados: (number | string)[] = []
    for (const id of createdIds) {
      const doc = await payload.findByID({ collection: 'informes', id, depth: 0 })
      if ((doc as { destaque?: boolean }).destaque) {
        destacados.push(id)
      }
    }
    return { destacados, total: destacados.length }
  }

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    // Importa a config diretamente (não depende de lib/payload.ts — task 7.1).
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    // Remove todos os documentos criados no banco (cleanup por id rastreado).
    for (const id of createdIds) {
      try {
        await payload?.delete({ collection: 'informes', id })
      } catch {
        // ignora — cleanup best-effort
      }
    }
    // Encerra a instância do Payload (fecha o pool do Postgres).
    if (etiquetaId) await payload?.delete({ collection: 'etiquetas', id: etiquetaId }).catch(() => {})
    if (payload) {
      await payload.destroy()
    }
  }, 120_000)

  it(
    'payload.update marca um informe e desmarca os demais, mantendo no máx. um destaque (Req 5.5)',
    async () => {
      // Informe exige ao menos uma etiqueta (etiquetas-informes.md). Criada
      // aqui, e não no beforeAll, para já entrar em uso: o seed.integration
      // roda em paralelo e apaga os cadastros sem uso.
      etiquetaId = (
        await payload.create({ collection: 'etiquetas', data: { nome: `Etiqueta ${runId}` } })
      ).id

      // 1. Cria 3 informes; o primeiro já entra em destaque.
      const a = await payload.create({
        collection: 'informes',
        data: {
          titulo: `Informe A ${runId}`,
          etiquetas: [etiquetaId],
          publicado: true,
          destaque: true,
        },
      })
      createdIds.push(a.id)

      const b = await payload.create({
        collection: 'informes',
        data: {
          titulo: `Informe B ${runId}`,
          etiquetas: [etiquetaId],
          publicado: true,
          destaque: false,
        },
      })
      createdIds.push(b.id)

      const c = await payload.create({
        collection: 'informes',
        data: {
          titulo: `Informe C ${runId}`,
          etiquetas: [etiquetaId],
          publicado: true,
          destaque: false,
        },
      })
      createdIds.push(c.id)

      // Após a criação, apenas A está em destaque (o hook não afeta os demais
      // que foram criados sem destaque).
      {
        const { destacados } = await contarDestaquesEntreCriados()
        expect(destacados).toEqual([a.id])
      }

      // 2. Marca OUTRO (B) em destaque via update — deve desmarcar A e manter C.
      await payload.update({
        collection: 'informes',
        id: b.id,
        data: { destaque: true },
      })

      {
        const { destacados } = await contarDestaquesEntreCriados()
        // Exatamente UM em destaque, e é o recém-atualizado (B).
        expect(destacados).toEqual([b.id])
      }

      // Confirma explicitamente que os demais ficaram com destaque: false.
      const aDepois = await payload.findByID({ collection: 'informes', id: a.id, depth: 0 })
      const cDepois = await payload.findByID({ collection: 'informes', id: c.id, depth: 0 })
      expect((aDepois as { destaque?: boolean }).destaque).toBe(false)
      expect((cDepois as { destaque?: boolean }).destaque).toBe(false)

      // 3. Idempotência: re-atualizar B para destaque: true mantém exatamente
      // um destaque (o mesmo B).
      await payload.update({
        collection: 'informes',
        id: b.id,
        data: { destaque: true },
      })

      {
        const { destacados } = await contarDestaquesEntreCriados()
        expect(destacados).toEqual([b.id])
      }
    },
    120_000,
  )
})
