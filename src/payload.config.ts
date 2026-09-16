import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import { Cardapio } from './collections/Cardapio'
import { Cronologia } from './collections/Cronologia'
import { Informes } from './collections/Informes'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Configuracoes } from './globals/Configuracoes'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Validação de ambiente (Requisito 2.4): a string de conexão do Postgres é
// lida de DATABASE_URI (Requisito 2.2). Se ausente, interrompemos a
// inicialização com uma mensagem que identifica a variável faltante, em vez de
// subir o Payload com um pool inválido.
const connectionString = process.env.DATABASE_URI
if (!connectionString) {
  throw new Error(
    'Variável de ambiente ausente: DATABASE_URI é obrigatória para iniciar o Payload.',
  )
}

// Segredo de aplicação usado para assinar sessões do admin (Requisito 2.5),
// lido de PAYLOAD_SECRET. Sem segredo, a inicialização também falha.
const secret = process.env.PAYLOAD_SECRET
if (!secret) {
  throw new Error(
    'Variável de ambiente ausente: PAYLOAD_SECRET é obrigatória para iniciar o Payload.',
  )
}

export default buildConfig({
  // Segredo para assinatura de sessões administrativas (Requisito 2.5).
  secret,
  // Editor rich text lexical registrado no nível da config (Requisito 5.7);
  // o campo `corpo` de Informes usa richText herdando este editor.
  editor: lexicalEditor(),
  // Persistência em Postgres via @payloadcms/db-postgres (Requisito 1.3).
  // `pool` é obrigatório; a string vem de DATABASE_URI (Requisito 2.2).
  db: postgresAdapter({
    pool: {
      connectionString,
    },
  }),
  // Localização pt-BR (padrão) e en (secundária) (Requisitos 3.1, 3.2).
  // `fallback: true` faz campos localizados caírem no defaultLocale (pt)
  // quando o valor do locale pedido está ausente (Requisito 3.6).
  localization: {
    locales: [
      { code: 'pt', label: 'Português (BR)' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'pt',
    fallback: true,
  },
  // Users: coleção de autenticação do admin (Req 1.2).
  // Media: coleção de uploads no filesystem local (Req 4.1–4.4).
  // Informes: publicações/notícias (Req 5).
  // Cardapio: itens do cardápio (Req 6).
  // Cronologia: marcos da linha do tempo (Req 7).
  collections: [Users, Media, Informes, Cardapio, Cronologia],
  // Configuracoes: global de configurações do estabelecimento (Req 8).
  globals: [Configuracoes],
  // Saída dos tipos gerados por `payload generate:types` (task 4.7).
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
