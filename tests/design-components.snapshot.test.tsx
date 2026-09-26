// @vitest-environment jsdom
//
// Testes de snapshot dos componentes do sistema de design (task 10.6).
// Feature: payload-cms-integration
// Validates: Requirements 18.2, 18.3
//
// Objetivo: fixar (via snapshot do markup renderizado) a paleta, os raios, as
// bordas e a AUSÊNCIA de sombra dos componentes reutilizáveis <Placeholder>,
// <NavCard>, <MenuSection> e <Timeline>.
//
// Como as classes utilitárias do Tailwind aparecem como nomes de classe no DOM
// (não como CSS resolvido), snapshotar o `innerHTML` documenta os tokens
// pretendidos: `borda-sistema`, `rounded-[var(--radius)]`, `text-placeholder`,
// cores `var(--color-*)` da paleta fechada (Req 18.2) e a ausência de qualquer
// classe `shadow-*` (Req 18.3). Qualquer mudança acidental num token ou a
// introdução de uma sombra aparece no diff do snapshot.
//
// Além do snapshot, há asserções explícitas de token/no-shadow para tornar o
// contrato do Req 18.3 legível e independente do arquivo de snapshot.
//
// Ambiente: o ambiente global do vitest é `node` (exigido pelos testes de
// integração do Payload). Este arquivo opta por `jsdom` APENAS via o docblock
// acima, preservando o `node` dos demais testes. `next/image` (usado
// transitivamente por <NavCard>/<Watercolor> e <Timeline>/<CmsImage>) é mockado
// por um <img> simples, seguindo o padrão de tests/cms-image.property.test.tsx.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

// Mock de `next/image`: renderiza um <img> nativo repassando `src`/`alt`.
// Mesmo padrão de tests/cms-image.property.test.tsx.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props
    return <img src={src as string} alt={alt as string} {...filterDomProps(rest)} />
  },
}))

// Remove props não-DOM aceitas pelo next/image mas ignoradas pelo <img> nativo
// (evita warnings do React; não afeta as classes/atributos sob snapshot).
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

import { Placeholder } from '../components/Placeholder'
import { NavCard } from '../components/NavCard'
import { MenuSection } from '../components/MenuSection'
import { Timeline } from '../components/Timeline'
import type { Cardapio, Cronologia, SecoesCardapio } from '../src/payload-types'

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Fixtures determinísticas (SEM aleatoriedade nem datas de runtime) para manter
// os snapshots estáveis entre execuções.
// ---------------------------------------------------------------------------

