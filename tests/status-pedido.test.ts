import { describe, expect, it } from 'vitest'

import {
  ehStatusPedido,
  OPCOES_STATUS_PEDIDO,
  proximoStatus,
  rotuloStatus,
  rotuloStatusCliente,
  ROTULO_STATUS,
  ROTULO_STATUS_CLIENTE,
  STATUS_PEDIDO,
} from '../lib/status-pedido'

// Testes do vocabulário de status dos dashboards
// (docs/features/dashboard-pedidos.md): rótulos amigáveis ao cliente (RN-D02)
// e transições do funil manual do funcionário.

describe('STATUS_PEDIDO', () => {
  it('tem exatamente os 4 status do funil, na ordem', () => {
    expect(STATUS_PEDIDO).toEqual(['pendente', 'pago', 'em_transito', 'finalizado'])
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
    expect(rotuloStatusCliente('pago')).toBe('Pagamento confirmado')
    expect(rotuloStatusCliente('em_transito')).toBe('Saiu para entrega')
    expect(rotuloStatusCliente('finalizado')).toBe('Entregue')
  })

  it('status desconhecido cai no próprio valor (nunca quebra a renderização)', () => {
    expect(rotuloStatusCliente('em_separacao')).toBe('em_separacao')
  })
})

describe('proximoStatus', () => {
  it('segue o funil linear pendente → pago → em_transito → finalizado', () => {
    expect(proximoStatus('pendente')?.status).toBe('pago')
    expect(proximoStatus('pago')?.status).toBe('em_transito')
    expect(proximoStatus('em_transito')?.status).toBe('finalizado')
  })

  it('cada transição tem rótulo de ação para o botão do funcionário', () => {
    expect(proximoStatus('pendente')?.rotuloAcao).toBe('Marcar como pago')
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
