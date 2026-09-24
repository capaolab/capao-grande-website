// @vitest-environment jsdom
//
// Testes do <SiteHeader>: comportamento do menu hamburger mobile e do estado
// ativo da navegação (Req 20.2, 20.4 — nomes acessíveis e aria-expanded).
//
// Mesmo padrão de mocks de tests/acessibilidade.test.tsx: `next/image` vira
// um <img> nativo, `next/link` um <a href> pass-through e
// `next/navigation.usePathname` retorna uma rota fixa ('/').
//
// jsdom não computa o CSS do Tailwind (as classes `hidden`/`md:hidden` não
// escondem nada aqui), então as asserções são sobre ESTRUTURA e ARIA — não
// sobre visibilidade visual, que é verificada manualmente no navegador.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props
    return <img src={src as string} alt={alt as string} {...filterDomProps(rest)} />
  },
}))

vi.mock('next/link', () => ({
  default: (props: Record<string, unknown>) => {
    const { href, children, ...rest } = props
    return (
      <a href={typeof href === 'string' ? href : String(href)} {...filterDomProps(rest)}>
        {children as ReactNode}
      </a>
    )
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

function filterDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const {
    fill: _fill,
    priority: _priority,
    loader: _loader,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blur,
    unoptimized: _unoptimized,
    sizes: _sizes,
    ...rest
  } = props
  return rest
}

import { SiteHeader } from '../components/SiteHeader'

afterEach(() => {
  cleanup()
})

describe('<SiteHeader> — menu hamburger mobile', () => {
  it('renderiza o logo com dimensões intrínsecas reais e altura limitada', () => {
    const { getByRole } = render(<SiteHeader />)

    const logo = getByRole('img', { name: 'Capão Grande' })
    // Dimensões intrínsecas reais do PNG (711×485) — proporção correta.
    expect(logo.getAttribute('width')).toBe('711')
    expect(logo.getAttribute('height')).toBe('485')
    // Altura limitada por breakpoint (mobile 56px, desktop 88px) com w-auto.
    expect(logo.className).toContain('h-14')
    expect(logo.className).toContain('w-auto')
    expect(logo.className).toContain('md:h-[88px]')
    // Sem `h-auto` residual que conflitaria com a altura fixa.
    expect(logo.className).not.toContain('h-auto')
  })

  it('o botão hamburger tem nome acessível e inicia fechado (aria-expanded="false")', () => {
    const { getByRole, queryByRole } = render(<SiteHeader />)

    const botao = getByRole('button', { name: 'Abrir menu' })
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(botao.getAttribute('aria-controls')).toBe('menu-mobile')

    // Fechado: só a nav desktop (em linha) existe no DOM.
    expect(queryByRole('link', { name: 'Processo' })).toBeTruthy()
    expect(document.getElementById('menu-mobile')).toBeNull()
  })

  it('abre ao clicar: aria-expanded="true", painel com links e item ativo com aria-current', () => {
    const { getByRole } = render(<SiteHeader />)

    fireEvent.click(getByRole('button', { name: 'Abrir menu' }))

    const botao = getByRole('button', { name: 'Fechar menu' })
    expect(botao.getAttribute('aria-expanded')).toBe('true')

    const painel = document.getElementById('menu-mobile')
    expect(painel).not.toBeNull()

    // A rota atual ('/') marca "Início" como ativo no painel mobile.
    const links = Array.from(painel!.querySelectorAll('a'))
    expect(links.map((a) => a.textContent)).toContain('Processo')
    const inicio = links.find((a) => a.textContent === 'Início')
    expect(inicio?.getAttribute('aria-current')).toBe('page')

    // No mobile o "Entrar" fica dentro do painel hamburger.
    const entrar = links.find((a) => a.textContent === 'Entrar')
    expect(entrar?.getAttribute('href')).toBe('/login')
  })

  it('fecha ao clicar novamente no botão', () => {
    const { getByRole } = render(<SiteHeader />)

    fireEvent.click(getByRole('button', { name: 'Abrir menu' }))
    fireEvent.click(getByRole('button', { name: 'Fechar menu' }))

    expect(getByRole('button', { name: 'Abrir menu' }).getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('menu-mobile')).toBeNull()
  })

  it('fecha ao pressionar Escape', () => {
    const { getByRole } = render(<SiteHeader />)

    fireEvent.click(getByRole('button', { name: 'Abrir menu' }))
    expect(document.getElementById('menu-mobile')).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(getByRole('button', { name: 'Abrir menu' }).getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('menu-mobile')).toBeNull()
  })

  it('fecha ao clicar em um link do painel', () => {
    const { getByRole } = render(<SiteHeader />)

    fireEvent.click(getByRole('button', { name: 'Abrir menu' }))

    const painel = document.getElementById('menu-mobile')
    const linkProcesso = Array.from(painel!.querySelectorAll('a')).find(
      (a) => a.textContent === 'Processo',
    )
    fireEvent.click(linkProcesso!)

    expect(document.getElementById('menu-mobile')).toBeNull()
  })
})
