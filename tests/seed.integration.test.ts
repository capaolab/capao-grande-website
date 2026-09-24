import { execFileSync } from 'child_process'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

// Teste de integração de invariantes do seed (task 6.2).
//
// Exercita o script de seed (scripts/seed.ts, Requisito 9) de ponta a ponta
// contra um Postgres real e verifica as invariantes exigidas pelos Req 9.2 e
// 9.3:
//   1. Executa o seed COMO SUBPROCESSO (`npm run seed`, que roda
//      `payload run scripts/seed.ts`). O seed usa top-level await + process.exit,
//      então NÃO pode ser importado no processo de teste (encerraria o Vitest).
//      Rodar como subprocesso exercita o script real de ponta a ponta.
//   2. Inicializa o Payload com a config do projeto (getPayload({ config })) e
//      relê o estado persistido no banco.
//   3. Assere as invariantes:
//        - No MÁXIMO um Informe_Destaque (Req 9.2); dado o seed, exatamente 1.
//        - Cardápio coerente com o modelo numérico de preço (Tarefa 6 de
//          docs/features/delivery-pedidos.md): pizzas têm `preco: null` (preço
//          por tamanho) e os tamanhos têm preço numérico; os detalhes verbatim
//          "dose" e "jarra 1,5 l" (Req 9.3) existem byte a byte.
//        - Contagens mínimas coerentes (informes >= 1, cardapio >= 1).
//   4. Idempotência: roda o seed uma segunda vez e confirma que as contagens
//      são estáveis e a invariante de destaque (<= 1) se mantém.
//
// O seed é dono dos dados de desenvolvimento e é idempotente (limpa/repovoa),
// então este teste NÃO cria nem apaga dados próprios — apenas assere o estado
// produzido pelo seed. Ao final, destrói a instância do Payload.
//
// Esta suíte depende de infraestrutura externa (Postgres + push de schema).
// Ela é PULADA (skip) quando DATABASE_URI está ausente ou o banco está
// inalcançável, imprimindo o motivo — mas RODA e PASSA de verdade quando o
// Postgres do docker-compose (serviço `db`) está de pé.

// Valores padrão de desenvolvimento (mesmos do .env.example). Só são usados
// como fallback quando a env não define nada — nunca são segredos reais.
const DEV_DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
const DEV_PAYLOAD_SECRET = 'test-secret-for-integration-seed'

const databaseUri = process.env.DATABASE_URI ?? DEV_DATABASE_URI
// A config exige DATABASE_URI e PAYLOAD_SECRET no import. Garantimos ambos
// antes de importar a config dinamicamente dentro do beforeAll — e os passamos
// ao subprocesso do seed.
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
    `[seed.integration] Postgres inalcançável em ${host}:${port} — ` +
      'teste de integração PULADO. Suba o banco com `docker compose -f docker-compose.yml up -d db` ' +
      'e defina DATABASE_URI para executá-lo.',
  )
}

const testDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(testDir, '..')

// Executa `npm run seed` como subprocesso, herdando as envs de conexão. O seed
// termina com process.exit(0/1); execFileSync lança se o código de saída for
// não-zero, propagando a falha do seed para o teste.
function runSeed(): void {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  execFileSync(npm, ['run', 'seed'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URI: databaseUri,
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
    },
    stdio: 'inherit',
    timeout: 110_000,
  })
}

