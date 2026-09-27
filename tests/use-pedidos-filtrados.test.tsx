// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePedidosFiltrados } from '../components/use-pedidos-filtrados'

// Atualização automática da lista de pedidos (dashboard-pedidos.md): busca
// silenciosa por intervalo com a aba visível, ao voltar o foco e sob demanda
// (recarregar), sem voltar a "carregando" e mantendo a lista se falhar.

function resposta(ids: number[]) {
  return {
    ok: true,
    json: async () => ({
      docs: ids.map((id) => ({ id, codigo: `C${id}`, status: 'pendente', itens: [] })),
      totalDocs: ids.length,
      totalPages: 1,
      page: 1,
    }),
  }
}

let visibilidade: DocumentVisibilityState = 'visible'
const fetchMock = vi.fn()

beforeEach(() => {
  visibilidade = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilidade)
  fetchMock.mockReset().mockResolvedValue(resposta([1]))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const ids = (estado: ReturnType<typeof usePedidosFiltrados>['estado']) =>
  estado.tipo === 'pronto' ? estado.pedidos.map((p) => p.id) : estado.tipo

describe('usePedidosFiltrados — atualização automática', () => {
  it('rebusca a cada intervalo só com a aba visível, sem voltar a carregando', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => usePedidosFiltrados(undefined, 'pedidos', 15_000))
    await waitFor(() => expect(ids(result.current.estado)).toEqual([1]))
    expect(result.current.atualizadoEm).toBeInstanceOf(Date)

    fetchMock.mockResolvedValue(resposta([2, 1]))
    await act(() => vi.advanceTimersByTimeAsync(15_000))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(ids(result.current.estado)).toEqual([2, 1])

    // Aba oculta: nada de requisições.
    visibilidade = 'hidden'
    await act(() => vi.advanceTimersByTimeAsync(45_000))
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // Voltou ao foco: busca na hora.
    fetchMock.mockResolvedValue(resposta([3, 2, 1]))
    visibilidade = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(ids(result.current.estado)).toEqual([3, 2, 1]))
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('recarregar() é silencioso e mantém a lista quando a busca falha', async () => {
    const { result } = renderHook(() => usePedidosFiltrados())
    await waitFor(() => expect(ids(result.current.estado)).toEqual([1]))
    const antes = result.current.atualizadoEm

    fetchMock.mockResolvedValue({ ok: false, status: 500 })
    await act(() => result.current.recarregar())
    expect(ids(result.current.estado)).toEqual([1])
    expect(result.current.atualizadoEm).toBe(antes)

    fetchMock.mockResolvedValue(resposta([4, 1]))
    await act(() => result.current.recarregar())
    expect(ids(result.current.estado)).toEqual([4, 1])
  })

  it('sem intervalo, não há atualização periódica', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => usePedidosFiltrados())
    await waitFor(() => expect(ids(result.current.estado)).toEqual([1]))
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
