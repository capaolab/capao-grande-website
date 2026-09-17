// Detalhe do informe `/informes/[slug]` (task 12.3) — Server Component async.
//
// Exibe etiqueta, data (pt-BR), título (único <h1>), capa 1:1, resumo destacado,
// corpo (rich text lexical) e, quando presente, o resumo em inglês. Inclui
// <ShareButtons> com nomes acessíveis (Req 12.1, 12.2, 20.4).
//
// Regras de negócio:
//  - `params` é uma Promise no Next 16 (confirmado em
//    node_modules/next/dist/docs/01-app/.../dynamic-routes.md): awaitamos para
//    obter o `slug`.
//  - `getInformeBySlug(slug)` retorna `null` quando não há informe publicado com
//    aquele slug → chamamos `notFound()` (renderiza o not-found do (frontend),
//    task 12.9) resultando em 404 (Req 12.1, 12.3).
//  - `resumoEn` é lido com `fallbackLocale: 'none'` na query: quando o valor em
//    'en' está ausente vem `null`; nesse caso OMITIMOS a seção em inglês, sem
//    fabricar conteúdo (Req 12.4).
//
// Renderização do `corpo` (lexical rich text): usamos o componente oficial
// `RichText` de `@payloadcms/richtext-lexical/react` (v3.89.0, confirmado no
// export "./react" do package.json e nos tipos de dist/exports/react). Ele
// converte o estado do editor (`corpo`) em JSX — sem `dangerouslySetInnerHTML`.
//
// Design: sem sombra; borda 1px `var(--color-borda)`; largura de leitura
// (`var(--spacing-leitura)`); hierarquia de headings sequencial com um só <h1>.

import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactElement } from 'react'

import { CmsImage } from '@/components/CmsImage'
import { formatarDataPtBr } from '@/components/InformeCard'
import { Placeholder } from '@/components/Placeholder'
import { ShareButtons } from '@/components/ShareButtons'
import { getInformeBySlug } from '@/lib/queries'

interface InformeDetalhePageProps {
  /** Segmento dinâmico `[slug]` — Promise no Next 16. */
  params: Promise<{ slug: string }>
}

/**
 * Gera os parâmetros estáticos para o export de staging (Vercel,
 * `CONTENT_SOURCE=static` — ver next.config.ts e
 * .github/workflows/deploy-staging.yml). `output: 'export'` exige que TODO
 * segmento dinâmico seja conhecido em build time; fora do modo estático
 * devolve `[]`, preservando o comportamento atual (SSR sob demanda via
 * `dynamicParams: true` implícito, quando há Payload/Postgres disponível).
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (process.env.CONTENT_SOURCE !== 'static') return []

  const { getInformesSlugsEstaticos } = await import('@/content/static-content')
  return getInformesSlugsEstaticos().map((slug) => ({ slug }))
}

/**
 * Metadados da página: define o <title> a partir do título do informe. Também
 * awaita `params` e busca o informe; null-safe (sem informe ⇒ título genérico,
 * a própria página cuida do 404 via notFound()).
 */
export async function generateMetadata({
  params,
}: InformeDetalhePageProps): Promise<Metadata> {
  const { slug } = await params
  const detalhe = await getInformeBySlug(slug)

  if (!detalhe) {
    return { title: 'Informe não encontrado — Capão Grande' }
  }

  const { informe } = detalhe
  return {
    title: `${informe.titulo} — Capão Grande`,
    description: informe.resumo ?? undefined,
  }
}

export default async function InformeDetalhePage({
  params,
}: InformeDetalhePageProps): Promise<ReactElement> {
  // Next 16: params é uma Promise (ver docs de dynamic-routes).
  const { slug } = await params

  const detalhe = await getInformeBySlug(slug)
  // Slug sem informe publicado correspondente ⇒ 404 (Req 12.1, 12.3).
  if (!detalhe) notFound()

  const { informe, resumoEn } = detalhe
  const dataFormatada = formatarDataPtBr(informe.data)

  // Seção em inglês só quando há resumo 'en' de fato (Req 12.4) — sem fabricar.
  const temResumoEn = resumoEn != null && resumoEn.trim() !== ''

  // A URL canônica do informe (caminho relativo). O <ShareButtons> codifica o
  // valor; um caminho é suficiente para os "share intents".
  const shareUrl = `/informes/${slug}`

  return (
    <article className="mx-auto w-full max-w-[var(--spacing-leitura)] py-12">
      {/* Cabeçalho: etiqueta + data (rótulos de seção, não headings — Req 20.2). */}
      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="uppercase tracking-wide text-[color:var(--color-verde)]">
          {informe.etiqueta}
        </span>
        {dataFormatada ? (
          <time
            dateTime={informe.data ?? undefined}
            className="text-[color:var(--color-paragrafo)]"
          >
            {dataFormatada}
          </time>
        ) : (
          <Placeholder label="data a confirmar" />
        )}
      </div>

      {/* Único <h1> da página (Req 20.2). */}
      <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
        {informe.titulo}
      </h1>

      {/* Capa 1:1 (Req 5.3, 12.1); placeholder listrado quando ausente. */}
      <div className="mt-8">
        <CmsImage
          media={informe.capa}
          square
          sizes="(max-width: 820px) 100vw, 820px"
          placeholderLabel="capa a confirmar"
        />
      </div>

      {/* Resumo destacado (Req 12.1): frase de destaque em serif/itálico. */}
      {informe.resumo != null && informe.resumo.trim() !== '' ? (
        <p className="mt-8 font-serif text-xl italic leading-relaxed text-[color:var(--color-paragrafo)]">
          {informe.resumo}
        </p>
      ) : (
        <Placeholder label="resumo a confirmar" as="p" className="mt-8 block" />
      )}

      {/* Corpo em rich text lexical (Req 5.7, 12.1) → JSX seguro via RichText. */}
      {informe.corpo != null ? (
        <div className="mt-8 space-y-4 text-[color:var(--color-paragrafo)] leading-relaxed">
          <RichText data={informe.corpo} />
        </div>
      ) : (
        <Placeholder label="conteúdo a confirmar" as="p" className="mt-8 block" />
      )}

      {/* Seção em inglês (Req 12.2, 12.4): omitida quando resumoEn é ausente. */}
      {temResumoEn ? (
        <section
          aria-labelledby="informe-en"
          className="borda-sistema mt-10 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6"
          lang="en"
        >
          <h2
            id="informe-en"
            className="mb-3 text-sm uppercase tracking-wide text-[color:var(--color-verde)]"
          >
            In English
          </h2>
          <p className="font-serif italic leading-relaxed text-[color:var(--color-paragrafo)]">
            {resumoEn}
          </p>
        </section>
      ) : null}

      {/* Compartilhamento com nomes acessíveis (Req 12.2, 20.4). */}
      <div className="mt-10 border-t border-[color:var(--color-borda)] pt-6">
        <ShareButtons url={shareUrl} title={informe.titulo} />
      </div>
    </article>
  )
}
