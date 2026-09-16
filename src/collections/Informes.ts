import type { CollectionConfig } from 'payload'

import { idsParaDesmarcarDestaque, type InformeDestaqueState } from './informes-destaque'

// Colecao_Informes (Requisito 5): publicações/notícias do site.
//
// Campos (Req 5.1): titulo, slug, data, etiqueta, destaque, resumo, corpo,
// capa, publicado. Localização pt/en em `titulo`, `resumo` e `corpo` (Req 3.3);
// `resumo` limitado a 200 caracteres (Req 5.6); `corpo` é rich text lexical
// herdando o editor registrado no nível da config (Req 5.7); `capa` é upload
// de imagem 1:1 (Req 5.3); `etiqueta` restrito às 7 opções fixas (Req 5.2);
// `destaque` é checkbox com invariante de unicidade (Req 5.4, 5.5).

// As sete opções fixas de `etiqueta` (Req 5.2). Os `value`s são preservados
// exatamente como especificado no design/requisitos, incluindo acentos, para
// que a leitura pública e o seed usem os mesmos valores.
const ETIQUETAS = [
  'Funcionamento',
  'Reflorestamento',
  'Horta',
  'Compostagem',
  'Apiário',
  'Viveiro',
  'Cardápio',
] as const

// Slugify simples: normaliza acentos, minúsculas, troca não-alfanuméricos por
// hífen e remove hífens nas pontas. Usado pelo hook de geração de slug.
function slugify(input: string): string {
  return input
    .normalize('NFD')
    // Remove marcas diacríticas (acentos) sem depender de dependências externas.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Informes: CollectionConfig = {
  slug: 'informes',
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'etiqueta', 'data', 'destaque', 'publicado'],
  },
  access: {
    // Leitura liberada; as leituras públicas filtram por `publicado` na camada
    // de queries (Req 5.8).
    read: () => true,
  },
  fields: [
    {
      name: 'titulo',
      type: 'text',
      required: true,
      localized: true, // Req 3.3
      label: 'Título',
    },
    {
      name: 'slug',
      type: 'text',
      unique: true, // Req 5.1: slug único
      index: true,
      admin: {
        description: 'Gerado automaticamente a partir do título se deixado em branco.',
      },
      hooks: {
        // Gera o slug a partir do `titulo` quando vazio (Req 5.1). O slug não é
        // localizado: é o identificador único da URL do informe.
        beforeValidate: [
          ({ value, data, originalDoc }) => {
            if (typeof value === 'string' && value.trim() !== '') {
              return slugify(value)
            }
            // `data.titulo`/`originalDoc.titulo` podem ser objetos por locale
            // (campo localizado) ou string, dependendo do fluxo. Resolvemos o
            // pt como base do slug.
            const titulo = resolverTituloBase(data?.titulo ?? originalDoc?.titulo)
            if (titulo) {
              return slugify(titulo)
            }
            return value
          },
        ],
      },
    },
    {
      name: 'data',
      type: 'date',
      label: 'Data',
    },
    {
      name: 'etiqueta',
      type: 'select',
      required: true,
      label: 'Etiqueta',
      options: ETIQUETAS.map((etiqueta) => ({ label: etiqueta, value: etiqueta })),
    },
    {
      name: 'resumo',
      type: 'textarea',
      localized: true, // Req 3.3
      maxLength: 200, // Req 5.6
      label: 'Resumo',
    },
    {
      name: 'corpo',
      type: 'richText', // Req 5.7 (editor lexical herdado da config)
      localized: true, // Req 3.3
      label: 'Corpo',
    },
    {
      name: 'capa',
      type: 'upload',
      relationTo: 'media', // Req 5.3: capa é upload de imagem
      label: 'Capa (1:1)',
      admin: {
        description: 'Imagem de capa em proporção 1:1.',
      },
    },
    {
      name: 'destaque',
      type: 'checkbox', // Req 5.4
      defaultValue: false,
      label: 'Destaque',
      admin: {
        description: 'No máximo um informe pode estar em destaque por vez.',
      },
    },
    {
      name: 'publicado',
      type: 'checkbox', // Req 5.8
      defaultValue: false,
      label: 'Publicado',
    },
  ],
  hooks: {
    // Unicidade de destaque (Req 5.5): quando um informe é salvo com
    // `destaque: true`, desmarca `destaque` em todos os DEMAIS. A decisão de
    // quais ids atualizar é delegada à função pura `idsParaDesmarcarDestaque`
    // (testável por PBT em `informes-destaque.ts`). O hook é idempotente: se
    // nenhum outro informe está em destaque, nada é atualizado.
    afterChange: [
      async ({ doc, req, context }) => {
        // Só age quando o documento salvo está em destaque.
        if (!doc?.destaque) {
          return doc
        }

        // Guarda de recursão: as atualizações que desmarcam os demais também
        // disparam `afterChange`, mas com `destaque: false` (o early-return
        // acima já as ignora). Mesmo assim marcamos um flag no contexto para
        // evitar reentrância sob qualquer fluxo.
        if (context?.desmarcandoDestaque) {
          return doc
        }

        const { payload } = req

        // Estado atual: todos os informes atualmente em destaque.
        const emDestaque = await payload.find({
          collection: 'informes',
          where: { destaque: { equals: true } },
          limit: 0,
          depth: 0,
          req,
        })

        const estado: InformeDestaqueState[] = emDestaque.docs.map((d) => ({
          id: d.id as string | number,
          destaque: Boolean((d as { destaque?: boolean }).destaque),
        }))

        const ids = idsParaDesmarcarDestaque(estado, doc.id as string | number)

        await Promise.all(
          ids.map((id) =>
            payload.update({
              collection: 'informes',
              id,
              data: { destaque: false },
              // Propaga o flag de contexto para evitar reentrância.
              context: { desmarcandoDestaque: true },
              req,
            }),
          ),
        )

        return doc
      },
    ],
  },
}

// Resolve o título base (pt) para o slug, aceitando tanto string quanto o
// objeto por locale de campos localizados.
function resolverTituloBase(titulo: unknown): string | null {
  if (typeof titulo === 'string') {
    return titulo
  }
  if (titulo && typeof titulo === 'object') {
    const localized = titulo as Record<string, unknown>
    const pt = localized.pt
    if (typeof pt === 'string') {
      return pt
    }
    // Cai para qualquer primeiro valor string disponível.
    const first = Object.values(localized).find((v) => typeof v === 'string')
    return typeof first === 'string' ? first : null
  }
  return null
}

export default Informes
