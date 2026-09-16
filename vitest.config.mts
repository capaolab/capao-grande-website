import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Raiz do workspace, usada para resolver o alias `@/*` -> `./*` do tsconfig
// (paths). O vitest não lê o tsconfig `paths` automaticamente, então
// espelhamos o mapeamento aqui para que os imports `@/...` em runtime
// (ex.: `@/lib/cardapio` em componentes) resolvam nos testes. Isto NÃO altera
// o ambiente de teste (segue `node` por padrão, com opt-in de `jsdom` por
// arquivo via docblock) — apenas a resolução de módulos.
const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  // `@vitejs/plugin-react` transforma JSX/TSX nos testes de componentes.
  // Só afeta a transformação; o ambiente continua sendo `node` por padrão,
  // com os testes de componentes optando por `jsdom` via docblock por arquivo
  // (`// @vitest-environment jsdom`). Isso preserva o `node` exigido pelos
  // testes de integração do Payload (Feature: payload-cms-integration).
  plugins: [react()],
  resolve: {
    alias: {
      // Espelha o `paths` do tsconfig: `@/*` -> `<root>/*`.
      '@': rootDir.replace(/\/$/, ''),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
})