function secao(id: number, nome: string, tipo: SecoesCardapio['tipo']): SecoesCardapio {
  return { id, nome, tipo, ordem: id, updatedAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' }
}
const BEBIDAS = secao(3, 'Bebidas', 'comum')
const PIZZAS = secao(1, 'Pizzas', 'por-tamanho')

const ITENS_CARDAPIO: Cardapio[] = [
  {
    id: 1,
    secao: BEBIDAS,
    nome: 'Suco de laranja',
    // Detalhe preservado palavra por palavra (Req 14.4): "jarra 1,5 l".
    detalhe: 'jarra 1,5 l',
    // Preço numérico (Tarefa 6 de delivery-pedidos.md): formatado na
    // renderização como "R$ 20,00".
    preco: 20,
    ordem: 1,
    ativo: true,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    secao: BEBIDAS,
    nome: 'Refrigerante',
    detalhe: null,
    preco: 8,
    ordem: 2,
    ativo: true,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

// Pizza sem preço próprio (preco: null): a seção Pizzas exibe "ver tamanhos"
// (preço depende do tamanho), preservando o cardápio impresso (Tarefa 6).
const ITENS_PIZZAS: Cardapio[] = [
  {
    id: 3,
    secao: PIZZAS,
    nome: 'Pizza Integral do Capão',
    detalhe: 'molho da casa',
    preco: null,
    ordem: 1,
    ativo: true,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

const MARCOS_CRONOLOGIA: Cronologia[] = [
  {
    id: 1,
    ano: '1992',
    titulo: 'Fundação',
    texto: 'O começo de tudo no Capão Grande.',
    ilustracao: null,
    ordem: 1,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    // "a confirmar" exercita o caminho do <Placeholder> no ano (Req 17.3, 19.1).
    ano: 'a confirmar',
    titulo: 'Próximo capítulo',
    texto: 'Um marco ainda por vir.',
    ilustracao: null,
    ordem: 2,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Snapshots — fixam markup (classes/tokens/bordas/raios) de cada componente.
// ---------------------------------------------------------------------------

describe('Snapshots do sistema de design (Req 18.2, 18.3)', () => {
  it('<Placeholder> fixa o token de cor placeholder e ausência de sombra', () => {
    const { container } = render(<Placeholder label="a confirmar" />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('<NavCard> fixa borda 1px, raio e ausência de sombra', () => {
    const { container } = render(
      <NavCard
        href="/processo"
        title="O processo"
        description="Da massa ao forno, passo a passo."
        watercolor="palmeira"
      />,
    )
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('<MenuSection> fixa filete oliva, divisores e preço formatado', () => {
    const { container } = render(
      <MenuSection secao="Bebidas" tipo="comum" itens={ITENS_CARDAPIO} />,
    )
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('<MenuSection> exibe "ver tamanhos" para pizza sem preço próprio', () => {
    const { container } = render(<MenuSection secao="Pizzas" tipo="por-tamanho" itens={ITENS_PIZZAS} />)
    // Tarefa 6 de delivery-pedidos.md: preco null na seção Pizzas exibe o
    // texto do cardápio impresso, não o placeholder.
    expect(container.textContent).toContain('ver tamanhos')
    expect(container.querySelector('[data-placeholder]')).toBeNull()
  })

  it('<Timeline> fixa divisores, ano em destaque e placeholder do ano', () => {
    const { container } = render(<Timeline marcos={MARCOS_CRONOLOGIA} />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})

// ---------------------------------------------------------------------------
// Asserções explícitas de token / no-shadow (Req 18.2, 18.3).
// Tornam o contrato legível sem depender apenas do arquivo de snapshot.
// ---------------------------------------------------------------------------

/** Retorna true se ALGUM elemento do container tiver uma classe `shadow-*`. */
function hasAnyShadowClass(container: HTMLElement): boolean {
  const all = container.querySelectorAll('*')
  for (const el of Array.from(all)) {
    // Classe utilitária de sombra do Tailwind: `shadow`, `shadow-md`, etc.
    if (/(^|\s)shadow(-|\s|$)/.test(el.className)) return true
  }
  return false
}

describe('Contrato de tokens: paleta, raios, bordas e ausência de sombra (Req 18.2, 18.3)', () => {
  it('<Placeholder> usa `text-placeholder` (#a89c8a) e nenhuma sombra', () => {
    const { container } = render(<Placeholder label="a confirmar" />)
    const el = container.querySelector('[data-placeholder]')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('text-placeholder')
    // Req 18.3: nenhuma sombra em nenhum elemento.
    expect(hasAnyShadowClass(container)).toBe(false)
  })

  it('<NavCard> usa `borda-sistema` (1px #e4dfd2), raio do sistema e nenhuma sombra', () => {
    const { container } = render(
      <NavCard href="/processo" title="O processo" description="..." />,
    )
    const card = container.firstElementChild as HTMLElement | null
    expect(card).not.toBeNull()
    // Req 18.3: borda 1px do sistema (#e4dfd2) e raio de canto.
    expect(card?.className).toContain('borda-sistema')
    expect(card?.className).toContain('rounded-[var(--radius)]')
    // Req 18.2: fundo da paleta (papel).
    expect(card?.className).toContain('var(--color-papel)')
    // Req 18.3: nenhuma sombra.
    expect(hasAnyShadowClass(container)).toBe(false)
  })

  it('<MenuSection> usa o filete oliva/divisores da paleta e nenhuma sombra', () => {
    const { container } = render(
      <MenuSection secao="Bebidas" tipo="comum" itens={ITENS_CARDAPIO} />,
    )
    // Req 18.2: filete oliva no título e divisores na borda clara da paleta.
    const heading = container.querySelector('h2')
    expect(heading?.className).toContain('var(--color-oliva)')
    expect(container.innerHTML).toContain('var(--color-borda-clara)')
    // Req 14.4: detalhe preservado palavra por palavra; preço numérico
    // formatado como moeda pt-BR (Tarefa 6 de delivery-pedidos.md).
    expect(container.textContent).toContain('jarra 1,5 l')
    expect(container.textContent).toContain('R$ 8,00')
    // Req 18.3: nenhuma sombra.
    expect(hasAnyShadowClass(container)).toBe(false)
  })

  it('<Timeline> usa divisores da paleta, placeholder no ano pendente e nenhuma sombra', () => {
    const { container } = render(<Timeline marcos={MARCOS_CRONOLOGIA} />)
    // Req 18.2: divisores 1px na borda clara da paleta.
    expect(container.innerHTML).toContain('var(--color-borda-clara)')
    // Ano legítimo "1992" é exibido como texto.
    expect(container.textContent).toContain('1992')
    // Req 17.3/19.1: ano "a confirmar" vira <Placeholder> cinza.
    const placeholder = container.querySelector('[data-placeholder]')
    expect(placeholder).not.toBeNull()
    expect(placeholder?.className).toContain('text-placeholder')
    // Req 18.3: nenhuma sombra.
    expect(hasAnyShadowClass(container)).toBe(false)
  })
})
