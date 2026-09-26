// @vitest-environment jsdom
//
// Testes do <PedidoPimentaCta>: a home leva direto ao formulário de pedidos
// de pimenta em mel, com link secundário para a página do produto, e a seção
// é rotulada pelo seu <h2>.

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

import { PedidoPimentaCta } from '../components/PedidoPimentaCta'

afterEach(() => {
  cleanup()
})

describe('<PedidoPimentaCta>', () => {
  it('aponta a ação principal para o formulário de pimenta em mel', () => {
    render(<PedidoPimentaCta />)
    const principal = screen.getByRole('link', { name: 'Pedir pimenta em mel' })
    expect(principal.getAttribute('href')).toBe('/pimenta-em-mel/pedido')
    const secundario = screen.getByRole('link', { name: 'Conheça a pimenta em mel' })
    expect(secundario.getAttribute('href')).toBe('/pimenta-em-mel')
  })

  it('é uma seção rotulada pelo próprio <h2>', () => {
    render(<PedidoPimentaCta />)
    expect(screen.getByRole('region', { name: 'Peça sua pimenta em mel' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Peça sua pimenta em mel',
    )
  })
})
