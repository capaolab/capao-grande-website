// Página /area-cliente — área do cliente (placeholder).
//
// Acessível apenas para usuários autenticados com papel `cliente` (ou `admin`,
// para suporte) — ver components/AreaInternaGuard.tsx e
// src/collections/Users.ts. O conteúdo real da área do cliente será construído
// posteriormente; por ora é um placeholder "em construção".

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'

export const metadata: Metadata = {
  title: 'Área do cliente | Capão Grande',
  description: 'Área do cliente do Capão Grande.',
}

export default function AreaClientePage(): ReactElement {
  return (
    <AreaInternaGuard area="cliente">
      <article className="mx-auto flex w-full max-w-[var(--spacing-leitura)] flex-col gap-4 py-12">
        <h1 className="font-serif text-4xl text-verde">Área do cliente</h1>
        <p className="font-sans text-paragrafo">
          Esta área é exclusiva para clientes. Em breve você poderá acompanhar
          seus pedidos e informações por aqui.
        </p>
      </article>
    </AreaInternaGuard>
  )
}
