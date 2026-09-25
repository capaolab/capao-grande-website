# Pizzaria Capão Grande Website

## Índice

- [Stack Tecnológica](#stack-tecnológica)
- [Documentação de Features](#documentação-de-features)
- [Como Rodar](#como-rodar)
  - [Desenvolvimento](#desenvolvimento)
  - [Imagem de produção (local)](#imagem-de-produção-local)
- [Deploy](#deploy)
  - [Preview de UI (Vercel — site estático)](#preview-de-ui-vercel--site-estático)
  - [Release (imagem Docker no GitHub Container Registry)](#release-imagem-docker-no-github-container-registry)
  - [Staging e produção (deploy manual)](#staging-e-produção-deploy-manual)

## Stack Tecnológica

- [Next.js](https://nextjs.org) (App Router)
- [Payload CMS](https://payloadcms.com)
- [PostgreSQL](https://www.postgresql.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
- Docker / Docker Compose

## Documentação de Features

Toda nova funcionalidade deve ser documentada em `docs/features/` usando o template [`docs/features/_template.md`](docs/features/_template.md), que define as seções CONTEXTO, REGRAS DE NEGÓCIO, TAREFAS e REFERÊNCIAS.

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

### Imagem de produção (local)

Builda o alvo `runner` a partir do código e sobe com um Postgres próprio, sem registry. Para staging e produção de verdade, veja [Deploy](#deploy).

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Para parar os serviços, use `docker compose down` (adicione `-v` para também remover os volumes, como os dados do Postgres).

## Deploy

Há três fluxos, cada um disparado por um padrão de tag:

| Fluxo | Tag | Workflow | Onde roda | Para quê |
| --- | --- | --- | --- | --- |
| **Preview de UI** | `preview-*` | `deploy-preview.yml` | Vercel (site estático) | O cliente vê e aprova mudanças visuais |
| **Release** | `release-X.Y.Z` | `release.yml` | GitHub Container Registry | Publica a imagem Docker versionada |
| **Staging / Produção** | — (manual) | `deploy/deploy.sh` | Servidor com Docker | Implanta uma versão publicada |

O chaveamento de conteúdo é feito por uma única variável, `CONTENT_SOURCE`:

- **`CONTENT_SOURCE=static`**: build estático do preview. Não usa Payload nem Postgres. O conteúdo vem de `content/seed-data.ts`, resolvido em memória por `content/static-content.ts`.
- **Sem `CONTENT_SOURCE`** (padrão): aplicação completa (desenvolvimento, staging e produção). Next.js + Payload CMS + Postgres, com os dados lidos pela Payload Local API em `lib/queries.ts`.

### Preview de UI (Vercel — site estático)

Serve para mostrar ao cliente uma alteração visual antes de aprová-la. É uma página estática, sem admin, API ou banco de dados.

- **Gatilho:** push de uma tag `preview-*` (ex.: `preview-home-nova`, `preview-2026-09-25`) ou execução manual pelo botão *Run workflow* na aba Actions, escolhendo a branch.
  ```bash
  git tag preview-home-nova && git push origin preview-home-nova
  ```
- **O que o pipeline faz:**
  1. `vercel pull --environment=preview` baixa as variáveis do projeto na Vercel.
  2. Acrescenta `CONTENT_SOURCE=static` ao ambiente de build.
  3. Move `app/(payload)` (admin + API REST/GraphQL) para fora da árvore de rotas, porque essas rotas são dinâmicas e incompatíveis com export estático.
  4. Roda `vercel build` e `vercel deploy --prebuilt`.
  5. Publica a URL do preview no resumo da execução, pronta para enviar ao cliente.
- **Equivalente local:** `npm run build:static` (ver `scripts/build-static.mjs`). Roda o mesmo build estático e **sempre restaura `app/(payload)` ao final**, mesmo se falhar. A saída vai para `out/`.
- **Como o chaveamento funciona:** com `CONTENT_SOURCE=static`, o `next.config.ts`:
  - ativa `output: 'export'`;
  - desativa o otimizador de imagens;
  - troca `@/lib/payload` pelo stub `lib/payload.static-stub.ts`;
  - não registra o plugin `withPayload`.

  Em `lib/queries.ts`, cada query retorna os dados de `content/static-content.ts`.
- **Divergências conscientes em relação à aplicação completa:**
  - a listagem de informes não pagina;
  - as imagens não passam pelo otimizador do Next;
  - formulários, login e painéis mostram avisos de indisponibilidade, porque não há API.

> Alterações que envolvam o Payload (coleções, campos, admin, globals, pedidos) **não aparecem no preview**. Valide-as em staging.
>
> A tag antiga `staging-v*.*` **não dispara mais nada**.

### Release (imagem Docker no GitHub Container Registry)

Cada release publica a aplicação completa como imagem Docker. A **mesma imagem** é implantada em staging e depois em produção.

```
ghcr.io/capaolab/capao-grande-website:<versão>
```

- **Gatilho:** push de uma tag `release-X.Y` ou `release-X.Y.Z`, com sufixo opcional (ex.: `release-1.2.0`, `release-1.3.0-rc.1`).
  ```bash
  git tag release-1.2.0 && git push origin release-1.2.0
  ```
- **O que o pipeline faz (`.github/workflows/release.yml`):**
  1. **Verificação:**
     - valida o formato da tag;
     - roda `tsc --noEmit`;
     - roda os testes (`vitest`, sem os `*.integration.test.ts`, que precisam de Postgres).

     Se algo falhar, nada é publicado.
  2. **Build da imagem:**
     - usa o alvo `runner` do `Dockerfile`;
     - o build não conecta ao banco;
     - segredos não entram na imagem.
  3. **Publicação no GHCR** com as tags `<versão>` (ex.: `1.2.0`) e `sha-<commit>`. Não existe `latest`: os ambientes sempre fixam a versão.
  4. **Criação da GitHub Release** com notas geradas a partir dos commits e o nome da imagem.
- **Configuração na organização (uma vez):**
  - Em *Settings → Actions → General → Workflow permissions*, permita que o `GITHUB_TOKEN` tenha *Read and write*, ou mantenha as `permissions` declaradas no workflow.
  - Na primeira publicação, o pacote é criado **privado** e vinculado ao repositório.
  - Para o servidor baixar a imagem, crie um token (PAT *classic* com `read:packages`, ou fine-grained com leitura de pacotes da organização) de uma conta com acesso ao pacote.

#### Como a imagem funciona

- **Renderização por requisição:** toda leitura do CMS chama `connection()` (`lib/payload.ts`). Por isso as páginas são renderizadas a cada requisição e não pré-renderizadas no build. O build dispensa banco, e edições no admin aparecem na hora, sem novo build.
- **Migrations automáticas:** ao subir, o container aplica as migrations pendentes de `src/migrations/` (`prodMigrations` em `src/payload.config.ts`). Em produção não há sincronização automática de schema (`push`). **Toda mudança de coleção ou campo precisa de uma migration antes da release:**
  ```bash
  # com o Postgres de dev rodando (docker compose up -d)
  docker compose exec app npm run payload migrate:create nome-da-mudanca
  ```
  Versione os arquivos gerados em `src/migrations/` junto com a mudança.
- **Uploads:** as mídias do Payload ficam em `/app/media`. Monte um volume nesse caminho (o `deploy/compose.yml` já faz isso).
- **Conteúdo da imagem:** o `.dockerignore` mantém fora da imagem `.env*`, `node_modules`, `.next`, `media`, testes e documentação.

### Staging e produção (deploy manual)

O servidor não tem IP externo, então o GitHub Actions não consegue alcançá-lo. O deploy é feito **no próprio servidor**, puxando do registry uma versão já publicada.

#### Preparação do servidor (uma vez)

1. **Postgres compartilhado** (atende esta e outras aplicações), numa rede Docker que os apps também usam:
   ```bash
   docker network create shared-db
   ```
   - **Produção:** sem porta publicada no host. O banco só é alcançável pela rede `shared-db`.
     ```bash
     docker run -d --name postgres-shared --network shared-db --restart unless-stopped \
       -e POSTGRES_PASSWORD='<senha-do-superusuário>' \
       -v postgres-shared-data:/var/lib/postgresql/data postgres:17-alpine
     ```
   - **Staging:** publica a porta `5432` no host para acessar o banco de fora (DBeaver, psql etc.) e validar dados. Use apenas em rede confiável.
     ```bash
     docker run -d --name postgres-shared --network shared-db --restart unless-stopped \
       -p 5432:5432 \
       -e POSTGRES_PASSWORD='<senha-do-superusuário>' \
       -v postgres-shared-data:/var/lib/postgresql/data postgres:17-alpine
     ```
     Conecte em `<ip-do-servidor>:5432` com o usuário e o banco do ambiente. Se o container já existir sem a porta, recrie-o com `docker rm -f postgres-shared` seguido do comando acima. Os dados ficam preservados no volume `postgres-shared-data`.
   Crie um banco e um usuário **por aplicação e ambiente**. São dois comandos separados, porque `CREATE DATABASE` não roda dentro de uma transação:
   ```bash
   docker exec postgres-shared psql -U postgres -c "CREATE ROLE capaolab_staging LOGIN PASSWORD '<senha>';"
   docker exec postgres-shared psql -U postgres -c "CREATE DATABASE capaogrande OWNER capaolab_staging;"
   ```
2. **Login no registry** com o token de leitura de pacotes:
   ```bash
   echo '<token>' | docker login ghcr.io -u <usuario-github> --password-stdin
   ```
3. **Arquivos de deploy:** o servidor precisa só da pasta `deploy/`. Crie `deploy/.env.staging` (e `deploy/.env.production`) a partir dos `*.example` e preencha:
   - `DATABASE_URI`, apontando para `postgres-shared`;
   - `PAYLOAD_SECRET` (`openssl rand -base64 32`, diferente por ambiente);
   - `NEXT_PUBLIC_SERVER_URL`;
   - `APP_PORT`;
   - `DB_NETWORK`.

#### Deploy de uma versão

```bash
./deploy/deploy.sh staging 1.2.0      # homologação
./deploy/deploy.sh production 1.2.0   # produção, após aprovar em staging
```

O script:
1. baixa a imagem;
2. sobe o container (projeto `capao-<ambiente>`, volume de uploads próprio);
3. espera o healthcheck ficar `healthy`.

Na primeira subida, as migrations são aplicadas sozinhas. Staging e produção podem coexistir no mesmo host, em portas diferentes.

- **Rollback:** rode o script com a versão anterior, ex.: `./deploy/deploy.sh staging 1.1.0`. Atenção: migrations **não** são revertidas automaticamente. Um rollback que atravesse uma mudança de schema exige avaliar o `down` da migration.
- **Logs:** `docker compose -p capao-staging logs -f app`
- **Primeiro acesso:** abra `/admin` e crie o primeiro usuário administrador.
- **Seed em staging:** a imagem não inclui a CLI do Payload. Para popular um banco de staging, rode o seed a partir de um checkout do repositório, apontando para o banco:
  ```bash
  DATABASE_URI=... PAYLOAD_SECRET=... npm run seed
  ```

#### Simulação local (sem registry)

Valida o mesmo artefato da release na sua máquina:

```bash
docker build --target runner -t capao-grande-website:local .
docker run --rm -p 3100:3000 --network shared-db \
  -e DATABASE_URI=postgres://capao_staging:<senha>@postgres-shared:5432/capao_staging \
  -e PAYLOAD_SECRET=dev -e NEXT_PUBLIC_SERVER_URL=http://localhost:3100 \
  capao-grande-website:local
```

O fluxo `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` continua disponível para rodar a imagem de produção com um Postgres próprio, sem registry.

maria@teste.com e func@teste.com