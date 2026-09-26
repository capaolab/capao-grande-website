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
  - [Staging](#staging)
  - [Produção](#produção)

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
- **Dados de exemplo (seed):** só para o ambiente local. O seed apaga e recria informes, etiquetas, cardápio, seções e cronologia, e cria o admin definido em `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (`.env`):
  ```bash
  docker compose exec app npm run seed
  ```
  Staging e produção não usam seed.

### Imagem de produção (local)

Builda os alvos `migrate` e `runner` a partir do código e sobe com um Postgres próprio, sem registry. O serviço `migrate` aplica as migrations e termina; só então o app sobe, na mesma ordem do deploy. Para o staging, veja [Deploy](#deploy).

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Para parar os serviços, use `docker compose down` (adicione `-v` para também remover os volumes, como os dados do Postgres).

## Deploy

Os fluxos de publicação e deploy:

| Fluxo | Tag | Workflow | Onde roda | Para quê |
| --- | --- | --- | --- | --- |
| **Preview de UI** | `preview-*` | `deploy-preview.yml` | Vercel (site estático) | O cliente vê e aprova mudanças visuais |
| **Release** | `release-X.Y.Z` | `release.yml` | GitHub Container Registry | Publica a imagem Docker versionada |
| **Staging** | — (manual) | `deploy/deploy.sh` | Servidor com Docker | Implanta uma versão publicada para homologação |
| **Produção** | — | — | — | A definir |

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

Cada release publica duas imagens da mesma versão. As **mesmas imagens** são implantadas em staging e depois em produção.

```
ghcr.io/capaolab/capao-grande-website:<versão>           # app (alvo runner)
ghcr.io/capaolab/capao-grande-website:<versão>-migrate   # migrations (alvo migrate)
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
  2. **Build das imagens:**
     - app: alvo `runner` do `Dockerfile`;
     - migrations: alvo `migrate` (dependências completas e a CLI do Payload);
     - o build não conecta ao banco;
     - segredos não entram nas imagens.
  3. **Publicação no GHCR:** o app com as tags `<versão>` (ex.: `1.2.0`) e `sha-<commit>`, e as migrations com `<versão>-migrate`. Não existe `latest`: os ambientes sempre fixam a versão.
  4. **Criação da GitHub Release** com notas geradas a partir dos commits e o nome das imagens.
- **Configuração na organização (uma vez):**
  - Em *Settings → Actions → General → Workflow permissions*, permita que o `GITHUB_TOKEN` tenha *Read and write*, ou mantenha as `permissions` declaradas no workflow.
  - Na primeira publicação, o pacote é criado **privado** e vinculado ao repositório.
  - Para o servidor baixar a imagem, crie um token (PAT *classic* com `read:packages`, ou fine-grained com leitura de pacotes da organização) de uma conta com acesso ao pacote.

#### Como a imagem funciona

- **Renderização por requisição:** toda leitura do CMS chama `connection()` (`lib/payload.ts`). Por isso as páginas são renderizadas a cada requisição e não pré-renderizadas no build. O build dispensa banco, e edições no admin aparecem na hora, sem novo build.
- **Migrations em passo próprio:** o app **não** altera o schema ao subir. As migrations de `src/migrations/` são aplicadas pela imagem `<versão>-migrate` (`payload migrate`), que o `deploy/deploy.sh` roda antes de subir o app. Fora do desenvolvimento não há sincronização automática de schema (`push`). **Toda mudança de coleção ou campo precisa de uma migration antes da release:**
  ```bash
  # com o Postgres de dev rodando (docker compose up -d)
  docker compose exec app npm run payload migrate:create nome-da-mudanca
  ```
  Versione os arquivos gerados em `src/migrations/` junto com a mudança.
- **Uploads:** as mídias do Payload ficam em `/app/media`. Monte um volume nesse caminho (o `deploy/compose.yml` já faz isso).
- **Conteúdo da imagem:** o `.dockerignore` mantém fora da imagem `.env*`, `node_modules`, `.next`, `media`, testes e documentação.

### Staging

O servidor não tem IP externo, então o GitHub Actions não consegue alcançá-lo. O deploy é feito **no próprio servidor** com `deploy/deploy.sh`, puxando do registry uma versão já publicada. O servidor precisa só da pasta `deploy/`.

#### Preparação do servidor (uma vez)

1. **Postgres compartilhado** (atende esta e outras aplicações), numa rede Docker que os apps também usam. Em staging, a porta `5432` é publicada no host para acessar o banco de fora (DBeaver, psql etc.). Use apenas em rede confiável.
   ```bash
   docker network create shared-db
   docker run -d --name postgres-shared --network shared-db --restart unless-stopped \
     -p 5432:5432 \
     -e POSTGRES_PASSWORD='<senha-do-superusuário>' \
     -v postgres-shared-data:/var/lib/postgresql/data postgres:17-alpine
   ```
   Se o container já existir sem a porta, recrie-o com `docker rm -f postgres-shared` seguido do comando acima. Os dados ficam preservados no volume `postgres-shared-data`.
2. **Usuário e banco:** o usuário é por ambiente (`capaolab_staging`) e o banco é o da aplicação (`capaogrande`). São dois comandos separados, porque `CREATE DATABASE` não roda dentro de uma transação:
   ```bash
   docker exec postgres-shared psql -U postgres -c "CREATE ROLE capaolab_staging LOGIN PASSWORD '<senha>';"
   docker exec postgres-shared psql -U postgres -c "CREATE DATABASE capaogrande OWNER capaolab_staging;"
   ```
3. **Login no registry** com o token de leitura de pacotes:
   ```bash
   echo '<token>' | docker login ghcr.io -u <usuario-github> --password-stdin
   ```
4. **Arquivo de ambiente:** crie `deploy/.env.staging` a partir de `deploy/.env.staging.example` e preencha:
   - `DATABASE_URI`: `postgres://capaolab_staging:<senha>@postgres-shared:5432/capaogrande`. O host é o **nome do container** do Postgres na rede Docker; o `deploy.sh` também o usa para o backup;
   - `PAYLOAD_SECRET` (`openssl rand -base64 32`);
   - `NEXT_PUBLIC_SERVER_URL`;
   - `APP_PORT` (padrão `3100`);
   - `DB_NETWORK` (padrão `shared-db`).

#### Deploy de uma versão

Um único comando faz o deploy completo, inclusive as migrations:

```bash
./deploy/deploy.sh staging <versão>      # ex.: ./deploy/deploy.sh staging 0.2
```

O script, nesta ordem:

1. **Baixa as imagens** `<versão>` (app) e `<versão>-migrate`.
2. **Faz o backup do banco** com `pg_dump` em `~/backups/capao-staging/` (mude com `BACKUP_DIR=...`). Se falhar, para aqui.
3. **Aplica as migrations** com a imagem `<versão>-migrate`, num container que roda e termina. Se falhar, para aqui: **o app em execução não é trocado**.
4. **Sobe o app** da nova versão.
5. **Espera o healthcheck** ficar `healthy`.

O script sempre roda as migrations: numa versão sem migrations novas, o passo 3 só termina com `Done.`. Na primeira implementação (banco vazio), ele cria o schema inteiro.

**Primeiro acesso** (banco novo): abra `/admin`, que mostra a tela de criação do primeiro usuário, e escolha o papel **Administrador**. Staging não usa seed.

**Só as migrations**, sem trocar o app (por exemplo, para validar uma release antes de subi-la):

```bash
export IMAGE_TAG=<versão> ENV_FILE=deploy/.env.staging
docker compose -f deploy/compose.yml --env-file deploy/.env.staging -p capao-staging --profile migrate pull migrate
docker compose -f deploy/compose.yml --env-file deploy/.env.staging -p capao-staging --profile migrate run --rm migrate
```

Faça o backup antes, como no passo 2. Depois de migrar, suba o app da mesma versão; a versão anterior pode não funcionar com o schema novo.

**Conferir as migrations aplicadas:**

```bash
docker exec postgres-shared psql -U capaolab_staging -d capaogrande \
  -c "SELECT name, batch FROM payload_migrations ORDER BY id;"
```

#### Migrations da release seguinte à `0.1`

As quatro rodam no mesmo lote, nesta ordem, e convertem os dados existentes:

| Migration | O que muda | O que acontece com os dados |
| --- | --- | --- |
| `20260926_113113_etiquetas` | Etiquetas viram a collection `etiquetas`, e o informe pode ter várias ([spec](docs/features/etiquetas-informes.md)) | As 7 etiquetas fixas viram registros, e cada informe passa a apontar para a etiqueta que tinha |
| `20260926_113524_capa_unsplash` | Campo de capa pelo link do Unsplash ([spec](docs/features/capa-unsplash.md)) | Só adiciona colunas vazias |
| `20260926_113948_secoes_cardapio` | Seções do cardápio viram a collection `secoes-cardapio` ([spec](docs/features/secoes-cardapio.md)) | Pizzas, Tamanhos, Bebidas e Vinhos viram registros com o tipo certo, e cada item passa a apontar para a sua seção |
| `20260926_114349_caixa_contas_fechadas` | Ciclo da conta: fechada → pagamento → paga ([spec](docs/features/caixa-contas-fechadas.md)) | Contas `aberta` passam a `pagamento`; contas pagas não mudam |

Conferência depois do deploy:

```bash
docker exec postgres-shared psql -U capaolab_staging -d capaogrande \
  -c "SELECT count(*) AS etiquetas FROM etiquetas;" \
  -c "SELECT count(*) AS informes_sem_etiqueta FROM informes i WHERE NOT EXISTS (SELECT 1 FROM informes_rels r WHERE r.parent_id = i.id AND r.path = 'etiquetas');" \
  -c "SELECT s.nome, s.tipo, count(c.id) AS itens FROM secoes_cardapio s LEFT JOIN cardapio c ON c.secao_id = s.id GROUP BY s.id ORDER BY s.ordem;" \
  -c "SELECT status, count(*) FROM caixa GROUP BY status;"
```

O esperado: 7 etiquetas, nenhum informe sem etiqueta, as 4 seções com os seus itens e nenhuma conta com status `aberta`.

#### Rollback

Voltar só a imagem **não basta** quando a release trouxe migrations: a versão anterior não entende o schema novo. O rollback é restaurar o backup feito pelo `deploy.sh` e subir a versão anterior:

```bash
docker compose -p capao-staging stop app
docker exec postgres-shared psql -U postgres -c "DROP DATABASE capaogrande;"
docker exec postgres-shared psql -U postgres -c "CREATE DATABASE capaogrande OWNER capaolab_staging;"
docker exec -i postgres-shared pg_restore -U capaolab_staging -d capaogrande --no-owner \
  < ~/backups/capao-staging/<arquivo>.dump
./deploy/deploy.sh staging <versão-anterior>
```

- Recrie o banco antes de restaurar. Um `pg_restore --clean` em cima do banco migrado deixa para trás as tabelas criadas pelas migrations novas.
- Tudo o que foi gravado no staging depois do backup se perde.
- Sem migrations entre as versões, basta `./deploy/deploy.sh staging <versão-anterior>`.

Cada migration roda na própria transação. Se uma falhar no passo 3, só ela é desfeita; as anteriores do mesmo lote ficam aplicadas. Nesse caso, restaure o backup antes de tentar de novo.

#### Banco que recebeu `push`

**Sintoma:** a consulta de `payload_migrations` mostra uma linha `dev` com `batch = -1`, e o passo de migrations para em *"It looks like you've run Payload in dev mode…"*.

**Causa:** algum comando do Payload rodou contra o banco sem `NODE_ENV=production` (por exemplo, um seed feito de um checkout). Nesse modo, o Payload sincroniza o schema direto no banco (`push`) em vez de usar as migrations.

**Correção:** registre como aplicadas as migrations da versão que fez o `push` e remova a marca `dev`. Isso só é seguro se o `push` foi feito com o código da versão implantada. Faça o backup antes. Para a `0.1`, a migration é a inicial:

```bash
docker exec postgres-shared psql -U capaolab_staging -d capaogrande -c "
  BEGIN;
  DELETE FROM payload_migrations WHERE batch = -1;
  INSERT INTO payload_migrations (name, batch) VALUES ('20260925_155109_initial', 1);
  COMMIT;"
```

Depois, rode o `deploy.sh` normalmente.

#### Operação

- **Logs do app:** `docker compose -p capao-staging logs -f app`
- **Estado:** `docker compose -p capao-staging ps`

#### Simulação local (sem registry)

Valida os mesmos artefatos da release na sua máquina, com um banco na rede `shared-db`:

```bash
docker build --target migrate -t capao-grande-website:local-migrate .
docker build --target runner -t capao-grande-website:local .
URI=postgres://capaolab_staging:<senha>@postgres-shared:5432/capaogrande
docker run --rm --network shared-db -e DATABASE_URI=$URI -e PAYLOAD_SECRET=dev \
  capao-grande-website:local-migrate
docker run --rm -p 3100:3000 --network shared-db \
  -e DATABASE_URI=$URI -e PAYLOAD_SECRET=dev -e NEXT_PUBLIC_SERVER_URL=http://localhost:3100 \
  capao-grande-website:local
```

O fluxo `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` continua disponível para rodar as imagens de produção com um Postgres próprio, sem registry.

### Produção
