'use client'

// <LinkComRetorno> — link entre /login e /cadastro que preserva a rota de
// retorno pós-login (`?next=...`, validada em lib/permissoes.ts). Assim quem
// chega ao login vindo de /pedido e decide se cadastrar também volta para o
// pedido ao terminar.
//
// Usa useSearchParams, então a página deve envolvê-lo em <Suspense>.

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ReactElement, ReactNode } from 'react'

import { comRetorno, PARAM_RETORNO } from '@/lib/permissoes'

export interface LinkComRetornoProps {
  href: string
  className?: string
  children: ReactNode
}

export function LinkComRetorno({ href, className, children }: LinkComRetornoProps): ReactElement {
  const searchParams = useSearchParams()
  return (
    <Link href={comRetorno(href, searchParams.get(PARAM_RETORNO))} className={className}>
      {children}
    </Link>
  )
}

export default LinkComRetorno
