// Layout das áreas internas (route group `(painel)`) — dashboards de pedidos
// e configurações do usuário.
//
// Root layout próprio (como o de `(auth)`): NÃO reutiliza o cabeçalho nem o
// rodapé do site público. Renderiza apenas o <PainelHeader> — barra interna
// com links da área, configurações e logout — e o conteúdo em FULL WIDTH
// (sem o max-w-conteudo de 1120px do site público), para que o dashboard de
// pedidos aproveite a tela toda.
//
// Server Component: define o documento HTML em pt-BR e aplica as CSS
// variables das fontes (mesmo padrão de app/(frontend)/layout.tsx). As
// páginas fornecem o único <h1> por rota; o layout não introduz cabeçalhos.

import type { Metadata } from 'next'
import type { ReactElement, ReactNode } from 'react'

import { PainelHeader } from '@/components/PainelHeader'
import { ebGaramond, karla } from '@/lib/design/fonts'

import '../globals.css'

export const metadata: Metadata = {
  title: 'Área interna | Capão Grande',
  description: 'Área interna do Capão Grande — pedidos e configurações da conta.',
}

export default function PainelLayout({
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
        <PainelHeader />
        {/* Full width: as páginas internas (dashboard de pedidos) ocupam a
            largura toda, com apenas o respiro lateral de 24px. */}
        <main className="w-full flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
