'use client'

// <AuthButton> — ação de autenticação da navbar pública.
//
// Client Component (compatível com o build estático de preview): ao montar,
// consulta `/api/users/me` via lib/auth-client.ts.
// - Deslogado (ou sem API): link "Entrar" para /login — mesmo visual de antes.
// - Logado: link "Painel" para a área do papel (lib/permissoes.ts) + botão
//   "Sair", que chama `POST /api/users/logout` e volta para a home.
//
// A visibilidade (desktop x painel hamburger) fica no wrapper do SiteHeader:
// `btn-primario` é CSS não-layered com `display: inline-flex`, que venceria o
// `hidden` do Tailwind no mesmo elemento.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactElement } from 'react'

import { buscarUsuarioAtual, sair, type UsuarioAtual } from '@/lib/auth-client'
import { rotaPorRole } from '@/lib/permissoes'

export interface AuthButtonProps {
  /** Chamado ao navegar por um dos links — o SiteHeader usa para fechar o menu mobile. */
  onNavigate?: () => void
}

export function AuthButton({ onNavigate }: AuthButtonProps): ReactElement {
  const router = useRouter()
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

  const aoSair = async () => {
    setSaindo(true)
    await sair()
    // O SiteHeader continua montado (mesmo root layout): volta o estado para
    // "deslogado" aqui, senão o botão ficaria preso em "Saindo…".
    setUsuario(null)
    setSaindo(false)
    onNavigate?.()
    router.push('/')
    router.refresh()
  }

  if (!usuario) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="btn-primario px-3 py-1.5 text-[0.95rem]"
      >
        Entrar
      </Link>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link
        href={rotaPorRole(usuario.role)}
        onClick={onNavigate}
        className="font-sans text-[0.95rem] text-paragrafo hover-verde transition-colors"
      >
        Painel
      </Link>
      <button
        type="button"
        onClick={aoSair}
        disabled={saindo}
        className="btn-primario px-3 py-1.5 text-[0.95rem] disabled:opacity-60"
      >
        {saindo ? 'Saindo…' : 'Sair'}
      </button>
    </span>
  )
}

export default AuthButton
