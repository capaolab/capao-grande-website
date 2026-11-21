@AGENTS.md

# capao-grande-website

Site da Pizzaria Capão Grande e painel interno (pedidos, delivery, caixa, cardápio, pimenta em mel). Hoje é um app Next.js (App Router) + Payload CMS 3 + Postgres em produção. A migração para a API capaolab-core terá desenho próprio (TODO: link quando existir); até lá o Payload é legado (ver "Legado Payload").

## API (alvo)

- Módulo: `/v1/capao-grande/`
- Rotas que escrevem hoje via Payload e viram chamadas do servidor do Next: login/logout, cadastro de cliente, pedido de delivery, pedido de pimenta, status de pedido, caixa
- CORS: TODO domínios de produção e de prévia

## Comandos

- Dev: `cp .env.example .env` e `docker compose up -d --build` (app em :3000)
- Testes unitários (gate do CI): `npx vitest --run --exclude 'tests/**/*.integration.test.ts'`
- Todos os testes: `npm run test` (os de integração estão em "Legado Payload")
- Typecheck: `npx tsc --noEmit` (não há script)
- Lint: `npm run lint`, ou `npx eslint <arquivos>`
- Build do preview estático: `npm run build:static` (saída em `out/`)

## Estrutura

- `app/`: route groups `(frontend)` site público, `(painel)` áreas de cliente/funcionário, `(auth)` login/cadastro. `(payload)` é legado
- `lib/`: regras de negócio puras (as testadas). `lib/queries.ts` é a porta única de leitura de dados
- `components/` fica na raiz, não em `src/`. O alias `@/*` aponta para a raiz
- `content/seed-data.ts` alimenta o seed local e o preview estático (`content/static-content.ts`)
- `docs/features/*.md`: specs da implementação atual em Payload, base para a migração ao capaolab-core. Os testes citam as regras pelo código (ex.: RN-E02)
- `deploy/`: deploy manual de staging da imagem atual no servidor (`deploy.sh`, `compose.yml`)

## Convenções

- Leitura nova → em `lib/queries.ts`, com o ramo `CONTEUDO_ESTATICO` (preview Vercel com `CONTENT_SOURCE=static`, sem backend)
- Testes: property-based com fast-check (100 runs, `tests/setup.ts`). Ambiente `node` por padrão; componentes usam `// @vitest-environment jsdom` na 1ª linha
- Branches `feat/*`

## Cuidados

- Gerados: `.next/`, `out/`, `.build-static-tmp/`. `build:static` move `app/(payload)` para `.build-static-tmp/` durante o build
- `.next/standalone/.env` é cópia do `.env` real
- `npm run lint` completo falha por 2 erros conhecidos em `docs/design/support.js` (mock de design); não conta como regressão

## Legado Payload (apagar esta seção junto com o código)

- Código: `src/` (`collections/`, `globals/`, `endpoints/`, `migrations/`, `payload.config.ts` = alias `@payload-config`), `app/(payload)/` (admin em `/admin` + API REST/GraphQL), `lib/payload.ts`, `scripts/seed.ts`
- O Payload segue em uso até a migração; mudanças nele seguem as regras abaixo
- Mudou collection ou campo → migration versionada em `src/migrations/`. O app não migra ao subir. Comandos do Payload são bloqueados para o Claude: peça ao usuário `docker compose exec app npm run payload migrate:create <nome>`
- Depois de mudar collections/globals: `npm run generate:types`
- Seed (só dev local, apaga e recria dados): `docker compose exec app npm run seed`. Bloqueado para o Claude; peça ao usuário
- `*.integration.test.ts` precisam de Postgres em `DATABASE_URI` (padrão nos testes: `postgres://capao:capao@localhost:5432/capao_grande`); sem banco, são pulados
- Não editar à mão: `src/payload-types.ts`, `app/(payload)/admin/importMap.js`, migrations já aplicadas
- Não rodar comandos do Payload sem `NODE_ENV=production` contra banco que não seja o de dev: o modo dev faz `push` do schema e quebra o controle de migrations

## Pronto quando

1. `npx tsc --noEmit` passa
2. `npx vitest --run --exclude 'tests/**/*.integration.test.ts'` passa
3. `npx eslint <arquivos alterados>` sem erros
4. Mudança de schema do Payload tem migration (enquanto houver Payload); feature nova tem doc em `../capaolab-core/docs/projetos/capao-grande-website/features/`
