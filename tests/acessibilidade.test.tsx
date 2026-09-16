// @vitest-environment jsdom
//
// Testes de acessibilidade automatizados das páginas públicas (task 12.10).
// Feature: payload-cms-integration
// Validates: Requirements 20.1, 20.2, 20.3, 20.4
//
// Estratégia (design "Acessibilidade" / "Testing Strategy"): rodar axe-core
// (via `vitest-axe`) sobre as PÁGINAS públicas renderizadas, verificando:
//   - Req 20.1: toda imagem de conteúdo tem `alt` presente (rule `image-alt`).
//   - Req 20.2: hierarquia de cabeçalhos sequencial e um único <h1>
//     (rules `heading-order`, `page-has-heading-one`; asserção explícita de 1 h1).
//   - Req 20.3: foco visível é uma preocupação de CSS (`:focus-visible` em
//     app/globals.css). O axe/jsdom NÃO computa estilos de `:focus-visible`,
//     então isso é DOCUMENTADO aqui e verificado por proxy (elementos
//     interativos são focáveis: links têm `href`, botões não estão `disabled`).
//   - Req 20.4: nomes acessíveis nos interativos — compartilhamento, paginação
//     e navegação (rules `link-name`, `button-name`; asserções explícitas).
//
// ── Abordagem: PÁGINAS via mock da camada de queries ────────────────────────
// As páginas públicas (app/(frontend)/**/page.tsx) são Server Components
// ASSÍNCRONOS que chamam a Payload Local API (getConfiguracoes/getInformes...).
// Não é possível renderizá-las em jsdom com um banco real; então mockamos
// `@/lib/queries` com fixtures representativas (incluindo valores ausentes /
// "a confirmar" para exercitar os placeholders) e, por serem funções async,
// chamamos o componente como função: `const ui = await Page(props)` e então
// `render(ui)`. É a forma mais fiel de "axe na página".
//
// Wrappers de renderização:
//   - As páginas retornam apenas o CONTEÚDO (um <article>/<div>), sem <main>,
//     pois no app o landmark <main> vive no layout (frontend)/layout.tsx. Para
//     não gerar falsos-positivos de landmark (`region`/`landmark-one-main`),
//     envolvemos o fragmento da página em um <main> ao renderizar — espelhando
//     o layout real, em vez de desabilitar essas regras.
//
// Regras do axe DESABILITADAS e por quê (todas por CONTEXTO de renderização
// isolada, não por conteúdo):
//   - `color-contrast`: jsdom não computa CSS resolvido (as cores vêm de
//     custom properties do Tailwind v4 em globals.css, que não é carregado nos
//     testes). Contraste é coberto pelos tokens do sistema de design (task 9.2)
//     e por revisão manual — não é avaliável de forma confiável aqui.
// Regras SIGNIFICATIVAS mantidas ATIVAS: `image-alt`, `link-name`,
// `button-name`, `heading-order`, `page-has-heading-one`, `list`, `listitem`,
// `landmark-*`, `aria-*`.
//
// `next/image` é mockado por um <img> nativo (repassa `src`/`alt`), `next/link`
// por um <a href> pass-through, `next/navigation.notFound` por um throw
// controlado, e o `RichText` do lexical por um <div> simples. Mesmo padrão de
// tests/cms-image.property.test.tsx.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

import { axe } from 'vitest-axe'
// O valor do matcher vive no JS de dist; o `vitest-axe/matchers` público é
// `export type *` (só tipos), então importamos o VALOR diretamente do dist.
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'

// Augmentação de tipo do vitest (>=3.2): adiciona `toHaveNoViolations` à
// interface unificada `Matchers`, cobrindo `expect().toHaveNoViolations()`.
declare module 'vitest' {
  // A assinatura deve espelhar EXATAMENTE a do vitest
  // (`interface Matchers<T = any>` em @vitest/expect), por isso o `any` aqui —
  // é uma augmentação de tipo, não código de runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> {
    toHaveNoViolations: () => T
  }
}

// ── Extensão do expect com o matcher do axe ─────────────────────────────────
// O auto-extend do `vitest-axe` (dist/extend-expect.js) é um no-op nesta versão
// (0.1.0), então registramos o matcher manualmente aqui.
expect.extend({ toHaveNoViolations })

