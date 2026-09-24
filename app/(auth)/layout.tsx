// Layout do route group `(auth)` — páginas de autenticação (ex.: /login).
//
// Root layout próprio, SEPARADO do `(frontend)`: renderiza o documento HTML
// com as mesmas fontes e tokens do design system, mas SEM <SiteHeader> e SEM
// <SiteFooter> — a tela de login é independente da landing page. A navegação
// de retorno ao site fica a cargo da própria página.

import type { Metadata } from 'next'
import type { ReactElement, ReactNode } from 'react'

import { ebGaramond, karla } from '@/lib/design/fonts'

import '../globals.css'

export const metadata: Metadata = {
  title: 'Entrar | Capão Grande',
  description: 'Acesse sua conta do Capão Grande.',
}

export default function AuthLayout({
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
        <main className="flex-1 w-full">
          <div className="mx-auto w-full max-w-conteudo px-6">{children}</div>
        </main>
      </body>
    </html>
  )
}
