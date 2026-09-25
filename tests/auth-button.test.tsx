// @vitest-environment jsdom
//
// Testes do <AuthButton>: alterna entre "Entrar" (deslogado) e "Painel" +
// "Sair" (logado) conforme `/api/users/me`, e volta para "Entrar" após o
// logout — o SiteHeader continua montado ao navegar para a home, então o
// estado precisa ser resetado no próprio componente.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('next/link', () => ({
  default: (props: Record<string, unknown>) => {
    const { href, children, ...rest } = props
    return (
      <a href={String(href)} {...rest}>
        {children as ReactNode}
      </a>
    )
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

import { AuthButton } from '../components/AuthButton'

function mockFetch(logado: boolean) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/users/me') {
      return new Response(
        JSON.stringify({ user: logado ? { id: 1, role: 'cliente' } : null }),
        { status: 200 },
      )
    }
    return new Response('{}', { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('<AuthButton>', () => {
  it('mostra "Entrar" sem sessão', async () => {
    mockFetch(false)
    render(<AuthButton />)
    const entrar = await screen.findByRole('link', { name: 'Entrar' })
    expect(entrar.getAttribute('href')).toBe('/login')
  })

  it('mostra "Sair" com sessão e volta para "Entrar" após o logout', async () => {
    const fetchMock = mockFetch(true)
    render(<AuthButton />)

    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Sair|Saindo/ })).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/logout',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
