# Capa de informe via link do Unsplash

## CONTEXTO

A capa do informe (`capa`) é um upload para a collection `media`, em
proporção 1:1. Para publicar sem foto própria, o admin pode colar o link de
uma imagem do Unsplash e usá-la como capa, sem baixar e subir o arquivo.

A imagem é servida a partir do próprio Unsplash (`images.unsplash.com`),
através do otimizador de imagens do Next. Não há integração com a API do
Unsplash: basta colar o link.

## REGRAS DE NEGÓCIO

- RN-U01: o informe ganha o grupo opcional `capaUnsplash` com `url` e `alt`,
  ao lado do upload `capa`, que continua existindo.
- RN-U02: só são aceitos links `https://images.unsplash.com/...`. Qualquer
  outro link é recusado na validação, com uma mensagem que explica como usar o
  link direto da imagem ("Copiar endereço da imagem").
- RN-U03: se o informe tem os dois, vale o upload `capa`. Se não tem nenhum,
  aparece o placeholder "capa a confirmar", como antes.
- RN-U04: a imagem do Unsplash é recortada em 1:1 pelos parâmetros da
  própria URL (`w`, `h`, `fit=crop`, `crop=entropy`), com o mesmo visual da
  capa enviada por upload.
- RN-U05: o texto alternativo é obrigatório sempre que houver link (Req 20.1).

## TAREFAS

### Tarefa 1: Campo no informe

**Critérios de Aceite**

- [x] O grupo `capaUnsplash` (`url`, `alt`) é validado conforme RN-U02 e
      RN-U05.
- [x] A migração `20260926_113524_capa_unsplash` adiciona as colunas.
- [x] A descrição no admin explica como copiar o link direto.

### Tarefa 2: Renderização

**Critérios de Aceite**

- [x] `capaDoInforme` (`lib/unsplash.ts`) resolve a capa com a precedência
      da RN-U03. `<CmsImage>` aceita uma imagem externa com a mesma forma de
      `Media`.
- [x] `images.remotePatterns` libera `images.unsplash.com` no
      `next.config.ts`.
- [x] O card, o destaque da home e a página do informe renderizam a capa do
      Unsplash em 1:1 (RN-U04).

## FORA DO ESCOPO

- Buscar fotos do Unsplash dentro do admin, que exigiria a API.
- Aceitar o link da página (`unsplash.com/photos/...`).
- Crédito ao fotógrafo. A Licença Unsplash não exige atribuição fora do uso
  da API.

## REFERÊNCIAS

- `src/collections/Informes.ts`, `lib/unsplash.ts`,
  `components/CmsImage.tsx`, `next.config.ts`
- `src/migrations/20260926_113524_capa_unsplash.ts`
- Testes: `tests/unsplash.test.ts`
- Doc externa: Next.js `images.remotePatterns` em `node_modules/next/dist/docs/`
