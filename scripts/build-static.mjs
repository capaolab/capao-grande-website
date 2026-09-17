#!/usr/bin/env node
// scripts/build-static.mjs — build estático de staging (npm run build:static).
//
// Roda `next build` com `CONTENT_SOURCE=static` (lib/queries.ts e
// next.config.ts passam a usar content/static-content.ts em vez do Payload
// Local API — Req do ambiente de staging na Vercel) e com o grupo de rotas
// `app/(payload)` temporariamente MOVIDO PARA FORA de `app/`: admin e API
// REST/GraphQL do Payload são inerentemente dinâmicos e incompatíveis com
// `output: 'export'` (next.config.ts). O diretório é sempre restaurado no
// final, inclusive se o build falhar — este script é usado tanto localmente
// quanto (de forma equivalente, ver .github/workflows/deploy-staging.yml)
// no CI de deploy do staging.
//
// Não precisa de DATABASE_URI nem PAYLOAD_SECRET: com `(payload)` fora da
// árvore de rotas e `CONTENT_SOURCE=static`, nada no grafo de módulos do
// build importa 'payload' ou '@payload-config'.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const payloadRouteGroup = path.join(rootDir, 'app', '(payload)')
const payloadRouteGroupBackup = path.join(rootDir, '.build-static-tmp', '(payload)')

function moverPara(origem, destino) {
  if (!existsSync(origem)) return
  mkdirSync(path.dirname(destino), { recursive: true })
  renameSync(origem, destino)
}

console.log('[build:static] movendo app/(payload) para fora da árvore de rotas...')
moverPara(payloadRouteGroup, payloadRouteGroupBackup)

let exitCode = 1
try {
  const resultado = spawnSync('npx', ['next', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, CONTENT_SOURCE: 'static' },
  })

  if (resultado.error) throw resultado.error
  exitCode = resultado.status ?? 1
} finally {
  console.log('[build:static] restaurando app/(payload)...')
  moverPara(payloadRouteGroupBackup, payloadRouteGroup)
}

process.exit(exitCode)
