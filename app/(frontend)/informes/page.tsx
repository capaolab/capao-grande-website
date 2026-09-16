// Listagem pública de informes — /informes (task 12.2, Requisitos 11.1–11.5, 20.4).
//
// Server Component assíncrono. Lista os informes PUBLICADOS em ordem cronológica
// inversa por `data` (a query `getInformesPagina` já ordena por `-data`),
// paginando 4 por página (INFORMES_PER_PAGE). Exibe:
//   - um único <h1> "Informes" (hierarquia de cabeçalhos sequencial — Req 20.2);
//   - a grade de <InformeCard> (ordem cronológica inversa — Req 11.1, 11.2);
//   - um contador "Mostrando X de Y publicações" (Req 11.3/11.4), com
//     X = pagination.loaded (<= total) e Y = pagination.total;
//   - controles de paginação com NOMES ACESSÍVEIS (Req 20.4):
//       * "Publicações mais antigas" (link para a página seguinte) exibido se e
//         somente se pagination.hasNextPage (Req 11.5);
//       * "Publicações mais recentes" (link para a página anterior) exibido
//         quando a página atual é > 1 (auxílio de navegação).
//   - um <Placeholder> de estado vazio quando não há informes publicados
//     (nunca fabrica dados — design "Estratégia de placeholder").
//
// Next 16 (App Router): `searchParams` é uma PROMISE nas props da página.
// Assinatura confirmada em
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md:
//   searchParams: Promise<{ [key: string]: string | string[] | undefined }>
// Aguardamos a promise e lemos `page` (string) → inteiro positivo (default 1).
// `paginar` (dentro de getInformesPagina) normaliza page < 1 para 1, mas ainda
// assim fazemos o parse defensivo da string aqui.

import type { ReactElement } from 'react'
import Link from 'next/link'

import { InformeCard } from '@/components/InformeCard'
import { Placeholder } from '@/components/Placeholder'
import { getInformesPagina } from '@/lib/queries'

/**
 * Converte o valor bruto de `?page=` (string | string[] | undefined) em um
 * inteiro positivo. Qualquer valor inválido/ausente vira 1. Quando o parâmetro
 * aparece repetido (`?page=1&page=2`), o Next entrega um array; usamos o
 * primeiro elemento.
 */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value == null) return 1
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<ReactElement> {
  const page = parsePage((await searchParams).page)

  const { informes, pagination } = await getInformesPagina(page)

  const paginaAnterior = pagination.page - 1
  const paginaSeguinte = pagination.page + 1

  return (
    <section className="py-12">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="font-serif text-4xl text-[color:var(--color-marrom)]">
          Informes
        </h1>

        {/* Contador "X de Y" (Req 11.3/11.4): exibidos até esta página vs total
            de publicados. Só faz sentido quando há publicados. */}
        {pagination.total > 0 ? (
          <p className="text-[color:var(--color-paragrafo)]">
            Mostrando {pagination.loaded} de {pagination.total}{' '}
            {pagination.total === 1 ? 'publicação' : 'publicações'}
          </p>
        ) : null}
      </header>

      {informes.length > 0 ? (
        // Seção da lista com um <h2> só para leitores de tela: mantém a
        // hierarquia de cabeçalhos sequencial (h1 -> h2 -> h3 dos cards),
        // sem alterar o visual (Req 20.2). Os <InformeCard> usam <h3>.
        <section aria-labelledby="informes-lista">
          <h2 id="informes-lista" className="sr-only">
            Publicações
          </h2>
          <ul className="grade-reflow-larga list-none p-0">
            {informes.map((informe) => (
              <li key={informe.id}>
                <InformeCard informe={informe} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        // Estado vazio: nenhum informe publicado. Sem dados fabricados (Req 19).
        <Placeholder
          label="Nenhuma publicação disponível no momento."
          as="p"
        />
      )}

      {/* Controles de paginação com nomes acessíveis (Req 20.4). Renderizados
          apenas quando há para onde navegar. */}
      {(pagination.hasNextPage || pagination.page > 1) && (
        <nav
          className="mt-10 flex flex-wrap items-center justify-between gap-4"
          aria-label="Paginação das publicações"
        >
          {pagination.page > 1 ? (
            <Link
              href={`/informes?page=${paginaAnterior}`}
              className="btn-primario"
              aria-label="Publicações mais recentes"
            >
              Publicações mais recentes
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}

          {/* "Publicações mais antigas" aparece sse há mais publicados além dos
              já exibidos (Req 11.3, 11.5). */}
          {pagination.hasNextPage ? (
            <Link
              href={`/informes?page=${paginaSeguinte}`}
              className="btn-primario"
              aria-label="Publicações mais antigas"
            >
              Publicações mais antigas
            </Link>
          ) : null}
        </nav>
      )}
    </section>
  )
}
