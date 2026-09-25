import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import { Caixa } from './collections/Caixa'
import { Cardapio } from './collections/Cardapio'
import { Cronologia } from './collections/Cronologia'
import { Informes } from './collections/Informes'
import { Media } from './collections/Media'
import { Pedidos } from './collections/Pedidos'
import { PedidosPimenta } from './collections/PedidosPimenta'
import { ProdutosPimenta } from './collections/ProdutosPimenta'
import { Users } from './collections/Users'
import { cadastroCliente } from './endpoints/cadastro-cliente'
import { submeterPedido } from './endpoints/submeter-pedido'
import { submeterPedidoPimenta } from './endpoints/submeter-pedido-pimenta'
import { Configuracoes } from './globals/Configuracoes'
import { migrations } from './migrations'

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
  // Painel admin com a identidade visual do site: logo em aquarela nas telas
  // de autenticação internas e mark no canto superior (componentes em
  // src/components/admin). As cores/fontes do site chegam ao painel via
  // app/(payload)/tema-capao.scss, importado em app/(payload)/layout.tsx.
  // A view `login` do painel é substituída por um redirecionamento para a
  // página /login do site — entrada única de autenticação, que já redireciona
  // admins ao painel após o login (lib/permissoes.ts).
  admin: {
    user: 'users',
    components: {
      graphics: {
        Logo: '@/src/components/admin/Logo',
        Icon: '@/src/components/admin/Icon',
      },
      views: {
        login: { Component: '@/src/components/admin/LoginRedirect' },
      },
    },
  },
  // Editor rich text lexical registrado no nível da config (Requisito 5.7);
  // o campo `corpo` de Informes usa richText herdando este editor.
  editor: lexicalEditor(),
  // Persistência em Postgres via @payloadcms/db-postgres (Requisito 1.3).
  // `pool` é obrigatório; a string vem de DATABASE_URI (Requisito 2.2).
  //
  // Schema: em desenvolvimento o Payload sincroniza o banco sozinho (`push`).
  // Em produção/staging (NODE_ENV=production, imagem Docker) não há push: as
  // migrations versionadas em src/migrations rodam na inicialização do
  // servidor via `prodMigrations` — a imagem standalone não tem a CLI do
  // Payload para rodar `payload migrate`. Toda mudança de schema precisa de
  // `npm run payload migrate:create <nome>` antes da release (ver README).
  db: postgresAdapter({
    pool: {
      connectionString,
    },
    prodMigrations: migrations,
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
  // Pedidos: pedidos de delivery (docs/features/delivery-pedidos.md, Tarefa 1).
  // ProdutosPimenta/PedidosPimenta: catálogo e pedidos de pimenta em mel
  // (docs/features/pimenta-em-mel.md).
  collections: [
    Users,
    Media,
    Informes,
    Cardapio,
    Cronologia,
    Pedidos,
    Caixa,
    ProdutosPimenta,
    PedidosPimenta,
  ],
  // Configuracoes: global de configurações do estabelecimento (Req 8).
  globals: [Configuracoes],
  // Endpoint público de submissão de pedidos (delivery-pedidos.md, Tarefa 4):
  // POST /api/submeter-pedido — honeypot + rate limit + validação server-side.
  // Endpoint público de cadastro de clientes (dashboard-pedidos.md):
  // POST /api/cadastro-cliente — cria a conta e já autentica (cookie).
  endpoints: [
    { path: '/submeter-pedido', method: 'post', handler: submeterPedido },
    { path: '/cadastro-cliente', method: 'post', handler: cadastroCliente },
    // Pedidos de pimenta em mel (pimenta-em-mel.md): mesmo fluxo do delivery.
    { path: '/submeter-pedido-pimenta', method: 'post', handler: submeterPedidoPimenta },
  ],
  // Saída dos tipos gerados por `payload generate:types` (task 4.7).
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
