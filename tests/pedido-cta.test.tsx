// @vitest-environment jsdom
//
// Testes do <PedidoCta>: a home leva direto ao formulário `/pedido`, com
// link secundário para `/delivery`, e a seção é rotulada pelo seu <h2>.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <img src={props.src as string} alt={props.alt as string} />
  ),
}))

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

import { PedidoCta } from '../components/PedidoCta'

afterEach(() => {
  cleanup()
})

describe('<PedidoCta>', () => {
  it('aponta a ação principal para o formulário /pedido', () => {
    render(<PedidoCta />)
    const principal = screen.getByRole('link', { name: 'Fazer meu pedido' })
    expect(principal.getAttribute('href')).toBe('/pedido')
    const secundario = screen.getByRole('link', { name: 'Como funciona o delivery' })
    expect(secundario.getAttribute('href')).toBe('/delivery')
  })

  it('é uma seção rotulada pelo próprio <h2>', () => {
    render(<PedidoCta />)
    expect(
      screen.getByRole('region', { name: 'Peça sua pizza online' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Peça sua pizza online',
    )
  })
})
