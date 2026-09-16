import { existsSync, rmSync } from 'fs'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

// Teste de integração de upload de mídia (task 3.2).
//
// Exercita a Colecao_Media (Requisitos 4.2, 4.4) de ponta a ponta usando a
// Payload Local API contra um Postgres real:
//   1. Inicializa o Payload com a config do projeto (getPayload({ config })).
//   2. Cria um documento de mídia via payload.create com um arquivo real e um
//      valor de `alt`.
//   3. Verifica que o arquivo foi gravado no filesystem (staticDir) E que o
//      documento retornado expõe a `url` pública e o `alt` (Req 4.2, 4.4).
//   4. Limpa: remove o documento/arquivo criado e destrói a instância do
//      Payload ao final.
//
// Esta suíte depende de infraestrutura externa (Postgres + push de schema).
// Ela é PULADA (skip) quando DATABASE_URI está ausente ou o banco está
// inalcançável, imprimindo o motivo — mas RODA e PASSA de verdade quando o
// Postgres do docker-compose (serviço `db`) está de pé.

// Valores padrão de desenvolvimento (mesmos do .env.example). Só são usados
// como fallback quando a env não define nada — nunca são segredos reais.
const DEV_DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
const DEV_PAYLOAD_SECRET = 'test-secret-for-integration-media-upload'

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

// Um PNG 2x2 mínimo e válido (transparente), embutido como base64 para não
// depender de nenhum arquivo de fixture no repositório.
const PNG_2X2_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9Qz0BgYABDAA' +
  'C7AwEDlD7pWgAAAABJRU5ErkJggg=='

const { host, port } = parseHostPort(databaseUri)
const dbAvailable = await isPortOpen(host, port)

if (!dbAvailable) {
  // eslint-disable-next-line no-console
  console.warn(
    `[media-upload.integration] Postgres inalcançável em ${host}:${port} — ` +
      'teste de integração PULADO. Suba o banco com `docker compose -f docker-compose.yml up -d db` ' +
      'e defina DATABASE_URI para executá-lo.',
  )
}

// staticDir da Colecao_Media resolve para `media/` na raiz do projeto
// (ver src/collections/Media.ts). Usamos o mesmo caminho para checar o disco.
const testDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(testDir, '..')
const mediaDir = path.resolve(projectRoot, 'media')

describe.skipIf(!dbAvailable)('upload de mídia (Payload + Postgres)', () => {
  let payload: Payload
  const createdIds: (number | string)[] = []
  const writtenFiles: string[] = []

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    // Importa a config diretamente (não depende de lib/payload.ts — task 7.1).
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    // Remove documentos criados no banco.
    for (const id of createdIds) {
      try {
        await payload?.delete({ collection: 'media', id })
      } catch {
        // ignora — cleanup best-effort
      }
    }
    // Remove arquivos que ainda restem no disco.
    for (const file of writtenFiles) {
      try {
        if (existsSync(file)) rmSync(file)
      } catch {
        // ignora
      }
    }
    // Encerra a instância do Payload (fecha o pool do Postgres).
    if (payload) {
      await payload.destroy()
    }
  }, 120_000)

  it(
    'grava o arquivo no filesystem e expõe url/alt (Req 4.2, 4.4)',
    async () => {
      const altText = `Aquarela de teste ${Date.now()}`
      const fileName = `teste-upload-${Date.now()}.png`

      const doc = await payload.create({
        collection: 'media',
        data: { alt: altText },
        file: {
          name: fileName,
          data: Buffer.from(PNG_2X2_BASE64, 'base64'),
          mimetype: 'image/png',
          size: Buffer.from(PNG_2X2_BASE64, 'base64').length,
        },
      })

      createdIds.push(doc.id)

      // (Req 4.4) O documento retornado expõe a URL pública e o alt.
      expect(doc.alt).toBe(altText)
      expect(typeof doc.url).toBe('string')
      expect(doc.url).toBeTruthy()
      expect(doc.filename).toBeTruthy()

      // (Req 4.2) O arquivo foi gravado no filesystem em staticDir (media/).
      const savedPath = path.resolve(mediaDir, doc.filename as string)
      writtenFiles.push(savedPath)
      expect(existsSync(savedPath)).toBe(true)
    },
    120_000,
  )
})