describe.skipIf(!dbAvailable)('invariantes do seed (Payload + Postgres)', () => {
  let payload: Payload

  beforeAll(async () => {
    // Approach A: roda o script de seed real como subprocesso ANTES de abrir a
    // instância de leitura, garantindo que o estado do banco vem do seed.
    runSeed()

    const { getPayload } = await import('payload')
    // Importa a config diretamente (não depende de lib/payload.ts — task 7.1).
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    // O seed é dono dos dados de dev (idempotente) — deixamos intactos.
    // Encerra a instância do Payload (fecha o pool do Postgres).
    if (payload) {
      await payload.destroy()
    }
  }, 120_000)

  it(
    'cria no máximo um informe em destaque (Req 9.2)',
    async () => {
      const destaques = await payload.find({
        collection: 'informes',
        where: { destaque: { equals: true } },
        limit: 0,
        depth: 0,
      })

      // Invariante central do Req 9.2: no máximo UM destaque.
      expect(destaques.totalDocs).toBeLessThanOrEqual(1)
      // Dado o conteúdo do seed (um único informe "carnaval" em destaque),
      // esperamos exatamente 1.
      expect(destaques.totalDocs).toBe(1)
    },
    120_000,
  )

  it(
    'cardápio coerente com o modelo numérico de preço (Req 9.3; Tarefa 6 de delivery-pedidos)',
    async () => {
      // Lê todos os itens do cardápio no locale padrão (pt).
      const { docs, totalDocs } = await payload.find({
        collection: 'cardapio',
        limit: 0,
        depth: 0,
        locale: 'pt',
      })

      // Contagem mínima coerente (Req 9.1).
      expect(totalDocs).toBeGreaterThanOrEqual(1)
      expect(docs.length).toBeGreaterThanOrEqual(1)

      const detalhes = docs.map((d) => (d as { detalhe?: string }).detalhe)
      const pizzas = docs.filter((d) => (d as { secao?: string }).secao === 'Pizzas')
      const tamanhos = docs.filter((d) => (d as { secao?: string }).secao === 'Tamanhos')

      // Pizzas: preço NULL (preço por tamanho — Tarefa 6; o antigo texto
      // "ver tamanhos" do Req 6.3 não existe mais no banco).
      expect(pizzas.length).toBeGreaterThanOrEqual(1)
      expect(pizzas.every((d) => (d as { preco?: number | null }).preco == null)).toBe(true)

      // Tamanhos: preço NUMÉRICO definido (carregam o preço das pizzas).
      expect(tamanhos.length).toBeGreaterThanOrEqual(1)
      expect(
        tamanhos.every((d) => typeof (d as { preco?: number | null }).preco === 'number'),
      ).toBe(true)

      // "dose": detalhe verbatim (Cachaça da casa) (Req 9.3).
      expect(detalhes).toContain('dose')

      // "jarra 1,5 l": detalhe verbatim (Suco grande) (Req 9.3).
      expect(detalhes).toContain('jarra 1,5 l')
    },
    120_000,
  )

  it(
    'popula informes e cardápio (Req 9.1)',
    async () => {
      const informes = await payload.find({ collection: 'informes', limit: 0, depth: 0 })
      const cardapio = await payload.find({ collection: 'cardapio', limit: 0, depth: 0 })

      expect(informes.totalDocs).toBeGreaterThanOrEqual(1)
      expect(cardapio.totalDocs).toBeGreaterThanOrEqual(1)
    },
    120_000,
  )

  it(
    'é idempotente: reexecutar mantém contagens estáveis e destaque <= 1',
    async () => {
      const antesInformes = await payload.find({ collection: 'informes', limit: 0, depth: 0 })
      const antesCardapio = await payload.find({ collection: 'cardapio', limit: 0, depth: 0 })
      const antesCronologia = await payload.find({ collection: 'cronologia', limit: 0, depth: 0 })

      // Roda o seed novamente (limpa/repovoa de forma previsível).
      runSeed()

      const depoisInformes = await payload.find({ collection: 'informes', limit: 0, depth: 0 })
      const depoisCardapio = await payload.find({ collection: 'cardapio', limit: 0, depth: 0 })
      const depoisCronologia = await payload.find({ collection: 'cronologia', limit: 0, depth: 0 })

      // Contagens estáveis entre execuções (sem duplicatas).
      expect(depoisInformes.totalDocs).toBe(antesInformes.totalDocs)
      expect(depoisCardapio.totalDocs).toBe(antesCardapio.totalDocs)
      expect(depoisCronologia.totalDocs).toBe(antesCronologia.totalDocs)

      // Invariante de destaque preservada (Req 9.2).
      const destaques = await payload.find({
        collection: 'informes',
        where: { destaque: { equals: true } },
        limit: 0,
        depth: 0,
      })
      expect(destaques.totalDocs).toBeLessThanOrEqual(1)
    },
    120_000,
  )
})
