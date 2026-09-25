import { connection } from 'next/server'
import { cache } from 'react'

import { getPayload } from 'payload'

import config from '@payload-config'

// Cliente Payload memoizado por requisição (Requisito 1.4).
//
// A Local API do Payload roda no mesmo processo do Next.js; obter a instância
// via `getPayload({ config })` a cada leitura recriaria trabalho desnecessário
// dentro de uma mesma requisição. Envolvemos a chamada em `React.cache` para
// que Server Components que consomem a camada de dados compartilhem a mesma
// instância dentro do escopo de uma requisição (recomendação da doc de data
// fetching do App Router para acesso não-`fetch`).
//
// A config é importada pelo alias `@payload-config` (tsconfig paths ->
// src/payload.config.ts), seguindo a convenção do Payload usada também pelos
// arquivos gerados do route group `(payload)`.
//
// `connection()` (Next 16): toda leitura do CMS acontece na REQUISIÇÃO, nunca
// no `next build`. Sem isso o build pré-renderiza as páginas consultando o
// Postgres — o que (1) quebra o build da imagem Docker no CI, onde não há
// banco (workflow release.yml), e (2) congelaria o conteúdo do CMS na imagem:
// edições no admin não apareceriam até um novo build.
export const getPayloadClient = cache(async () => {
  await connection()
  return getPayload({ config })
})
