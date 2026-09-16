# Implementation Plan: Integração do Payload CMS

## Overview

Este plano converte o design em uma sequência incremental de tarefas de código. Ele parte da infraestrutura (Payload embarcado no Next.js 16, Postgres via Docker, ambiente, mídia), passa pelas coleções/global e geração de tipos, adiciona o seed, monta o sistema de design e os componentes reutilizáveis, e por fim liga cada página pública ao CMS via Local API em Server Components. A camada de dados é fatiada em funções puras (paginação, agrupamento, ordenação, fallback de locale, placeholder) para permitir testes de propriedade, complementados por testes por exemplo/integração que exercitam o Payload + Postgres.

Antes de escrever qualquer código Next.js 16, consulte o guia relevante em `node_modules/next/dist/docs/` (regra do `AGENTS.md`); confirme as APIs do Payload 3 e `@payloadcms/db-postgres` no momento da implementação. O bloco `nextjs-agent-rules` do `AGENTS.md` NÃO deve ser removido em nenhum diff.

## Tasks

- [x] 1. Base do projeto: dependências, ambiente e runner de testes
  - [x] 1.1 Instalar e fixar dependências do Payload e do banco
    - Adicionar `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical` e demais peers, com versões fixadas (Payload 3), ao `package.json`
    - Adicionar scripts `payload`, `generate:types` e `seed` ao `package.json`
    - Consultar `node_modules/next/dist/docs/` antes de tocar em qualquer config do Next; confirmar as APIs do Payload 3 instaladas
    - _Requirements: 1.1, 1.3_

  - [x] 1.2 Provisionar Postgres local e variáveis de ambiente
    - Criar `docker-compose.yml` com o serviço `Dev_Postgres` (postgres:16, usuário/senha/db, porta 5432, volume `pgdata`)
    - Criar `.env.example` com `DATABASE_URI` e `PAYLOAD_SECRET`
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 1.3 Configurar o runner de testes (fast-check + framework)
    - Instalar `vitest` e `fast-check` (fixados) como devDependencies; adicionar script `test` com execução única (`vitest --run`)
    - Criar config mínima de teste (tsconfig/vitest) e uma pasta `tests/`
    - Definir mínimo de 100 iterações por propriedade como padrão do fast-check
    - _Requirements: 1.1_

- [x] 2. Configuração central do Payload embarcada no Next.js
  - [x] 2.1 Criar `payload.config.ts` com adapter, localização e validação de env
    - Definir `secret` a partir de `PAYLOAD_SECRET`; usar `postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })`
    - Lançar erro identificando `DATABASE_URI` quando ausente, interrompendo a inicialização
    - Configurar `localization` com `locales` pt/en, `defaultLocale: 'pt'`, `fallback: true`
    - Registrar o editor lexical (rich text) e apontar `db`/`collections`/`globals` (preenchidos nas próximas tarefas)
    - _Requirements: 1.4, 2.2, 2.4, 3.1, 3.2, 5.7_

  - [x] 2.2 Ligar o Payload ao Next.js (route groups e config)
    - Envolver `next.config.ts` com `withPayload(...)`
    - Adicionar o alias `@payload-config` -> `payload.config.ts` no `tsconfig.json`
    - Gerar/instalar os arquivos do route group `(payload)` (admin `/admin`, `api/*`) a partir de `@payloadcms/next`; não editar esses arquivos
    - Mover o site público atual (`app/page.tsx`, `app/layout.tsx`) para o route group `(frontend)` sem colisão de layouts
    - Confirmar que o bloco `nextjs-agent-rules` do `AGENTS.md` permanece intacto
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 2.3 Teste de configuração/smoke da inicialização
    - Exemplo: inicialização falha com mensagem clara quando `DATABASE_URI` está ausente
    - Exemplo: `withPayload` aplicado e `/admin` montado
    - _Requirements: 2.4, 1.2_

