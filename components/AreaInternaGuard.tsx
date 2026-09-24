'use client'

// <AreaInternaGuard> — guarda de papel para as áreas internas do site.
//
// Client Component (compatível com o build estático de staging, que não pode
// checar sessão no servidor em request time): ao montar, consulta
// `/api/users/me`. Sem sessão válida -> redireciona para `/login`; com papel
// não permitido na área -> redireciona para a área do próprio papel
// (lib/permissoes.ts). Enquanto verifica, exibe um estado de carregamento.
//
// É uma guarda de UX: a segurança real dos dados fica no `access` das
// coleções do Payload, enforced no servidor pela API.

import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactElement, type ReactNode } from 'react'

import { podeAcessarArea, rotaPorRole, ROTA_LOGIN } from '@/lib/permissoes'

export interface AreaInternaGuardProps {
  /** Área protegida: 'funcionario' ou 'cliente' (admin pode ver ambas). */
  area: 'funcionario' | 'cliente'
  children: ReactNode
}

export function AreaInternaGuard({ area, children }: AreaInternaGuardProps): ReactElement {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    let ativo = true

    fetch('/api/users/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!ativo) return
        if (!res.ok) {
          router.replace(ROTA_LOGIN)
          return
        }
        const dados = (await res.json()) as { user?: { role?: string } | null }
        const role = dados.user?.role
        if (!dados.user) {
          router.replace(ROTA_LOGIN)
        } else if (!podeAcessarArea(role ?? null, area)) {
          router.replace(rotaPorRole(role))
        } else {
          setAutorizado(true)
        }
      })
      .catch(() => {
        // Sem API (staging estático) ou offline: manda para o login.
        if (ativo) router.replace(ROTA_LOGIN)
      })

    return () => {
      ativo = false
    }
  }, [area, router])

  if (!autorizado) {
    return (
      <p role="status" className="py-12 text-center font-sans text-paragrafo">
        Verificando acesso…
      </p>
    )
  }

  return <>{children}</>
}

export default AreaInternaGuard
