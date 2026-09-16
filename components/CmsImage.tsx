// <CmsImage> — wrapper de `next/image` que lê `url` e `alt` de um valor da
// Colecao_Media (Requisitos 4.4, 5.3, 20.1).
//
// API do `next/image` confirmada em node_modules/next/dist/docs/ (Next 16):
//  - import default de 'next/image';
//  - `src` e `alt` são obrigatórios; `src` pode ser um caminho interno (mesma
//    origem) sem configurar `remotePatterns`;
//  - usa-se `width`/`height` OU `fill` (com o elemento pai posicionado) para
//    reservar espaço; `style.objectFit: 'cover'` recorta na proporção do box;
//  - o `alt` deve ser string vazia para imagens decorativas.
//
// Regras de negócio:
//  - Quando `media` é um documento Media populado com `url` não vazia,
//    renderiza a imagem (Req 4.4); o `alt` vem SEMPRE do registro de mídia
//    (Req 20.1) — `alt` vazio é tratado como decorativo (`alt=""`).
//  - Quando `media` está ausente (null/undefined), é apenas um id numérico
//    (relação não populada) ou tem `url` vazia, renderiza um PLACEHOLDER
//    listrado com legenda, sem fabricar imagem (padrão do protótipo).
//  - `square` renderiza em proporção 1:1 com recorte `cover`, usado pela capa
//    do informe (Req 5.3).
//  - Sem sombra; borda 1px `var(--color-borda)` (Req 18.3).

import Image from 'next/image'
import type { CSSProperties } from 'react'

import type { Media } from '@/src/payload-types'

/**
 * Valor de um campo de relação/upload de mídia como aparece nos tipos gerados
 * do Payload: pode ser um id (número), um documento `Media` populado, ou
 * ausente (`null`/`undefined`).
 */
export type CmsImageValue = number | Media | null | undefined

export interface CmsImageProps {
  /** O valor do campo de mídia (id, documento populado ou ausente). */
  media: CmsImageValue
  /**
   * Renderiza em proporção 1:1 com recorte `cover` (capa do informe, Req 5.3).
   * Ignorado quando `fill` é usado por um pai já dimensionado.
   */
  square?: boolean
  /**
   * Dimensões intrínsecas em px. Quando `square` é usado e apenas `width` é
   * informado, `height` assume o mesmo valor. Ignorado quando `fill` é `true`.
   */
  width?: number
  height?: number
  /**
   * Expande a imagem para o tamanho do elemento pai (que deve estar
   * posicionado). Útil para caixas com proporção controlada por CSS.
   */
  fill?: boolean
  /** Atributo `sizes` repassado ao `next/image` (responsividade). */
  sizes?: string
  /** Classe utilitária aplicada à imagem e ao placeholder. */
  className?: string
  /**
   * Legenda do placeholder quando a imagem está ausente (o que entraria ali).
   * Ex.: "capa a confirmar".
   */
  placeholderLabel?: string
}

/** `true` quando o valor é um documento Media populado com `url` utilizável. */
function isPopulatedMedia(media: CmsImageValue): media is Media & { url: string } {
  return (
    typeof media === 'object' &&
    media !== null &&
    typeof media.url === 'string' &&
    media.url.trim() !== ''
  )
}

const DEFAULT_DIMENSION = 800

/**
 * Placeholder listrado com legenda, exibido quando não há imagem (Req 4.4/5.3
 * — nunca fabricar imagem). Usa os tokens de cinza/borda do sistema de design
 * e uma faixa em `repeating-linear-gradient`, sem sombra (Req 18.3).
 */
function StripedPlaceholder({
  square,
  className,
  label,
}: {
  square?: boolean
  className?: string
  label: string
}) {
  const stripeStyle: CSSProperties = {
    backgroundImage:
      'repeating-linear-gradient(45deg, var(--color-borda-clara) 0, var(--color-borda-clara) 10px, var(--color-papel) 10px, var(--color-papel) 20px)',
    aspectRatio: square ? '1 / 1' : undefined,
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={[
        'borda-sistema flex items-center justify-center rounded-[var(--radius)] w-full',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={stripeStyle}
    >
      <span className="px-3 py-1 text-center text-sm text-[color:var(--color-placeholder)]">
        {label}
      </span>
    </div>
  )
}

/**
 * Renderiza a imagem de um registro de mídia do CMS, ou um placeholder
 * listrado com legenda quando a imagem está ausente.
 */
export function CmsImage({
  media,
  square = false,
  width,
  height,
  fill = false,
  sizes,
  className,
  placeholderLabel = 'imagem a confirmar',
}: CmsImageProps) {
  if (!isPopulatedMedia(media)) {
    return (
      <StripedPlaceholder square={square} className={className} label={placeholderLabel} />
    )
  }

  // `alt` vem sempre do registro de mídia (Req 20.1); vazio ⇒ decorativa.
  const alt = media.alt ?? ''

  const objectFitStyle: CSSProperties | undefined = square
    ? { objectFit: 'cover' }
    : undefined

  const imageClassName = [
    'borda-sistema rounded-[var(--radius)]',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  if (fill) {
    return (
      <Image
        src={media.url}
        alt={alt}
        fill
        sizes={sizes}
        className={imageClassName}
        style={{ objectFit: square ? 'cover' : undefined }}
      />
    )
  }

  // Dimensões intrínsecas: usa as do registro de mídia quando disponíveis,
  // senão as props, senão um padrão. Em modo `square`, força 1:1.
  const intrinsicWidth =
    width ?? media.width ?? DEFAULT_DIMENSION
  const intrinsicHeight = square
    ? (height ?? width ?? media.width ?? intrinsicWidth)
    : (height ?? media.height ?? DEFAULT_DIMENSION)

  return (
    <Image
      src={media.url}
      alt={alt}
      width={intrinsicWidth}
      height={intrinsicHeight}
      sizes={sizes}
      className={imageClassName}
      style={objectFitStyle}
    />
  )
}

export default CmsImage
