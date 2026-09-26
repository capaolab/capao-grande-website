import { describe, expect, it } from 'vitest'

import { capaDoInforme, ehUrlImagemUnsplash, urlCapaUnsplash } from '../lib/unsplash'
import type { Media } from '../src/payload-types'

// Capa pelo link do Unsplash (docs/features/capa-unsplash.md).

const FOTO = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&w=400'

const upload = {
  id: 1,
  alt: 'Forno a lenha',
  url: '/api/media/file/forno.jpg',
  width: 800,
  height: 800,
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
} as Media

describe('ehUrlImagemUnsplash (RN-U02)', () => {
  it('aceita só o link direto https de images.unsplash.com', () => {
    expect(ehUrlImagemUnsplash(FOTO)).toBe(true)
    expect(ehUrlImagemUnsplash(`  ${FOTO}  `)).toBe(true)
    expect(ehUrlImagemUnsplash('https://unsplash.com/photos/pizza-abc123')).toBe(false)
    expect(ehUrlImagemUnsplash('http://images.unsplash.com/photo-1')).toBe(false)
    expect(ehUrlImagemUnsplash('https://images.unsplash.com.evil.com/photo-1')).toBe(false)
    expect(ehUrlImagemUnsplash('não é url')).toBe(false)
  })
})

describe('urlCapaUnsplash (RN-U04)', () => {
  it('força recorte 1:1 e preserva os demais parâmetros', () => {
    const u = new URL(urlCapaUnsplash(FOTO))
    expect(u.hostname).toBe('images.unsplash.com')
    expect(u.pathname).toBe('/photo-1513104890138-7c749659a591')
    expect(u.searchParams.get('w')).toBe('1080')
    expect(u.searchParams.get('h')).toBe('1080')
    expect(u.searchParams.get('fit')).toBe('crop')
    expect(u.searchParams.get('ixlib')).toBe('rb-4.0.3')
  })
})

describe('capaDoInforme (RN-U03)', () => {
  const unsplash = { url: FOTO, alt: 'Pizza saindo do forno' }

  it('upload tem precedência sobre o Unsplash', () => {
    expect(capaDoInforme({ capa: upload, capaUnsplash: unsplash })).toBe(upload)
  })

  it('sem upload, usa o Unsplash recortado com o alt informado', () => {
    expect(capaDoInforme({ capa: null, capaUnsplash: unsplash })).toEqual({
      url: urlCapaUnsplash(FOTO),
      alt: 'Pizza saindo do forno',
      width: 1080,
      height: 1080,
    })
  })

  it('sem nenhum dos dois, devolve a capa vazia (placeholder)', () => {
    expect(capaDoInforme({ capa: null, capaUnsplash: { url: null, alt: null } })).toBeNull()
    expect(capaDoInforme({ capa: null })).toBeNull()
  })
})