// ── Mocks de dependências do Next (padrão dos demais testes de componente) ───

// `next/image` → <img> nativo repassando src/alt (deixa `alt` no DOM, Req 20.1).
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props
    return <img src={src as string} alt={alt as string} {...filterDomProps(rest)} />
  },
}))

// `next/link` → <a href> pass-through, preservando aria-label/className etc.
vi.mock('next/link', () => ({
  default: (props: Record<string, unknown>) => {
    const { href, children, ...rest } = props
    return (
      <a href={typeof href === 'string' ? href : String(href)} {...filterDomProps(rest)}>
        {children as ReactNode}
      </a>
    )
  },
}))

// `next/navigation` → `usePathname` fixo (para <SiteHeader>, se usado) e
// `notFound()` que lança um erro identificável (a página de detalhe usa isso).
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

// `RichText` do lexical → <div> simples: aqui só precisamos de um bloco de
// conteúdo válido para o axe; a conversão real de rich text não é o objeto do
// teste de acessibilidade.
vi.mock('@payloadcms/richtext-lexical/react', () => ({
  RichText: () => <div>Corpo do informe.</div>,
}))

// Remove props não-DOM aceitas por next/image mas ignoradas pelo <img> nativo
// (evita warnings do React; não afeta atributos/roles sob teste do axe).
function filterDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const {
    fill: _fill,
    priority: _priority,
    loader: _loader,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blur,
    unoptimized: _unoptimized,
    sizes: _sizes,
    ...rest
  } = props
  return rest
}

// ── Mock da camada de queries com fixtures representativas ──────────────────
// As fixtures cobrem tanto o "caminho feliz" (valores presentes) quanto
// pendências ("a confirmar"/ausentes) para exercitar os <Placeholder> das
// páginas. Um único informe em destaque (invariante do domínio), com capa
// (alt não vazio) para exercitar imagem de conteúdo com `alt` (Req 20.1).

import type {
  Cardapio,
  Configuracoe,
  Cronologia,
  Informe,
  Media,
} from '../src/payload-types'

function media(alt: string, url = '/media/exemplo.png'): Media {
  return {
    id: 1,
    alt,
    url,
    width: 800,
    height: 800,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  } as unknown as Media
}

function informe(overrides: Partial<Informe> = {}): Informe {
  return {
    id: 10,
    titulo: 'Reflorestamento avança no Capão',
    slug: 'reflorestamento-avanca',
    data: '2024-05-01T00:00:00.000Z',
    etiqueta: 'Reflorestamento',
    resumo: 'Plantamos mais mudas nativas nesta estação.',
    corpo: { root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 } },
    capa: media('Mudas nativas recém-plantadas'),
    destaque: false,
    publicado: true,
    updatedAt: '2024-05-01T00:00:00.000Z',
    createdAt: '2024-05-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Informe
}

const DESTAQUE = informe({
  id: 1,
  titulo: 'Novo cardápio de verão',
  slug: 'cardapio-de-verao',
  etiqueta: 'Cardápio',
  destaque: true,
})

const RECENTES: Informe[] = [
  informe({ id: 2, titulo: 'Colheita da horta', slug: 'colheita-da-horta', etiqueta: 'Horta' }),
  // Um recente SEM capa e SEM resumo: exercita placeholders no InformeCard.
  informe({ id: 3, titulo: 'Notas do apiário', slug: 'notas-do-apiario', etiqueta: 'Apiário', capa: null, resumo: null }),
  informe({ id: 4, titulo: 'Compostagem em dia', slug: 'compostagem-em-dia', etiqueta: 'Compostagem' }),
]

