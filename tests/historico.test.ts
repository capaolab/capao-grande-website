import { describe, expect, it } from 'vitest'

import type { ContaCaixa } from '../lib/caixa-api'
import { gerarCsv, montarLinhas, resumirDia } from '../lib/historico'
import type { PedidoResumo } from '../lib/pedidos-api'

// Testes das funções puras do histórico do dia
// (docs/features/caixa-historico.md): resumo caixa + delivery, lista
// cronológica unificada e CSV.

function conta(parcial: Partial<ContaCaixa>): ContaCaixa {
  return {
    id: 1,
    codigo: 'AAAA',
    mesa: null,
    itens: [{ nomeSnapshot: 'Pizza Margherita', quantidade: 1, precoUnitario: 50 }],
    subtotal: 50,
    servico: false,
    taxaServico: 0,
    desconto: 0,
    total: 50,
    pagamentos: [],
    status: 'aberta',
    createdAt: '2026-09-25T20:00:00.000Z',
    ...parcial,
  }
}

function pedido(parcial: Partial<PedidoResumo>): PedidoResumo {
  return {
    id: 10,
    codigo: 'DDDD',
    nome: 'Maria',
    telefone: '71999999999',
    status: 'pendente',
    subtotal: 30,
    createdAt: '2026-09-25T19:00:00.000Z',
    itens: [{ nomeSnapshot: 'Refrigerante', quantidade: 2, precoUnitario: 15 }],
    ...parcial,
  }
}

const contaPaga = conta({
  id: 1,
  codigo: 'PAGA',
  mesa: '4',
  subtotal: 100,
  servico: true,
  taxaServico: 10,
  desconto: 5,
  total: 105,
  status: 'paga',
  pagamentos: [
    { id: 'a', valor: 52.5, forma: 'pix', pago: true },
    { id: 'b', valor: 52.5, forma: 'cartao', pago: true },
  ],
  createdAt: '2026-09-25T21:00:00.000Z',
})

const contaAberta = conta({
  id: 2,
  codigo: 'ABRT',
  total: 60,
  subtotal: 60,
  pagamentos: [
    { id: 'c', valor: 20, forma: 'dinheiro', pago: true },
    { id: 'd', valor: 40, forma: null, pago: false },
  ],
  createdAt: '2026-09-25T18:00:00.000Z',
})

describe('resumirDia', () => {
  it('soma caixa por forma de pagamento, débito e ajustes', () => {
    const r = resumirDia([], [contaPaga, contaAberta])
    expect(r.caixa).toMatchObject({
      contas: 2,
      pagas: 1,
      abertas: 1,
      subtotal: 16000,
      taxaServico: 1000,
      desconto: 500,
      total: 16500,
      recebido: 12500,
      emDebito: 4000,
      ticketMedio: 8250,
      pessoas: 4,
      porForma: { pix: 5250, cartao: 5250, dinheiro: 2000 },
    })
  })

  it('conta sem rateio fica inteira em débito', () => {
    const r = resumirDia([], [conta({ total: 50 })])
    expect(r.caixa.recebido).toBe(0)
    expect(r.caixa.emDebito).toBe(5000)
  })

  it('delivery entra com o subtotal e contagem por status; total geral soma os dois', () => {
    const r = resumirDia(
      [pedido({ id: 1, status: 'pago' }), pedido({ id: 2, status: 'pago', subtotal: 20 })],
      [contaPaga],
    )
    expect(r.delivery).toEqual({ pedidos: 2, subtotal: 5000, porStatus: { pago: 2 } })
    expect(r.totalGeral).toBe(10500 + 5000)
  })

  it('dia vazio: tudo zero, sem divisão por zero no ticket médio', () => {
    const r = resumirDia([], [])
    expect(r.caixa.ticketMedio).toBe(0)
    expect(r.totalGeral).toBe(0)
  })
})

describe('resumirDia — pimenta em mel', () => {
  it('pimenta entra como terceira origem no total geral', () => {
    const r = resumirDia(
      [pedido({ id: 1, subtotal: 30 })],
      [contaPaga],
      [pedido({ id: 2, subtotal: 240, status: 'em_transito', modalidade: 'retirada' })],
    )
    expect(r.pimenta).toEqual({ pedidos: 1, subtotal: 24000, porStatus: { em_transito: 1 } })
    expect(r.totalGeral).toBe(10500 + 3000 + 24000)
  })

  it('sem pedidos de pimenta, o resumo fica zerado', () => {
    expect(resumirDia([], []).pimenta).toEqual({ pedidos: 0, subtotal: 0, porStatus: {} })
  })
})

describe('montarLinhas', () => {
  it('junta caixa e delivery em ordem cronológica', () => {
    const linhas = montarLinhas([pedido({})], [contaPaga, contaAberta])
    expect(linhas.map((l) => l.codigo)).toEqual(['ABRT', 'DDDD', 'PAGA'])
    expect(linhas[1]).toMatchObject({ origem: 'delivery', referencia: 'Maria', total: 3000 })
    expect(linhas[2]).toMatchObject({
      origem: 'caixa',
      referencia: 'Mesa 4',
      statusValor: 'paga',
      pagamentos: 'Pix R$ 52,50 (pago); Cartão R$ 52,50 (pago)',
    })
  })
})

describe('montarLinhas — pimenta em mel', () => {
  it('usa estabelecimento na referência e rótulo de retirada no status', () => {
    const linhas = montarLinhas(
      [pedido({})],
      [],
      [
        pedido({
          id: 3,
          codigo: 'PIMT',
          estabelecimento: 'Bistrô do Vale',
          status: 'em_transito',
          modalidade: 'retirada',
          createdAt: '2026-09-25T20:30:00.000Z',
        }),
      ],
    )
    expect(linhas.map((l) => l.origem)).toEqual(['delivery', 'pimenta'])
    expect(linhas[1]).toMatchObject({
      referencia: 'Bistrô do Vale (Maria)',
      status: 'Pronto para retirada',
      modalidade: 'retirada',
    })
  })

  it('CSV identifica a origem "Pimenta em mel"', () => {
    const csv = gerarCsv(montarLinhas([], [], [pedido({ codigo: 'PIMT' })]), () => 'x')
    expect(csv.split('\n')[1].startsWith('Pimenta em mel;PIMT;')).toBe(true)
  })
})

describe('gerarCsv', () => {
  it('usa ; e vírgula decimal, com cabeçalho e aspas quando necessário', () => {
    const csv = gerarCsv(montarLinhas([], [contaPaga]), () => '25/09/2026 18:00')
    const [cabecalho, linha] = csv.split('\n')
    expect(cabecalho.startsWith('Origem;Código;Data/hora')).toBe(true)
    expect(linha).toContain('Caixa;PAGA;25/09/2026 18:00;Mesa 4')
    expect(linha).toContain(';105,00;105,00;0,00;Paga;')
    // "Pagamentos" contém ';' → campo entre aspas.
    expect(linha.endsWith('"Pix R$ 52,50 (pago); Cartão R$ 52,50 (pago)"')).toBe(true)
  })
})
