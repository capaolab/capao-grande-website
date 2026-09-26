import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  agruparCardapio,
  type ItemAgrupavel,
  type SecaoMinima,
} from '../lib/cardapio'

// Item de teste: além da forma mínima `ItemAgrupavel`, carrega um `id` único
// para permitir verificar contagens (multiset) e estabilidade da ordenação.
// A seção vem sempre populada, como na leitura com depth (secoes-cardapio.md).
interface ItemTeste extends ItemAgrupavel {
  id: number
  secao: SecaoMinima
}

// `ordem` pode ser um número, null ou undefined (campo opcional/anulável).
const ordemArb = fc.oneof(
  fc.integer({ min: -1000, max: 1000 }),
  fc.constant(null),
  fc.constant(undefined),
)

// Seções cadastradas: nomes distintos e `ordem` arbitrária (inclusive
// empatada ou ausente).
const secoesArb = fc
  .array(ordemArb, { minLength: 1, maxLength: 6 })
  .map((ordens) =>
    ordens.map((ordem, i): SecaoMinima => ({ id: i + 1, nome: `Seção ${i + 1}`, ordem, tipo: 'comum' })),
  )

// Array arbitrário de itens com `id` único (índice no array), para que o
// multiset de ids identifique cada item sem colisão.
const itensArb = secoesArb.chain((secoes) =>
  fc
    .array(fc.record({ secao: fc.constantFrom(...secoes), ordem: ordemArb }), { maxLength: 60 })
    .map((itens) => itens.map((it, id): ItemTeste => ({ ...it, id }))),
)

const ordemDe = (item: { ordem?: number | null }): number => item.ordem ?? 0

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
            expect(item.secao.nome).toBe(grupo.secao)
          }
        }
      }),
    )
  })

  it('seções aparecem por (ordem ?? 0) da seção e uma seção existe sse e somente se tem ao menos um item', () => {
    fc.assert(
      fc.property(itensArb, (itens) => {
        const grupos = agruparCardapio(itens)
        const secoesSaida = grupos.map((g) => g.secao)

        // Seções não decrescentes pelo `ordem` da seção.
        const secaoPorNome = new Map(itens.map((i) => [i.secao.nome, i.secao]))
        for (let i = 1; i < secoesSaida.length; i++) {
          expect(ordemDe(secaoPorNome.get(secoesSaida[i - 1])!)).toBeLessThanOrEqual(
            ordemDe(secaoPorNome.get(secoesSaida[i])!),
          )
        }

        // Nenhum grupo vazio.
        for (const grupo of grupos) {
          expect(grupo.itens.length).toBeGreaterThan(0)
        }

        // Uma seção aparece sse há ao menos um item de entrada com essa seção.
        expect(new Set(secoesSaida)).toEqual(new Set(itens.map((i) => i.secao.nome)))
        expect(secoesSaida.length).toBe(new Set(secoesSaida).size)
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
            .filter((i) => i.secao.nome === grupo.secao)
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
