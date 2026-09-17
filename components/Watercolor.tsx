// <Watercolor> — repertório ilustrativo em aquarela (Requisitos 18.8, 20.1).
//
// Renderiza uma das aquarelas em `public/assets/watercolor/` (único repertório
// de ilustração permitido — Req 18.8) sobre fundo claro, SEM sombra e SEM borda
// (Req 18.3 / mandato do design). Usa `next/image` (Next.js 16) com um caminho
// público `/assets/watercolor/<name>.png`, fornecendo `width`/`height` (as
// imagens são PNG e não são importadas estaticamente, então as dimensões são
// obrigatórias — ver node_modules/next/dist/docs .../02-components/image.md).
//
// Acessibilidade (Req 20.1): quando a aquarela é decorativa (uso padrão), o
// `alt` é uma string vazia (`alt=""`), conforme recomendação do doc do
// `next/image` para imagens puramente decorativas. Quando a ilustração carrega
// significado, a página fornece um `alt` descritivo.

import Image from 'next/image'
import type { ReactElement } from 'react'

/** Nomes-base das aquarelas disponíveis em `public/assets/watercolor/`. */
export type WatercolorName =
  | 'arvore-1'
  | 'arvore-2'
  | 'arvore-3'
  | 'arvore-4'
  | 'arvore-5'
  | 'arvore-6'
  | 'banana'
  | 'erva'
  | 'legumes'
  | 'mel'
  | 'molho'
  | 'palmeira'
  | 'vinho'
  | 'logo'
  | 'mark'

/** Diretório público onde as aquarelas foram copiadas (task 9.3). */
const WATERCOLOR_DIR = '/assets/watercolor'

export interface WatercolorProps {
  /** Nome-base do asset, ex.: 'arvore-1' | 'banana' | 'palmeira'. */
  name: WatercolorName
  /** Largura intrínseca em px (obrigatória para PNG não importado estaticamente). */
  width: number
  /** Altura intrínseca em px (obrigatória para PNG não importado estaticamente). */
  height: number
  /**
   * Texto alternativo. Omitido/`undefined` ⇒ decorativa ⇒ `alt=""` (Req 20.1).
   * Forneça um texto descritivo apenas quando a aquarela transmitir significado.
   */
  alt?: string
  /** Classes utilitárias adicionais para dimensionamento/posicionamento. */
  className?: string
  /** Repassa a otimização de prioridade do `next/image` (ex.: aquarela do hero). */
  priority?: boolean
}

/**
 * Aquarela decorativa (ou opcionalmente significativa) sobre fundo claro, sem
 * sombra/borda (Req 18.3, 18.8). Decorativa por padrão ⇒ `alt=""` (Req 20.1).
 */
export function Watercolor({
  name,
  width,
  height,
  alt,
  className,
  priority,
}: WatercolorProps): ReactElement {
  // Decorativa quando nenhum `alt` significativo é fornecido (Req 20.1).
  const altText = alt ?? ''

  return (
    <Image
      src={`${WATERCOLOR_DIR}/${name}.png`}
      width={width}
      height={height}
      alt={altText}
      priority={priority}
      // Fundo claro, sem sombra/borda por design (Req 18.3): nenhuma classe de
      // sombra/borda é aplicada; sombras já são globalmente desativadas em
      // app/globals.css. O dimensionamento é responsabilidade explícita do
      // call site via `className` (ex.: `w-24 h-auto` ou `h-14 w-auto`) — o
      // componente NÃO injeta `h-auto` automaticamente, pois isso conflitaria
      // com alturas fixas do chamador (duas utilidades de `height` no Tailwind
      // são resolvidas pela ordem do CSS gerado, não pela ordem das classes).
      className={className}
    />
  )
}

export default Watercolor
