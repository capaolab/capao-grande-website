import net from 'net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

// Integração dos cadastros do painel:
// - `etiquetas` (docs/features/etiquetas-informes.md): informe com várias
//   etiquetas (RN-E02) e bloqueio da exclusão de etiqueta em uso (RN-E03).
// - `secoes-cardapio` (docs/features/secoes-cardapio.md): no máximo uma seção
//   de tamanhos (RN-S03) e bloqueio da exclusão de seção com itens (RN-S05).
// PULADO quando o Postgres está inalcançável, como as demais suítes de
// integração.

const DEV_DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
const databaseUri = process.env.DATABASE_URI ?? DEV_DATABASE_URI
process.env.DATABASE_URI = databaseUri
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'test-secret-for-integration-cadastros'

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

describe.skipIf(!dbAvailable)('cadastros do painel (Payload + Postgres)', () => {
  let payload: Payload
  const etiquetaIds: number[] = []
  const informeIds: number[] = []
  const secaoIds: number[] = []
  const itemIds: number[] = []

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    for (const id of informeIds) await payload?.delete({ collection: 'informes', id }).catch(() => {})
    for (const id of etiquetaIds) await payload?.delete({ collection: 'etiquetas', id }).catch(() => {})
    for (const id of itemIds) await payload?.delete({ collection: 'cardapio', id }).catch(() => {})
    for (const id of secaoIds) await payload?.delete({ collection: 'secoes-cardapio', id }).catch(() => {})
    if (payload) await payload.destroy()
  }, 120_000)

  it(
    'informe aceita várias etiquetas e etiqueta em uso não pode ser removida',
    async () => {
      for (const nome of ['Horta', 'Viveiro']) {
        const etiqueta = await payload.create({
          collection: 'etiquetas',
          data: { nome: `${nome} ${runId}` },
        })
        etiquetaIds.push(etiqueta.id)
      }
      const informe = await payload.create({
        collection: 'informes',
        data: { titulo: `Etiquetas ${runId}`, etiquetas: etiquetaIds, publicado: true },
      })
      informeIds.push(informe.id)

      const lido = await payload.findByID({ collection: 'informes', id: informe.id, depth: 1 })
      expect(lido.etiquetas.map((e) => (typeof e === 'object' ? e.id : e))).toEqual(etiquetaIds)

      await expect(
        payload.delete({ collection: 'etiquetas', id: etiquetaIds[0] }),
      ).rejects.toThrow(/em uso por 1 informe/)

      // Sem informes usando, a exclusão passa.
      await payload.delete({ collection: 'informes', id: informe.id })
      informeIds.pop()
      await payload.delete({ collection: 'etiquetas', id: etiquetaIds[0] })
      etiquetaIds.shift()
    },
    120_000,
  )

  it(
    'seção com itens não pode ser removida',
    async () => {
      const secao = await payload.create({
        collection: 'secoes-cardapio',
        data: { nome: `Sobremesas ${runId}`, tipo: 'comum', ordem: 5 },
      })
      secaoIds.push(secao.id)
      const item = await payload.create({
        collection: 'cardapio',
        data: { secao: secao.id, nome: `Pudim ${runId}`, preco: 12, ativo: true },
      })
      itemIds.push(item.id)

      await expect(
        payload.delete({ collection: 'secoes-cardapio', id: secao.id }),
      ).rejects.toThrow(/tem 1 item/)

      await payload.delete({ collection: 'cardapio', id: item.id })
      itemIds.pop()
      await payload.delete({ collection: 'secoes-cardapio', id: secao.id })
      secaoIds.pop()
    },
    120_000,
  )

  it(
    'existe no máximo uma seção de tamanhos',
    async () => {
      const { docs } = await payload.find({
        collection: 'secoes-cardapio',
        where: { tipo: { equals: 'tamanhos' } },
        limit: 1,
      })
      let tamanhos = docs[0]
      if (!tamanhos) {
        tamanhos = await payload.create({
          collection: 'secoes-cardapio',
          data: { nome: `Tamanhos ${runId}`, tipo: 'tamanhos' },
        })
        secaoIds.push(tamanhos.id)
      }

      await expect(
        payload.create({
          collection: 'secoes-cardapio',
          data: { nome: `Outros tamanhos ${runId}`, tipo: 'tamanhos' },
        }),
      ).rejects.toThrow(/Já existe uma seção de tamanhos/)

      // A própria seção de tamanhos continua editável.
      await payload.update({
        collection: 'secoes-cardapio',
        id: tamanhos.id,
        data: { ordem: tamanhos.ordem ?? 2 },
      })
    },
    120_000,
  )
})
