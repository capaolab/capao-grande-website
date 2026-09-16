// Página 404 do site público — not-found.tsx do route group `(frontend)`
// (task 12.9, Req 12.3).
//
// Convenção do Next 16 (node_modules/next/dist/docs/.../file-conventions/
// not-found.md): este arquivo renderiza a UI quando `notFound()` é chamado
// dentro de um segmento do `(frontend)` — por exemplo em `/informes/[slug]`
// quando o slug não corresponde a um informe publicado (task 12.3). Sendo o
// not-found na raiz do route group, também atende URLs não correspondidas do
// site. O Next retorna status HTTP 404 para respostas não-streamadas.
//
// Renderiza DENTRO do layout `(frontend)` (o <SiteHeader>/<SiteFooter> já
// envolvem o conteúdo em app/(frontend)/layout.tsx), portanto aqui devolvemos
// apenas o conteúdo da página — sem <html>/<body> (isso é papel do
// global-not-found, que não usamos).
//
// Server Component (padrão): não recebe props e não faz data fetch — o 404 é
// estático dentro do sistema de design.
//
// Design (Req 18): paleta fechada via tokens de app/globals.css, sem sombra,
// borda 1px `var(--color-borda)`; um único <h1>; link "voltar" para a home com
// `.btn-primario` e nome acessível; aquarela decorativa (`alt=""`, Req 20.1).

import Link from 'next/link'
import type { ReactElement } from 'react'

import { Watercolor } from '@/components/Watercolor'

export default function NotFound(): ReactElement {
  return (
    <section
      aria-labelledby="nao-encontrada-titulo"
      className="mx-auto flex w-full max-w-[var(--spacing-leitura)] flex-col items-center py-20 text-center"
    >
      {/* Grafismo decorativo (Req 18.8, 20.1) — sem significado ⇒ alt="". */}
      <Watercolor name="mark" width={120} height={120} className="mb-8 w-28" />

      {/* Único <h1> da página (Req 20.2). */}
      <h1
        id="nao-encontrada-titulo"
        className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]"
      >
        Página não encontrada
      </h1>

      {/* Código do erro como rótulo secundário, não como heading. */}
      <p className="mt-2 font-serif text-lg italic text-[color:var(--color-verde)]">
        Erro 404
      </p>

      {/* Mensagem curta em pt-BR — sem conteúdo fabricado. */}
      <p className="mt-6 leading-relaxed text-[color:var(--color-paragrafo)]">
        A página que você procura pode ter sido movida ou não existe mais. Que
        tal voltar ao início e continuar navegando pelo Capão Grande?
      </p>

      {/* Link "voltar" para a home com nome acessível e botão primário
          (Req 18.5). É um link, não um botão de ação. */}
      <Link href="/" className="btn-primario mt-8">
        Voltar para a página inicial
      </Link>
    </section>
  )
}
