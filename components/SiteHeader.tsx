'use client'

// <SiteHeader> — cabeçalho fixo do site público (task 10.4, Req 18.4, 20.2, 20.3).
//
// Client Component: usa `usePathname()` (next/navigation) para destacar o item
// de navegação ativo. É a única razão de ser cliente; não tem outro estado.
//
// Design (Req 18.4): cabeçalho `sticky top-0` com fundo translúcido +
// `backdrop-blur` e borda inferior de 1px var(--color-borda). Sem sombra
// (mandato global em app/globals.css). Logo em aquarela com altura >= 88px.
// Item ativo em #55453a (var(--color-marrom)); hover em #86a544
// (var(--color-verde)); foco visível já é verde via `:focus-visible` global
// (Req 20.3).
//
// Acessibilidade: landmark <nav> com `aria-label`, links com nomes acessíveis
// e `aria-current="page"` no item ativo (Req 20.2, 20.3).

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactElement } from 'react'

import { Watercolor } from '@/components/Watercolor'

/** Itens de navegação do site (design: nav em uma linha, quebra em telas estreitas). */
const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/', label: 'Início' },
  { href: '/informes', label: 'Informes' },
  { href: '/pizzaria', label: 'Pizzaria' },
  { href: '/cardapio', label: 'Cardápio' },
  { href: '/delivery', label: 'Delivery' },
  { href: '/processo', label: 'Processo' },
  { href: '/sobre', label: 'Sobre' },
]

/**
 * Um link só é "ativo" quando corresponde à rota atual. A raiz `/` casa apenas
 * de forma exata; as demais casam pela própria rota e por sub-rotas (ex.:
 * `/informes/[slug]` mantém "Informes" ativo).
 */
function isAtivo(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader(): ReactElement {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-borda bg-papel/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-conteudo flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
        {/* Logo como link para a home. Altura >= 88px (Req 18.4). É o nome do
            site, então recebe um alt significativo. */}
        <Link href="/" aria-label="Capão Grande — página inicial" className="shrink-0">
          <Watercolor
            name="logo"
            width={200}
            height={88}
            alt="Capão Grande"
            priority
            className="h-[88px] w-auto"
          />
        </Link>

        <nav aria-label="Navegação principal">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[0.95rem]">
            {NAV_ITEMS.map((item) => {
              const ativo = isAtivo(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? 'page' : undefined}
                    className={
                      ativo
                        ? 'text-marrom font-medium'
                        : 'text-paragrafo hover-verde transition-colors'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default SiteHeader
