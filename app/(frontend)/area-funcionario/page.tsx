// Página /area-funcionario — área interna da equipe (placeholder).
//
// Acessível apenas para usuários autenticados com papel `funcionario` (ou
// `admin`, para suporte) — ver components/AreaInternaGuard.tsx e
// src/collections/Users.ts. O conteúdo real de gestão de recursos será
// construído posteriormente; por ora é um placeholder "em construção".

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'

export const metadata: Metadata = {
  title: 'Área da equipe | Capão Grande',
  description: 'Área interna da equipe do Capão Grande.',
}

export default function AreaFuncionarioPage(): ReactElement {
  return (
    <AreaInternaGuard area="funcionario">
      <article className="mx-auto flex w-full max-w-[var(--spacing-leitura)] flex-col gap-4 py-12">
        <h1 className="font-serif text-4xl text-verde">Área da equipe</h1>
        <p className="font-sans text-paragrafo">
          Esta área é exclusiva da equipe. A gestão de recursos será construída
          aqui em breve.
        </p>
      </article>
    </AreaInternaGuard>
  )
}
