// @vitest-environment jsdom
//
// Testes do <AreaInternaGuard>: sem sessão redireciona para o login,
// preservando a rota de retorno (`?next=`) quando a página pede — é o que
// torna o login obrigatório em /pedido (RN12) e devolve o usuário ao pedido.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}))

import { AreaInternaGuard } from '../components/AreaInternaGuard'

function mockUsuario(user: { role: string } | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ user }), { status: 200 })),
  )
}

afterEach(() => {
  cleanup()
  replace.mockReset()
  vi.unstubAllGlobals()
})

describe('<AreaInternaGuard>', () => {
  it('sem sessão manda para /login?next=<retorno> e não mostra o conteúdo', async () => {
    mockUsuario(null)
    render(
      <AreaInternaGuard area="qualquer" retorno="/pedido">
        <p>formulário</p>
      </AreaInternaGuard>,
    )
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fpedido'))
    expect(screen.queryByText('formulário')).toBeNull()
  })

  it('sem `retorno` manda para /login puro', async () => {
    mockUsuario(null)
    render(
      <AreaInternaGuard area="cliente">
        <p>conteúdo</p>
      </AreaInternaGuard>,
    )
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'))
  })

  it('com sessão (qualquer papel) libera o conteúdo em area="qualquer"', async () => {
    mockUsuario({ role: 'funcionario' })
    render(
      <AreaInternaGuard area="qualquer" retorno="/pedido">
        <p>formulário</p>
      </AreaInternaGuard>,
    )
    expect(await screen.findByText('formulário')).toBeTruthy()
    expect(replace).not.toHaveBeenCalled()
  })
})
