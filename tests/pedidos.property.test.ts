import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import {
  ALFABETO_CODIGO,
  calcularSubtotal,
  gerarCodigoPedido,
  TAMANHO_CODIGO,
  validarPedido,
  type ItemCardapioMinimo,
  type ItemPedidoEntrada,
} from '../lib/pedidos'

// Testes de propriedade/unidade das funções puras de pedidos de delivery
// (docs/features/delivery-pedidos.md, Tarefas 1 e 4): código público, cálculo
// de subtotal a partir do cardápio e validação da submissão.

// ---------------------------------------------------------------------------
// gerarCodigoPedido
// ---------------------------------------------------------------------------

describe('gerarCodigoPedido', () => {
  // Regex ancorado: exatamente TAMANHO_CODIGO caracteres do alfabeto sem
  // ambíguos (sem 0/O, 1/I).
  const formato = new RegExp(`^[${ALFABETO_CODIGO}]{${TAMANHO_CODIGO}}$`)

  it('gera códigos de 4 caracteres do alfabeto sem ambíguos (aleatoriedade real)', () => {
    fc.assert(
      fc.property(fc.integer(), () => {
        expect(gerarCodigoPedido()).toMatch(formato)
      }),
    )
  })

  it('alfabeto não contém caracteres ambíguos (0, O, 1, I)', () => {
    expect(ALFABETO_CODIGO).not.toMatch(/[0O1I]/)
  })

  it('respeita a fonte de aleatoriedade injetada (determinístico para teste)', () => {
    // random sempre 0 ⇒ sempre o primeiro caractere do alfabeto.
    expect(gerarCodigoPedido(() => 0)).toBe(ALFABETO_CODIGO[0].repeat(TAMANHO_CODIGO))
    // random próximo de 1 ⇒ sempre o último caractere.
    expect(gerarCodigoPedido(() => 0.999999)).toBe(
      ALFABETO_CODIGO[ALFABETO_CODIGO.length - 1].repeat(TAMANHO_CODIGO),
    )
  })
})

// ---------------------------------------------------------------------------
// calcularSubtotal
// ---------------------------------------------------------------------------

// Cardápio sintético fixo: dois itens de preço fixo, uma pizza sem preço
// próprio e dois tamanhos (que carregam o preço das pizzas).
const CARDAPIO: ItemCardapioMinimo[] = [
  { id: 1, tipoSecao: 'comum', nome: 'Suco pequeno', preco: 8 },
  { id: 2, tipoSecao: 'comum', nome: 'Rio Sol', preco: 40 },
  { id: 3, tipoSecao: 'por-tamanho', nome: 'Pizza Integral do Capão', preco: null },
  { id: 4, tipoSecao: 'tamanhos', nome: 'Pequena', preco: 30 },
  { id: 5, tipoSecao: 'tamanhos', nome: 'Grande', preco: 60 },
]

const quantidadeArb = fc.integer({ min: 1, max: 20 })

// Item de preço fixo arbitrário (Bebidas ou Vinhos do cardápio sintético).
const itemFixoArb = fc.record({
  item: fc.constantFrom<number | string>(1, 2),
  quantidade: quantidadeArb,
})

// Pizza com tamanho válido arbitrário.
const pizzaArb = fc.record({
  item: fc.constant<number | string>(3),
  quantidade: quantidadeArb,
  tamanho: fc.constantFrom<number | string>(4, 5),
})

