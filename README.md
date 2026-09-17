# Pizzaria Capão Grande Website

## Índice

- [Stack Tecnológica](#stack-tecnológica)
- [Como Rodar](#como-rodar)
  - [Desenvolvimento](#desenvolvimento)
  - [Produção](#produção)
- [Deploy](#deploy)
  - [Staging (Vercel — site estático)](#staging-vercel--site-estático)
  - [Produção (Docker — aplicação completa)](#produção-docker--aplicação-completa)

## Stack Tecnológica

- [Next.js](https://nextjs.org) (App Router)
- [Payload CMS](https://payloadcms.com)
- [PostgreSQL](https://www.postgresql.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
- Docker / Docker Compose

## Como Rodar

O projeto usa Docker Compose, com serviços para o app (Next.js + Payload) e o Postgres. Antes de começar, copie o arquivo de variáveis de ambiente na raiz do repositório:

```bash
cp .env.example .env
```

Ajuste `PAYLOAD_SECRET` e os demais valores em `.env` conforme necessário.

### Desenvolvimento

```bash
docker compose up -d --build
```

- App: http://localhost:3000
- Admin do Payload: http://localhost:3000/admin
- O código da raiz do repositório é montado no container (`./:/app`), com hot reload.

### Produção

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Para parar os serviços, use `docker compose down` (adicione `-v` para também remover os volumes, como os dados do Postgres).

## Deploy

Existem dois ambientes de deploy, com propósitos e stacks diferentes. O chaveamento entre eles é feito por uma única variável de ambiente, `CONTENT_SOURCE`:

- **`CONTENT_SOURCE=static`** → build estático (staging): sem Payload, sem Postgres; o conteúdo vem de `content/seed-data.ts` resolvido em memória por `content/static-content.ts`.
- **Sem `CONTENT_SOURCE`** (padrão) → aplicação completa (desenvolvimento e produção): Next.js + Payload CMS + Postgres, com os dados lidos pela Payload Local API em `lib/queries.ts`.

### Staging (Vercel — site estático)

Ambiente de **QA visual**: uma página estática para consolidar e validar alterações visuais antes da produção. Não inclui admin, API nem banco de dados.

- **Gatilho:** push de uma tag no formato `staging-v*.*` (ex.: `staging-v0.1`) dispara o workflow `.github/workflows/deploy-staging.yml`.
- **O que o pipeline faz:**
  1. `vercel pull --environment=preview` (baixa as variáveis do projeto na Vercel);
  2. acrescenta `CONTENT_SOURCE=static` ao ambiente de build;
  3. move `app/(payload)` (admin + API REST/GraphQL) para fora da árvore de rotas — essas rotas são dinâmicas e incompatíveis com export estático;
  4. `vercel build` + `vercel deploy --prebuilt`.
- **Equivalente local:** `npm run build:static` (ver `scripts/build-static.mjs`). Roda o mesmo build estático e **sempre restaura `app/(payload)` ao final**, mesmo em caso de falha. A saída vai para `out/`.
- **Como o chaveamento funciona:** com `CONTENT_SOURCE=static`, o `next.config.ts` ativa `output: 'export'`, desativa o otimizador de imagens, troca `@/lib/payload` pelo stub `lib/payload.static-stub.ts` (que tira toda a cadeia Payload/Postgres do bundle) e não registra o plugin `withPayload`. Em `lib/queries.ts`, cada query retorna os dados de `content/static-content.ts`.
- **Divergências conscientes em relação à produção:** a listagem de informes não pagina no estático (query strings não geram páginas distintas num export) e imagens não passam pelo otimizador do Next. Ambas são deliberadas e documentadas em `content/static-content.ts` e `next.config.ts`.

> Alterações que envolvam o Payload (coleções, campos, admin, globals) **não aparecem no staging** e devem ser testadas localmente no ambiente de desenvolvimento via Docker (`docker compose up -d --build`).

### Produção (Docker — aplicação completa)

Deploy da aplicação como um todo: **Next.js + Payload CMS + Postgres**, via o alvo `runner` do `Dockerfile` (multi-stage) e o `docker-compose.prod.yml`.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- O `Dockerfile` gera um servidor Next.js standalone; o Postgres sobe com healthcheck e volume persistente (`postgres_data`); os uploads de mídia do Payload ficam no volume `uploads` (montado em `/app/media`).
- `DATABASE_URI`, `PAYLOAD_SECRET` e `NEXT_PUBLIC_SERVER_URL` reais são fornecidos em runtime via `.env` (o build usa placeholders — ver comentários no `Dockerfile`).
- O deploy de staging **não interfere** no de produção: são pipelines e artefatos independentes (Vercel/estático vs. Docker/standalone), e o código de produção nunca passa pelo caminho `CONTENT_SOURCE=static`.

**Pendências antes do primeiro deploy de produção:**

1. Gerar e versionar as migrations do Payload (`npm run payload migrate:create` → `src/migrations/`) e executá-las no deploy; em produção o schema não é sincronizado automaticamente.
2. Validar o build de produção localmente com o comando acima antes do primeiro deploy, já que o CI de staging não exercita o caminho com Payload.