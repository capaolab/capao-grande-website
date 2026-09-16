# Design Document

## Overview

Este documento descreve o design da integração do **Payload CMS 3** ao site do Capão Grande, um aplicativo **Next.js 16.3.5** (App Router) com **React 19**, **TypeScript 5** e **Tailwind CSS v4**. O Payload é embarcado no mesmo aplicativo Next.js (código e deploy únicos), com o painel em `/admin` e persistência em Postgres via `@payloadcms/db-postgres` (Requisito 1).

A verificação da documentação instalada (`node_modules/next/dist/docs/`) e da documentação oficial do Payload confirmou os seguintes pontos que fundamentam o design:

- **Padrão de integração do Payload 3**: o Payload instala arquivos dentro de `app/` sob um _route group_ `(payload)` que contém o painel e as rotas de API REST/GraphQL. O código do site público é movido para um _route group_ paralelo — aqui chamado `(frontend)` — para conviver com o Payload sem colisão de layouts. Os arquivos de `(payload)` são importados de `@payloadcms/next` e não devem ser editados.
- **Plugin do Next**: o `next.config` precisa envolver a config com `withPayload` e ser ESM (`.mjs` ou `.ts` com projeto ESM). O projeto atual usa `next.config.ts`, que será convertido para `withPayload`.
- **Localização (Payload)**: `localization.locales`, `localization.defaultLocale` e `localization.fallback` são as chaves corretas; a localização é por **campo** (`localized: true`), armazenada como objeto por locale. `fallback: true` faz o campo cair no `defaultLocale` quando o valor do locale pedido está ausente (Requisitos 3, 6.6).
- **Postgres adapter**: `postgresAdapter({ pool: { connectionString } })` — `pool` é obrigatório. A string virá de `DATABASE_URI` (Requisito 2.2), diferente do exemplo padrão da doc que usa `DATABASE_URL`.
- **Data fetching no App Router**: Server Components assíncronos consultam dados diretamente; para consultas fora de `fetch` (Local API), a doc recomenda `React.cache` para deduplicar dentro de uma requisição. `params` é uma `Promise` no Next 16.
- **Fontes**: `next/font/google` para EB Garamond e Karla, expostas como CSS variables no layout raiz.

O bloco `nextjs-agent-rules` do `AGENTS.md` é preservado integralmente (Requisito 1.5); nenhuma etapa do design remove esse bloco.

### Objetivos de design

1. Um único código, um único deploy: Payload embarcado, admin em `/admin`, site público nas rotas de conteúdo.
2. Conteúdo 100% editável no admin; o site nunca fabrica dados — valores ausentes ou "a confirmar" viram `Placeholder_AConfirmar` em cinza (Requisitos 9.4, 19).
3. Fidelidade ao sistema de design das Diretrizes (paleta fechada, tipografia EB Garamond + Karla, raios 4–6px, borda 1px `#e4dfd2`, sem sombra) (Requisito 18).
4. Tipos gerados pelo Payload consumidos diretamente pelo frontend, garantindo _type-safety_ ponta a ponta.

## Architecture

### Estrutura de pastas (App Router + Payload)

O Payload 3 exige dois _route groups_ dentro de `app/`. A estrutura pública convive com o painel sem que os layouts colidam, porque cada _route group_ tem seu próprio `layout.tsx`.