const CARDAPIO: Array<{ secao: Cardapio['secao']; itens: Cardapio[] }> = [
  {
    secao: 'Bebidas',
    itens: [
      { id: 1, secao: 'Bebidas', nome: 'Suco de laranja', detalhe: 'natural', preco: 'jarra 1,5 l', ordem: 1, ativo: true, updatedAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' } as unknown as Cardapio,
      { id: 2, secao: 'Bebidas', nome: 'Refrigerante', detalhe: null, preco: 'R$ 8,00', ordem: 2, ativo: true, updatedAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' } as unknown as Cardapio,
    ],
  },
]

const CRONOLOGIA: Cronologia[] = [
  { id: 1, ano: '1992', titulo: 'Fundação', texto: 'O começo de tudo.', ilustracao: media('Foto da fundação'), ordem: 1, updatedAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' } as unknown as Cronologia,
  // Ano "a confirmar" → placeholder cinza no <Timeline> (Req 17.3).
  { id: 2, ano: 'a confirmar', titulo: 'Próximo capítulo', texto: 'Ainda por vir.', ilustracao: null, ordem: 2, updatedAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' } as unknown as Cronologia,
]

// Global de configurações com uma MISTURA de campos presentes e pendentes,
// exercitando links de contato (nomes acessíveis, Req 20.4) e placeholders.
const CONFIGURACOES: Configuracoe = {
  id: 1,
  endereco: 'Estrada do Capão, s/n',
  linkMapa: 'https://maps.example.com/capao',
  horarios: [
    { faixa: 'Sex a Dom', horario: '18h às 23h', id: 'h1' },
    { faixa: 'Feriados', horario: 'a confirmar', id: 'h2' },
  ],
  whatsapp: '+55 11 99999-0000',
  instagram: '@capaogrande',
  email: 'contato@capaogrande.com',
  chavePix: 'contato@capaogrande.com',
  qrPix: media('QR code do Pix'),
  taxasEntrega: [
    { distancia: 'até 3 km', valor: 'R$ 8,00', id: 't1' },
    { distancia: 'a confirmar', valor: 'a confirmar', id: 't2' },
  ],
  avisoRetirada: 'Retirada no local a partir das 18h.',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
} as unknown as Configuracoe

vi.mock('@/lib/queries', () => ({
  getInformeDestaque: vi.fn(async () => DESTAQUE),
  getInformesRecentes: vi.fn(async () => RECENTES),
  getInformesPagina: vi.fn(async (page: number) => ({
    // Página 1 de duas: 4 itens e hasNextPage=true para exercitar os controles
    // de paginação (Req 11.5, 20.4).
    informes: page > 1 ? RECENTES : [DESTAQUE, ...RECENTES],
    pagination: {
      page,
      perPage: 4,
      total: 6,
      loaded: page > 1 ? 6 : 4,
      hasNextPage: page === 1,
      totalPages: 2,
    },
  })),
  getInformeBySlug: vi.fn(async (slug: string) =>
    slug === 'inexistente'
      ? null
      : { informe: DESTAQUE, resumoEn: 'A summary in English.' },
  ),
  getCardapioAgrupado: vi.fn(async () => CARDAPIO),
  getCronologia: vi.fn(async () => CRONOLOGIA),
  getConfiguracoes: vi.fn(async () => CONFIGURACOES),
}))

// Importa as páginas DEPOIS dos mocks (hoisting do vi.mock cobre os módulos,
// mas mantemos os imports após por clareza).
import Home from '../app/(frontend)/page'
import InformesPage from '../app/(frontend)/informes/page'
import InformeDetalhePage from '../app/(frontend)/informes/[slug]/page'
import PizzariaPage from '../app/(frontend)/pizzaria/page'
import CardapioPage from '../app/(frontend)/cardapio/page'
import DeliveryPage from '../app/(frontend)/delivery/page'
import ProcessoPage from '../app/(frontend)/processo/page'
import SobrePage from '../app/(frontend)/sobre/page'
import NotFound from '../app/(frontend)/not-found'

// ── Configuração comum do axe ───────────────────────────────────────────────
// `color-contrast` desabilitado: jsdom não resolve o CSS do Tailwind v4
// (globals.css não é carregado nos testes), então o contraste real não é
// avaliável aqui. Todas as demais regras (image-alt, link-name, button-name,
// heading-order, page-has-heading-one, list, landmarks, aria) ficam ATIVAS.
const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },
  },
} as const

/**
 * Renderiza um fragmento de página dentro de um <main> (espelhando o layout
 * real, que fornece o landmark <main>) para que as regras de landmark do axe
 * não gerem falsos-positivos em fragmentos isolados.
 */
function renderPagina(ui: ReactElement) {
  return render(<main>{ui}</main>)
}

afterEach(() => {
  cleanup()
})

// ─────────────────────────────────────────────────────────────────────────────
// 1) axe nas páginas públicas (Req 20.1, 20.2, 20.4)
// ─────────────────────────────────────────────────────────────────────────────

describe('Acessibilidade (axe) das páginas públicas — Req 20.1, 20.2, 20.4', () => {
  it('home `/` não tem violações de axe', async () => {
    const ui = await Home()
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('listagem `/informes` (com paginação) não tem violações de axe', async () => {
    const ui = await InformesPage({ searchParams: Promise.resolve({}) })
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('detalhe `/informes/[slug]` (com ShareButtons) não tem violações de axe', async () => {
    const ui = await InformeDetalhePage({
      params: Promise.resolve({ slug: 'cardapio-de-verao' }),
    })
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('`/pizzaria` não tem violações de axe', async () => {
    const ui = await PizzariaPage()
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('`/cardapio` não tem violações de axe', async () => {
    const ui = await CardapioPage()
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('`/delivery` não tem violações de axe', async () => {
    const ui = await DeliveryPage()
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('`/processo` não tem violações de axe', async () => {
    const ui = ProcessoPage()
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('`/sobre` (com Timeline) não tem violações de axe', async () => {
    const ui = await SobrePage()
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('`not-found` (404) não tem violações de axe', async () => {
    const ui = NotFound()
    const { container } = renderPagina(ui)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2) Nomes acessíveis: ShareButtons (Req 20.4)
// ─────────────────────────────────────────────────────────────────────────────

describe('Nomes acessíveis dos botões de compartilhamento — Req 20.4', () => {
  it('cada link de compartilhamento tem um nome acessível "Compartilhar no ..."', async () => {
    const ui = await InformeDetalhePage({
      params: Promise.resolve({ slug: 'cardapio-de-verao' }),
    })
    const { getByRole } = renderPagina(ui)

    // Um link por rede, cada um com aria-label "Compartilhar no <rede>".
    expect(getByRole('link', { name: 'Compartilhar no WhatsApp' })).toBeTruthy()
    expect(getByRole('link', { name: 'Compartilhar no X' })).toBeTruthy()
    expect(getByRole('link', { name: 'Compartilhar no Facebook' })).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3) Nomes acessíveis: controles de paginação (Req 20.4)
// ─────────────────────────────────────────────────────────────────────────────

describe('Nomes acessíveis dos controles de paginação — Req 20.4', () => {
  it('página 1: "Publicações mais antigas" tem nome acessível (hasNextPage)', async () => {
    const ui = await InformesPage({ searchParams: Promise.resolve({}) })
    const { getByRole, queryByRole } = renderPagina(ui)

    // Link para a próxima página (mais antigas) presente na página 1.
    const antigas = getByRole('link', { name: 'Publicações mais antigas' })
    expect(antigas).toBeTruthy()
    expect(antigas.getAttribute('href')).toBe('/informes?page=2')

    // Na página 1 não há "mais recentes" (não existe página anterior).
    expect(queryByRole('link', { name: 'Publicações mais recentes' })).toBeNull()

    // A landmark de paginação também tem nome acessível.
    expect(getByRole('navigation', { name: 'Paginação das publicações' })).toBeTruthy()
  })

  it('página 2: "Publicações mais recentes" tem nome acessível (página anterior)', async () => {
    const ui = await InformesPage({ searchParams: Promise.resolve({ page: '2' }) })
    const { getByRole } = renderPagina(ui)

    const recentes = getByRole('link', { name: 'Publicações mais recentes' })
    expect(recentes).toBeTruthy()
    expect(recentes.getAttribute('href')).toBe('/informes?page=1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4) `alt` presente em toda imagem de conteúdo (Req 20.1)
// ─────────────────────────────────────────────────────────────────────────────

describe('Texto alternativo presente em imagens de conteúdo — Req 20.1', () => {
  it('toda <img> renderizada possui o atributo `alt` (mesmo que "")', async () => {
    // A home renderiza capa do destaque (alt não vazio) e aquarelas
    // decorativas (alt=""), cobrindo ambos os casos.
    const ui = await Home()
    const { container } = renderPagina(ui)

    const imgs = Array.from(container.querySelectorAll('img'))
    expect(imgs.length).toBeGreaterThan(0)
    for (const img of imgs) {
      // `alt` PRESENTE é o contrato (Req 20.1); vazio é válido (decorativa).
      expect(img.hasAttribute('alt')).toBe(true)
    }

    // A capa do destaque carrega o alt vindo do registro de mídia.
    const capa = imgs.find((i) => i.getAttribute('alt') === DESTAQUE_CAPA_ALT)
    expect(capa).toBeTruthy()
  })
})

const DESTAQUE_CAPA_ALT = 'Mudas nativas recém-plantadas'

// ─────────────────────────────────────────────────────────────────────────────
// 5) Hierarquia de cabeçalhos: exatamente um <h1> por página (Req 20.2)
// ─────────────────────────────────────────────────────────────────────────────

describe('Hierarquia de cabeçalhos: um único <h1> por página — Req 20.2', () => {
  const casos: Array<[string, () => Promise<ReactElement> | ReactElement]> = [
    ['home', () => Home()],
    ['informes', () => InformesPage({ searchParams: Promise.resolve({}) })],
    ['detalhe', () => InformeDetalhePage({ params: Promise.resolve({ slug: 'cardapio-de-verao' }) })],
    ['pizzaria', () => PizzariaPage()],
    ['cardapio', () => CardapioPage()],
    ['delivery', () => DeliveryPage()],
    ['processo', () => ProcessoPage()],
    ['sobre', () => SobrePage()],
    ['not-found', () => NotFound()],
  ]

  it.each(casos)('%s tem exatamente um <h1>', async (_nome, fabricar) => {
    const ui = await fabricar()
    const { container } = renderPagina(ui)
    const h1s = container.querySelectorAll('h1')
    expect(h1s.length).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6) Foco visível (Req 20.3) — DOCUMENTADO como preocupação de CSS + proxy.
// ─────────────────────────────────────────────────────────────────────────────
//
// O indicador de foco visível é implementado por `:focus-visible` (contorno
// verde #86a544) em app/globals.css (task 9.2). axe/jsdom NÃO avaliam o estilo
// computado de `:focus-visible` (o CSS do Tailwind v4 não é carregado nos
// testes), então NÃO é possível asserir o contorno aqui — isso fica para a
// revisão manual/tecnologia assistiva mencionada no design.
//
// Como PROXY verificável, garantimos que os elementos interativos são
// FOCÁVEIS por teclado: links têm `href` (entram na ordem de tabulação) e não
// há elementos interativos desabilitados que impeçam o foco.

describe('Foco visível (proxy): elementos interativos são focáveis — Req 20.3', () => {
  it('todos os links do detalhe do informe têm `href` (focáveis via teclado)', async () => {
    const ui = await InformeDetalhePage({
      params: Promise.resolve({ slug: 'cardapio-de-verao' }),
    })
    const { container } = renderPagina(ui)

    const links = Array.from(container.querySelectorAll('a'))
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      // Um <a> sem href não é focável por teclado; exigimos href não vazio.
      const href = link.getAttribute('href')
      expect(href != null && href.trim() !== '').toBe(true)
    }
  })

  it('nenhum controle interativo da home está `disabled` (não bloqueia foco)', async () => {
    const ui = await Home()
    const { container } = renderPagina(ui)
    const desabilitados = container.querySelectorAll(
      'a[aria-disabled="true"], button[disabled], [tabindex="-1"]',
    )
    expect(desabilitados.length).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7) Detalhe inexistente aciona notFound() (404 do design) — Req 12.3/20 contexto
// ─────────────────────────────────────────────────────────────────────────────

describe('Detalhe de slug inexistente aciona notFound()', () => {
  it('chamar a página com slug sem informe publicado lança NEXT_NOT_FOUND', async () => {
    await expect(
      InformeDetalhePage({ params: Promise.resolve({ slug: 'inexistente' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
