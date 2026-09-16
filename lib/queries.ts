// Camada de queries das páginas públicas (task 7.10).
//
// Este é um módulo *server-only*: usa o cliente da Payload Local API obtido via
// `getPayloadClient()` (lib/payload.ts). É consumido pelos Server Components das
// páginas (tasks 12.x). Nada aqui roda no cliente.
//
// Regras transversais (design.md / Requisitos 5.8, 6.6, 3.1, 3.5):
// - Leituras públicas SEMPRE filtram `publicado` (informes) / `ativo` (cardápio).
// - O locale padrão de toda leitura pública é 'pt' (defaultLocale).
// - O detalhe do informe lê o resumo em 'en' com `fallbackLocale: 'none'` APENAS
//   para a seção secundária: um `en` ausente vira `null` (não cai para pt), para
//   que a página possa omitir a seção sem fabricar conteúdo (Requisito 12.4).
//
// A lógica pura (paginação, agrupamento, ordenação) vive em lib/pagination.ts,
// lib/cardapio.ts e lib/cronologia.ts e é testada por propriedade; aqui apenas
// orquestramos a Local API e delegamos a essas funções.

import type { Cardapio, Configuracoe, Cronologia, Informe } from '@/src/payload-types'

import { agruparCardapio, type SecaoAgrupada } from '@/lib/cardapio'
import { ordenarCronologia } from '@/lib/cronologia'
import { INFORMES_PER_PAGE, paginar, type PaginationState } from '@/lib/pagination'
import { getPayloadClient } from '@/lib/payload'

/**
 * Informe em destaque da home (Requisitos 10.1, 5.8).
 *
 * `find({ collection: 'informes', where: { destaque: true AND publicado: true },
 * limit: 1, locale: 'pt' })`. A unicidade do destaque é garantida por hook de
 * escrita na coleção (task 4.1), então basta pegar o primeiro. Retorna `null`
 * quando não há destaque publicado (a home aplica placeholder — Req 10.4).
 */
export async function getInformeDestaque(): Promise<Informe | null> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'informes',
    where: {
      and: [{ destaque: { equals: true } }, { publicado: { equals: true } }],
    },
    limit: 1,
    locale: 'pt',
  })

  return docs[0] ?? null
}

/**
 * Informes publicados mais recentes (Requisito 10.2), em ordem cronológica
 * inversa (`sort: '-data'`). Usado na home para listar os recentes que NÃO são
 * o destaque: passe o `id` do destaque em `excludeId`.
 *
 * `where: { publicado: true [AND id != excludeId] }, sort: '-data', limit,
 * locale: 'pt'`.
 */
export async function getInformesRecentes(
  limit = 3,
  excludeId?: number,
): Promise<Informe[]> {
  const payload = await getPayloadClient()

  const conditions: NonNullable<
    Parameters<typeof payload.find>[0]['where']
  >['and'] = [{ publicado: { equals: true } }]

  if (excludeId != null) {
    conditions.push({ id: { not_equals: excludeId } })
  }

  const { docs } = await payload.find({
    collection: 'informes',
    where: { and: conditions },
    sort: '-data',
    limit,
    locale: 'pt',
  })

  return docs
}

/** Resultado da listagem paginada de informes (Requisito 11). */
export interface InformesPagina {
  /** Informes publicados desta página (no máx. `INFORMES_PER_PAGE`). */
  informes: Informe[]
  /**
   * Estado de paginação derivado do total real de publicados via `paginar`,
   * de modo que `hasNextPage`/`loaded` (contador "X de Y") fiquem coerentes
   * com a lógica pura testada por propriedade (Requisitos 11.3–11.5).
   */
  pagination: PaginationState
}

/**
 * Listagem paginada de informes publicados (Requisitos 11.1–11.5).
 *
 * `find({ collection: 'informes', where: { publicado: true }, sort: '-data',
 * limit: INFORMES_PER_PAGE, page, locale: 'pt' })`. A ordenação é cronológica
 * inversa por `data`. O estado de paginação (`hasNextPage`, contador) é
 * recalculado com `paginar(totalDocs, page)` para manter consistência com as
 * invariantes puras, em vez de depender apenas dos flags do Payload.
 */