```plaintext
capao-grande-website/
├─ app/
│  ├─ (payload)/                     # arquivos do Payload (NÃO editar) — de @payloadcms/next
│  │  ├─ admin/[[...segments]]/
│  │  │  ├─ page.tsx                 # painel /admin
│  │  │  └─ not-found.tsx
│  │  ├─ api/[...slug]/route.ts      # REST API do Payload
│  │  ├─ api/graphql/route.ts        # GraphQL
│  │  ├─ api/graphql-playground/route.ts
│  │  ├─ layout.tsx                  # layout raiz do Payload
│  │  └─ custom.scss
│  ├─ (frontend)/                    # SITE PÚBLICO (nosso código)
│  │  ├─ layout.tsx                  # layout do site: fontes, <html>, nav, footer
│  │  ├─ page.tsx                    # /  (home)
│  │  ├─ informes/
│  │  │  ├─ page.tsx                 # /informes (paginação 4/página)
│  │  │  └─ [slug]/page.tsx          # /informes/[slug]
│  │  ├─ pizzaria/page.tsx           # /pizzaria
│  │  ├─ cardapio/page.tsx           # /cardapio
│  │  ├─ delivery/page.tsx           # /delivery
│  │  ├─ processo/page.tsx           # /processo
│  │  ├─ sobre/page.tsx              # /sobre
│  │  └─ not-found.tsx               # 404 do site
│  ├─ globals.css                    # Tailwind v4 + tokens do sistema de design
│  └─ favicon.ico
├─ src/                              # (ou raiz) código do Payload
│  ├─ payload.config.ts              # config central do Payload (Requisito 1.4)
│  ├─ collections/
│  │  ├─ Informes.ts
│  │  ├─ Cardapio.ts
│  │  ├─ Cronologia.ts
│  │  ├─ Media.ts
│  │  └─ Users.ts                    # usuários do admin (auth)
│  ├─ globals/
│  │  └─ Configuracoes.ts
│  └─ payload-types.ts               # GERADO por `payload generate:types`
├─ lib/
│  ├─ payload.ts                     # getPayloadClient() com React.cache
│  ├─ queries.ts                     # consultas de dados das páginas públicas
│  └─ design/
│     ├─ fonts.ts                    # EB Garamond + Karla (next/font)
│     └─ placeholder.tsx             # Placeholder_AConfirmar
├─ components/                       # componentes de UI reutilizáveis
├─ scripts/
│  └─ seed.ts                        # script de seed (Requisito 9)
├─ media/                            # uploads no filesystem local (Requisito 4.2)
├─ public/assets/watercolor/         # aquarelas copiadas de docs/design/assets
├─ docker-compose.yml                # Dev_Postgres (Requisito 2.1)
├─ .env.example                      # DATABASE_URI, PAYLOAD_SECRET (Requisito 2.3)
├─ next.config.ts                    # withPayload(nextConfig)
└─ tsconfig.json                     # path "@payload-config" -> payload.config.ts
```

**Decisão:** manter o `payload.config.ts` e `collections/` sob `src/` (ou na raiz) é a convenção padrão do Payload; o alias `@payload-config` no `tsconfig.json` aponta para ele, e os arquivos gerados de `(payload)` importam a config por esse alias.

### Diagrama de arquitetura e fluxo de dados

```mermaid
flowchart TD
    subgraph Browser["Navegador"]
        Visitor["Visitante"]
        Editor["Editor de conteúdo"]
    end

    subgraph NextApp["Aplicativo Next.js 16 (deploy único)"]
        subgraph Frontend["Route group (frontend) — Server Components"]
            Home["/ (home)"]
            Informes["/informes + /informes/[slug]"]
            OutrasPaginas["/pizzaria /cardapio /delivery /processo /sobre"]
            Comp["Componentes UI + Sistema de Design"]
        end
        subgraph PayloadRG["Route group (payload)"]
            Admin["/admin (painel)"]
            RestApi["/api/* (REST/GraphQL)"]
        end
        LocalAPI["Payload Local API (getPayload)\nlib/payload.ts + lib/queries.ts"]
        Config["payload.config.ts\ncoleções + global + localização"]
    end

    subgraph Infra["Infraestrutura"]
        PG[("Postgres\n@payloadcms/db-postgres")]
        FS[["Filesystem local\n/media (uploads)"]]
    end

    Visitor -->|HTTP| Frontend
    Editor -->|login| Admin
    Home --> LocalAPI
    Informes --> LocalAPI
    OutrasPaginas --> LocalAPI
    Frontend --> Comp
    Admin --> Config
    RestApi --> Config
    LocalAPI --> Config
    Config -->|Drizzle| PG
    Config -->|leitura/escrita de arquivos| FS
    Comp -->|<Image> src público| FS
```

### Padrão de acesso a dados

As páginas públicas são **Server Components assíncronos** que usam a **Payload Local API** (sem latência de rede, roda no mesmo processo). Um cliente Payload único é obtido via `getPayload({ config })` e memoizado por requisição com `React.cache` (recomendação da doc de fetching para acesso não-`fetch`).

```ts
// lib/payload.ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { cache } from 'react'

export const getPayloadClient = cache(async () => {
  return getPayload({ config })
})
```

