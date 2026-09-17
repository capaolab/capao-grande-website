import { withPayload } from "@payloadcms/next/withPayload";

import type { NextConfig } from "next";

// Build estático de staging (Vercel, sem Payload/Postgres — ver
// content/static-content.ts e .github/workflows/deploy-staging.yml).
// `scripts/build-static.mjs` roda com esta variável definida e com
// `app/(payload)` temporariamente fora da árvore de rotas: o grupo de rotas
// `(payload)` (admin + API REST/GraphQL) é inerentemente dinâmico e
// incompatível com `output: 'export'`.
const isStaticContent = process.env.CONTENT_SOURCE === "static";

const nextConfig: NextConfig = {
  // Produção (Docker): o stage `runner` do Dockerfile executa o servidor
  // standalone gerado aqui. No build estático de staging, o spread abaixo
  // sobrescreve este valor com `output: "export"`.
  output: "standalone",
  ...(isStaticContent
    ? {
        output: "export",
        // Export estático não tem servidor para o otimizador de imagens do
        // Next; exigido por `output: 'export'`. Sem impacto visual: o seed
        // nunca define `capa`/`ilustracao` (Req 9.4), então toda imagem já
        // renderiza como o placeholder listrado do <CmsImage>.
        images: { unoptimized: true },
        turbopack: {
          resolveAlias: {
            // lib/queries.ts SEMPRE importa `@/lib/payload` estaticamente,
            // mas só o CHAMA quando CONTENT_SOURCE !== 'static' (ver
            // CONTEUDO_ESTATICO ali). Um `if` em runtime não impede o
            // bundler de ANALISAR o módulo alvo de um import — e o
            // lib/payload.ts real puxa @payload-config ->
            // @payloadcms/db-postgres -> drizzle-kit/esbuild (binários
            // nativos que o Turbopack não consegue empacotar para um build
            // sem banco). Trocar o módulo por este alias, antes da
            // resolução, é o que de fato remove essa cadeia do build
            // estático — não a forma como o import é escrito no código.
            "@/lib/payload": "./lib/payload.static-stub.ts",
          },
        },
      }
    : {}),
};

// `withPayload` registra a integração do admin/webpack da Payload — só faz
// sentido (e só é seguro, ver nota acima) quando o build tem Payload de
// verdade.
export default isStaticContent ? nextConfig : withPayload(nextConfig);
