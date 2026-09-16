# Pizzaria Capão Grande Website

## Índice

- [Stack Tecnológica](#stack-tecnológica)
- [Como Rodar](#como-rodar)
  - [Desenvolvimento](#desenvolvimento)
  - [Produção](#produção)

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
- O código em `webapp/` é montado no container, com hot reload.

### Produção

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Para parar os serviços, use `docker compose down` (adicione `-v` para também remover os volumes, como os dados do Postgres).