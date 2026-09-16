// <NavCard> — cartão de navegação inteiramente clicável (Requisitos 10.3, 18.8).
//
// Usado nos 3 cartões da home que apontam para /processo, /delivery e /pizzaria.
// O CARD INTEIRO é clicável: o `next/link` cobre toda a superfície do cartão
// via um overlay `::after` (a técnica de "stretched link"). Isso mantém a
// semântica correta — um único link com nome acessível = `title` (Req 20.4) —
// sem aninhar conteúdo interativo dentro do `<a>` e sem duplicar links.
//
// API do `next/link` confirmada em node_modules/next/dist/docs/ (Next 16):
// import default de 'next/link'; `href` obrigatório; atributos de `<a>` como
// `className`/`aria-label` são repassados ao elemento âncora subjacente.
//
// Design: sem sombra; borda 1px `var(--color-borda)`; hover verde (Req 18.4,
// 20.3). Foco visível é tratado globalmente por `:focus-visible` em globals.css.
// A aquarela (opcional) usa `<Watercolor>` e é decorativa (`alt=""`).

import Link from 'next/link'
import type { ReactElement } from 'react'

import { Watercolor, type WatercolorName } from './Watercolor'

export interface NavCardProps {
  /** Destino da navegação, ex.: "/processo". */
  href: string
  /** Título do cartão; serve também como NOME ACESSÍVEL do link (Req 20.4). */
  title: string
  /** Texto de apoio opcional exibido abaixo do título. */
  description?: string
  /** Aquarela decorativa opcional exibida no topo do cartão (Req 18.8). */
  watercolor?: WatercolorName
  /** Classes utilitárias adicionais para o cartão. */
  className?: string
}

/**
 * Cartão de navegação com card inteiro clicável (Req 10.3). O link estica-se
 * sobre todo o cartão através do overlay `::after` (classe utilitária
 * `after:absolute after:inset-0`), então qualquer clique dentro do cartão
 * aciona a navegação. O nome acessível do link é o `title` (Req 20.4).
 */
export function NavCard({
  href,
  title,
  description,
  watercolor,
  className,
}: NavCardProps): ReactElement {
  const cardClasses = [
    // Cartão: papel, borda 1px do sistema, raio, sem sombra (Req 18.3).
    'borda-sistema group relative flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6 transition-colors',
    // Hover verde na borda do cartão (Req 18.4).
    'hover:border-[color:var(--color-verde)]',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClasses}>
      {watercolor ? (
        <Watercolor name={watercolor} width={96} height={96} className="w-24" />
      ) : null}

      <h3 className="font-serif text-xl text-[color:var(--color-marrom)]">
        {/*
          O link estica-se por todo o cartão via `after:absolute after:inset-0`
          (stretched link). O texto do título é o nome acessível (Req 20.4);
          o texto do título fica em verde no hover do cartão (Req 18.4).
        */}
        <Link
          href={href}
          className="after:absolute after:inset-0 group-hover:text-[color:var(--color-verde)]"
        >
          {title}
        </Link>
      </h3>

      {description ? (
        <p className="text-[color:var(--color-paragrafo)]">{description}</p>
      ) : null}
    </div>
  )
}

export default NavCard