Todas as consultas de página ficam em `lib/queries.ts`, cada uma tipada com os tipos gerados. Leituras públicas sempre filtram por `publicado`/`ativo` e usam o locale pt-BR por padrão (Requisitos 3.5, 5.8, 6.6).

## Components and Interfaces

### Camada de dados (queries)

Assinaturas das consultas usadas pelas páginas (implementadas com a Local API `payload.find` / `payload.findGlobal`):

```ts
// lib/queries.ts
import type { Locale } from '@/src/payload-types' // 'pt' | 'en' derivado da config

// Home
export function getInformeDestaque(): Promise<Informe | null>          // Req 10.1, 10.4
export function getInformesRecentes(excludeId?: string, limit = 3): Promise<Informe[]> // Req 10.2

// Listagem /informes
export function getInformesPagina(page: number, perPage = 4): Promise<{
  docs: Informe[]
  totalDocs: number
  page: number
  hasNextPage: boolean
}>                                                                     // Req 11.1, 11.2, 11.4

// Detalhe
export function getInformeBySlug(slug: string): Promise<Informe | null> // Req 12.1, 12.3

// Cardápio agrupado por seção, ordenado por `ordem`
export function getCardapioAgrupado(): Promise<Record<SecaoCardapio, ItemCardapio[]>> // Req 14.1, 14.2

// Cronologia ordenada por `ordem` asc
export function getCronologia(): Promise<MarcoCronologia[]>            // Req 7.4, 17.2

// Global
export function getConfiguracoes(): Promise<Configuracoes>            // Req 8, 13, 15
```

Regras de consulta (mapeadas a requisitos):

- **Destaque da home**: `find({ collection: 'informes', where: { destaque: { equals: true }, publicado: { equals: true } }, limit: 1 })` retorna o único `Informe_Destaque` ou `null` (Req 10.1). A unicidade é garantida por hook de escrita (ver Data Models), então a consulta não precisa desempatar.
- **Recentes na home**: `where: { publicado: { equals: true }, id: { not_equals: destaqueId } }, sort: '-data', limit: 3` (Req 10.2).
- **Listagem paginada**: `find({ ..., sort: '-data', limit: 4, page })`. O Payload retorna `totalDocs`, `page`, `hasNextPage` — usados pelo contador "X de Y" e pelo botão "Publicações mais antigas" (Req 11.1–11.5).
- **Cardápio**: `find({ collection: 'cardapio', where: { ativo: { equals: true } }, sort: 'ordem', limit: 0 })`, depois agrupado por `secao` em memória preservando a ordem (Req 14.1, 14.2).
- **Cronologia**: `sort: 'ordem'` ascendente (Req 7.4, 17.2).

### Layout e navegação compartilhados

- **`app/(frontend)/layout.tsx`** — define `<html lang="pt-BR">`, aplica as CSS variables das fontes, e envolve o conteúdo com `<SiteHeader>` e `<SiteFooter>`. Largura máxima 1120px, respiro lateral 24px (Req 18.6).
- **`<SiteHeader>`** — cabeçalho fixo (`sticky top-0`), fundo translúcido com `backdrop-blur`, borda inferior `#e4dfd2`. Logo completo com altura mínima 88px; navegação em uma linha que quebra em duas em telas estreitas. Item ativo em `#55453a`, hover em `#86a544` (Req 18.4). Usa o grafismo circular no rodapé/favicon.
- **`<SiteFooter>`** — grafismo circular + contatos do `Global_Configuracoes`, com `Placeholder_AConfirmar` para campos ausentes.

### Componentes reutilizáveis

