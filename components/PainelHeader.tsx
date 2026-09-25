'use client'

// <PainelHeader> — barra de navegação das áreas internas (route group
// `(painel)`): dashboards de pedidos e configurações da conta.
//
// Diferente do <SiteHeader> público: não tem os links do site nem footer ao
// redor — só a navegação da área interna. Os itens dependem do papel
// (`/api/users/me` em mount, via lib/auth-client.ts — padrão compatível com
// o build estático de preview):
// - cliente:     "Meus pedidos" (/area-cliente) + "Configurações"
// - funcionario: "Delivery" (/area-funcionario), "Caixa" e "Histórico" —
//                sem "Configurações" (conta gerida pelo admin no Payload)
// - admin:       "Admin" (/admin) + "Configurações"
// Todos veem o botão "Sair" (logout via `POST /api/users/logout`, volta para
// /login).
//
// Sem sessão (preview estático ou visitante): mostra apenas o logo e um link
// "Entrar" — o AreaInternaGuard das páginas faz o redirect para /login.
//
// Estrutura visual e acessibilidade espelham o SiteHeader: barra sticky com
// fundo translúcido + backdrop-blur, item ativo com aria-current, hamburger
// no mobile com aria-expanded/aria-controls, fecha com Escape e ao navegar.
// No mobile o logo fica centralizado (grid 1fr auto 1fr).

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactElement } from 'react'

import { Watercolor } from '@/components/Watercolor'
import { buscarUsuarioAtual, sair, type UsuarioAtual } from '@/lib/auth-client'
import { rotaPorRole, ROTA_LOGIN } from '@/lib/permissoes'

/** Item do menu interno; `exato` = só fica ativo na própria rota (não em sub-rotas). */
interface ItemMenu {
  href: string
  label: string
  exato?: boolean
}

/** Itens da área interna conforme o papel do usuário. */
function itensPorRole(role: string | null | undefined): ItemMenu[] {
  switch (role) {
    case 'cliente':
      return [
        { href: '/area-cliente', label: 'Meus pedidos', exato: true },
        { href: '/area-cliente/pimenta', label: 'Pimenta em mel' },
        { href: '/configuracoes', label: 'Configurações' },
      ]
    case 'funcionario':
      // Sem "Configurações": a conta do funcionário é criada e habilitada
      // pelo admin no Payload. `exato` evita que "Delivery" fique ativo
      // nas sub-rotas /pimenta, /caixa e /historico.
      return [
        { href: '/area-funcionario', label: 'Delivery', exato: true },
        { href: '/area-funcionario/pimenta', label: 'Pimenta em mel' },
        { href: '/area-funcionario/caixa', label: 'Caixa' },
        { href: '/area-funcionario/historico', label: 'Histórico' },
      ]
    case 'admin':
      return [
        { href: '/admin', label: 'Admin' },
        { href: '/configuracoes', label: 'Configurações' },
      ]
    default:
      return []
  }
}

function isAtivo(pathname: string, item: ItemMenu): boolean {
  if (item.exato) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function classesDoLink(ativo: boolean): string {
  return ativo
    ? 'text-marrom font-medium'
    : 'text-paragrafo hover-verde transition-colors'
}

export function PainelHeader(): ReactElement {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null)
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    let ativo = true
    buscarUsuarioAtual().then((atual) => {
      if (ativo) setUsuario(atual)
    })
    return () => {
      ativo = false
    }
  }, [])

  // Fecha o menu mobile ao mudar de rota (mesmo padrão do SiteHeader).
  const [ultimaRota, setUltimaRota] = useState(pathname)
  if (ultimaRota !== pathname) {
    setUltimaRota(pathname)
    setMenuAberto(false)
  }

  useEffect(() => {
    if (!menuAberto) return
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false)
    }
    window.addEventListener('keydown', aoPressionarTecla)
    return () => window.removeEventListener('keydown', aoPressionarTecla)
  }, [menuAberto])

  const aoSair = async () => {
    setSaindo(true)
    await sair()
    setMenuAberto(false)
    router.push(ROTA_LOGIN)
    router.refresh()
  }

  const itens = itensPorRole(usuario?.role)

  const botaoSair = (
    <button
      type="button"
      onClick={aoSair}
      disabled={saindo}
      className="btn-primario px-3 py-1.5 text-[0.95rem] disabled:opacity-60"
    >
      {saindo ? 'Saindo…' : 'Sair'}
    </button>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-borda bg-papel/80 backdrop-blur">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-6 px-6 py-3 md:flex md:justify-between">
        {/* Hamburger — somente mobile; 1ª coluna do grid, à esquerda. */}
        <button
          type="button"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="menu-painel-mobile"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          className="text-marrom hover-verde -ml-2 justify-self-start p-2 transition-colors md:hidden"
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

        {/* Logo — link para a área do papel (ou home sem sessão). Centralizado
            no mobile (2ª coluna do grid). */}
        <Link
          href={usuario ? rotaPorRole(usuario.role) : '/'}
          aria-label="Capão Grande — área interna"
          className="shrink-0"
        >
          <Watercolor
            name="logo"
            width={711}
            height={485}
            alt="Capão Grande"
            priority
            className="h-14 w-auto md:h-[72px]"
          />
        </Link>

        {/* Navegação da área interna — somente desktop. `ml-auto` agrupa os
            itens com a ação de sessão no lado direito. */}
        <nav aria-label="Navegação da área interna" className="ml-auto hidden md:block">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[0.95rem]">
            {itens.map((item) => {
              const ativo = isAtivo(pathname, item)
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

        {/* Ação de sessão — desktop: "Sair" (logado) ou "Entrar" (sem sessão).
            Visibilidade num wrapper SEM `btn-primario` (CSS não-layered com
            `display: inline-flex` venceria o `hidden` no mesmo elemento). */}
        <div className="hidden justify-self-end md:block">
          {usuario ? (
            botaoSair
          ) : (
            <Link href={ROTA_LOGIN} className="btn-primario px-3 py-1.5 text-[0.95rem]">
              Entrar
            </Link>
          )}
        </div>
      </div>

      {/* Painel do menu mobile (somente quando aberto; some a partir de `md`). */}
      {menuAberto ? (
        <nav
          id="menu-painel-mobile"
          aria-label="Navegação da área interna"
          className="border-t border-borda bg-papel md:hidden"
        >
          <ul className="flex w-full flex-col gap-y-1 px-6 py-3 font-sans text-[0.95rem]">
            {itens.map((item) => {
              const ativo = isAtivo(pathname, item)
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
            <li className="mt-2 self-start">
              {usuario ? (
                botaoSair
              ) : (
                <Link
                  href={ROTA_LOGIN}
                  onClick={() => setMenuAberto(false)}
                  className="btn-primario px-3 py-1.5"
                >
                  Entrar
                </Link>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}

export default PainelHeader