- [x] 3. Coleção de mídia e uploads no filesystem local
  - [x] 3.1 Implementar `collections/Media.ts` e `collections/Users.ts`
    - `Media`: `upload` com `staticDir` para `../media`, campo `alt` de texto, expor `url` pública
    - `Users`: coleção de autenticação do admin
    - Registrar ambas em `payload.config.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Teste de integração de upload de mídia
    - Exemplo (Payload + Postgres): upload grava no filesystem e expõe `url`/`alt`
    - _Requirements: 4.2, 4.4_

- [x] 4. Coleções de conteúdo e global de configurações
  - [x] 4.1 Implementar `collections/Informes.ts`
    - Campos `titulo`/`resumo`/`corpo` localizados; `resumo` textarea `maxLength: 200`; `corpo` rich text lexical
    - `slug` único (gerado do `titulo` via hook `beforeValidate` se vazio); `data`; `etiqueta` select com as 7 opções fixas; `capa` upload 1:1; `destaque` checkbox; `publicado`
    - Hook de unicidade de destaque: ao salvar com `destaque: true`, desmarcar `destaque` nos demais (idempotente, no máx. 1 destaque)
    - Registrar em `payload.config.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 3.3_

  - [x] 4.2 Teste de propriedade do modelo de destaque único
    - **Property 1: No máximo um informe em destaque**
    - **Validates: Requirements 5.5, 9.2**
    - Testar implementação em memória do hook: qualquer sequência de "marcar destaque" mantém ≤ 1 destaque e marcar produz exatamente esse destaque
    - Tag: "Feature: payload-cms-integration, Property 1: No máximo um informe em destaque"

  - [x] 4.3 Teste de integração do hook de destaque (Payload + Postgres)
    - Exemplo e2e via Local API: `payload.update` marca um e desmarca os demais
    - _Requirements: 5.5_

  - [x] 4.4 Implementar `collections/Cardapio.ts`
    - Campos `secao` (select: Pizzas, Tamanhos, Bebidas, Vinhos), `nome`, `detalhe` (localizado), `preco` (`type: 'text'`, nunca número), `ordem` (number), `ativo`
    - Registrar em `payload.config.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 3.4_

  - [x] 4.5 Implementar `collections/Cronologia.ts`
    - Campos `ano` (`type: 'text'`, aceita "a confirmar"/"hoje"), `titulo`, `texto`, `ilustracao` (upload), `ordem` (number)
    - Registrar em `payload.config.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 4.6 Implementar `globals/Configuracoes.ts`
    - Campos `endereco`, `linkMapa`, `horarios` (array `faixa`/`horario`), `whatsapp`, `instagram`, `email`, `chavePix`, `qrPix` (upload), `taxasEntrega` (array `distancia`/`valor`), `avisoRetirada`
    - Registrar em `payload.config.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.7 Gerar os tipos do Payload
    - Executar `payload generate:types` para produzir `src/payload-types.ts`
    - Confirmar que o tipo de locales e os tipos das coleções/global existem para consumo no frontend
    - _Requirements: 1.4, 3.2_

- [x] 5. Checkpoint — coleções, global e tipos
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Script de seed com invariantes
  - [x] 6.1 Implementar `scripts/seed.ts` via Local API
    - Popular `informes`, `cardapio`, `cronologia` e o global `configuracoes` com `getPayload({ config })` fora do Next
    - Criar no máximo um `Informe_Destaque`; preservar textos do cardápio palavra por palavra (ex.: "ver tamanhos", "dose", "jarra 1,5 l")
    - Gravar "a confirmar" para dados reais desconhecidos (horários, endereço, linkMapa, WhatsApp, Instagram, e-mail, chave Pix, QR Pix, anos da cronologia) — nunca fabricar
    - Seed idempotente (limpar/repovoar de forma previsível)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 6.2 Teste de integração de invariantes do seed
    - Exemplo (Payload + Postgres): seed cria no máximo um destaque e preserva textos do cardápio verbatim
    - _Requirements: 9.2, 9.3_

- [x] 7. Camada de dados: funções puras + queries da Local API
  - [x] 7.1 Implementar cliente Payload memoizado
    - `lib/payload.ts`: `getPayloadClient = cache(() => getPayload({ config }))`
    - _Requirements: 1.4_

  - [x] 7.2 Implementar utilitários puros de localização e placeholder
    - `lib/design/placeholder helpers`: `isAConfirmar(value)` (trata `null`/`undefined`/vazio/"a confirmar" case-insensitive e com/sem acento como pendente)
    - `resolverLocalizado(valor, locale, fallback)` puro (en ausente ⇒ retorna pt; sem locale ⇒ pt)
    - _Requirements: 3.5, 3.6, 19.1, 19.2_

  - [x] 7.3 Teste de propriedade do fallback de localização
    - **Property 9: Fallback de localização para pt**
    - **Validates: Requirements 3.5, 3.6, 3.1**
    - Metamórfico sobre `resolverLocalizado`: valor `en` ausente com fallback retorna `pt`; sem locale retorna `pt`
    - Tag: "Feature: payload-cms-integration, Property 9: Fallback de localização para pt"

  - [x] 7.4 Teste de propriedade e por exemplo de `isAConfirmar`/placeholder
    - **Property 10: Placeholder para valores ausentes ou "a confirmar"**
    - **Validates: Requirements 19.1, 19.2, 13.2, 15.4, 16.2, 17.3, 10.4**
    - Propriedade sobre strings arbitrárias (espaços, acentos, caixa) mapeando para placeholder; exemplos: "", "  ", "a confirmar", "A Confirmar" (pendente) e "hoje" (não pendente)
    - Tag: "Feature: payload-cms-integration, Property 10: Placeholder para valores ausentes ou a confirmar"

  - [x] 7.5 Implementar funções puras de paginação, agrupamento e ordenação
    - `paginar(total, page, perPage=4)` retornando limite ≤ 4, `hasNextPage`, contador consistente
    - `agruparCardapio(itens)` agrupa por `secao` preservando ordem por `ordem`
    - `ordenarCronologia(marcos)` ordena por `ordem` ascendente
    - `renderPreco(preco)` identidade sobre a string
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 14.1, 14.2, 14.4, 6.3, 6.4, 6.5, 7.4, 17.2_

  - [x] 7.6 Teste de propriedade da identidade de preço
    - **Property 4: Preço é preservado palavra por palavra**
    - **Validates: Requirements 6.3, 6.4, 14.4, 9.3**
    - `renderPreco` é identidade sobre a string armazenada
    - Tag: "Feature: payload-cms-integration, Property 4: Preço é preservado palavra por palavra"

  - [x] 7.7 Teste de propriedade da ordenação da cronologia
    - **Property 5: Ordenação da cronologia por `ordem` crescente**
    - **Validates: Requirements 7.4, 17.2**
    - `ordenarCronologia` produz lista não decrescente por `ordem`
    - Tag: "Feature: payload-cms-integration, Property 5: Ordenação da cronologia por ordem crescente"

  - [x] 7.8 Teste de propriedade do agrupamento do cardápio
    - **Property 6: Agrupamento do cardápio por seção preservando ordem**
    - **Validates: Requirements 14.1, 14.2, 6.5**
    - Cada item ativo aparece exatamente uma vez; dentro de cada seção, ordem não decrescente por `ordem`
    - Tag: "Feature: payload-cms-integration, Property 6: Agrupamento do cardápio por seção preservando ordem"

  - [x] 7.9 Teste de propriedade da paginação e do contador
    - **Property 7: Paginação da listagem de informes**
    - **Property 8: Contador consistente com o total**
    - **Validates: Requirements 11.2, 11.1, 11.3, 11.5, 11.4**
    - `paginar` sobre totais/páginas aleatórios: ≤ 4 por página, presença do botão sse há mais publicados, contador ≤ total e = soma carregada
    - Tags: "Feature: payload-cms-integration, Property 7: Paginação da listagem de informes" e "Feature: payload-cms-integration, Property 8: Contador consistente com o total"

  - [x] 7.10 Implementar as queries das páginas em `lib/queries.ts`
    - `getInformeDestaque`, `getInformesRecentes`, `getInformesPagina`, `getInformeBySlug`, `getCardapioAgrupado`, `getCronologia`, `getConfiguracoes`
    - Leituras públicas sempre filtram `publicado`/`ativo` e usam locale pt por padrão; detalhe lê `en` com `fallbackLocale: 'none'` só para a seção secundária
    - Tipar com os tipos gerados de `src/payload-types.ts`
    - _Requirements: 5.8, 6.6, 10.1, 10.2, 11.1, 12.1, 12.4, 14.1, 7.4, 8.1_

  - [x] 7.11 Testes de integração das leituras públicas (Payload + Postgres)
    - Exemplos: listagem só retorna `publicado`; cardápio só retorna `ativo`; fallback de locale real (en vazio ⇒ pt); slug inexistente/não publicado ⇒ null
    - **Property 2: Leitura pública de informes só retorna publicados** / **Property 3: Leitura pública do cardápio só retorna ativos** / **Property 11: Slug de informe resolve documento publicado ou 404**
    - **Validates: Requirements 5.8, 11.1, 6.6, 3.6, 12.1, 12.3**
    - Tags: "Feature: payload-cms-integration, Property 2: ..." , "Property 3: ...", "Property 11: ..."

- [x] 8. Checkpoint — camada de dados
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Sistema de design (tokens, fontes e assets)
  - [x] 9.1 Configurar fontes via `next/font`
    - `lib/design/fonts.ts`: EB Garamond (títulos/números/itálicos) e Karla (corpo/nav/botões) como CSS variables `--font-serif`/`--font-sans`
    - Consultar `node_modules/next/dist/docs/` para o uso de `next/font` no Next 16
    - _Requirements: 18.1_

  - [x] 9.2 Definir tokens Tailwind v4 em `app/globals.css`
    - Paleta fechada, raios 4–6px, borda 1px `#e4dfd2`, sem sombra; larguras `--spacing-conteudo` 1120px e `--spacing-leitura`; foco visível `#86a544`
    - Regras de grade reflow `repeat(auto-fit, minmax(240px..320px, 1fr))`; hover verde; botão primário escurece para `#3e3229`
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 20.3_

  - [x] 9.3 Copiar aquarelas para `public/assets/watercolor/`
    - Copiar `arvore-1..6`, `banana`, `erva`, `legumes`, `mel`, `molho`, `palmeira`, `vinho`, `logo`, `mark` de `docs/design/assets` para `public/assets/watercolor/`
    - _Requirements: 18.8_