| Componente | Uso | Requisitos |
| --- | --- | --- |
| `<NavCard>` | 3 cartões clicáveis na home (`/processo`, `/delivery`, `/pizzaria`), card inteiro clicável, aquarela + título + texto + link | 10.3, 18.8 |
| `<InformeCard>` | Cartão/linha de informe (data, etiqueta, título clicável, resumo) na home e na listagem | 10.2, 11.1 |
| `<HoursTable>` | Tabela de horários a partir do array `horarios` (faixa/horário); placeholder se ausente | 13.1, 13.2 |
| `<MenuSection>` | Seção do cardápio com filete `#b9cc6a`, nome à esquerda e `preco` à direita separados por linha fina, texto do preço palavra por palavra | 14.1–14.4 |
| `<StepList>` | Lista numerada de passos (delivery: 3 passos; processo: 5 passos), numeração em `#b9cc6a` | 15.1, 16.1 |
| `<Timeline>` | Linha do tempo da cronologia, uma aquarela por marco alinhada à direita (desce abaixo do texto em telas estreitas) | 17.1–17.3 |
| `<Placeholder>` | `Placeholder_AConfirmar` em cinza (`#a89c8a`), sem dados fabricados | 19.1, 19.2 |
| `<ShareButtons>` | Botões de compartilhamento no detalhe do informe, com nomes acessíveis | 12.2, 20.4 |
| `<Watercolor>` | Renderiza aquarela de `public/assets/watercolor`, fundo claro, sem sombra/borda, `alt` apropriado | 18.8, 20.1 |
| `<CmsImage>` | Wrapper de `next/image` que lê `url` e `alt` de `Colecao_Media`; capa 1:1 quando aplicável | 4.4, 5.3, 20.1 |

### Sistema de design (implementação)

**Fontes** (`lib/design/fonts.ts`), via `next/font/google` — EB Garamond para títulos, números (cronologia/processo), itálicos em inglês e frases de destaque (peso 500); Karla para corpo, navegação, botões, etiquetas e tabelas (pesos 400/500/700) (Req 18.1):

```ts
import { EB_Garamond, Karla } from 'next/font/google'

export const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})
```

**Tokens Tailwind v4** (`app/globals.css`) — a paleta é fechada; nenhum outro tom entra no site (Req 18.2). Raios 4–6px, borda 1px `#e4dfd2`, sem sombra (Req 18.3):

```css
@import "tailwindcss";

@theme {
  --color-marrom: #55453a;      /* texto principal, botões primários, item ativo nav */
  --color-marrom-escuro: #3e3229; /* hover de botão primário (Req 18.5) */
  --color-paragrafo: #6b6052;   /* texto corrido */
  --color-verde: #86a544;       /* títulos de seção, links, foco, hover (Req 18.4) */
  --color-oliva: #b9cc6a;       /* etiqueta destaque, filete cardápio, numeração processo */
  --color-fundo: #faf7f0;       /* fundo do site */
  --color-papel: #fffdf8;       /* fundo de cards, rodapé, blocos */
  --color-borda: #e4dfd2;       /* linhas, bordas, divisores */
  --color-borda-clara: #ece8dc; /* variante em listas */
  --color-placeholder: #a89c8a; /* texto de "a confirmar" */

  --font-serif: var(--font-serif); /* EB Garamond */
  --font-sans: var(--font-sans);   /* Karla */

  --radius: 5px;                /* dentro de 4–6px (Req 18.3) */

  --spacing-conteudo: 1120px;   /* largura máx (Req 18.6) */
  --spacing-leitura: 820px;     /* páginas de leitura 760–900px */
}
```

Grades reflow automático: `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` (ou até 320px), tudo desce para coluna única em telas pequenas (Req 18.7). Hover: borda/texto para `#86a544`, botão primário escurece para `#3e3229`, sem animação de escala (Req 18.4, 18.5).

**Aquarelas**: as imagens em `docs/design/assets` (`arvore-1..6`, `banana`, `erva`, `legumes`, `mel`, `molho`, `palmeira`, `vinho`, `logo`, `mark`) são copiadas para `public/assets/watercolor/`. São o **único** repertório ilustrativo; nenhuma ilustração nova é criada (Req 18.8). Uma aquarela por bloco, sobre fundo claro, sem sombra/recorte/borda.

### Estratégia de placeholder "a confirmar"

Um único componente `<Placeholder label="..." />` centraliza o comportamento (Req 19). Um helper `isAConfirmar(value)` trata como pendente: `null`, `undefined`, string vazia, ou string igual a "a confirmar" (case-insensitive, com/sem acento). As páginas nunca renderizam valor fabricado:

```tsx
export function isAConfirmar(v?: string | null): boolean {
  if (v == null) return true
  const t = v.trim().toLowerCase()
  return t === '' || t === 'a confirmar'
}
// Uso: {isAConfirmar(cfg.whatsapp) ? <Placeholder label="WhatsApp a confirmar" /> : <a href={...}>{cfg.whatsapp}</a>}
```

