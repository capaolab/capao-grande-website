// Capa de informe por link do Unsplash (docs/features/capa-unsplash.md).
// Só o link direto da imagem (`images.unsplash.com`) é aceito: é o host
// liberado em `images.remotePatterns` (next.config.ts). O recorte 1:1 é
// feito pelos parâmetros da própria URL (Imgix, usado pelo Unsplash).

import type { ImagemCms } from '@/components/CmsImage'
import type { Informe } from '@/src/payload-types'

const HOST_UNSPLASH = 'images.unsplash.com'
const LADO_CAPA = 1080

/** `true` quando a URL é um link direto de imagem do Unsplash (https). */
export function ehUrlImagemUnsplash(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' && u.hostname === HOST_UNSPLASH
  } catch {
    return false
  }
}

/** URL da imagem recortada em 1:1, preservando os demais parâmetros. */
export function urlCapaUnsplash(url: string): string {
  const u = new URL(url.trim())
  u.searchParams.set('w', String(LADO_CAPA))
  u.searchParams.set('h', String(LADO_CAPA))
  u.searchParams.set('fit', 'crop')
  u.searchParams.set('crop', 'entropy')
  u.searchParams.set('auto', 'format')
  return u.toString()
}

/**
 * Capa exibida no site (RN-U03): o upload `capa` tem precedência; sem ele,
 * vale o link do Unsplash; sem nenhum, `null` (o <CmsImage> mostra o
 * placeholder).
 */
export function capaDoInforme(informe: Pick<Informe, 'capa' | 'capaUnsplash'>): Informe['capa'] | ImagemCms {
  if (typeof informe.capa === 'object' && informe.capa?.url) return informe.capa
  const unsplash = informe.capaUnsplash
  if (unsplash?.url && ehUrlImagemUnsplash(unsplash.url)) {
    return {
      url: urlCapaUnsplash(unsplash.url),
      alt: unsplash.alt ?? '',
      width: LADO_CAPA,
      height: LADO_CAPA,
    }
  }
  return informe.capa
}
