// @vitest-environment jsdom
//
// Testes do <CaixaPagamento> (docs/features/caixa-historico.md): divisão
// igual por N pessoas, ajuste manual com redistribuição do restante, forma de
// pagamento obrigatória antes do check e recálculo de pago/em débito.
//
// O fetch é mockado como um servidor mínimo que ecoa o rateio recebido (com
// ids e o status derivado), para exercitar o fluxo de gravação.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { CaixaPagamento } from '../components/CaixaPagamento'
import type { ContaCaixa, PagamentoApi } from '../lib/caixa-api'

const CONTA: ContaCaixa = {
  id: 7,
  codigo: 'MESA',
  mesa: '3',
  itens: [{ id: 'i1', item: 1, nomeSnapshot: 'Pizza Grande', quantidade: 2, precoUnitario: 50 }],
  subtotal: 100,
  servico: false,
  taxaServico: 0,
  desconto: 0,
  total: 100,
  pagamentos: [],
  status: 'pagamento',
  createdAt: '2026-09-25T20:00:00.000Z',
}

function mockServidor() {
  let seq = 0
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const corpo = JSON.parse(String(init?.body)) as { pagamentos: PagamentoApi[] }
    const pagamentos = corpo.pagamentos.map((p) => ({ ...p, id: p.id ?? `p${++seq}` }))
    const soma = pagamentos.reduce((acc, p) => acc + Math.round(p.valor * 100), 0)
    const quitada = pagamentos.every((p) => p.pago) && soma === 10000
    return new Response(
      JSON.stringify({ doc: { ...CONTA, pagamentos, status: quitada ? 'paga' : 'pagamento' } }),
      { status: 200 },
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function valores(): string[] {
  return screen
    .getAllByLabelText(/^Valor da pessoa/)
    .map((input) => (input as HTMLInputElement).value)
}

function situacao() {
  return within(screen.getByLabelText('Situação do pagamento'))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('<CaixaPagamento>', () => {
  it('começa com 1 pessoa pagando tudo e divide por 5 em partes iguais', async () => {
    mockServidor()
    render(<CaixaPagamento conta={CONTA} onAtualizada={() => {}} onNovaConta={() => {}} />)

    expect(valores()).toEqual(['100,00'])

    fireEvent.change(screen.getByLabelText('Dividir por quantas pessoas?'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dividir igualmente' }))

    await waitFor(() => expect(valores()).toEqual(['20,00', '20,00', '20,00', '20,00', '20,00']))
  })

  it('ajustar o valor de uma pessoa redistribui o restante entre as outras', async () => {
    mockServidor()
    render(<CaixaPagamento conta={CONTA} onAtualizada={() => {}} onNovaConta={() => {}} />)

    fireEvent.change(screen.getByLabelText('Dividir por quantas pessoas?'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dividir igualmente' }))
    await waitFor(() => expect(valores()).toHaveLength(5))

    const primeira = screen.getByLabelText('Valor da pessoa 1 em reais')
    fireEvent.change(primeira, { target: { value: '40' } })
    fireEvent.blur(primeira)

    await waitFor(() => expect(valores()).toEqual(['40,00', '15,00', '15,00', '15,00', '15,00']))
    expect(screen.getByText('(valor ajustado)')).toBeTruthy()
  })

  it('exige forma de pagamento antes do check e recalcula pago / em débito', async () => {
    const fetchMock = mockServidor()
    render(<CaixaPagamento conta={CONTA} onAtualizada={() => {}} onNovaConta={() => {}} />)

    fireEvent.change(screen.getByLabelText('Dividir por quantas pessoas?'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dividir igualmente' }))
    await waitFor(() => expect(valores()).toEqual(['50,00', '50,00']))
    const chamadas = fetchMock.mock.calls.length

    // Sem forma: não grava e avisa.
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento da pessoa 1' }))
    expect(screen.getByRole('alert').textContent).toMatch(/forma de pagamento da pessoa 1/)
    expect(fetchMock.mock.calls.length).toBe(chamadas)

    fireEvent.click(screen.getAllByLabelText('Pix')[0])
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Confirmar/ })[0]).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento da pessoa 1' }))

    await waitFor(() => expect(situacao().getByText('Já pago').nextSibling?.textContent).toBe('R$ 50,00'))
    expect(situacao().getByText('Em débito').nextSibling?.textContent).toBe('R$ 50,00')
    expect(screen.getByRole('button', { name: 'Pessoa 1: pago. Desmarcar pagamento' })).toBeTruthy()
  })
})
