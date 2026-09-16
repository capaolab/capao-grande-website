import net from 'net'

import fc from 'fast-check'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

// Testes de integração das leituras públicas (task 7.11) — Payload + Postgres.
//
// Exercita as MESMAS semânticas de leitura pública implementadas em
// `lib/queries.ts` (getInformesPagina/getInformeDestaque, getCardapioAgrupado,
// getInformeBySlug) contra um Postgres real, via a Payload Local API:
//   - Listagem pública de informes retorna apenas `publicado: true` (Req 5.8, 11.1).
//   - Listagem pública de cardápio retorna apenas `ativo: true` (Req 6.6).
//   - Fallback de locale real: `en` ausente com fallback ⇒ retorna `pt` (Req 3.6);
//     leitura com `fallbackLocale: 'none'` ⇒ `null` para o campo `en` (Req 12.4).
//   - Slug: publicado resolve o doc; não publicado / inexistente ⇒ null (⇒ 404)
//     (Req 12.1, 12.3).
//
// ---------------------------------------------------------------------------
// ABORDAGEM (documentada conforme instrução da tarefa):
//
// Usamos a Payload Local API DIRETAMENTE (getPayload({ config }) +
// payload.find/findByID), replicando as MESMAS cláusulas que `lib/queries.ts`
// aplica (filtros publicado/ativo, locale 'pt' por padrão, fallbackLocale
// 'none' na seção secundária). Não importamos `lib/queries.ts` porque ele
// importa via alias '@/...' e usa `getPayloadClient` (React `cache`), voltado a
// Server Components do Next; sob o runner vitest (environment: node, sem alias
// '@/...' configurado no vitest.config.mts) esses imports não resolvem. Assim,
// `lib/queries.ts` é exercitado no nível SEMÂNTICO (as queries idênticas) aqui,
// e continua verificado por tipos separadamente (tsc). NÃO enfraquecemos o
// código de produção para acomodar os testes.
//
// Contagem de execuções fast-check para as propriedades DB-backed: usamos
// numRuns REDUZIDO (20) via { numRuns } no fc.assert de cada propriedade, para
// manter o número de round-trips ao banco razoável em testes de integração
// (o default global é 100 para propriedades puras). Cada lote gerado é criado e
// limpo dentro da própria propriedade; ids também são rastreados para cleanup
// no afterAll como salvaguarda.
// ---------------------------------------------------------------------------
//
// Esta suíte depende de infraestrutura externa (Postgres + push de schema). É
// PULADA (skip) quando DATABASE_URI está ausente ou o banco está inalcançável,
// imprimindo o motivo — mas RODA e PASSA de verdade quando o Postgres do
// docker-compose (serviço `db`) está de pé.

// Valores padrão de desenvolvimento (mesmos do .env.example). Só são usados
// como fallback quando a env não define nada — nunca são segredos reais.
const DEV_DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
const DEV_PAYLOAD_SECRET = 'test-secret-for-integration-leituras-publicas'

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
    `[leituras-publicas.integration] Postgres inalcançável em ${host}:${port} — ` +
      'teste de integração PULADO. Suba o banco com `docker compose -f docker-compose.yml up -d db` ' +
      'e defina DATABASE_URI para executá-lo.',
  )
}

// Sufixo único por execução para evitar colisões com dados semeados e permitir
// asserts precisos + limpeza determinística.
const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

