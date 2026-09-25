import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { coordenadaValida, validarLocalizacaoOpcional } from '../lib/geolocalizacao'
import {
  calcularSubtotalPimenta,
  precoAplicavel,
  temPrecoLote,
  validarPedidoPimenta,
  type ProdutoPimentaMinimo,
} from '../lib/pimenta'

// Testes das funções puras da pimenta em mel (docs/features/pimenta-em-mel.md):
// preço unitário × lote, subtotal calculado no servidor, validação da
// submissão por modalidade e localização opcional do cliente.

const FRASCO: ProdutoPimentaMinimo = {
  id: 1,
  nome: 'Pimenta em mel',
  volume: '150 ml',
  preco: 25,
  precoLote: 20,
  loteMinimo: 12,
}
const POTE_SEM_LOTE: ProdutoPimentaMinimo = { id: 2, nome: 'Pote', volume: null, preco: 40.9 }

describe('precoAplicavel', () => {
  it('usa o preço unitário abaixo do lote mínimo e o de lote a partir dele', () => {
    expect(precoAplicavel(FRASCO, 11)).toEqual({ precoUnitario: 25, lote: false })
    expect(precoAplicavel(FRASCO, 12)).toEqual({ precoUnitario: 20, lote: true })
    expect(precoAplicavel(FRASCO, 100)).toEqual({ precoUnitario: 20, lote: true })
  })

  it('sem preço de lote configurado, sempre o unitário', () => {
    expect(precoAplicavel(POTE_SEM_LOTE, 1000).lote).toBe(false)
    expect(temPrecoLote({ ...FRASCO, loteMinimo: null })).toBe(false)
    expect(temPrecoLote({ ...FRASCO, loteMinimo: 1 })).toBe(false)
  })

  it('propriedade: o lote vale exatamente quando quantidade ≥ loteMinimo', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 2, max: 100 }), (qtd, min) => {
        const r = precoAplicavel({ ...FRASCO, loteMinimo: min }, qtd)
        expect(r.lote).toBe(qtd >= min)
      }),
    )
  })
})

describe('calcularSubtotalPimenta', () => {
  it('soma em centavos e grava snapshot de nome/preço por item', () => {
    const r = calcularSubtotalPimenta(
      [
        { produto: 1, quantidade: 12 },
        { produto: 2, quantidade: 3 },
      ],
      [FRASCO, POTE_SEM_LOTE],
    )
    expect(r).toEqual({
      ok: true,
      subtotal: 12 * 20 + 3 * 40.9,
      itens: [
        { produto: 1, quantidade: 12, nomeSnapshot: 'Pimenta em mel (150 ml)', precoUnitario: 20, lote: true },
        { produto: 2, quantidade: 3, nomeSnapshot: 'Pote', precoUnitario: 40.9, lote: false },
      ],
    })
  })

  it('rejeita produto inexistente e quantidade inválida, acumulando erros', () => {
    const r = calcularSubtotalPimenta(
      [
        { produto: 99, quantidade: 1 },
        { produto: 1, quantidade: 0 },
      ],
      [FRASCO],
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erros).toHaveLength(2)
  })

  it('propriedade: subtotal = Σ preço aplicável × quantidade, sem ruído de centavos', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ produto: fc.constantFrom(1, 2), quantidade: fc.integer({ min: 1, max: 200 }) }),
          { minLength: 1, maxLength: 6 },
        ),
        (itens) => {
          const r = calcularSubtotalPimenta(itens, [FRASCO, POTE_SEM_LOTE])
          expect(r.ok).toBe(true)
          if (!r.ok) return
          const esperadoCentavos = itens.reduce((acc, item) => {
            const produto = item.produto === 1 ? FRASCO : POTE_SEM_LOTE
            return acc + Math.round(precoAplicavel(produto, item.quantidade).precoUnitario * 100) * item.quantidade
          }, 0)
          expect(Math.round(r.subtotal * 100)).toBe(esperadoCentavos)
          expect(r.subtotal * 100).toBeCloseTo(esperadoCentavos, 6)
        },
      ),
    )
  })
})

describe('validarPedidoPimenta', () => {
  const BASE = {
    nome: 'Restaurante da Vila',
    telefone: '(75) 99999-0000',
    itens: [{ produto: 1, quantidade: 24 }],
  }

  it('entrega exige ponto no mapa', () => {
    expect(validarPedidoPimenta({ ...BASE, modalidade: 'entrega' })).toContain(
      'Para entrega, marque o ponto de entrega no mapa.',
    )
    expect(
      validarPedidoPimenta({ ...BASE, modalidade: 'entrega', latitude: -12.6, longitude: -41.5 }),
    ).toEqual([])
  })

  it('retirada dispensa coordenadas', () => {
    expect(validarPedidoPimenta({ ...BASE, modalidade: 'retirada' })).toEqual([])
  })

  it('exige modalidade válida, nome, telefone e itens', () => {
    const erros = validarPedidoPimenta({ modalidade: 'correio', itens: [] })
    expect(erros).toEqual([
      'Nome é obrigatório.',
      'Telefone (WhatsApp) é obrigatório.',
      'O pedido precisa de ao menos um produto.',
      'Escolha entre entrega e retirada na pizzaria.',
    ])
  })

  it('rejeita item sem produto ou com quantidade não inteira', () => {
    const erros = validarPedidoPimenta({
      ...BASE,
      modalidade: 'retirada',
      itens: [{ quantidade: 1 }, { produto: 1, quantidade: 1.5 }],
    })
    expect(erros).toHaveLength(2)
  })
})

describe('geolocalização', () => {
  it('coordenadaValida exige números finitos dentro da faixa', () => {
    expect(coordenadaValida(-12.6, -41.5)).toBe(true)
    expect(coordenadaValida(91, 0)).toBe(false)
    expect(coordenadaValida(0, -181)).toBe(false)
    expect(coordenadaValida(Number.NaN, 0)).toBe(false)
    expect(coordenadaValida('-12', '-41')).toBe(false)
  })

  it('localização opcional: ausente é válida; meia coordenada não', () => {
    expect(validarLocalizacaoOpcional(undefined, undefined)).toEqual([])
    expect(validarLocalizacaoOpcional(null, null)).toEqual([])
    expect(validarLocalizacaoOpcional(-12.6, null)).toHaveLength(1)
    expect(validarLocalizacaoOpcional(-12.6, -41.5)).toEqual([])
  })
})
