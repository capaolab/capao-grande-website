// @vitest-environment jsdom
//
// Testes do fluxo de contas fechadas no <CaixaForm>
// (docs/features/caixa-contas-fechadas.md): fechar a conta leva à aba
// "Contas"; a conta pode ser reaberta com os itens dela ou seguir para o
// pagamento com serviço/desconto definidos pelo caixa.
//
// O fetch é mockado como um servidor mínimo da collection `caixa` (uma conta
// em memória; o total é o subtotal enquanto fechada).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { CaixaForm } from '../components/CaixaForm'
import type { SecaoPedido } from '../components/SeletorItensCardapio'
import type { ContaCaixa } from '../lib/caixa-api'

const SECOES: SecaoPedido[] = [
  {
    secao: 'Bebidas',
    tipo: 'comum',
    itens: [
      { id: 1, nome: 'Suco', detalhe: null, preco: 10 },
      { id: 2, nome: 'Cerveja', detalhe: null, preco: 8 },
    ],
  },
]
const PRECOS: Record<number, number> = { 1: 10, 2: 8 }

interface Chamada {
  metodo: string
  url: string
  corpo: Record<string, unknown> | null
}

function mockServidor() {
  const chamadas: Chamada[] = []
  let conta: ContaCaixa | null = null

  function comItens(itens: Array<{ item: number; quantidade: number }>): Partial<ContaCaixa> {
    const subtotal = itens.reduce((acc, i) => acc + PRECOS[i.item] * i.quantidade, 0)
    return {
      itens: itens.map((i) => ({ ...i, nomeSnapshot: i.item === 1 ? 'Suco' : 'Cerveja' })),
      subtotal,
      total: subtotal,
    }
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET'
      const corpo = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null
      chamadas.push({ metodo, url, corpo })
      const itens = corpo?.itens as Array<{ item: number; quantidade: number }> | undefined

      if (metodo === 'POST') {
        conta = {
          id: 9,
          codigo: 'MESA',
          mesa: (corpo?.mesa as string | null) ?? null,
          taxaServico: 0,
          desconto: 0,
          pagamentos: [],
          status: 'fechada',
          createdAt: '2026-09-26T20:00:00.000Z',
          ...comItens(itens ?? []),
        } as ContaCaixa
        return new Response(JSON.stringify({ doc: conta }))
      }
      if (metodo === 'PATCH' && conta) {
        if (corpo?.status === 'pagamento') {
          const taxa = corpo.servico ? conta.subtotal / 10 : 0
          conta = { ...conta, status: 'pagamento', servico: Boolean(corpo.servico), taxaServico: taxa, total: conta.subtotal + taxa }
        } else if (itens) {
          conta = { ...conta, ...comItens(itens) }
        }
        return new Response(JSON.stringify({ doc: conta }))
      }
      // GET: lista filtrada por status.
      const status = new URL(url, 'http://x').searchParams.get('where[status][equals]')
      const docs = conta && conta.status === status ? [conta] : []
      return new Response(JSON.stringify({ docs }))
    }),
  )
  return chamadas
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('<CaixaForm> — contas fechadas', () => {
  it('fechar leva à lista; reabrir carrega os itens e salvar mantém a conta fechada', async () => {
    const chamadas = mockServidor()
    render(<CaixaForm secoes={SECOES} />)

    fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /^Suco/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar conta' }))

    // Vai para a aba "Contas" com a conta fechada.
    expect(await screen.findByText('#MESA · Mesa 4')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Contas' }).getAttribute('aria-selected')).toBe('true')
    const criacao = chamadas.find((c) => c.metodo === 'POST')!
    expect(criacao.corpo).toEqual({ mesa: '4', itens: [{ item: 1, quantidade: 1 }], observacoes: null })

    // Reabrir: volta ao lançamento com o item da conta selecionado.
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }))
    expect(screen.getByText('Editando a conta #MESA · Mesa 4')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Suco/ }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /^Cerveja/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar conta' }))

    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'PATCH')).toBe(true))
    const edicao = chamadas.find((c) => c.metodo === 'PATCH')!
    expect(edicao.url).toContain('/api/caixa/9')
    expect(edicao.corpo?.itens).toEqual([
      { item: 1, quantidade: 1 },
      { item: 2, quantidade: 1 },
    ])
    expect(await screen.findByText('R$ 18,00')).toBeTruthy()
  })

  it('seguir para pagamento envia serviço/desconto do caixa e abre o rateio', async () => {
    const chamadas = mockServidor()
    render(<CaixaForm secoes={SECOES} />)

    fireEvent.click(screen.getByRole('button', { name: /^Suco/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar conta' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Seguir para pagamento' }))

    fireEvent.click(screen.getByLabelText('Taxa de serviço (10%)'))
    expect(screen.getByText('R$ 11,00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e ir para o pagamento' }))

    expect(await screen.findByText('Em pagamento')).toBeTruthy()
    expect(screen.getByText(/Conta #MESA/)).toBeTruthy()
    const transicao = chamadas.find((c) => c.metodo === 'PATCH')!
    expect(transicao.corpo).toEqual({ status: 'pagamento', servico: true, desconto: 0 })
  })
})
