// @vitest-environment jsdom
//
// Property 12: Texto alternativo de imagens de conteúdo
// Feature: payload-cms-integration
// Validates: Requirements 4.3, 20.1
//
// Este arquivo renderiza um componente React (<CmsImage>), então precisa do DOM.
// O ambiente global do vitest é `node` (exigido pelos testes de integração do
// Payload); aqui optamos por `jsdom` APENAS neste arquivo via o docblock acima
// (`// @vitest-environment jsdom`, suportado pelo vitest 4). Assim os testes de
// integração continuam rodando sob `node` sem vazamento de ambiente.
//
// `next/image` puxa internals do Next que não rodam bem em jsdom, então o
// mockamos por um <img> simples que repassa as props. Isso deixa o atributo
// `alt` diretamente no nó do DOM, que é exatamente o que a Property 12 verifica.

import { afterEach, describe, expect, it, vi } from 'vitest'
import fc from 'fast-check'
import { cleanup, render } from '@testing-library/react'

// Mock de `next/image`: renderiza um <img> nativo repassando as props (em
// especial `alt` e `src`). Padrão para testar componentes que usam next/image.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props
    // `fill`/`priority` etc. não precisam ir para o DOM; mantemos src/alt.
    return <img src={src as string} alt={alt as string} data-testid="cms-img" {...filterDomProps(rest)} />
  },
}))

// Remove props não-DOM que o next/image aceita mas o <img> nativo não entende
// (evita warnings do React sem afetar o atributo `alt` sob teste).
function filterDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const {
    fill: _fill,
    priority: _priority,
    loader: _loader,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blur,
    unoptimized: _unoptimized,
    ...rest
  } = props
  return rest
}

import { CmsImage } from '../components/CmsImage'
import type { Media } from '../src/payload-types'

afterEach(() => {
  cleanup()
})

/**
 * Arbitrário de um registro `Media` populado e utilizável (url não vazia).
 * `alt` cobre string arbitrária, incluindo vazio, espaços, unicode e acentos.
 */
const mediaArbitrary: fc.Arbitrary<Media> = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  // `alt` arbitrário: qualquer string unicode (inclui "", espaços, acentos…).
  alt: fc.string({ unit: 'grapheme' }),
  // `url` sempre não vazia para acionar a renderização da imagem.
  url: fc
    .string({ minLength: 1, maxLength: 40 })
    .map((s) => `/media/${encodeURIComponent(s)}.png`),
  width: fc.integer({ min: 1, max: 4000 }),
  height: fc.integer({ min: 1, max: 4000 }),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
}) as unknown as fc.Arbitrary<Media>

describe('Feature: payload-cms-integration, Property 12: Texto alternativo de imagens de conteúdo', () => {
  it('o `alt` renderizado é igual ao `alt` armazenado no registro de mídia (Req 4.3, 20.1)', () => {
    fc.assert(
      fc.property(mediaArbitrary, (media) => {
        const { container, unmount } = render(<CmsImage media={media} />)
        try {
          const img = container.querySelector('img')
          expect(img).not.toBeNull()
          // Property 12: alt renderizado === alt armazenado (exato).
          expect(img?.getAttribute('alt')).toBe(media.alt)
        } finally {
          // Evita vazamento de DOM entre as (>=100) iterações da propriedade.
          unmount()
        }
      }),
    )
  })

  it('exemplo: `alt` vazio renderiza alt="" (imagem decorativa)', () => {
    const media = {
      id: 1,
      alt: '',
      url: '/media/decorativa.png',
      width: 800,
      height: 800,
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
    } as unknown as Media

    const { container } = render(<CmsImage media={media} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('')
  })

  it('exemplo complementar: mídia ausente (null) renderiza o placeholder (role="img")', () => {
    const { container } = render(
      <CmsImage media={null} placeholderLabel="capa a confirmar" />,
    )
    // Sem imagem: nenhum <img>, mas um elemento com role="img" e aria-label.
    expect(container.querySelector('img')).toBeNull()
    const placeholder = container.querySelector('[role="img"]')
    expect(placeholder).not.toBeNull()
    expect(placeholder?.getAttribute('aria-label')).toBe('capa a confirmar')
  })
})