- [x] 10. Componentes reutilizáveis e layout compartilhado
  - [x] 10.1 Implementar `<Placeholder>` e `<Watercolor>`
    - `<Placeholder label>` em cinza `#a89c8a`, sem dados fabricados; `<Watercolor>` renderiza aquarela em fundo claro, sem sombra/borda, com `alt` apropriado (decorativa ⇒ `alt=""`)
    - _Requirements: 19.1, 19.2, 18.8, 20.1_

  - [x] 10.2 Implementar `<CmsImage>`
    - Wrapper de `next/image` que lê `url` e `alt` de `Colecao_Media`; capa 1:1 quando aplicável; placeholder listrado com legenda quando a imagem está ausente
    - Consultar `node_modules/next/dist/docs/` para `next/image` no Next 16
    - _Requirements: 4.4, 5.3, 20.1_

  - [x] 10.3 Teste de propriedade do alt de imagem de conteúdo
    - **Property 12: Texto alternativo de imagens de conteúdo**
    - **Validates: Requirements 4.3, 20.1**
    - `<CmsImage>` sobre registros de mídia arbitrários: `alt` renderizado = `alt` armazenado
    - Tag: "Feature: payload-cms-integration, Property 12: Texto alternativo de imagens de conteúdo"

  - [x] 10.4 Implementar `<SiteHeader>`, `<SiteFooter>` e o layout `(frontend)`
    - `app/(frontend)/layout.tsx`: `<html lang="pt-BR">`, CSS variables das fontes, largura máx e respiro lateral, envolve com header/footer
    - Header sticky com blur/borda, logo ≥ 88px, item ativo `#55453a`, hover `#86a544`; footer com grafismo e contatos do global usando `<Placeholder>` para ausentes
    - _Requirements: 18.4, 18.6, 13.2, 19.1, 20.2, 20.3_

  - [x] 10.5 Implementar componentes de conteúdo restantes
    - `<NavCard>` (card inteiro clicável), `<InformeCard>`, `<HoursTable>`, `<MenuSection>` (preço à direita, verbatim), `<StepList>`, `<Timeline>`, `<ShareButtons>` (nomes acessíveis)
    - Aplicar placeholder onde os dados podem faltar; foco visível e nomes acessíveis nos interativos
    - _Requirements: 10.2, 10.3, 11.1, 13.1, 13.2, 14.1, 14.3, 14.4, 15.1, 16.1, 17.1, 17.3, 18.8, 20.3, 20.4_

  - [x] 10.6 Testes de snapshot dos componentes do sistema de design
    - Snapshots de `<NavCard>`, `<MenuSection>`, `<Timeline>`, `<Placeholder>` fixando paleta, raios, bordas e ausência de sombra
    - _Requirements: 18.2, 18.3_

