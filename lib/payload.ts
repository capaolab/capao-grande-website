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
export const getPayloadClient = cache(async () => {
  return getPayload({ config })
})
