// <InformeCard> — cartão de informe usado na home e na listagem (Req 10.2, 11.1).
//
// Mostra etiqueta, data (formatada em pt-BR), título (clicável), resumo e a
// capa 1:1 via <CmsImage square>. O cartão inteiro é clicável via link
// esticado (`after:absolute after:inset-0`, técnica de stretched link),
// mantendo um único link com nome acessível = `titulo` (Req 20.4) apontando
// para /informes/[slug].
//
// Placeholders (Req 19): quando `slug`, `data` ou `resumo` estão ausentes,
// exibe <Placeholder> em vez de fabricar dados. Sem slug o cartão não é
// clicável (não há destino), então o título é renderizado sem link.
//
// API do `next/link` confirmada em node_modules/next/dist/docs/ (Next 16).
// Design: sem sombra; borda 1px `var(--color-borda)`; hover verde (Req 18.4).

import Link from 'next/link'
import type { ReactElement } from 'react'

import type { Informe } from '@/src/payload-types'

import { CmsImage } from './CmsImage'
import { Placeholder } from './Placeholder'

export interface InformeCardProps {
  /** Registro do informe vindo do CMS (tipo gerado). */
  informe: Informe
  /** Classes utilitárias adicionais para o cartão. */
  className?: string
}

/**
 * Formata uma data ISO (ex.: "2024-05-01T...") em pt-BR (ex.: "01/05/2024").
 * Retorna `null` quando a string é vazia ou inválida, para que o chamador
 * exiba um <Placeholder> em vez de uma data fabricada (Req 19).
 */
export function formatarDataPtBr(data: string | null | undefined): string | null {
  if (data == null || data.trim() === '') return null
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

export function InformeCard({ informe, className }: InformeCardProps): ReactElement {
  const dataFormatada = formatarDataPtBr(informe.data)
  const href =
    informe.slug != null && informe.slug.trim() !== ''
      ? `/informes/${informe.slug}`
      : null

  const cardClasses = [
    'borda-sistema group relative flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-5 transition-colors',
    href ? 'hover:border-[color:var(--color-verde)]' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={cardClasses}>
      {/* Capa em proporção 1:1 (Req 5.3); placeholder listrado se ausente. */}
      <CmsImage
        media={informe.capa}
        square
        sizes="(max-width: 640px) 100vw, 320px"
        placeholderLabel="capa a confirmar"
      />

      <div className="flex items-center gap-3 text-sm">
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

      <h3 className="font-serif text-xl text-[color:var(--color-marrom)]">
        {href ? (
          // Nome acessível do link = título (Req 20.4); card inteiro clicável.
          <Link
            href={href}
            className="after:absolute after:inset-0 group-hover:text-[color:var(--color-verde)]"
          >
            {informe.titulo}
          </Link>
        ) : (
          informe.titulo
        )}
      </h3>

      {informe.resumo != null && informe.resumo.trim() !== '' ? (
        <p className="text-[color:var(--color-paragrafo)]">{informe.resumo}</p>
      ) : (
        <Placeholder label="resumo a confirmar" as="p" />
      )}
    </article>
  )
}

export default InformeCard