describe('calcularSubtotal', () => {
  it('subtotal = soma de preço × quantidade para entradas válidas arbitrárias', () => {
    fc.assert(
      fc.property(
        // União dos geradores de item fixo e pizza, tipada como entrada de pedido.
        fc.array(fc.oneof(itemFixoArb, pizzaArb) as fc.Arbitrary<ItemPedidoEntrada>, {
          minLength: 1,
          maxLength: 10,
        }),
        (itens) => {
          const resultado = calcularSubtotal(itens, CARDAPIO)
          expect(resultado.ok).toBe(true)
          if (!resultado.ok) return

          const esperado = itens.reduce((acc, entrada) => {
            const doc = CARDAPIO.find((d) => String(d.id) === String(entrada.item))!
            const preco =
              doc.preco ??
              CARDAPIO.find((d) => String(d.id) === String(entrada.tamanho))!.preco!
            return acc + preco * entrada.quantidade
          }, 0)

          expect(resultado.subtotal).toBeCloseTo(esperado, 10)
          // Snapshots resolvidos para todos os itens, na ordem de entrada.
          expect(resultado.itens.length).toBe(itens.length)
        },
      ),
    )
  })

  it('pizza sem tamanho é rejeitada', () => {
    const resultado = calcularSubtotal([{ item: 3, quantidade: 1 }], CARDAPIO)
    expect(resultado).toEqual({
      ok: false,
      erros: [{ tipo: 'pizza_sem_tamanho', item: 3 }],
    })
  })

  it('tamanho que não pertence à seção Tamanhos é rejeitado', () => {
    fc.assert(
      fc.property(fc.constantFrom<number | string>(1, 2, 3), (tamanhoErrado) => {
        const resultado = calcularSubtotal([{ item: 3, quantidade: 1, tamanho: tamanhoErrado }], CARDAPIO)
        expect(resultado.ok).toBe(false)
        if (resultado.ok) return
        expect(resultado.erros).toEqual([
          { tipo: 'tamanho_invalido', item: 3, tamanho: tamanhoErrado },
        ])
      }),
    )
  })

  it('item inexistente é rejeitado', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 9999 }),
        quantidadeArb,
        (idInexistente, quantidade) => {
          const resultado = calcularSubtotal(
            [{ item: idInexistente, quantidade }],
            CARDAPIO,
          )
          expect(resultado).toEqual({
            ok: false,
            erros: [{ tipo: 'item_inexistente', item: idInexistente }],
          })
        },
      ),
    )
  })

  it('quantidade menor que 1 ou não inteira é rejeitada', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -100, max: 0 }),
          fc.double({ min: 0.1, max: 100, noNaN: true }).filter((n) => !Number.isInteger(n)),
        ),
        (quantidade) => {
          const resultado = calcularSubtotal([{ item: 1, quantidade }], CARDAPIO)
          expect(resultado).toEqual({
            ok: false,
            erros: [{ tipo: 'quantidade_invalida', item: 1, quantidade }],
          })
        },
      ),
    )
  })

  it('coleta TODOS os erros (não para no primeiro)', () => {
    const resultado = calcularSubtotal(
      [
        { item: 9999, quantidade: 1 },
        { item: 3, quantidade: 2 },
        { item: 1, quantidade: 0 },
      ],
      CARDAPIO,
    )
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.erros.map((e) => e.tipo)).toEqual([
      'item_inexistente',
      'pizza_sem_tamanho',
      'quantidade_invalida',
    ])
  })

  it('preenche snapshots de nome e preço unitário (exemplo conhecido)', () => {
    const resultado = calcularSubtotal(
      [
        { item: 3, quantidade: 2, tamanho: 5 }, // 2 × pizza Grande (60) = 120
        { item: 1, quantidade: 3 }, // 3 × suco (8) = 24
      ],
      CARDAPIO,
    )
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.subtotal).toBe(144)
    expect(resultado.itens[0]).toMatchObject({
      nomeSnapshot: 'Pizza Integral do Capão',
      precoUnitario: 60,
      tamanho: 5,
    })
    expect(resultado.itens[1]).toMatchObject({
      nomeSnapshot: 'Suco pequeno',
      precoUnitario: 8,
      tamanho: null,
    })
  })
})

// ---------------------------------------------------------------------------
// validarPedido
// ---------------------------------------------------------------------------

const VALIDO = {
  nome: 'Maria',
  telefone: '+55 75 99999-0000',
  itens: [{ item: 1, quantidade: 2 }],
  latitude: -12.6,
  longitude: -41.5,
}

describe('validarPedido', () => {
  it('aceita um pedido válido (sem erros)', () => {
    expect(validarPedido(VALIDO)).toEqual([])
    // Campos opcionais presentes não mudam o resultado.
    expect(validarPedido({ ...VALIDO, localidade: 'Povoado', observacoes: 'sem cebola' })).toEqual([])
  })

  it('rejeita nome vazio/ausente', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(undefined), fc.constant(null), fc.integer()),
        (nome) => {
          expect(validarPedido({ ...VALIDO, nome })).toContain('Nome é obrigatório.')
        },
      ),
    )
  })

  it('rejeita telefone vazio/ausente', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.constant('  '), fc.constant(undefined), fc.constant(null), fc.integer()),
        (telefone) => {
          expect(validarPedido({ ...VALIDO, telefone })).toContain(
            'Telefone (WhatsApp) é obrigatório.',
          )
        },
      ),
    )
  })

  it('rejeita pedido sem itens', () => {
    expect(validarPedido({ ...VALIDO, itens: [] })).toContain(
      'O pedido precisa de ao menos um item.',
    )
    expect(validarPedido({ ...VALIDO, itens: undefined })).toContain(
      'O pedido precisa de ao menos um item.',
    )
  })

  it('rejeita item sem id do cardápio ou com quantidade inválida', () => {
    expect(validarPedido({ ...VALIDO, itens: [{}] })).toEqual([
      'Item 1: item do cardápio é obrigatório.',
    ])
    expect(validarPedido({ ...VALIDO, itens: [{ item: 1, quantidade: 0 }] })).toEqual([
      'Item 1: quantidade deve ser um inteiro maior ou igual a 1.',
    ])
  })

  it('rejeita latitude/longitude inválidas (NaN, Infinity, não-número, ausente)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(Number.NaN),
          fc.constant(Number.POSITIVE_INFINITY),
          fc.constant(Number.NEGATIVE_INFINITY),
          fc.constant(undefined),
          fc.constant(null),
          fc.string(),
        ),
        (coordenada) => {
          expect(validarPedido({ ...VALIDO, latitude: coordenada })).toContain(
            'Latitude da entrega é obrigatória (número finito).',
          )
          expect(validarPedido({ ...VALIDO, longitude: coordenada })).toContain(
            'Longitude da entrega é obrigatória (número finito).',
          )
        },
      ),
    )
  })

  it('acumula múltiplos erros de uma vez', () => {
    const erros = validarPedido({})
    expect(erros.length).toBeGreaterThanOrEqual(4)
  })
})