Aplica-se a horários, endereço, `linkMapa`, WhatsApp, Instagram, e-mail, chave Pix, QR Pix, anos da cronologia, detalhes de massa e fotos quadradas (Req 13.2, 15.4, 16.2, 17.3, 19.2). Para imagens ausentes, um placeholder listrado com legenda do que entra ali (padrão do protótipo), sem bloco vazio.

### Acessibilidade

- `alt` de toda imagem de conteúdo vem do campo de texto alternativo da `Colecao_Media` (Req 4.3, 20.1); aquarelas decorativas usam `alt=""`.
- Hierarquia de cabeçalhos sequencial por página: um `<h1>` por página, o "olho" (15px caixa alta, `#86a544`) é um rótulo de seção estilizado, não um heading fora de ordem (Req 20.2).
- Indicador de foco visível em todos os interativos (`:focus-visible` com contorno em `#86a544`) (Req 20.3).
- Nomes acessíveis (`aria-label`) para botões de compartilhamento, controles de navegação e paginação (Req 20.4).

## Data Models

Os tipos abaixo refletem os campos das coleções; o Payload gera `src/payload-types.ts` via `payload generate:types`, e o frontend importa esses tipos (nunca redefine manualmente). Os _shapes_ TypeScript a seguir documentam a intenção do design.

### Localização e locales

```ts
// Config de localização (payload.config.ts) — Req 3.1, 3.5, 6.6
localization: {
  locales: [
    { code: 'pt', label: 'Português (BR)' },
    { code: 'en', label: 'English' },
  ],
  defaultLocale: 'pt',   // pt-BR como padrão (Req 3.1, 3.5)
  fallback: true,        // en ausente cai para pt (Req 3.6)
}
```

### Colecao_Informes (Requisito 5)

```ts
type Etiqueta =
  | 'Funcionamento' | 'Reflorestamento' | 'Horta'
  | 'Compostagem' | 'Apiário' | 'Viveiro' | 'Cardápio' // Req 5.2

interface Informe {
  id: string
  titulo: string        // localized pt/en (Req 3.3)
  slug: string          // único, index
  data: string          // date
  etiqueta: Etiqueta    // select restrito (Req 5.2)
  destaque: boolean     // checkbox; no máx. 1 marcado (Req 5.4, 5.5)
  resumo: string        // localized pt/en, maxLength 200 (Req 3.3, 5.6)
  corpo: RichText        // lexical rich text (Req 5.7), localized pt/en (Req 3.3)
  capa: Media           // upload 1:1 (Req 5.3)
  publicado: boolean     // filtro de leitura pública (Req 5.8)
}
```

Definição dos campos e regras (Payload):

- `slug` — `unique: true`, gerado do `titulo` via hook `beforeValidate` se vazio.
- `etiqueta` — `type: 'select'` com as sete opções fixas (Req 5.2).
- `capa` — `type: 'upload', relationTo: 'media'`, com `imageSizes`/crop forçando proporção **1:1** (Req 5.3).
- `resumo` — `type: 'textarea', maxLength: 200, localized: true` (Req 5.6, 3.3).
- `corpo` — `type: 'richText'` (lexical), `localized: true` (Req 5.7, 3.3).
- **Único destaque** — `hook afterChange`/`beforeChange` na coleção: quando um documento é salvo com `destaque: true`, um `payload.update` desmarca `destaque` em todos os demais registros, mantendo no máximo um `Informe_Destaque` (Req 5.5). O hook é _idempotente_: salvar um destaque já único não altera os demais.

### Colecao_Cardapio (Requisito 6)

```ts
type SecaoCardapio = 'Pizzas' | 'Tamanhos' | 'Bebidas' | 'Vinhos' // Req 6.2

interface ItemCardapio {
  id: string
  secao: SecaoCardapio  // select restrito (Req 6.2)
  nome: string
  detalhe: string        // localized pt/en (Req 3.4)
  preco: string          // TEXTO, nunca número (Req 6.3): "R$ 30,00", "ver tamanhos", "dose", "jarra 1,5 l"
  ordem: number          // ordenação dentro da seção (Req 6.5)
  ativo: boolean         // filtro público (Req 6.6)
}
```

`preco` é `type: 'text'` de propósito, para preservar formatos não numéricos; a renderização exibe o texto palavra por palavra sem reformatação (Req 6.4, 14.4).

