import { describe, expect, it } from 'vitest'

import {
  ehStatusPedido,
  exigeFrete,
  OPCOES_STATUS_PEDIDO,
  proximoStatus,
  rotuloStatus,
  rotuloStatusCliente,
  ROTULO_STATUS,
  ROTULO_STATUS_CLIENTE,
  STATUS_PEDIDO,
  totalPedido,
} from '../lib/status-pedido'

// Testes do vocabulário de status dos dashboards
// (docs/features/dashboard-pedidos.md): rótulos amigáveis ao cliente (RN-D02)
// e transições do funil manual do funcionário.

describe('STATUS_PEDIDO', () => {
  it('tem exatamente os 5 status do funil, na ordem', () => {
    expect(STATUS_PEDIDO).toEqual(['pendente', 'validado', 'pago', 'em_transito', 'finalizado'])
  })

  it('todo status tem rótulo operacional e rótulo de cliente', () => {
    for (const status of STATUS_PEDIDO) {
      expect(ROTULO_STATUS[status]).toBeTruthy()
      expect(ROTULO_STATUS_CLIENTE[status]).toBeTruthy()
    }
  })
})

describe('ehStatusPedido', () => {
  it('reconhece os status canônicos', () => {
    for (const status of STATUS_PEDIDO) {
      expect(ehStatusPedido(status)).toBe(true)
    }
  })

  it('rejeita valores desconhecidos ou não-string', () => {
    expect(ehStatusPedido('entregue')).toBe(false)
    expect(ehStatusPedido(null)).toBe(false)
    expect(ehStatusPedido(42)).toBe(false)
  })
})

describe('rotuloStatusCliente', () => {
  it('mapeia os status para rótulos amigáveis (RN-D02)', () => {
    expect(rotuloStatusCliente('pendente')).toBe('Recebido')
    expect(rotuloStatusCliente('validado')).toBe('Pedido confirmado')
    expect(rotuloStatusCliente('pago')).toBe('Pagamento confirmado')
    expect(rotuloStatusCliente('em_transito')).toBe('Saiu para entrega')
    expect(rotuloStatusCliente('finalizado')).toBe('Entregue')
  })

  it('status desconhecido cai no próprio valor (nunca quebra a renderização)', () => {
    expect(rotuloStatusCliente('em_separacao')).toBe('em_separacao')
  })
})

describe('proximoStatus', () => {
  it('segue o funil linear pendente → validado → pago → em_transito → finalizado', () => {
    expect(proximoStatus('pendente')?.status).toBe('validado')
    expect(proximoStatus('validado')?.status).toBe('pago')
    expect(proximoStatus('pago')?.status).toBe('em_transito')
    expect(proximoStatus('em_transito')?.status).toBe('finalizado')
  })

  it('cada transição tem rótulo de ação para o botão do funcionário', () => {
    expect(proximoStatus('pendente')?.rotuloAcao).toBe('Validar pedido')
    expect(proximoStatus('validado')?.rotuloAcao).toBe('Marcar como pago')
    expect(proximoStatus('pago')?.rotuloAcao).toBe('Saiu para entrega')
    expect(proximoStatus('em_transito')?.rotuloAcao).toBe('Finalizar pedido')
  })

  it('pedido finalizado não tem próximo status', () => {
    expect(proximoStatus('finalizado')).toBeNull()
  })
})

describe('retirada (pimenta em mel)', () => {
  it('mesmos valores de status, com rótulos de retirada', () => {
    expect(proximoStatus('pago', 'retirada')).toEqual({
      status: 'em_transito',
      rotuloAcao: 'Pronto para retirada',
    })
    expect(rotuloStatus('em_transito', 'retirada')).toBe('Pronto para retirada')
    expect(rotuloStatus('em_transito')).toBe('Em trânsito')
    expect(rotuloStatusCliente('em_transito', 'retirada')).toBe('Pronto para retirada')
    expect(rotuloStatusCliente('finalizado', 'retirada')).toBe('Retirado')
    expect(rotuloStatusCliente('pago', 'retirada')).toBe('Pagamento confirmado')
  })

  it('as opções do select espelham STATUS_PEDIDO', () => {
    expect(OPCOES_STATUS_PEDIDO.map((o) => o.value)).toEqual([...STATUS_PEDIDO])
  })
})

describe('frete (pedidos-painel.md)', () => {
  it('entrega exige frete; retirada não', () => {
    expect(exigeFrete()).toBe(true)
    expect(exigeFrete('entrega')).toBe(true)
    expect(exigeFrete('retirada')).toBe(false)
  })

  it('total soma produtos e frete sem ruído de ponto flutuante', () => {
    expect(totalPedido(0.1, 0.2)).toBe(0.3)
    expect(totalPedido(89.9, 12)).toBe(101.9)
    expect(totalPedido(50, 0)).toBe(50)
  })
})