export async function getInformesPagina(page: number): Promise<InformesPagina> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'informes',
    where: { publicado: { equals: true } },
    sort: '-data',
    limit: INFORMES_PER_PAGE,
    page,
    locale: 'pt',
  })

  const pagination = paginar(result.totalDocs, page)

  return { informes: result.docs, pagination }
}

/** Detalhe do informe + resumo secundário em inglês (Requisitos 12.1, 12.4). */
export interface InformeDetalhe {
  /** Documento no locale padrão 'pt' (publicado). */
  informe: Informe
  /**
   * Resumo em inglês lido com `fallbackLocale: 'none'`: é `null` quando o
   * valor em 'en' está ausente (NÃO cai para pt). A página de detalhe omite a
   * seção em inglês quando isto é `null` (Requisito 12.4) — sem fabricar texto.
   */
  resumoEn: string | null
}

/**
 * Busca um informe publicado pelo `slug` (Requisitos 12.1, 12.3).
 *
 * `find({ collection: 'informes', where: { slug: slug AND publicado: true },
 * limit: 1, locale: 'pt' })`. Retorna `null` quando não existe informe
 * publicado com aquele slug (a rota chama `notFound()` → 404).
 *
 * Além do documento em 'pt', expõe `resumoEn`: uma segunda leitura do mesmo
 * documento com `locale: 'en'` e `fallbackLocale: 'none'`, de forma que um
 * `en` ausente resulte em `null` para a seção secundária (Requisito 12.4).
 */
export async function getInformeBySlug(slug: string): Promise<InformeDetalhe | null> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'informes',
    where: {
      and: [{ slug: { equals: slug } }, { publicado: { equals: true } }],
    },
    limit: 1,
    locale: 'pt',
  })

  const informe = docs[0]
  if (!informe) return null

  // Seção secundária em inglês: sem fallback para pt (Req 12.4). Lemos o mesmo
  // documento por id no locale 'en'; se o resumo 'en' estiver ausente, o
  // `fallbackLocale: 'none'` deixa o campo nulo em vez de devolver o pt.
  const informeEn = await payload.findByID({
    collection: 'informes',
    id: informe.id,
    locale: 'en',
    fallbackLocale: 'none',
    disableErrors: true,
  })

  const resumoEn = informeEn?.resumo ?? null

  return { informe, resumoEn }
}

/**
 * Cardápio agrupado por seção, apenas itens ativos (Requisitos 6.6, 14.1).
 *
 * `find({ collection: 'cardapio', where: { ativo: true }, sort: 'ordem',
 * limit: 0, locale: 'pt' })` e então `agruparCardapio(itens)` (agrupa por
 * `secao` na ordem canônica, preservando `ordem`). `limit: 0` desativa a
 * paginação para trazer todos os itens ativos.
 */
export async function getCardapioAgrupado(): Promise<SecaoAgrupada<Cardapio>[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'cardapio',
    where: { ativo: { equals: true } },
    sort: 'ordem',
    limit: 0,
    locale: 'pt',
  })

  return agruparCardapio(docs)
}

/**
 * Marcos da cronologia ordenados por `ordem` ascendente (Requisitos 7.4, 17.2).
 *
 * `find({ collection: 'cronologia', limit: 0, locale: 'pt' })` seguido de
 * `ordenarCronologia`. A cronologia não tem filtro público de publicado/ativo.
 */
export async function getCronologia(): Promise<Cronologia[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'cronologia',
    limit: 0,
    locale: 'pt',
  })

  return ordenarCronologia(docs)
}

/**
 * Global de configurações do site (Requisito 8.1).
 *
 * `findGlobal({ slug: 'configuracoes', locale: 'pt' })`.
 */
export async function getConfiguracoes(): Promise<Configuracoe> {
  const payload = await getPayloadClient()

  return payload.findGlobal({
    slug: 'configuracoes',
    locale: 'pt',
  })
}
