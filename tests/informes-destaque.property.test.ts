import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  idsParaDesmarcarDestaque,
  type InformeDestaqueState,
} from '../src/collections/informes-destaque'

// Feature: payload-cms-integration, Property 1: No máximo um informe em destaque
//
// Property 1 (design.md): para qualquer sequência de operações de salvamento na
// Colecao_Informes, após cada salvamento a quantidade de registros com
// `destaque: true` deve ser no máximo 1, e salvar um registro com `destaque`
// marcado deve resultar em exatamente esse registro em destaque.
//
// Validates: Requirements 5.5, 9.2
//
// Aqui modelamos uma IMPLEMENTAÇÃO EM MEMÓRIA do hook de destaque único: o hook
// real do Payload delega a decisão de "quais informes desmarcar" à função pura
// `idsParaDesmarcarDestaque` e depois aplica `payload.update` sobre esses ids
// (mais o próprio informe salvo com `destaque: true`). O modelo abaixo reproduz
// essa aplicação sobre uma lista em memória, sem tocar no Payload nem no banco.

// ---------------------------------------------------------------------------
// Modelo em memória do hook
// ---------------------------------------------------------------------------

type Estado = InformeDestaqueState[]

/**
 * Aplica o hook de destaque único em memória: dado o estado atual e o id de um
 * informe que acabou de ser salvo com `destaque: true`, computa
 * `idsParaDesmarcarDestaque` e produz o próximo estado, desmarcando esses ids e
 * marcando `savedId` como o único destaque.
 *
 * Espelha o que o hook do Payload faz: `payload.update` nos ids retornados
 * (destaque: false) + o documento salvo permanece com destaque: true.
 */
function marcarDestaque(estado: Estado, savedId: InformeDestaqueState['id']): Estado {
  const paraDesmarcar = new Set(idsParaDesmarcarDestaque(estado, savedId))
  return estado.map((informe) => {
    if (informe.id === savedId) return { ...informe, destaque: true }
    if (paraDesmarcar.has(informe.id)) return { ...informe, destaque: false }
    return { ...informe }
  })
}

/** Conta quantos informes estão em destaque. */
const contarDestaques = (estado: Estado): number =>
  estado.filter((i) => i.destaque).length

/** Ids dos informes em destaque. */
const idsEmDestaque = (estado: Estado): Array<InformeDestaqueState['id']> =>
  estado.filter((i) => i.destaque).map((i) => i.id)

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Ids únicos: alguns numéricos, alguns string, como o Payload permite
// (string | number). `fc.uniqueArray` com um comparador estável garante ids
// distintos no conjunto de informes.
const idArb: fc.Arbitrary<InformeDestaqueState['id']> = fc.oneof(
  fc.integer({ min: 0, max: 10_000 }),
  fc.string({ minLength: 1, maxLength: 8 }),
)

/**
 * Um conjunto de informes com ids únicos e destaque booleano arbitrário.
 * Não força a invariante inicial (≤1 destaque) de propósito: o estado inicial
 * pode conter vários destaques (representa dados possivelmente inconsistentes),
 * e o hook deve convergir para no máximo um após uma marcação.
 */
const informesArb: fc.Arbitrary<Estado> = fc
  .uniqueArray(fc.record({ id: idArb, destaque: fc.boolean() }), {
    minLength: 1,
    maxLength: 12,
    selector: (i) => i.id,
  })

/** Gera um estado não vazio junto com um id existente para marcar. */
const estadoComIdArb: fc.Arbitrary<{ estado: Estado; id: InformeDestaqueState['id'] }> =
  informesArb.chain((estado) =>
    fc
      .constantFrom(...estado.map((i) => i.id))
      .map((id) => ({ estado, id })),
  )

const TAG = 'Feature: payload-cms-integration, Property 1: No máximo um informe em destaque'

// ---------------------------------------------------------------------------
// Propriedades
// ---------------------------------------------------------------------------

describe(TAG, () => {
  it('após marcar um destaque, no máximo um informe fica em destaque', () => {
    fc.assert(
      fc.property(estadoComIdArb, ({ estado, id }) => {
        const proximo = marcarDestaque(estado, id)
        expect(contarDestaques(proximo)).toBeLessThanOrEqual(1)
      }),
    )
  })

  it('marcar produz EXATAMENTE o informe salvo como único destaque', () => {
    fc.assert(
      fc.property(estadoComIdArb, ({ estado, id }) => {
        const proximo = marcarDestaque(estado, id)
        // Exatamente um destaque, e é o savedId.
        expect(idsEmDestaque(proximo)).toEqual([id])
        // Todos os demais ficam desmarcados.
        for (const informe of proximo) {
          expect(informe.destaque).toBe(informe.id === id)
        }
      }),
    )
  })

  it('é idempotente: marcar o mesmo id novamente não altera nada', () => {
    fc.assert(
      fc.property(estadoComIdArb, ({ estado, id }) => {
        const umaVez = marcarDestaque(estado, id)
        const duasVezes = marcarDestaque(umaVez, id)
        expect(duasVezes).toEqual(umaVez)
        // E a segunda aplicação não teria nada a desmarcar.
        expect(idsParaDesmarcarDestaque(umaVez, id)).toEqual([])
      }),
    )
  })

  it('sobre uma SEQUÊNCIA de marcas, a invariante ≤1 vale após cada passo e o último id marcado é o destaque', () => {
    const sequenciaArb = informesArb.chain((estado) =>
      fc
        .array(fc.constantFrom(...estado.map((i) => i.id)), {
          minLength: 1,
          maxLength: 20,
        })
        .map((marcas) => ({ estado, marcas })),
    )

    fc.assert(
      fc.property(sequenciaArb, ({ estado, marcas }) => {
        let atual = estado
        for (const id of marcas) {
          atual = marcarDestaque(atual, id)
          // Invariante após cada passo: no máximo um destaque.
          expect(contarDestaques(atual)).toBeLessThanOrEqual(1)
        }
        // Após toda a sequência, o último id marcado é o único destaque.
        const ultimo = marcas[marcas.length - 1]
        expect(idsEmDestaque(atual)).toEqual([ultimo])
      }),
    )
  })
})
