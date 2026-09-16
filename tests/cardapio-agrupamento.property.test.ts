import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  agruparCardapio,
  ORDEM_SECOES,
  type ItemAgrupavel,
  type SecaoCardapio,
} from '../lib/cardapio'

// Item de teste: além da forma mínima `ItemAgrupavel`, carrega um `id` único
// para permitir verificar contagens (multiset) e estabilidade da ordenação.
interface ItemTeste extends ItemAgrupavel {
  id: number
}

// Gerador de seção sobre os 4 valores fixos do cardápio.
const secaoArb = fc.constantFrom<SecaoCardapio>('Pizzas', 'Tamanhos', 'Bebidas', 'Vinhos')

// `ordem` pode ser um número, null ou undefined (campo opcional/anulável).
const ordemArb = fc.oneof(
  fc.integer({ min: -1000, max: 1000 }),
  fc.constant(null),
  fc.constant(undefined),
)

// Array arbitrário de itens com `id` único (índice no array), para que o
// multiset de ids identifique cada item sem colisão.
const itensArb = fc
  .array(fc.record({ secao: secaoArb, ordem: ordemArb }), { maxLength: 60 })
  .map((itens) => itens.map((it, id): ItemTeste => ({ ...it, id })))

const ordemDe = (item: ItemAgrupavel): number => item.ordem ?? 0

describe('Feature: payload-cms-integration, Property 6: Agrupamento do cardápio por seção preservando ordem', () => {
  // Validates: Requirements 14.1, 14.2, 6.5

  it('todo item de entrada aparece exatamente uma vez no resultado', () => {
    fc.assert(
      fc.property(itensArb, (itens) => {
        const grupos = agruparCardapio(itens)
        const idsSaida = grupos.flatMap((g) => g.itens.map((i) => i.id)).sort((a, b) => a - b)
        const idsEntrada = itens.map((i) => i.id).sort((a, b) => a - b)

        // Contagem total preservada e mesmo multiset de ids.
        expect(idsSaida.length).toBe(idsEntrada.length)
        expect(idsSaida).toEqual(idsEntrada)
      }),
    )
  })

  it('dentro de cada seção os itens são não decrescentes por (ordem ?? 0)', () => {
    fc.assert(
      fc.property(itensArb, (itens) => {
        const grupos = agruparCardapio(itens)
        for (const grupo of grupos) {
          for (let i = 1; i < grupo.itens.length; i++) {
            expect(ordemDe(grupo.itens[i - 1])).toBeLessThanOrEqual(ordemDe(grupo.itens[i]))
          }
        }
      }),
    )
  })

  it('todo item de um grupo pertence à seção desse grupo (nenhum item mal alocado)', () => {
    fc.assert(
      fc.property(itensArb, (itens) => {
        const grupos = agruparCardapio(itens)
        for (const grupo of grupos) {
          for (const item of grupo.itens) {
            expect(item.secao).toBe(grupo.secao)
          }
        }
      }),
    )
  })

  it('seções aparecem na ordem canônica e uma seção existe sse e somente se tem ao menos um item', () => {
    fc.assert(
      fc.property(itensArb, (itens) => {
        const grupos = agruparCardapio(itens)
        const secoesSaida = grupos.map((g) => g.secao)

        // Ordem canônica: a sequência de seções é uma subsequência de ORDEM_SECOES.
        const indices = secoesSaida.map((s) => ORDEM_SECOES.indexOf(s))
        for (let i = 1; i < indices.length; i++) {
          expect(indices[i]).toBeGreaterThan(indices[i - 1])
        }

        // Nenhum grupo vazio.
        for (const grupo of grupos) {
          expect(grupo.itens.length).toBeGreaterThan(0)
        }

        // Uma seção aparece sse há ao menos um item de entrada com essa seção.
        const secoesEntrada = new Set(itens.map((i) => i.secao))
        for (const secao of ORDEM_SECOES) {
          const presente = secoesSaida.includes(secao)
          expect(presente).toBe(secoesEntrada.has(secao))
        }
      }),
    )
  })

  it('estabilidade: itens com (ordem ?? 0) igual preservam a ordem relativa de entrada', () => {
    fc.assert(
      fc.property(itensArb, (itens) => {
        const grupos = agruparCardapio(itens)
        for (const grupo of grupos) {
          // Ordem de entrada dos itens desta seção (por id crescente, já que
          // id = índice de entrada).
          const entradaDaSecao = itens
            .filter((i) => i.secao === grupo.secao)
            .map((i) => i.id)

          // Para cada valor de `ordem`, a subsequência de ids na saída deve
          // igualar a subsequência de ids na entrada (ordenação estável).
          const valores = new Set(grupo.itens.map(ordemDe))
          for (const v of valores) {
            const idsSaida = grupo.itens.filter((i) => ordemDe(i) === v).map((i) => i.id)
            const idsEntrada = entradaDaSecao.filter((id) => {
              const item = itens[id]
              return ordemDe(item) === v
            })
            expect(idsSaida).toEqual(idsEntrada)
          }
        }
      }),
    )
  })

  it('não muta a entrada', () => {
    fc.assert(
      fc.property(itensArb, (itens) => {
        const snapshot = itens.map((i) => ({ ...i }))
        agruparCardapio(itens)
        expect(itens).toEqual(snapshot)
      }),
    )
  })
})