### Colecao_Cronologia (Requisito 7)

```ts
interface MarcoCronologia {
  id: string
  ano: string        // TEXTO (Req 7.2): aceita "ano a confirmar", "hoje"
  titulo: string
  texto: string
  ilustracao?: Media  // upload (Req 7.3)
  ordem: number       // ordenação asc (Req 7.4)
}
```

`ano` é texto para permitir "a confirmar" e "hoje" (Req 7.2, 17.3).

### Colecao_Media (Requisito 4)

```ts
interface Media {
  id: string
  alt: string        // texto alternativo (Req 4.3, 20.1)
  url: string        // URL pública servida do filesystem (Req 4.4)
  filename: string
  width?: number
  height?: number
  sizes?: Record<string, { url: string; width: number; height: number }>
}
```

Config de upload: `upload: { staticDir: path.resolve(dirname, '../media') }`, armazenando no **filesystem local** (Req 4.2). Os arquivos são servidos pela rota de arquivos do Payload / diretório estático, e `url`/`alt` ficam disponíveis para as páginas (Req 4.4, 20.1).

### Global_Configuracoes (Requisito 8)

```ts
interface Configuracoes {
  endereco: string
  linkMapa: string
  horarios: { faixa: string; horario: string }[]      // array (Req 8.2)
  whatsapp: string
  instagram: string
  email: string
  chavePix: string
  qrPix?: Media                                        // upload (Req 8.4)
  taxasEntrega: { distancia: string; valor: string }[] // array (Req 8.3)
  avisoRetirada: string
}
```

Todos os campos textuais aceitam o marcador "a confirmar"; o frontend aplica `<Placeholder>` quando `isAConfirmar` é verdadeiro (Req 13.2, 15.4, 19).

### Consumo dos tipos gerados no frontend

`payload generate:types` produz `src/payload-types.ts` com `Informe`, `Cardapio`, `Cronologia`, `Media`, `Config` (global) e o tipo de locales. `lib/queries.ts` e os componentes importam esses tipos (`import type { Informe } from '@/src/payload-types'`), evitando duplicação e garantindo que mudanças de schema quebrem a compilação onde necessário.

## Error Handling

### Inicialização

- **`DATABASE_URI` ausente** (Req 2.4): a config valida `process.env.DATABASE_URI` antes de construir o adapter; se ausente, registra erro identificando a variável e interrompe a inicialização (lança exceção), em vez de subir com pool inválido.
- **`PAYLOAD_SECRET`**: lido de env e passado a `secret` da config para assinar sessões do admin (Req 2.5). Sem segredo, a inicialização falha do mesmo modo.

```ts
const connectionString = process.env.DATABASE_URI
if (!connectionString) {
  throw new Error('Variável de ambiente ausente: DATABASE_URI é obrigatória para iniciar o Payload.')
}
```

### Rotas públicas

- **`/informes/[slug]` inexistente ou não publicado** (Req 12.3): a query retorna `null` → a página chama `notFound()` do Next, servindo `app/(frontend)/not-found.tsx` (404).
- **Resumo em inglês ausente** no detalhe (Req 12.4): com `fallback: true` o Payload devolveria o pt; para omitir a seção "em inglês" a query lê o campo com `locale: 'en'` e `fallbackLocale: 'none'` **apenas para a seção secundária**, e a seção é omitida se vazia (sem fabricar conteúdo).
- **Sem `Informe_Destaque`** (Req 10.4): hero renderiza sem conteúdo fabricado, aplicando `<Placeholder>` quando aplicável.
- **Falha de leitura da Local API**: erros inesperados sobem para o `error.tsx` do route group `(frontend)`, exibindo uma página de erro dentro do sistema de design.

### Placeholders vs. erros

Dados "a confirmar" ou ausentes **não** são erros: são renderizados como `Placeholder_AConfirmar` (Req 19). Somente falhas técnicas (DB indisponível, slug inexistente) acionam páginas de erro/404.

## Docker Compose e variáveis de ambiente

`docker-compose.yml` provisiona a `Dev_Postgres` para desenvolvimento local (Req 2.1):

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: capao
      POSTGRES_PASSWORD: capao
      POSTGRES_DB: capao_grande
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`.env.example` (Req 2.3):

