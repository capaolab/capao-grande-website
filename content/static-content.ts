// content/static-content.ts — camada de conteúdo do build ESTÁTICO de preview
// (Vercel, `CONTENT_SOURCE=static`; ver .github/workflows/deploy-preview.yml).
//
// Resolve os mesmos dados de content/seed-data.ts em memória, no formato que
// `lib/queries.ts` devolveria a partir do Payload Local API — sem Payload, sem
// Postgres, sem nenhuma chamada de rede. Cada `getXxx` aqui é o espelho do
// `getXxx` correspondente em lib/queries.ts (mesma assinatura, mesmo
// comportamento observável), exceto pela paginação de `/informes` (ver
// `getInformesPagina` abaixo).
//
// Este módulo NUNCA deve importar 'payload', '@payloadcms/*' nem
// '@payload-config': é o que permite ao build estático rodar sem
// DATABASE_URI/PAYLOAD_SECRET (Requisito do ambiente de preview na Vercel).

import type { Cardapio, Configuracoe, Cronologia, Informe } from '@/src/payload-types'

import { agruparCardapio, type SecaoAgrupada } from '@/lib/cardapio'
import { ordenarCronologia } from '@/lib/cronologia'
import type { InformesPagina } from '@/lib/queries'
import { slugify } from '@/src/collections/Informes'
import {
  CARDAPIO,
  CONFIGURACOES,
  CRONOLOGIA,
  INFORMES,
  richText,
  type SeedInforme,
} from '@/content/seed-data'

// Timestamp único para todos os documentos sintéticos: o build estático é
// reproduzível (mesma entrada -> mesma saída), então um valor fixo por build
// é suficiente — não há "quando foi criado" real a preservar.
const BUILD_TIMESTAMP = new Date().toISOString()

function paraInforme(seed: SeedInforme, id: number): Informe {
  return {
    id,
    titulo: seed.titulo,
    slug: slugify(seed.titulo),
    data: seed.data,
    etiqueta: seed.etiqueta,
    resumo: seed.resumoPt,
    corpo: richText(seed.corpoPt),
    // Nenhuma imagem de capa no seed (Req 9.4: nunca fabricar mídia) — o
    // <CmsImage> já trata `capa` ausente como placeholder listrado, igual ao
    // comportamento do seed real no Postgres.
    capa: null,
    destaque: seed.destaque,
    publicado: seed.publicado,
    updatedAt: BUILD_TIMESTAMP,
    createdAt: BUILD_TIMESTAMP,
  }
}

// Todos os informes (publicados e não) com o mesmo `id`/`slug` estáveis em
// todo o módulo, para que as funções abaixo sejam consistentes entre si.
const TODOS_INFORMES: Informe[] = INFORMES.map((seed, index) => paraInforme(seed, index + 1))

// `resumoEn` por id, espelhando a query real (`fallbackLocale: 'none'`): só
// existe quando o seed definiu `resumoEn`; do contrário é `null` (nunca cai
// para o pt), igual à leitura em locale 'en' de lib/queries.ts.
const RESUMO_EN_POR_ID = new Map<number, string | null>(
  TODOS_INFORMES.map((informe, index) => [informe.id, INFORMES[index]?.resumoEn ?? null]),
)

function porDataDesc(a: Informe, b: Informe): number {
  const dataA = a.data ? Date.parse(a.data) : 0
  const dataB = b.data ? Date.parse(b.data) : 0
  return dataB - dataA
}

function publicados(): Informe[] {
  return TODOS_INFORMES.filter((informe) => informe.publicado === true)
}

/** Espelha `getInformeDestaque` de lib/queries.ts. */
export function getInformeDestaque(): Informe | null {
  return publicados().find((informe) => informe.destaque === true) ?? null
}

/** Espelha `getInformesRecentes` de lib/queries.ts. */
export function getInformesRecentes(limit = 3, excludeId?: number): Informe[] {
  return publicados()
    .filter((informe) => excludeId == null || informe.id !== excludeId)
    .sort(porDataDesc)
    .slice(0, limit)
}

/**
 * Espelha `getInformesPagina` de lib/queries.ts, mas SEM paginar: devolve
 * todos os publicados numa página só (`hasNextPage: false`).
 *
 * Motivo: `/informes` navega entre páginas por query string
 * (`?page=2`, ver app/(frontend)/informes/page.tsx), e o export estático do
 * Next gera um único HTML por rota — variações de query string não produzem
 * páginas distintas. Paginar de verdade faria o link "Publicações mais
 * antigas" parecer quebrado (recarrega a mesma página 1). Como este é um
 * ambiente de QA visual, mostrar tudo de uma vez é o comportamento correto;
 * o volume de seed (poucas dezenas de itens, no máximo) não justifica scroll
 * infinito nem paginação client-side só para o preview.
 */
export function getInformesPagina(_page: number): InformesPagina {
  const informes = publicados().sort(porDataDesc)
  return {
    informes,
    pagination: {
      page: 1,
      perPage: informes.length,
      total: informes.length,
      offset: 0,
      loaded: informes.length,
      hasNextPage: false,
    },
  }
}

/** Espelha `getInformeBySlug` de lib/queries.ts. */
export function getInformeBySlug(
  slug: string,
): { informe: Informe; resumoEn: string | null } | null {
  const informe = publicados().find((item) => item.slug === slug)
  if (!informe) return null

  return { informe, resumoEn: RESUMO_EN_POR_ID.get(informe.id) ?? null }
}

/** Slugs de todos os informes publicados, para `generateStaticParams`. */
export function getInformesSlugsEstaticos(): string[] {
  return publicados()
    .map((informe) => informe.slug)
    .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
}

/** Espelha `getCardapioAgrupado` de lib/queries.ts. */
export function getCardapioAgrupado(): SecaoAgrupada<Cardapio>[] {
  const itens: Cardapio[] = CARDAPIO.map((item, index) => ({
    id: index + 1,
    secao: item.secao,
    nome: item.nome,
    detalhe: item.detalhe,
    preco: item.preco,
    ordem: item.ordem,
    ativo: true,
    updatedAt: BUILD_TIMESTAMP,
    createdAt: BUILD_TIMESTAMP,
  }))

  return agruparCardapio(itens)
}

/** Espelha `getCronologia` de lib/queries.ts. */
export function getCronologia(): Cronologia[] {
  const marcos: Cronologia[] = CRONOLOGIA.map((marco, index) => ({
    id: index + 1,
    ano: marco.ano,
    titulo: marco.titulo,
    texto: marco.texto,
    ilustracao: null,
    ordem: marco.ordem,
    updatedAt: BUILD_TIMESTAMP,
    createdAt: BUILD_TIMESTAMP,
  }))

  return ordenarCronologia(marcos)
}

/** Espelha `getConfiguracoes` de lib/queries.ts. */
export function getConfiguracoes(): Configuracoe {
  return {
    id: 1,
    ...CONFIGURACOES,
    qrPix: null,
    updatedAt: BUILD_TIMESTAMP,
    createdAt: BUILD_TIMESTAMP,
  }
}
