import { describe, expect, it } from 'vitest'

import { filtrarCardapioDelivery } from '../lib/cardapio'

// Cardápio do delivery (docs/features/pedidos-painel.md): só os itens e os
// tamanhos liberados no global `cardapio-delivery`.

const GRUPOS = [
  { secao: 'Pizzas', tipo: 'por-tamanho' as const, itens: [{ id: 1 }, { id: 2 }] },
  { secao: 'Tamanhos', tipo: 'tamanhos' as const, itens: [{ id: 10 }, { id: 11 }] },
  { secao: 'Bebidas', tipo: 'comum' as const, itens: [{ id: 20 }] },
]

describe('filtrarCardapioDelivery', () => {
  it('mantém só os itens e os tamanhos liberados', () => {
    expect(
      filtrarCardapioDelivery(GRUPOS, { itens: new Set([2]), tamanhos: new Set([11]) }),
    ).toEqual([
      { secao: 'Pizzas', tipo: 'por-tamanho', itens: [{ id: 2 }] },
      { secao: 'Tamanhos', tipo: 'tamanhos', itens: [{ id: 11 }] },
    ])
  })

  it('sem tamanho liberado, as pizzas saem do delivery', () => {
    const resultado = filtrarCardapioDelivery(GRUPOS, {
      itens: new Set([1, 20]),
      tamanhos: new Set(),
    })
    expect(resultado.map((g) => g.secao)).toEqual(['Bebidas'])
  })

  it('omite seções que ficam vazias', () => {
    const resultado = filtrarCardapioDelivery(GRUPOS, {
      itens: new Set([20]),
      tamanhos: new Set([10]),
    })
    expect(resultado.map((g) => g.secao)).toEqual(['Tamanhos', 'Bebidas'])
  })
})
