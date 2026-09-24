'use client'

// <SiteHeader> — cabeçalho fixo do site público (task 10.4, Req 18.4, 20.2, 20.3).
//
// Client Component: usa `usePathname()` (next/navigation) para destacar o item
// de navegação ativo e para FECHAR o menu mobile ao mudar de rota, além de
// `useState` para o estado aberto/fechado do menu hamburger.
//
// Design (Req 18.4): cabeçalho `sticky top-0` com fundo translúcido +
// `backdrop-blur` e borda inferior de 1px var(--color-borda). Sem sombra
// (mandato global em app/globals.css). Logo em aquarela com altura limitada:
// 56px no mobile e 88px (Req 18.4) a partir de `md` — as dimensões intrínsecas
// REAIS do PNG (711×485) são declaradas para que `w-auto` preserve a proporção
// e a imagem nunca renderize no tamanho intrínseco (711px), que estourava a
// barra nos dois modos.
//
// Nav responsiva: a partir de `md` os links ficam em linha, agrupados à
// direita JUNTO do botão "Entrar"; abaixo disso um botão hamburger abre/fecha
// um painel vertical dentro do header. O painel fecha ao trocar de rota, ao
// clicar num link e via tecla Escape.
//
// Mobile: hamburger à esquerda e logo alinhado à DIREITA. O "Entrar" NÃO
// aparece na barra — fica dentro do painel hamburger, ao final da lista.
//
// Acessibilidade: landmark <nav> com `aria-label`, links com nomes acessíveis
// e `aria-current="page"` no item ativo (Req 20.2, 20.3). O botão hamburger tem
// `aria-label` dinâmico, `aria-expanded` e `aria-controls`; o ícone SVG é
// decorativo (`aria-hidden`).

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactElement } from 'react'

import { Watercolor } from '@/components/Watercolor'

/** Itens de navegação do site (desktop: em linha; mobile: painel hamburger). */
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

/** Classes do link de navegação: ativo em marrom, senão parágrafo com hover verde. */
function classesDoLink(ativo: boolean): string {
  return ativo
    ? 'text-marrom font-medium'
    : 'text-paragrafo hover-verde transition-colors'
}

export function SiteHeader(): ReactElement {
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)

  // Fecha o menu mobile ao mudar de rota — padrão "ajustar estado durante a
  // renderização" (setState em effect dispararia cascading renders; aqui o
  // React re-renderiza antes de commitar, sem efeito colateral).
  const [ultimaRota, setUltimaRota] = useState(pathname)
  if (ultimaRota !== pathname) {
    setUltimaRota(pathname)
    setMenuAberto(false)
  }

  // Fecha o menu mobile com Escape enquanto estiver aberto.
  useEffect(() => {
    if (!menuAberto) return

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false)
    }

    window.addEventListener('keydown', aoPressionarTecla)
    return () => window.removeEventListener('keydown', aoPressionarTecla)
  }, [menuAberto])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-borda bg-papel/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-conteudo items-center justify-between gap-x-6 px-6 py-3">
        {/* Botão hamburger — somente mobile (< md). Ícone SVG decorativo:
            3 barras quando fechado, X quando aberto. No mobile é o primeiro
            item do fluxo, então fica à ESQUERDA (logo à direita). */}
        <button
          type="button"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="menu-mobile"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          className="text-marrom hover-verde -ml-2 p-2 transition-colors md:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-6 w-6"
          >
            {menuAberto ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        {/* Logo como link para a home. Altura limitada: 56px no mobile, 88px
            (Req 18.4) no desktop; dimensões intrínsecas reais (711×485) +
            `w-auto` preservam a proporção. É o nome do site, então recebe um
            alt significativo. No mobile fica à DIREITA (o hamburger é o
            primeiro item do fluxo e o `justify-between` separa os dois). */}
        <Link
          href="/"
          aria-label="Capão Grande — página inicial"
          className="shrink-0"
        >
          <Watercolor
            name="logo"
            width={711}
            height={485}
            alt="Capão Grande"
            priority
            className="h-14 w-auto md:h-[88px]"
          />
        </Link>

        {/* Navegação em linha — somente desktop (>= md). `ml-auto` agrupa a
            nav JUNTO do botão "Entrar" no lado direito da barra. */}
        <nav aria-label="Navegação principal" className="ml-auto hidden md:block">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[0.95rem]">
            {NAV_ITEMS.map((item) => {
              const ativo = isAtivo(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? 'page' : undefined}
                    className={classesDoLink(ativo)}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Botão "Entrar" — ação (não é item de conteúdo, então fica fora de
            NAV_ITEMS e sem aria-current). Somente desktop: botão compacto à
            direita, colado na nav; no mobile ele aparece dentro do painel
            hamburger (ver abaixo). A visibilidade fica num wrapper SEM
            `btn-primario`: essa classe é CSS não-layered com `display:
            inline-flex`, que venceria o `hidden` do Tailwind no mesmo
            elemento e manteria o botão visível no mobile. */}
        <div className="hidden md:block">
          <Link href="/login" className="btn-primario px-3 py-1.5 text-[0.95rem]">
            Entrar
          </Link>
        </div>
      </div>

      {/* Painel do menu mobile (somente quando aberto; some a partir de `md`).
          Cada link fecha o painel no clique; Escape e mudança de rota também. */}
      {menuAberto ? (
        <nav
          id="menu-mobile"
          aria-label="Navegação principal"
          className="border-t border-borda bg-papel md:hidden"
        >
          <ul className="mx-auto flex w-full max-w-conteudo flex-col gap-y-1 px-6 py-3 font-sans text-[0.95rem]">
            {NAV_ITEMS.map((item) => {
              const ativo = isAtivo(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? 'page' : undefined}
                    onClick={() => setMenuAberto(false)}
                    className={`block py-2 ${classesDoLink(ativo)}`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            {/* "Entrar" — no mobile fica dentro do painel hamburger, ao final
                da lista; fecha o painel no clique como os demais links. */}
            <li>
              <Link
                href="/login"
                onClick={() => setMenuAberto(false)}
                className="btn-primario mt-2 self-start px-3 py-1.5"
              >
                Entrar
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}

export default SiteHeader
