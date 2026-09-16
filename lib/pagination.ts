// Função pura de paginação para a listagem de informes (Requisito 11).
//
// Esta função NÃO acessa o Payload, o Next.js nem o banco: recebe apenas o
// total de itens publicados, a página atual e o tamanho de página, e devolve
// um estado de paginação previsível. Isso permite testá-la por propriedade
// (task 7.9) com totais/páginas sintéticos, e mantém as queries da Local API
// (lib/queries.ts) livres de lógica de contagem.

/** Tamanho de página padrão da listagem de informes (Requisito 11.2). */
export const INFORMES_PER_PAGE = 4

export interface PaginationState {
  /** Página atual normalizada (>= 1). */
  page: number
  /** Itens por página, sempre <= perPage solicitado e <= 4 por padrão. */
  perPage: number
  /** Total de itens publicados informado. */
  total: number
  /** Deslocamento (0-based) do primeiro item desta página: (page - 1) * perPage. */
  offset: number
  /**
   * Quantidade de itens exibidos até o fim desta página (contador "X" em
   * "X de Y", Requisito 11.3/11.4). Igual à soma dos itens carregados nas
   * páginas 1..page. Invariante: loaded <= total.
   */
  loaded: number
  /**
   * Verdadeiro se, e somente se, existem itens publicados além dos já
   * exibidos até esta página (Requisito 11.5). Equivalente a
   * `page * perPage < total`.
   */
  hasNextPage: boolean
}

/**
 * Calcula o estado de paginação da listagem de informes.
 *
 * Invariantes garantidas:
 * - `perPage` <= `perPage` solicitado e, por padrão, <= 4 (Requisito 11.2).
 * - `loaded` <= `total` (Requisito 11.4): o contador nunca ultrapassa o total.
 * - `loaded` = soma dos itens carregados nas páginas 1..page (contador coerente).
 * - `hasNextPage` === (`page * perPage` < `total`) (Requisito 11.5): botão
 *   "Publicações mais antigas" aparece exatamente quando há mais publicados.
 *
 * Casos de borda tratados de forma previsível:
 * - `total` <= 0 vira 0; `loaded` = 0 e `hasNextPage` = false.
 * - `page` < 1 (ou não inteiro/NaN) é normalizada para 1.
 * - `perPage` < 1 (ou não inteiro/NaN) volta ao padrão 4; nunca excede 4.
 * - `page` além da última: `offset` pode ser >= `total`, `loaded` fica em `total`
 *   e `hasNextPage` é false (nada além para carregar).
 */
export function paginar(
  total: number,
  page: number,
  perPage: number = INFORMES_PER_PAGE,
): PaginationState {
  // Normaliza perPage: inteiro em [1, INFORMES_PER_PAGE]. Nunca permite passar
  // de 4 (limite do Requisito 11.2), mesmo que um valor maior seja pedido.
  const requested = Number.isFinite(perPage) ? Math.floor(perPage) : INFORMES_PER_PAGE
  const safePerPage = Math.min(
    INFORMES_PER_PAGE,
    requested >= 1 ? requested : INFORMES_PER_PAGE,
  )

  // Normaliza total: inteiro >= 0.
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0

  // Normaliza page: inteiro >= 1.
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1

  const offset = (safePage - 1) * safePerPage

  // Itens carregados até o fim desta página, limitado ao total disponível.
  // Se a página está além do fim, offset >= total => loaded fica em total.
  const loaded = Math.min(safeTotal, offset + safePerPage)

  const hasNextPage = safePage * safePerPage < safeTotal

  return {
    page: safePage,
    perPage: safePerPage,
    total: safeTotal,
    offset,
    loaded,
    hasNextPage,
  }
}
