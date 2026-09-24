import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import { renderPreco } from '../lib/cardapio'

// Property 4 (nova forma, Tarefa 6 de docs/features/delivery-pedidos.md): o
// preço agora é NUMÉRICO na collection e `renderPreco` é a camada de
// formatação — qualquer número finito não-negativo vira moeda pt-BR no
// formato histórico do cardápio impresso "R$ X,XX" (espaço comum U+0020,
// vírgula decimal, duas casas). O antigo contrato de identidade sobre string
// (Requisito 6.3) foi revogado pelo P1 da feature de delivery.

// Formato esperado: "R$ " + grupos de milhar com ponto + vírgula + 2 casas.
// Ex.: "R$ 30,00", "R$ 1.234,56".
const FORMATO_BRL = /^R\$ \d{1,3}(\.\d{3})*,\d{2}$/

// Preços arbitrários: finitos, não-negativos, em magnitude realista de
// cardápio (até 1 milhão de reais) para não exercitar notação científica.
const precoArb = fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true })

describe('Feature: delivery-pedidos, Property 4: renderPreco formata número como moeda pt-BR', () => {
  it('renderPreco formata qualquer número finito não-negativo como "R$ X,XX"', () => {
    fc.assert(
      fc.property(precoArb, (preco) => {
        const saida = renderPreco(preco)
        expect(saida).toMatch(FORMATO_BRL)
      }),
    )
  })

  it('nunca emite no-break space (U+00A0) — só espaço comum', () => {
    fc.assert(
      fc.property(precoArb, (preco) => {
        expect(renderPreco(preco)).not.toContain('\u00a0')
      }),
    )
  })

  it('a parte inteira da saída corresponde ao valor arredondado em centavos', () => {
    fc.assert(
      fc.property(precoArb, (preco) => {
        const saida = renderPreco(preco)
        // Parse de volta: remove "R$ ", pontos de milhar e troca vírgula por ponto.
        const numero = Number(saida.replace('R$ ', '').replace(/\./g, '').replace(',', '.'))
        // O valor formatado (2 casas) difere do original por menos de 1 centavo.
        expect(Math.abs(numero - preco)).toBeLessThan(0.01)
      }),
    )
  })

  it('valores conhecidos do cardápio impresso', () => {
    // Exemplos do seed (content/seed-data.ts): saída idêntica ao texto
    // original do cardápio impresso.
    expect(renderPreco(30)).toBe('R$ 30,00')
    expect(renderPreco(12.5)).toBe('R$ 12,50')
    expect(renderPreco(8)).toBe('R$ 8,00')
    expect(renderPreco(0)).toBe('R$ 0,00')
    expect(renderPreco(100)).toBe('R$ 100,00')
    expect(renderPreco(1234.56)).toBe('R$ 1.234,56')
  })
})
