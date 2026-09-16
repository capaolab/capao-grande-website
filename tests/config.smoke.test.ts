import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Raiz do projeto (este arquivo vive em <root>/tests/).
const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '..')

// Caminho absoluto do módulo de configuração central do Payload.
// Importar pelo caminho real (não pelo alias @payload-config) exercita o
// mesmo módulo que o Next carrega na inicialização, incluindo a validação de
// ambiente em nível de módulo (Requisito 2.4).
const configPath = path.resolve(projectRoot, 'src/payload.config.ts')

describe('inicialização do Payload — validação de ambiente (Req 2.4)', () => {
  // Guardamos o ambiente original para restaurá-lo após cada teste, já que
  // manipulamos process.env para exercitar o guard de inicialização.
  const originalEnv = process.env

  beforeEach(() => {
    // Cópia rasa para isolar mutações por teste.
    process.env = { ...originalEnv }
    // Garante um estado de módulos limpo para reavaliar payload.config a cada
    // teste (a validação roda no topo do módulo, na primeira avaliação).
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('falha com mensagem que identifica DATABASE_URI quando a variável está ausente', async () => {
    delete process.env.DATABASE_URI
    // PAYLOAD_SECRET presente para isolar a falha na ausência de DATABASE_URI:
    // a config valida DATABASE_URI antes de PAYLOAD_SECRET, então esta é a
    // primeira exceção lançada.
    process.env.PAYLOAD_SECRET = 'segredo-de-teste'

    // A avaliação do módulo deve rejeitar com uma mensagem que nomeia
    // DATABASE_URI, interrompendo a inicialização em vez de subir um pool
    // inválido.
    await expect(import(configPath)).rejects.toThrow(/DATABASE_URI/)
  })

  it('falha com mensagem que identifica PAYLOAD_SECRET quando o segredo está ausente', async () => {
    // Com DATABASE_URI presente, a próxima variável obrigatória é
    // PAYLOAD_SECRET (Requisito 2.5).
    process.env.DATABASE_URI = 'postgres://capao:capao@localhost:5432/capao_grande'
    delete process.env.PAYLOAD_SECRET

    await expect(import(configPath)).rejects.toThrow(/PAYLOAD_SECRET/)
  })
})

describe('integração Payload↔Next — withPayload e /admin montado (Req 1.2)', () => {
  it('next.config aplica withPayload e expõe um default export definido', async () => {
    // withPayload envolve a config do Next; um default export definido
    // confirma que a composição ocorreu sem lançar.
    const nextConfigPath = path.resolve(projectRoot, 'next.config.ts')
    const mod = await import(nextConfigPath)

    expect(mod.default).toBeDefined()
    // withPayload retorna a config do Next (objeto) ou uma função que a
    // resolve, dependendo da versão; ambos são valores não nulos.
    expect(['object', 'function']).toContain(typeof mod.default)
  })

  it('a rota /admin do route group (payload) existe e exporta um componente default', () => {
    // O painel é servido por app/(payload)/admin/[[...segments]]/page.tsx.
    // Verificamos estaticamente (existência + default export) em vez de
    // importar o módulo: a página gerada importa a config via alias
    // `@payload-config` (resolvido pelo Next, não pelo runner de teste) e
    // toda a stack de `@payloadcms/next/views`. Para um smoke test, a
    // presença do arquivo e a declaração de um `export default` já
    // confirmam que `/admin` está montado.
    const adminPagePath = path.resolve(
      projectRoot,
      'app/(payload)/admin/[[...segments]]/page.tsx',
    )
    expect(existsSync(adminPagePath)).toBe(true)

    const source = readFileSync(adminPagePath, 'utf8')
    expect(source).toMatch(/export default \w+/)
    // Confirma que a página monta a view do painel do Payload.
    expect(source).toContain('RootPage')
  })

  it('os arquivos de rota da API do route group (payload) existem', () => {
    // REST, GraphQL e playground montados por @payloadcms/next.
    const apiRoutes = [
      'app/(payload)/api/[...slug]/route.ts',
      'app/(payload)/api/graphql/route.ts',
      'app/(payload)/api/graphql-playground/route.ts',
    ]
    for (const rel of apiRoutes) {
      expect(existsSync(path.resolve(projectRoot, rel))).toBe(true)
    }
  })
})