```bash
DATABASE_URI=postgres://capao:capao@localhost:5432/capao_grande
PAYLOAD_SECRET=troque-por-um-segredo-longo-e-aleatorio
```

Adapter (Req 2.2, 1.3):

```ts
db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })
```

## Seed script design (Requisito 9)

`scripts/seed.ts` usa a Local API fora do Next (`import config from '@payload-config'; const payload = await getPayload({ config })`) e popula `informes`, `cardapio`, `cronologia` e o global `configuracoes` (Req 9.1):

- Cria vários informes, com **no máximo um** `destaque: true` (Req 9.2). O hook de unicidade reforça a invariante mesmo que o seed erre.
- Itens do cardápio preservam os textos do cardápio impresso **palavra por palavra** (Req 9.3, 6.3) — incluindo "ver tamanhos", "dose", "jarra 1,5 l" e frases como "Saboreiem com prazer!".
- Para dados reais desconhecidos (horários, endereço, link do Maps, WhatsApp, Instagram, e-mail, chave Pix, QR Pix, anos da cronologia), grava o marcador **"a confirmar"** em vez de fabricar (Req 9.4, 19.2).
- Idempotência: o seed limpa/repovoa de forma previsível para reexecução em ambiente de desenvolvimento.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: No máximo um informe em destaque

*For any* sequência de operações de salvamento na `Colecao_Informes`, após cada salvamento a quantidade de registros com `destaque` verdadeiro deve ser no máximo 1, e salvar um registro com `destaque` marcado deve resultar em exatamente esse registro em destaque.

**Validates: Requirements 5.5, 9.2**

### Property 2: Leitura pública de informes só retorna publicados

*For any* conjunto de informes e qualquer página consultada na listagem pública, todos os informes retornados devem ter `publicado` verdadeiro.

**Validates: Requirements 5.8, 11.1**

### Property 3: Leitura pública do cardápio só retorna ativos

*For any* conjunto de itens de cardápio, toda listagem pública deve retornar apenas itens com `ativo` verdadeiro.

**Validates: Requirements 6.6**

### Property 4: Preço é preservado palavra por palavra

*For any* string de `preco` armazenada, o texto renderizado na página do cardápio deve ser exatamente igual à string armazenada, sem reformatação numérica.

**Validates: Requirements 6.3, 6.4, 14.4, 9.3**

### Property 5: Ordenação da cronologia por `ordem` crescente

*For any* conjunto de marcos de cronologia, a lista renderizada deve estar ordenada de forma não decrescente pelo campo `ordem`.

**Validates: Requirements 7.4, 17.2**

### Property 6: Agrupamento do cardápio por seção preservando ordem

*For any* conjunto de itens ativos, o agrupamento por `secao` deve conter todo item ativo exatamente uma vez, e dentro de cada seção os itens devem estar em ordem não decrescente por `ordem`.

**Validates: Requirements 14.1, 14.2, 6.5**

### Property 7: Paginação da listagem de informes

*For any* total de informes publicados e qualquer número de página válido, a listagem deve retornar no máximo 4 informes, em ordem cronológica inversa por `data`, e o botão "Publicações mais antigas" deve estar presente se e somente se existem informes publicados além dos já exibidos.

**Validates: Requirements 11.2, 11.1, 11.3, 11.5**

### Property 8: Contador consistente com o total

*For any* estado de paginação da listagem, o contador de exibidos deve ser menor ou igual ao total de informes publicados e igual à soma dos informes já carregados.

**Validates: Requirements 11.4**

### Property 9: Fallback de localização para pt

*For any* campo localizado cujo valor em `en` esteja ausente, uma leitura no locale `en` com fallback habilitado deve retornar o valor em `pt`; e uma leitura sem locale informado deve retornar o valor em `pt`.

**Validates: Requirements 3.5, 3.6, 3.1**

### Property 10: Placeholder para valores ausentes ou "a confirmar"

*For any* valor de campo textual de contato/configuração, se o valor está ausente, vazio ou igual a "a confirmar", a renderização deve exibir o `Placeholder_AConfirmar` em cinza e nunca um valor fabricado.

**Validates: Requirements 19.1, 19.2, 13.2, 15.4, 16.2, 17.3, 10.4**

### Property 11: Slug de informe resolve documento publicado ou 404

