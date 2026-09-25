// lib/payload.static-stub.ts — substitui lib/payload.ts no build ESTÁTICO de
// preview (ver next.config.ts, `turbopack.resolveAlias`, `CONTENT_SOURCE`).
//
// `lib/payload.ts` importa `@payload-config` -> `src/payload.config.ts`
// estaticamente, que por sua vez puxa `@payloadcms/db-postgres` ->
// `drizzle-kit` -> `esbuild`/`@libsql` (binários nativos). Mesmo com o branch
// de chamada guardado por `if (CONTENT_SOURCE === 'static')` em
// lib/queries.ts, um bundler ainda ANALISA e tenta empacotar o alvo de um
// `import()` dinâmico com especificador literal — só trocar o MÓDULO em si
// via alias de resolução evita que essa cadeia inteira seja alcançada no
// build estático (Req: preview na Vercel sem Payload/Postgres).
//
// Nunca deveria ser chamado de fato: no build estático, `lib/queries.ts`
// sempre retorna pelo ramo `content/static-content.ts` antes de importar
// `@/lib/payload`.
export function getPayloadClient(): never {
  throw new Error(
    '[lib/payload.static-stub] getPayloadClient() chamado no build estático de preview (CONTENT_SOURCE=static). ' +
      'Isto indica um bug: todo caminho de app/(frontend) deveria retornar via content/static-content.ts antes de chegar aqui.',
  )
}
