import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { paginar, INFORMES_PER_PAGE } from '../lib/pagination'

// Testes de propriedade da função pura `paginar` (Requisito 11).
//
// Property 7: Paginação da listagem de informes (≤ 4 por página; botão
//   "Publicações mais antigas" presente sse há publicados além dos exibidos).
//   Validates: Requirements 11.2, 11.1, 11.3, 11.5
//
// Property 8: Contador consistente com o total (contador ≤ total e igual à
//   soma dos itens carregados até a página atual).
//   Validates: Requirements 11.4
//
// `paginar` normaliza total/página/perPage, então as invariantes são checadas
// contra os valores normalizados devolvidos (result.page/result.perPage/
// result.total), não contra as entradas cruas.

/**
 * Total arbitrário: inteiros que cobrem 0, valores pequenos (fronteiras em
 * torno de multiplos de 4) e valores grandes.
 */
const arbTotal: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100_000 })

/**
 * Página arbitrária: inclui valores inválidos (< 1, incluindo negativos e 0)
 * que devem ser normalizados para 1, além de páginas grandes que ultrapassam
 * a última página existente.
 */
const arbPage: fc.Arbitrary<number> = fc.integer({ min: -50, max: 100_000 })

/**
 * perPage arbitrário: inclui valores < 1 (normalizados ao padrão 4), a faixa
 * válida 1..4 e valores > 4 (clampados para 4). Nunca deve resultar em > 4.
 */
const arbPerPage: fc.Arbitrary<number> = fc.integer({ min: -10, max: 50 })

describe('Feature: payload-cms-integration, Property 7: Paginação da listagem de informes', () => {
  it('perPage normalizado é sempre >= 1 e <= 4 (Req 11.2)', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        expect(r.perPage).toBeGreaterThanOrEqual(1)
        expect(r.perPage).toBeLessThanOrEqual(INFORMES_PER_PAGE)
        expect(INFORMES_PER_PAGE).toBe(4)
      }),
    )
  })

  it('hasNextPage === (page * perPage < total) usando os valores normalizados (Req 11.5)', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        const esperado = r.page * r.perPage < r.total
        expect(r.hasNextPage).toBe(esperado)
      }),
    )
  })

  it('offset === (page - 1) * perPage e offset >= 0', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        expect(r.offset).toBe((r.page - 1) * r.perPage)
        expect(r.offset).toBeGreaterThanOrEqual(0)
      }),
    )
  })

  it('botão presente sse há publicados além da página: hasNextPage <=> total > page*perPage (Req 11.3)', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        const limiteDaPagina = r.page * r.perPage
        if (r.total <= limiteDaPagina) {
          // Nada além do que já foi exibido => sem botão.
          expect(r.hasNextPage).toBe(false)
        } else {
          // Há publicados além desta página => botão presente.
          expect(r.hasNextPage).toBe(true)
        }
      }),
    )
  })
})

describe('Feature: payload-cms-integration, Property 8: Contador consistente com o total', () => {
  it('loaded <= total sempre: o contador nunca ultrapassa o total (Req 11.4)', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        expect(r.loaded).toBeLessThanOrEqual(r.total)
      }),
    )
  })

  it('loaded === min(total, offset + perPage): contador = itens carregados até esta página', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        expect(r.loaded).toBe(Math.min(r.total, r.offset + r.perPage))
      }),
    )
  })

  it('com próxima página, loaded === page*perPage (conjunto cheio); na última ou além, loaded === total', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        if (r.hasNextPage) {
          // Ainda há mais para carregar => página cheia carregada até aqui.
          expect(r.loaded).toBe(r.page * r.perPage)
        } else {
          // Na última página (ou além dela) => todos os itens estão carregados.
          expect(r.loaded).toBe(r.total)
        }
      }),
    )
  })

  it('loaded >= 0', () => {
    fc.assert(
      fc.property(arbTotal, arbPage, arbPerPage, (total, page, perPage) => {
        const r = paginar(total, page, perPage)
        expect(r.loaded).toBeGreaterThanOrEqual(0)
      }),
    )
  })
})