describe.skipIf(!dbAvailable)('leituras públicas (Payload + Postgres)', () => {
  let payload: Payload
  // Rastreamento global de ids criados (salvaguarda de cleanup no afterAll).
  const createdInformeIds: (number | string)[] = []
  const createdCardapioIds: (number | string)[] = []

  // --- Helpers que replicam as cláusulas de lib/queries.ts -----------------

  // Semântica de getInformesPagina/getInformesRecentes/getInformeDestaque:
  // leitura pública SEMPRE filtra publicado: true, locale 'pt'.
  async function lerInformesPublicados(): Promise<Array<{ id: number | string }>> {
    const { docs } = await payload.find({
      collection: 'informes',
      where: { publicado: { equals: true } },
      limit: 0,
      locale: 'pt',
    })
    return docs as Array<{ id: number | string }>
  }

  // Semântica de getCardapioAgrupado: leitura pública SEMPRE filtra ativo: true.
  async function lerCardapioAtivo(): Promise<Array<{ id: number | string }>> {
    const { docs } = await payload.find({
      collection: 'cardapio',
      where: { ativo: { equals: true } },
      limit: 0,
      locale: 'pt',
    })
    return docs as Array<{ id: number | string }>
  }

  // Semântica de getInformeBySlug: filtra slug + publicado: true, locale 'pt'.
  async function lerInformePorSlug(
    slug: string,
  ): Promise<{ id: number | string } | null> {
    const { docs } = await payload.find({
      collection: 'informes',
      where: {
        and: [{ slug: { equals: slug } }, { publicado: { equals: true } }],
      },
      limit: 1,
      locale: 'pt',
    })
    return (docs[0] as { id: number | string } | undefined) ?? null
  }

  async function criarInforme(data: {
    titulo: string
    publicado: boolean
    resumoPt?: string
    resumoEn?: string
  }): Promise<{ id: number | string; slug?: string | null }> {
    // Cria em 'pt' (locale padrão). resumo pt opcional.
    const doc = await payload.create({
      collection: 'informes',
      locale: 'pt',
      data: {
        titulo: data.titulo,
        etiqueta: 'Funcionamento',
        publicado: data.publicado,
        ...(data.resumoPt != null ? { resumo: data.resumoPt } : {}),
      },
    })
    createdInformeIds.push(doc.id)

    // Se houver resumo 'en', grava-o numa segunda escrita no locale 'en'.
    if (data.resumoEn != null) {
      await payload.update({
        collection: 'informes',
        id: doc.id,
        locale: 'en',
        data: { resumo: data.resumoEn },
      })
    }

    return { id: doc.id, slug: (doc as { slug?: string | null }).slug }
  }

  async function criarItemCardapio(data: {
    nome: string
    ativo: boolean
  }): Promise<{ id: number | string }> {
    const doc = await payload.create({
      collection: 'cardapio',
      locale: 'pt',
      data: {
        secao: 'Pizzas',
        nome: data.nome,
        preco: 'R$ 30,00',
        ordem: 1,
        ativo: data.ativo,
      },
    })
    createdCardapioIds.push(doc.id)
    return { id: doc.id }
  }

  async function apagarInforme(id: number | string): Promise<void> {
    try {
      await payload.delete({ collection: 'informes', id })
    } catch {
      // best-effort
    }
  }

  async function apagarCardapio(id: number | string): Promise<void> {
    try {
      await payload.delete({ collection: 'cardapio', id })
    } catch {
      // best-effort
    }
  }

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    for (const id of createdInformeIds) await apagarInforme(id)
    for (const id of createdCardapioIds) await apagarCardapio(id)
    if (payload) {
      await payload.destroy()
    }
  }, 120_000)

  // --- Exemplos ------------------------------------------------------------

  it(
    'listagem pública de informes retorna só publicados (Req 5.8, 11.1)',
    async () => {
      const pub1 = await criarInforme({ titulo: `Pub 1 ${runId}`, publicado: true })
      const pub2 = await criarInforme({ titulo: `Pub 2 ${runId}`, publicado: true })
      const naoPub = await criarInforme({ titulo: `Draft ${runId}`, publicado: false })

      const docs = await lerInformesPublicados()
      const ids = docs.map((d) => d.id)

      expect(ids).toContain(pub1.id)
      expect(ids).toContain(pub2.id)
      expect(ids).not.toContain(naoPub.id)
    },
    120_000,
  )

  it(
    'listagem pública do cardápio retorna só itens ativos (Req 6.6)',
    async () => {
      const ativo1 = await criarItemCardapio({ nome: `Ativo 1 ${runId}`, ativo: true })
      const ativo2 = await criarItemCardapio({ nome: `Ativo 2 ${runId}`, ativo: true })
      const inativo = await criarItemCardapio({ nome: `Inativo ${runId}`, ativo: false })

      const docs = await lerCardapioAtivo()
      const ids = docs.map((d) => d.id)

      expect(ids).toContain(ativo1.id)
      expect(ids).toContain(ativo2.id)
      expect(ids).not.toContain(inativo.id)
    },
    120_000,
  )

  it(
    'fallback de locale: en ausente com fallback ⇒ pt; fallbackLocale none ⇒ null (Req 3.6, 12.4)',
    async () => {
      const resumoPt = `Resumo em português ${runId}`
      const criado = await criarInforme({
        titulo: `Fallback ${runId}`,
        publicado: true,
        resumoPt,
        // sem resumoEn de propósito
      })

      // Leitura em 'en' COM fallback padrão (comportamento do Payload,
      // localization.fallback: true) ⇒ devolve o valor pt (Req 3.6).
      const comFallback = await payload.findByID({
        collection: 'informes',
        id: criado.id,
        locale: 'en',
      })
      expect((comFallback as { resumo?: string | null }).resumo).toBe(resumoPt)

      // Leitura em 'en' com fallbackLocale: 'none' ⇒ campo en ausente vira null
      // (semântica da seção secundária de getInformeBySlug — Req 12.4).
      const semFallback = await payload.findByID({
        collection: 'informes',
        id: criado.id,
        locale: 'en',
        fallbackLocale: 'none',
        disableErrors: true,
      })
      expect((semFallback as { resumo?: string | null } | null)?.resumo ?? null).toBeNull()
    },
    120_000,
  )

  it(
    'slug: publicado resolve o doc; não publicado e inexistente ⇒ null/404 (Req 12.1, 12.3)',
    async () => {
      const publicado = await criarInforme({ titulo: `Slug Pub ${runId}`, publicado: true })
      const rascunho = await criarInforme({ titulo: `Slug Draft ${runId}`, publicado: false })

      expect(publicado.slug).toBeTruthy()
      expect(rascunho.slug).toBeTruthy()

      // Slug publicado ⇒ resolve o doc.
      const resolvido = await lerInformePorSlug(publicado.slug as string)
      expect(resolvido?.id).toBe(publicado.id)

      // Slug de rascunho (não publicado) ⇒ null (⇒ 404).
      const naoPublicado = await lerInformePorSlug(rascunho.slug as string)
      expect(naoPublicado).toBeNull()

      // Slug inexistente ⇒ null (⇒ 404).
      const inexistente = await lerInformePorSlug(`nao-existe-${runId}`)
      expect(inexistente).toBeNull()
    },
    120_000,
  )

  // --- Propriedades (fast-check, DB-backed, numRuns reduzido = 20) ----------

  const DB_NUM_RUNS = 20

  it(
    'Feature: payload-cms-integration, Property 2: Leitura pública de informes só retorna publicados',
    async () => {
      // For any mistura de informes (publicado aleatório), a leitura pública
      // filtrada por publicado retorna exatamente o subconjunto publicado
      // (por id) e nunca um não publicado. (Req 5.8, 11.1)
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          async (publicados) => {
            const lote: Array<{ id: number | string; publicado: boolean }> = []
            try {
              for (let i = 0; i < publicados.length; i++) {
                const criado = await criarInforme({
                  titulo: `P2 ${runId} ${Date.now()}-${i}-${Math.random()}`,
                  publicado: publicados[i],
                })
                lote.push({ id: criado.id, publicado: publicados[i] })
              }

              const docs = await lerInformesPublicados()
              const idsPublicos = new Set(docs.map((d) => d.id))

              // Todo publicado do lote está presente; nenhum não publicado está.
              for (const item of lote) {
                if (item.publicado) {
                  expect(idsPublicos.has(item.id)).toBe(true)
                } else {
                  expect(idsPublicos.has(item.id)).toBe(false)
                }
              }
            } finally {
              for (const item of lote) await apagarInforme(item.id)
            }
          },
        ),
        { numRuns: DB_NUM_RUNS },
      )
    },
    120_000,
  )

  it(
    'Feature: payload-cms-integration, Property 3: Leitura pública do cardápio só retorna ativos',
    async () => {
      // For any mistura de itens de cardápio (ativo aleatório), a leitura
      // pública filtrada por ativo retorna exatamente o subconjunto ativo. (Req 6.6)
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          async (ativos) => {
            const lote: Array<{ id: number | string; ativo: boolean }> = []
            try {
              for (let i = 0; i < ativos.length; i++) {
                const criado = await criarItemCardapio({
                  nome: `P3 ${runId} ${Date.now()}-${i}-${Math.random()}`,
                  ativo: ativos[i],
                })
                lote.push({ id: criado.id, ativo: ativos[i] })
              }

              const docs = await lerCardapioAtivo()
              const idsAtivos = new Set(docs.map((d) => d.id))

              for (const item of lote) {
                if (item.ativo) {
                  expect(idsAtivos.has(item.id)).toBe(true)
                } else {
                  expect(idsAtivos.has(item.id)).toBe(false)
                }
              }
            } finally {
              for (const item of lote) await apagarCardapio(item.id)
            }
          },
        ),
        { numRuns: DB_NUM_RUNS },
      )
    },
    120_000,
  )

  it(
    'Feature: payload-cms-integration, Property 11: Slug de informe resolve documento publicado ou 404',
    async () => {
      // For any informe com publicado aleatório, a busca por slug filtrando
      // publicado: true retorna o doc sse publicado === true; caso contrário
      // null (⇒ 404). (Req 12.1, 12.3)
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (publicado) => {
          const criado = await criarInforme({
            titulo: `P11 ${runId} ${Date.now()}-${Math.random()}`,
            publicado,
          })
          try {
            const slug = criado.slug as string
            expect(slug).toBeTruthy()

            const resolvido = await lerInformePorSlug(slug)
            if (publicado) {
              expect(resolvido?.id).toBe(criado.id)
            } else {
              expect(resolvido).toBeNull()
            }
          } finally {
            await apagarInforme(criado.id)
          }
        }),
        { numRuns: DB_NUM_RUNS },
      )
    },
    120_000,
  )
})
