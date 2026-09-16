// Layout compartilhado do site público (route group `(frontend)`) — task 10.4.
//
// Server Component: define o documento HTML em pt-BR (Req 3.1 — site em
// português), aplica as CSS variables das fontes (EB Garamond -> --font-serif,
// Karla -> --font-sans; mapeadas em app/globals.css), envolve o conteúdo com
// <SiteHeader> e <SiteFooter> e limita a largura do conteúdo a
// var(--spacing-conteudo) = 1120px com respiro lateral (Req 18.6).
//
// Landmarks: <header> (SiteHeader) / <main> / <footer> (SiteFooter). As páginas
// fornecem o único <h1> por rota, mantendo a hierarquia de cabeçalhos sequencial
// (Req 20.2). O layout não introduz cabeçalhos.
//
// Não editar o layout do route group `(payload)` — este arquivo cobre apenas o
// site público. Consultado node_modules/next/dist/docs/ (next/font, layout).

import type { Metadata } from 'next'
import type { ReactElement, ReactNode } from 'react'

import { ebGaramond, karla } from '@/lib/design/fonts'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'

import '../globals.css'

export const metadata: Metadata = {
  title: 'Capão Grande',
  description:
    'Capão Grande — pizzaria, reflorestamento e agrofloresta. Informes, cardápio e como visitar.',
}

export default function FrontendLayout({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <html
      lang="pt-BR"
      className={`${ebGaramond.variable} ${karla.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-fundo text-marrom">
        <SiteHeader />
        <main className="flex-1 w-full">
          {/* Container centralizado: largura máx 1120px + respiro lateral 24px
              (Req 18.6). As páginas de leitura aplicam a medida menor por conta
              própria via var(--spacing-leitura). */}
          <div className="mx-auto w-full max-w-conteudo px-6">{children}</div>
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
