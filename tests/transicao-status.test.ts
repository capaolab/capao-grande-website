import { describe, expect, it } from 'vitest'

import { exigirTransicaoValida } from '../src/collections/transicao-status'

// Trava de concorrência do funil (docs/features/dashboard-pedidos.md): uma
// tela desatualizada do funcionário não pode fazer o pedido voltar no funil
// nem trocar o frete de um pedido já validado.

const conflito = /já foi atualizado por outra pessoa/

describe('exigirTransicaoValida', () => {
  it('funcionário: aceita a próxima etapa do funil', () => {
    expect(() =>
      exigirTransicaoValida({ status: 'validado', frete: 10 }, { status: 'pendente' }, 'entrega', 'funcionario'),
    ).not.toThrow()
    expect(() =>
      exigirTransicaoValida({ status: 'finalizado' }, { status: 'em_transito' }, 'retirada', 'funcionario'),
    ).not.toThrow()
  })

  it('funcionário: rejeita retroceder ou pular etapas (tela desatualizada)', () => {
    // A tela mostrava "validado", mas o pedido já estava em trânsito.
    expect(() =>
      exigirTransicaoValida({ status: 'pago' }, { status: 'em_transito' }, 'entrega', 'funcionario'),
    ).toThrow(conflito)
    expect(() =>
      exigirTransicaoValida({ status: 'pago' }, { status: 'pendente' }, 'entrega', 'funcionario'),
    ).toThrow(conflito)
    expect(() =>
      exigirTransicaoValida({ status: 'pendente' }, { status: 'finalizado' }, 'entrega', 'funcionario'),
    ).toThrow(conflito)
  })

  it('funcionário: rejeita trocar o frete de pedido já validado (validação dupla)', () => {
    expect(() =>
      exigirTransicaoValida(
        { status: 'validado', frete: 15 },
        { status: 'validado', frete: 10 },
        'entrega',
        'funcionario',
      ),
    ).toThrow(conflito)
  })

  it('funcionário: repetir o mesmo status e frete não é conflito', () => {
    expect(() =>
      exigirTransicaoValida(
        { status: 'validado', frete: 10 },
        { status: 'validado', frete: 10 },
        'entrega',
        'funcionario',
      ),
    ).not.toThrow()
    expect(() =>
      exigirTransicaoValida({ status: 'pago', frete: null }, { status: 'pago' }, 'entrega', 'funcionario'),
    ).not.toThrow()
  })

  it('admin, chamadas internas e criação ficam livres', () => {
    expect(() =>
      exigirTransicaoValida({ status: 'pendente' }, { status: 'finalizado' }, 'entrega', 'admin'),
    ).not.toThrow()
    expect(() =>
      exigirTransicaoValida({ status: 'pendente' }, { status: 'finalizado' }, 'entrega', undefined),
    ).not.toThrow()
    expect(() =>
      exigirTransicaoValida({ status: 'pendente' }, undefined, 'entrega', 'funcionario'),
    ).not.toThrow()
  })
})
