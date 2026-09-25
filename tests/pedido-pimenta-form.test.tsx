// @vitest-environment jsdom
//
// Testes do <PedidoPimentaForm> (docs/features/pimenta-em-mel.md): preço de
// lote ao vivo, pré-preenchimento com os dados e a localização da conta,
// entrega × retirada no corpo enviado, validação local e sessão expirada.
//
// O <PedidoMapa> (Leaflet) é substituído por um stub que repassa o
// `pontoInicial` ao formulário — como o mapa real faz ao posicionar o pin — e
// oferece um botão para marcar um ponto manualmente.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'

import type { PontoEntrega } from '../components/PedidoMapa'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('../components/PedidoMapa', () => ({
  PedidoMapa: ({
    onMudancaPonto,
    pontoInicial,
  }: {
    onMudancaPonto: (p: PontoEntrega | null) => void
    pontoInicial?: PontoEntrega | null
  }) => {
    useEffect(() => {
      if (pontoInicial) onMudancaPonto(pontoInicial)
    }, [pontoInicial, onMudancaPonto])
    return (
      <button type="button" onClick={() => onMudancaPonto({ latitude: -12.61, longitude: -41.49 })}>
        Marcar ponto (stub)
      </button>
    )
  },
}))

import { PedidoPimentaForm, type ProdutoPimentaForm } from '../components/PedidoPimentaForm'

const PRODUTOS: ProdutoPimentaForm[] = [
  {
    id: 1,
    nome: 'Pimenta em mel',
    volume: '150 ml',
    descricao: null,
    preco: 25,
    precoLote: 20,
    loteMinimo: 12,
  },
  { id: 2, nome: 'Pote', volume: null, descricao: null, preco: 40, precoLote: null, loteMinimo: null },
]

interface Usuario {
  id: number
  nome?: string
  sobrenome?: string
  telefone?: string
  latitude?: number | null
  longitude?: number | null
  localidade?: string | null
}

function mockApi(usuario: Usuario, resposta: { status: number; corpo: unknown }) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/users/me') {
      return new Response(JSON.stringify({ user: usuario }), { status: 200 })
    }
    return new Response(JSON.stringify(resposta.corpo), { status: resposta.status })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function corpoEnviado(fetchMock: ReturnType<typeof mockApi>): Record<string, unknown> {
  const chamada = fetchMock.mock.calls.find(([url]) => url === '/api/submeter-pedido-pimenta')
  expect(chamada).toBeDefined()
  return JSON.parse(String((chamada as unknown as [string, RequestInit])[1].body))
}

const USUARIO: Usuario = {
  id: 5,
  nome: 'Ana',
  sobrenome: 'Souza',
  telefone: '75999990000',
  latitude: -12.62,
  longitude: -41.51,
  localidade: 'Perto da ponte',
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('<PedidoPimentaForm>', () => {
  it('aplica o preço de lote ao atingir a quantidade mínima', async () => {
    mockApi(USUARIO, { status: 201, corpo: {} })
    render(<PedidoPimentaForm produtos={PRODUTOS} whatsappDigitos={null} />)

    const quantidade = screen.getByLabelText('Pimenta em mel (150 ml)')
    fireEvent.change(quantidade, { target: { value: '11' } })
    expect(screen.getByText('R$ 275,00')).toBeTruthy()

    fireEvent.change(quantidade, { target: { value: '12' } })
    expect(screen.getByText(/preço de lote aplicado/)).toBeTruthy()
    expect(screen.getByText('R$ 240,00')).toBeTruthy()
  })

  it('entrega: pré-preenche dados e localização da conta e envia as coordenadas', async () => {
    const fetchMock = mockApi(USUARIO, { status: 201, corpo: { codigo: 'K7PX', subtotal: 240 } })
    render(<PedidoPimentaForm produtos={PRODUTOS} whatsappDigitos="5575999990000" />)

    await waitFor(() =>
      expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe(
        'Ana Souza',
      ),
    )
    expect(
      (screen.getByLabelText('Localidade ou ponto de referência') as HTMLInputElement).value,
    ).toBe('Perto da ponte')

    fireEvent.change(screen.getByLabelText('Pimenta em mel (150 ml)'), {
      target: { value: '12' },
    })
    fireEvent.change(screen.getByLabelText('Estabelecimento'), {
      target: { value: 'Bistrô do Vale' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    await screen.findByText('#K7PX')
    expect(corpoEnviado(fetchMock)).toMatchObject({
      nome: 'Ana Souza',
      telefone: '75999990000',
      estabelecimento: 'Bistrô do Vale',
      itens: [{ produto: 1, quantidade: 12 }],
      modalidade: 'entrega',
      latitude: -12.62,
      longitude: -41.51,
      localidade: 'Perto da ponte',
    })
    expect(screen.getByText('Ver meus pedidos').getAttribute('href')).toBe(
      '/area-cliente/pimenta',
    )
  })

  it('retirada: esconde o mapa e não envia coordenadas', async () => {
    const fetchMock = mockApi(
      { id: 5, nome: 'Ana', sobrenome: 'Souza', telefone: '75999990000' },
      { status: 201, corpo: { codigo: 'R2TD', subtotal: 40 } },
    )
    render(<PedidoPimentaForm produtos={PRODUTOS} whatsappDigitos={null} />)

    fireEvent.click(screen.getByRole('radio', { name: /Retirada na pizzaria/ }))
    expect(screen.queryByText('Marcar ponto (stub)')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de Pote' }))
    await waitFor(() =>
      expect((screen.getByLabelText('Telefone (WhatsApp) (obrigatório)') as HTMLInputElement).value).toBe(
        '75999990000',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    await screen.findByText('#R2TD')
    const corpo = corpoEnviado(fetchMock)
    expect(corpo).toMatchObject({ modalidade: 'retirada', itens: [{ produto: 2, quantidade: 1 }] })
    expect(corpo).not.toHaveProperty('latitude')
  })

  it('valida localmente: sem produtos e sem ponto de entrega não envia', async () => {
    const fetchMock = mockApi(
      { id: 5, nome: 'Ana', sobrenome: 'Souza', telefone: '75999990000' },
      { status: 201, corpo: {} },
    )
    render(<PedidoPimentaForm produtos={PRODUTOS} whatsappDigitos={null} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/users/me', expect.anything()))

    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    expect(await screen.findByText('Informe a quantidade de ao menos um produto.')).toBeTruthy()
    expect(screen.getByText(/Marque o ponto de entrega no mapa/)).toBeTruthy()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/submeter-pedido-pimenta')).toBe(false)
  })

  it('sessão expirada (401) mantém o formulário e oferece novo login', async () => {
    mockApi(USUARIO, { status: 401, corpo: { erros: ['Entre na sua conta para enviar o pedido.'] } })
    render(<PedidoPimentaForm produtos={PRODUTOS} whatsappDigitos={null} />)
    await waitFor(() =>
      expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe(
        'Ana Souza',
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de Pote' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    const link = await screen.findByText('Entrar novamente (abre em nova aba)')
    expect(link.getAttribute('href')).toBe('/login?next=%2Fpimenta-em-mel%2Fpedido')
    expect(screen.getByLabelText('Pimenta em mel (150 ml)')).toBeTruthy()
  })
})