*For any* slug, a rota `/informes/[slug]` deve exibir o informe correspondente se e somente se existe um informe publicado com aquele slug; caso contrário deve responder 404.

**Validates: Requirements 12.1, 12.3**

### Property 12: Texto alternativo de imagens de conteúdo

*For any* imagem de conteúdo renderizada a partir da `Colecao_Media`, o atributo `alt` da imagem deve ser igual ao texto alternativo armazenado no registro de mídia correspondente.

**Validates: Requirements 4.3, 20.1**

## Testing Strategy

Abordagem dupla: **testes de propriedade** (universais, muitos inputs) e **testes por exemplo/integração** (cenários específicos e infraestrutura). Configuração de PBT: mínimo de 100 iterações por propriedade; cada teste referencia a propriedade do design com a tag **Feature: payload-cms-integration, Property {n}: {texto}**.

### Testes de propriedade (lógica pura / do nosso código)

Focados em funções puras extraídas da camada de dados e UI (sem depender de rede/DB), usando um _runner_ de PBT (ex.: fast-check):

- **Property 1** — modelo do hook de unicidade de destaque: dada uma lista de informes e uma sequência de "marcar destaque", a invariante "≤ 1 destaque" se mantém. Testado contra uma implementação em memória do hook.
- **Property 4** — função de renderização de preço é identidade sobre a string.
- **Property 5, 6** — funções `ordenarCronologia` e `agruparCardapio` sobre listas geradas aleatoriamente (invariantes de ordenação e cobertura).
- **Property 7, 8** — função de paginação `paginar(total, page, perPage=4)` (limite ≤ 4, presença do botão, contador consistente) sobre totais e páginas aleatórias.
- **Property 9** — função `resolverLocalizado(valor, locale, fallback)` (metamórfica: en ausente ⇒ retorna pt).
- **Property 10** — `isAConfirmar` e o mapeamento para placeholder sobre strings arbitrárias (incluindo espaços, acentos, caixa).

### Testes por exemplo / edge cases

- `isAConfirmar` para "", "  ", "a confirmar", "A Confirmar", "hoje" (não-placeholder para conteúdo legítimo).
- Home sem `Informe_Destaque` renderiza hero com placeholder (Req 10.4).
- Detalhe omite seção em inglês quando `resumo` en ausente (Req 12.4).
- Cardápio preserva "ver tamanhos", "jarra 1,5 l" (Req 6.3).

### Testes de integração (Payload + Postgres)

Com um Postgres de teste (o serviço do `docker-compose` ou container efêmero), 1–3 exemplos por caso — não PBT, pois exercitam infraestrutura:

- Hook de destaque único de ponta a ponta via Local API (`payload.update` marca um, desmarca os demais) — reforça **Property 1** no banco real (Req 5.5).
- Leitura pública filtra `publicado`/`ativo` (Req 5.8, 6.6).
- Fallback de localização real: campo `en` vazio retorna `pt` (Req 3.6).
- Upload de mídia grava no filesystem e expõe `url`/`alt` (Req 4.2, 4.4).
- `/informes/[slug]` inexistente → 404 (Req 12.3).
- Seed cria no máximo um destaque e preserva textos do cardápio (Req 9.2, 9.3).

### Smoke / configuração

- Inicialização falha com mensagem clara quando `DATABASE_URI` está ausente (Req 2.4) — teste único.
- `/admin` responde (painel montado) e `withPayload` está aplicado (Req 1.2).
- Fontes EB Garamond/Karla carregam via `next/font` (variáveis CSS presentes no HTML) (Req 18.1).

### Acessibilidade

- Verificação automatizada (axe) das páginas públicas: hierarquia de headings (Req 20.2), foco visível (Req 20.3), nomes acessíveis de botões de compartilhamento e paginação (Req 20.4), `alt` presente (Req 20.1). Complementada por revisão manual, já que conformidade WCAG completa exige teste com tecnologia assistiva e revisão especializada.

### Visual / design system

- Testes de snapshot dos componentes (`<NavCard>`, `<MenuSection>`, `<Timeline>`, `<Placeholder>`) para fixar a fidelidade ao sistema de design (paleta, raios, bordas, ausência de sombra) (Req 18) — snapshot em vez de PBT por serem saídas de renderização determinísticas.
