'use client'

// <AreaInternaGuard> — guarda de papel para as áreas internas do site.
//
// Client Component (compatível com o build estático de preview, que não pode
// checar sessão no servidor em request time): ao montar, consulta
// `/api/users/me`. Sem sessão válida -> redireciona para `/login` (com
// `?next=<retorno>` quando a página pede para voltar após o login); com papel
// não permitido na área -> redireciona para a área do próprio papel
// (lib/permissoes.ts). Enquanto verifica, exibe um estado de carregamento.
//
// É uma guarda de UX: a segurança real dos dados fica no `access` das
// coleções do Payload, enforced no servidor pela API.

import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactElement, type ReactNode } from 'react'

import { comRetorno, podeAcessarArea, rotaPorRole, ROTA_LOGIN } from '@/lib/permissoes'

export interface AreaInternaGuardProps {
  /** Área protegida: 'funcionario' ou 'cliente' (admin pode ver ambas);
      'qualquer' aceita qualquer papel autenticado. */
  area: 'funcionario' | 'cliente' | 'qualquer'
  /** Rota para onde voltar após o login (ex.: '/pedido'); vai como
      `/login?next=...`. Ausente ⇒ o login segue para a área do papel. */
  retorno?: string
  children: ReactNode
}

export function AreaInternaGuard({
  area,
  retorno,
  children,
}: AreaInternaGuardProps): ReactElement {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState(false)
  const rotaLogin = comRetorno(ROTA_LOGIN, retorno)

  useEffect(() => {
    let ativo = true

    fetch('/api/users/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!ativo) return
        if (!res.ok) {
          router.replace(rotaLogin)
          return
        }
        const dados = (await res.json()) as { user?: { role?: string } | null }
        const role = dados.user?.role
        if (!dados.user) {
          router.replace(rotaLogin)
        } else if (area !== 'qualquer' && !podeAcessarArea(role ?? null, area)) {
          router.replace(rotaPorRole(role))
        } else {
          setAutorizado(true)
        }
      })
      .catch(() => {
        // Sem API (preview estático) ou offline: manda para o login.
        if (ativo) router.replace(rotaLogin)
      })

    return () => {
      ativo = false
    }
  }, [area, rotaLogin, router])

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
