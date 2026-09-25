import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import {
  calcularTotalConta,
  centavosParaTexto,
  desfazerAjustes,
  dividirConta,
  dividirIgual,
  FORMAS_PAGAMENTO,
  lerValorReais,
  redistribuir,
  resumoPagamento,
  validarRateio,
  type ParteRateio,
} from '../lib/caixa'

// Testes de propriedade/unidade das funções puras do caixa
// (docs/features/caixa-historico.md): total da conta (serviço + desconto) e
// rateio do pagamento entre pessoas. Valores em centavos.

const soma = (partes: ParteRateio[]) => partes.reduce((acc, p) => acc + p.valor, 0)

const totalArb = fc.integer({ min: 0, max: 10_000_000 })
const pessoasArb = fc.integer({ min: 1, max: 30 })

// ---------------------------------------------------------------------------
// calcularTotalConta
// ---------------------------------------------------------------------------

describe('calcularTotalConta', () => {
  it('sem serviço e sem desconto, total = subtotal', () => {
    fc.assert(
      fc.property(totalArb, (subtotal) => {
        const r = calcularTotalConta({ subtotal, servico: false, desconto: 0 })
        expect(r).toEqual({ ok: true, subtotal, taxaServico: 0, desconto: 0, total: subtotal })
      }),
    )
  })

  it('serviço = 10% do subtotal arredondado ao centavo; total = subtotal + taxa − desconto', () => {
    fc.assert(
      fc.property(totalArb, fc.double({ min: 0, max: 1, noNaN: true }), (subtotal, fracao) => {
        const taxa = Math.round(subtotal * 0.1)
        const desconto = Math.floor((subtotal + taxa) * fracao)
        const r = calcularTotalConta({ subtotal, servico: true, desconto })
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.taxaServico).toBe(taxa)
        expect(r.total).toBe(subtotal + taxa - desconto)
        expect(r.total).toBeGreaterThanOrEqual(0)
      }),
    )
  })

  it('exemplo: R$ 123,45 com serviço → taxa R$ 12,35', () => {
    const r = calcularTotalConta({ subtotal: 12345, servico: true, desconto: 500 })
    expect(r).toEqual({ ok: true, subtotal: 12345, taxaServico: 1235, desconto: 500, total: 13080 })
  })

  it('rejeita desconto negativo, fracionário ou maior que a conta', () => {
    expect(calcularTotalConta({ subtotal: 1000, servico: false, desconto: -1 }).ok).toBe(false)
    expect(calcularTotalConta({ subtotal: 1000, servico: false, desconto: 0.5 }).ok).toBe(false)
    expect(calcularTotalConta({ subtotal: 1000, servico: false, desconto: 1001 }).ok).toBe(false)
    expect(calcularTotalConta({ subtotal: 1000, servico: true, desconto: 1100 }).ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// dividirIgual / dividirConta
// ---------------------------------------------------------------------------

describe('dividirIgual', () => {
  it('a soma das partes é sempre o total e elas diferem em no máximo 1 centavo', () => {
    fc.assert(
      fc.property(totalArb, pessoasArb, (total, n) => {
        const partes = dividirIgual(total, n)
        expect(partes).toHaveLength(n)
        expect(partes.reduce((a, b) => a + b, 0)).toBe(total)
        expect(Math.max(...partes) - Math.min(...partes)).toBeLessThanOrEqual(1)
      }),
    )
  })

  it('a sobra de centavos vai para as primeiras partes (100 / 3 → 34, 33, 33)', () => {
    expect(dividirIgual(100, 3)).toEqual([34, 33, 33])
    expect(dividirIgual(10000, 5)).toEqual([2000, 2000, 2000, 2000, 2000])
  })
})

describe('dividirConta', () => {
  it('divide igualmente, sem partes pagas', () => {
    const r = dividirConta(10000, [], 5)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.partes.map((p) => p.valor)).toEqual([2000, 2000, 2000, 2000, 2000])
    expect(r.partes.every((p) => !p.pago && !p.editado)).toBe(true)
  })

  it('preserva as partes pagas e divide o restante entre as novas', () => {
    // n2 >= 2: com 1 parte paga, sobra ao menos uma pessoa para o restante.
    fc.assert(
      fc.property(totalArb, pessoasArb, fc.integer({ min: 2, max: 30 }), (total, n1, n2) => {
        const inicial = dividirConta(total, [], n1)
        if (!inicial.ok) throw new Error(inicial.erro)
        const comPaga = inicial.partes.map((p, i) =>
          i === 0 ? { ...p, pago: true, forma: 'pix' as const } : p,
        )
        const r = dividirConta(total, comPaga, n2)
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.partes).toHaveLength(n2)
        expect(r.partes[0]).toEqual(comPaga[0])
        expect(soma(r.partes)).toBe(total)
      }),
    )
  })

  it('não permite dividir por menos pessoas do que as que já pagaram', () => {
    const inicial = dividirConta(9000, [], 3)
    if (!inicial.ok) throw new Error(inicial.erro)
    const pagas: ParteRateio[] = inicial.partes.map((p) => ({ ...p, pago: true, forma: 'dinheiro' }))
    expect(dividirConta(9000, pagas.slice(0, 2).concat(inicial.partes[2]), 1).ok).toBe(false)
    expect(dividirConta(9000, [], 0).ok).toBe(false)
    // Dividir só entre quem já pagou, com saldo em aberto, também falha.
    expect(dividirConta(9000, pagas.slice(0, 1).concat(inicial.partes.slice(1)), 1).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// redistribuir
// ---------------------------------------------------------------------------

describe('redistribuir', () => {
  it('exemplo: conta de R$ 100 por 5, pessoa 1 paga R$ 40 → as outras 4 pagam R$ 15', () => {
    const inicial = dividirConta(10000, [], 5)
    if (!inicial.ok) throw new Error(inicial.erro)
    const r = redistribuir(10000, inicial.partes, 0, 4000)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.partes.map((p) => p.valor)).toEqual([4000, 1500, 1500, 1500, 1500])
    expect(r.partes[0].editado).toBe(true)
  })

  it('mantém a soma e não mexe em partes travadas (pagas ou ajustadas)', () => {
    fc.assert(
      fc.property(
        totalArb,
        // n >= 3: uma parte paga, uma ajustada e ao menos uma livre.
        fc.integer({ min: 3, max: 10 }),
        fc.nat(),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (total, n, semente, fracao) => {
          const inicial = dividirConta(total, [], n)
          if (!inicial.ok) throw new Error(inicial.erro)
          // A primeira parte fica paga; ajusta outra parte qualquer.
          const partes = inicial.partes.map((p, i) =>
            i === 0 ? { ...p, pago: true, forma: 'cartao' as const } : p,
          )
          const indice = 1 + (semente % (n - 1))
          const disponivel = total - partes[0].valor
          const novoValor = Math.floor(disponivel * fracao)
          const r = redistribuir(total, partes, indice, novoValor)
          expect(r.ok).toBe(true)
          if (!r.ok) return
          expect(soma(r.partes)).toBe(total)
          expect(r.partes[0]).toEqual(partes[0])
          expect(r.partes[indice].valor).toBe(novoValor)
        },
      ),
    )
  })

  it('rejeita valor que passa do total e edição de parte paga', () => {
    const inicial = dividirConta(10000, [], 2)
    if (!inicial.ok) throw new Error(inicial.erro)
    expect(redistribuir(10000, inicial.partes, 0, 10001).ok).toBe(false)
    const paga = inicial.partes.map((p, i) => (i === 0 ? { ...p, pago: true, forma: 'pix' as const } : p))
    expect(redistribuir(10000, paga, 0, 100).ok).toBe(false)
  })

  it('rejeita quando todas as partes ficam travadas sem fechar o total', () => {
    const inicial = dividirConta(10000, [], 2)
    if (!inicial.ok) throw new Error(inicial.erro)
    const primeira = redistribuir(10000, inicial.partes, 0, 3000)
    if (!primeira.ok) throw new Error(primeira.erro)
    expect(redistribuir(10000, primeira.partes, 1, 3000).ok).toBe(false)
    // Fechando exatamente o total, é aceito.
    expect(redistribuir(10000, primeira.partes, 1, 7000).ok).toBe(true)
  })

  it('desfazerAjustes volta à divisão igual do que falta', () => {
    const inicial = dividirConta(10000, [], 4)
    if (!inicial.ok) throw new Error(inicial.erro)
    const ajustada = redistribuir(10000, inicial.partes, 1, 7000)
    if (!ajustada.ok) throw new Error(ajustada.erro)
    const r = desfazerAjustes(10000, ajustada.partes)
    expect(r.ok && r.partes.map((p) => p.valor)).toEqual([2500, 2500, 2500, 2500])
  })
})

// ---------------------------------------------------------------------------
// resumoPagamento / validarRateio
// ---------------------------------------------------------------------------

const parteArb = fc.record({
  valor: fc.integer({ min: 0, max: 1_000_000 }),
  forma: fc.constantFrom(...FORMAS_PAGAMENTO),
  pago: fc.boolean(),
  editado: fc.boolean(),
})

describe('resumoPagamento', () => {
  it('pago + em débito = total; soma por forma = pago', () => {
    fc.assert(
      fc.property(fc.array(parteArb, { minLength: 1, maxLength: 10 }), (partes) => {
        const total = soma(partes)
        const r = resumoPagamento(total, partes)
        expect(r.pago + r.emDebito).toBe(total)
        expect(r.porForma.pix + r.porForma.dinheiro + r.porForma.cartao).toBe(r.pago)
        expect(r.quitada).toBe(partes.every((p) => p.pago || p.valor === 0) && r.emDebito === 0)
      }),
    )
  })
})

describe('validarRateio', () => {
  it('aceita rateio vazio e rateio que fecha o total', () => {
    expect(validarRateio(5000, [])).toEqual([])
    const r = dividirConta(5000, [], 3)
    if (!r.ok) throw new Error(r.erro)
    expect(validarRateio(5000, r.partes)).toEqual([])
  })

  it('rejeita soma diferente do total e parte paga sem forma', () => {
    expect(validarRateio(5000, [{ valor: 4000, forma: null, pago: false, editado: false }])).not.toEqual([])
    expect(validarRateio(5000, [{ valor: 5000, forma: null, pago: true, editado: false }])).not.toEqual([])
  })
})

// ---------------------------------------------------------------------------
// lerValorReais / centavosParaTexto
// ---------------------------------------------------------------------------

describe('lerValorReais', () => {
  it('aceita formatos pt-BR comuns', () => {
    expect(lerValorReais('12,50')).toBe(1250)
    expect(lerValorReais('12.5')).toBe(1250)
    expect(lerValorReais('R$ 1.234,56')).toBe(123456)
    expect(lerValorReais('7')).toBe(700)
    expect(lerValorReais('0')).toBe(0)
  })

  it('rejeita vazio, negativo, mais de 2 casas e texto', () => {
    for (const invalido of ['', '-5', '1,234', 'abc', '1,2,3']) {
      expect(lerValorReais(invalido)).toBeNull()
    }
  })

  it('ida e volta: centavosParaTexto → lerValorReais preserva o valor', () => {
    fc.assert(
      fc.property(totalArb, (centavos) => {
        expect(lerValorReais(centavosParaTexto(centavos))).toBe(centavos)
      }),
    )
  })
})