- [x] 11. Checkpoint — sistema de design e componentes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Páginas públicas ligadas ao CMS (Server Components)
  - [x] 12.1 Implementar a home `/`
    - Hero com `Informe_Destaque` (placeholder quando ausente, sem fabricar); 3 informes recentes publicados que não sejam o destaque; 3 `<NavCard>` para `/processo`, `/delivery`, `/pizzaria`
    - Um `<h1>`, hierarquia de headings sequencial
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 20.2_

  - [x] 12.2 Implementar a listagem `/informes`
    - 4 por página, ordem cronológica inversa por `data`; contador "X de Y"; botão "Publicações mais antigas" sse há mais publicados; nomes acessíveis nos controles de paginação
    - Usar `paginar` e as queries; consultar `node_modules/next/dist/docs/` para `searchParams`/`params` (Promise) no Next 16
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 20.4_

  - [x] 12.3 Implementar o detalhe `/informes/[slug]`
    - Exibir etiqueta, data, título, capa 1:1, resumo destacado, corpo e resumo em inglês; `<ShareButtons>` com nomes acessíveis
    - `notFound()` (404) quando o slug não corresponde a informe publicado; omitir a seção em inglês quando o resumo `en` está ausente (sem fabricar)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 20.4_

  - [x] 12.4 Implementar `/pizzaria`
    - Mapa a partir de `linkMapa`, `<HoursTable>` a partir de `horarios`, contatos do global; `<Placeholder>` cinza para campos ausentes/"a confirmar"
    - _Requirements: 13.1, 13.2, 19.1, 19.2_

  - [x] 12.5 Implementar `/cardapio`
    - Agrupar itens ativos por `secao` via `agruparCardapio`, ordenar por `ordem`; preço à direita, verbatim via `renderPreco`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 12.6 Implementar `/delivery`
    - 3 passos (WhatsApp, Pix com QR, taxa por distância) via `<StepList>`; chave Pix e QR do global; `taxasEntrega`; `<Placeholder>` para ausentes/"a confirmar"
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 19.1, 19.2_

  - [x] 12.7 Implementar `/processo`
    - 5 passos do processo via `<StepList>`; `<Placeholder>` para detalhes de massa/fotos quadradas ausentes
    - _Requirements: 16.1, 16.2, 19.1, 19.2_

  - [x] 12.8 Implementar `/sobre`
    - História desde 1992 e `<Timeline>` da cronologia ordenada por `ordem`; ano "a confirmar" como `<Placeholder>` cinza
    - _Requirements: 17.1, 17.2, 17.3, 19.1_

  - [x] 12.9 Implementar o `not-found.tsx` do `(frontend)`
    - Página 404 dentro do sistema de design, usada por `/informes/[slug]` inexistente
    - _Requirements: 12.3_

  - [x] 12.10 Testes de acessibilidade automatizados das páginas públicas
    - axe nas páginas: hierarquia de headings, foco visível, nomes acessíveis (compartilhar/paginação), `alt` presente
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [x] 13. Checkpoint final — todas as páginas e testes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são de teste e podem ser puladas para um MVP mais rápido; as demais são implementação obrigatória.
- Cada tarefa referencia requisitos específicos para rastreabilidade; tarefas de propriedade referenciam a Property correspondente do design e usam a tag "Feature: payload-cms-integration, Property {n}: {texto}".
- Testes de propriedade cobrem lógica pura (destaque único em memória, identidade de preço, ordenação da cronologia, agrupamento do cardápio, paginação/contador, fallback de locale, `isAConfirmar`/placeholder, alt de imagem). Testes por exemplo/integração cobrem o Payload + Postgres (hook de destaque e2e, filtros públicos, fallback no DB, upload de mídia, slug 404, invariantes do seed) e configuração/acessibilidade/snapshot.
- Antes de escrever código Next.js 16, consulte `node_modules/next/dist/docs/`; confirme as APIs do Payload 3 no momento da implementação. Não remova o bloco `nextjs-agent-rules` do `AGENTS.md`.
- Mínimo de 100 iterações por propriedade no fast-check.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "4.1", "4.4", "4.5", "4.6"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.7"] },
    { "id": 6, "tasks": ["6.1", "7.1", "7.2", "7.5"] },
    { "id": 7, "tasks": ["6.2", "7.3", "7.4", "7.6", "7.7", "7.8", "7.9", "7.10"] },
    { "id": 8, "tasks": ["7.11", "9.1", "9.2", "9.3"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.4", "10.5"] },
    { "id": 10, "tasks": ["10.3", "10.6"] },
    { "id": 11, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9"] },
    { "id": 12, "tasks": ["12.10"] }
  ]
}
```
