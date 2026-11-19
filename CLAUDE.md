@AGENTS.md

# capao-grande-website

Site da Pizzaria Capão Grande e painel interno (pedidos, delivery, caixa, cardápio, pimenta em mel). Um único app Next.js (App Router) + Payload CMS 3 + Postgres.

## Comandos

- Dev: `cp .env.example .env` e `docker compose up -d --build` (app em :3000, admin em `/admin`)
- Seed (só dev local, apaga e recria dados): `docker compose exec app npm run seed`. Bloqueado para o Claude em `.claude/settings.json`; peça ao usuário
- Testes unitários (gate do CI): `npx vitest --run --exclude 'tests/**/*.integration.test.ts'`
- Todos os testes: `npm run test`. Os `*.integration.test.ts` precisam de Postgres em `DATABASE_URI` (padrão nos testes: `postgres://capao:capao@localhost:5432/capao_grande`); sem banco, são pulados
- Typecheck: `npx tsc --noEmit` (não há script)
- Lint: `npm run lint`, ou `npx eslint <arquivos>`
- Tipos do Payload, após mudar collections/globals: `npm run generate:types`
- Build do preview estático: `npm run build:static` (saída em `out/`)

## Estrutura

- `src/`: backend Payload (`collections/`, `globals/`, `endpoints/`, `migrations/`, `payload.config.ts` = alias `@payload-config`)
- `app/`: route groups `(frontend)` site público, `(painel)` áreas de cliente/funcionário, `(auth)` login/cadastro, `(payload)` admin + API
- `lib/`: regras de negócio puras (as testadas). `lib/queries.ts` é a porta de leitura do CMS
- `components/` fica na raiz, não em `src/`. O alias `@/*` aponta para a raiz
- `content/seed-data.ts` alimenta o seed local e o preview estático (`content/static-content.ts`)
- Regras de negócio novas são documentadas fora deste repo, em `../capaolab-core/docs/projetos/capao-grande-website/`. O `docs/` daqui é para design e artefatos do frontend
- `docs/features/*.md`: specs da implementação atual em Payload, que será migrada para o capaolab-core. Os testes citam as regras pelo código (ex.: RN-E02)
- `deploy/`: deploy manual de staging no servidor (`deploy.sh`, `compose.yml`)

## Convenções

- Mudou collection ou campo → precisa de migration versionada em `src/migrations/`. O app não migra ao subir. Comandos do Payload são bloqueados para o Claude: peça ao usuário para rodar `docker compose exec app npm run payload migrate:create <nome>`
- Feature nova → documente em `../capaolab-core/docs/projetos/capao-grande-website/features/`, com o modelo de `../capaolab-core/docs/core/features/_template.md`
- Nova leitura do CMS → em `lib/queries.ts`, com o ramo `CONTEUDO_ESTATICO` (preview Vercel com `CONTENT_SOURCE=static`, sem banco)
- Testes: property-based com fast-check (100 runs, `tests/setup.ts`). Ambiente `node` por padrão; componentes usam `// @vitest-environment jsdom` na 1ª linha
- Commits: conventional commits em português (`feat:`, `fix(header):`, `chore(deploy):`), branches `feat/*`

## Cuidados

- Não editar à mão: `src/payload-types.ts`, `app/(payload)/admin/importMap.js`, migrations já aplicadas
- Gerados: `.next/`, `out/`, `.build-static-tmp/`. `build:static` move `app/(payload)` para `.build-static-tmp/` durante o build
- Não rodar comandos do Payload sem `NODE_ENV=production` contra banco que não seja o de dev: o modo dev faz `push` do schema e quebra o controle de migrations
- `.next/standalone/.env` é cópia do `.env` real
- `npm run lint` completo falha por 2 erros conhecidos em `docs/design/support.js` (mock de design); não conta como regressão

## Pronto quando

1. `npx tsc --noEmit` passa
2. `npx vitest --run --exclude 'tests/**/*.integration.test.ts'` passa
3. `npx eslint <arquivos alterados>` sem erros
4. Mudança de schema tem migration; feature nova tem doc em `../capaolab-core/docs/projetos/capao-grande-website/features/`
