# Requirements Document

## Introduction

Este documento descreve os requisitos para integrar o Payload CMS 3 ao site do Capão Grande, construído em Next.js 16.3.5 (App Router) com React 19, TypeScript 5 e Tailwind CSS v4. O Payload será embarcado no mesmo aplicativo Next.js (código e deploy únicos), com o painel administrativo disponível em `/admin` e persistência em Postgres através de `@payloadcms/db-postgres`.

O escopo cobre a fatia completa da funcionalidade: configuração do Payload (coleções, global, localização pt-BR/en, mídia e dados iniciais de exemplo) e construção de todas as páginas públicas conectadas aos dados do CMS, aplicando o sistema de design derivado das Diretrizes do Site e do HTML de design.

O conteúdo modela três coleções (informes, cardápio, cronologia), uma configuração global (configuracoes), uma coleção de mídia, e as páginas públicas `/`, `/informes`, `/informes/[slug]`, `/pizzaria`, `/cardapio`, `/delivery`, `/processo` e `/sobre`. A fidelidade ao sistema de design, o comportamento de placeholders para dados "a confirmar" e a acessibilidade são requisitos transversais.

Observação técnica: o Next.js 16.3.5 pode divergir do conhecimento prévio; o guia relevante encontra-se em `node_modules/next/dist/docs/`. O bloco `nextjs-agent-rules` do `AGENTS.md` não deve ser removido.

## Glossary

- **Site**: O aplicativo web público do Capão Grande construído em Next.js.
- **Payload**: A instância do Payload CMS 3 embarcada no aplicativo Next.js, cujo painel administrativo está em `/admin`.
- **Admin_Payload**: O painel administrativo padrão do Payload em `/admin`; é a única interface de administração do sistema.
- **Postgres**: O banco de dados PostgreSQL acessado via `@payloadcms/db-postgres`.
- **Colecao_Informes**: A coleção `informes` do Payload que armazena publicações/notícias.
- **Colecao_Cardapio**: A coleção `cardapio` do Payload que armazena itens do cardápio.
- **Colecao_Cronologia**: A coleção `cronologia` do Payload que armazena marcos históricos.
- **Colecao_Media**: A coleção de mídia do Payload responsável por uploads de arquivos.
- **Global_Configuracoes**: O global `configuracoes` do Payload com dados de contato, horários, entrega e Pix.
- **Sistema_Localizacao**: O subsistema de localização do Payload configurado com pt-BR como padrão e en como secundário.
- **Sistema_Design**: O conjunto de tokens visuais (fontes, paleta, raios, bordas, espaçamentos, grades) definidos nas Diretrizes do Site.
- **Placeholder_AConfirmar**: A representação visual em cinza usada para valores ausentes ou marcados como "a confirmar", exibida sem dados fabricados.
- **Informe_Destaque**: O único registro da Colecao_Informes com o campo `destaque` marcado por vez.
- **Dev_Postgres**: A instância local de Postgres provida via `docker-compose.yml` para desenvolvimento.

## Requirements

### Requirement 1: Configuração do Payload e Postgres

**User Story:** Como desenvolvedor, quero o Payload CMS 3 embarcado no aplicativo Next.js com persistência em Postgres, para gerenciar conteúdo em um único código e deploy.

#### Acceptance Criteria

1. THE Payload SHALL ser embarcado no mesmo aplicativo Next.js, compartilhando código e deploy únicos.
2. THE Admin_Payload SHALL ser servido na rota `/admin`.
3. THE Payload SHALL usar `@payloadcms/db-postgres` para persistência em Postgres.
4. WHEN o aplicativo Next.js inicializa, THE Payload SHALL carregar sua configuração a partir de um arquivo de configuração central do Payload.
5. THE Site SHALL preservar o bloco `nextjs-agent-rules` do arquivo `AGENTS.md` sem remoção.

### Requirement 2: Ambiente de desenvolvimento com Docker Compose e variáveis de ambiente

**User Story:** Como desenvolvedor, quero um Postgres local via Docker Compose e configuração por variáveis de ambiente, para executar o projeto localmente de forma reproduzível.

#### Acceptance Criteria

1. THE Site SHALL fornecer um arquivo `docker-compose.yml` que provisiona a Dev_Postgres para desenvolvimento local.
2. THE Payload SHALL ler a string de conexão do banco a partir da variável de ambiente `DATABASE_URI`.
3. THE Site SHALL fornecer um arquivo `.env` de exemplo contendo a chave `DATABASE_URI`.
4. IF a variável de ambiente `DATABASE_URI` estiver ausente na inicialização, THEN THE Payload SHALL registrar uma mensagem de erro identificando a variável ausente e interromper a inicialização.
5. THE Payload SHALL usar um segredo de aplicação lido de variável de ambiente para assinatura de sessões administrativas.

### Requirement 3: Localização pt-BR e en

**User Story:** Como editor de conteúdo, quero campos localizados em pt-BR e en, para publicar conteúdo em português com resumos curtos em inglês.

#### Acceptance Criteria

1. THE Sistema_Localizacao SHALL definir pt-BR como localidade padrão e en como localidade secundária.
2. WHERE um campo é declarado como localizado, THE Payload SHALL armazenar valores separados para pt-BR e en.
3. THE Colecao_Informes SHALL declarar os campos de texto `titulo`, `resumo` e `corpo` como localizados em pt-BR e en.
4. THE Colecao_Cardapio SHALL declarar o campo `detalhe` como localizado em pt-BR e en.
5. WHEN uma requisição de leitura pública não informa uma localidade, THE Payload SHALL retornar os valores da localidade pt-BR.
6. IF o valor da localidade en de um campo localizado estiver ausente, THEN THE Site SHALL exibir o conteúdo da localidade pt-BR como conteúdo apresentado.

### Requirement 4: Coleção de mídia e uploads

**User Story:** Como editor de conteúdo, quero enviar imagens pelo painel, para associar capas, ilustrações e QR code aos conteúdos.

#### Acceptance Criteria

1. THE Payload SHALL fornecer a Colecao_Media para uploads de arquivos.
2. THE Colecao_Media SHALL armazenar os arquivos no sistema de arquivos local.
3. WHEN um arquivo de imagem é enviado, THE Colecao_Media SHALL registrar um campo de texto alternativo associado ao arquivo.
4. THE Colecao_Media SHALL expor a URL pública de cada arquivo armazenado para consumo pelas páginas do Site.

### Requirement 5: Coleção informes

**User Story:** Como editor de conteúdo, quero cadastrar informes com etiqueta, resumo, corpo e capa, para publicar notícias no site.

#### Acceptance Criteria

1. THE Colecao_Informes SHALL fornecer os campos `titulo`, `slug`, `data`, `etiqueta`, `destaque`, `resumo`, `corpo`, `capa` e `publicado`.
2. THE Colecao_Informes SHALL restringir o campo `etiqueta` aos valores: Funcionamento, Reflorestamento, Horta, Compostagem, Apiário, Viveiro, Cardápio.
3. THE Colecao_Informes SHALL definir o campo `capa` como um upload de imagem com proporção 1:1.
4. THE Colecao_Informes SHALL definir o campo `destaque` como um campo de marcação (checkbox).
5. WHEN um registro da Colecao_Informes é salvo com `destaque` marcado, THE Payload SHALL desmarcar `destaque` em todos os demais registros da Colecao_Informes, mantendo no máximo um Informe_Destaque.
6. THE Colecao_Informes SHALL limitar o campo `resumo` a no máximo 200 caracteres.
7. THE Colecao_Informes SHALL definir o campo `corpo` como um campo de texto rico (rich text).
8. WHEN uma consulta pública lista informes, THE Payload SHALL retornar apenas registros com `publicado` verdadeiro.

### Requirement 6: Coleção cardápio

**User Story:** Como editor de conteúdo, quero cadastrar itens do cardápio com preço em texto livre, para preservar os valores exatos do cardápio impresso.

#### Acceptance Criteria

1. THE Colecao_Cardapio SHALL fornecer os campos `secao`, `nome`, `detalhe`, `preco`, `ordem` e `ativo`.
2. THE Colecao_Cardapio SHALL restringir o campo `secao` aos valores: Pizzas, Tamanhos, Bebidas, Vinhos.
3. THE Colecao_Cardapio SHALL armazenar o campo `preco` como texto, preservando valores como "R$ 30,00", "ver tamanhos", "dose" e "jarra 1,5 l".
4. WHEN uma página pública renderiza o campo `preco`, THE Site SHALL exibir o texto do preço palavra por palavra, sem reformatação numérica.
5. THE Colecao_Cardapio SHALL fornecer o campo `ordem` para ordenação dos itens dentro de cada `secao`.
6. WHEN uma consulta pública lista itens do cardápio, THE Payload SHALL retornar apenas registros com `ativo` verdadeiro.

### Requirement 7: Coleção cronologia

**User Story:** Como editor de conteúdo, quero cadastrar marcos da linha do tempo, para contar a história e o reflorestamento do Capão Grande.

#### Acceptance Criteria

1. THE Colecao_Cronologia SHALL fornecer os campos `ano`, `titulo`, `texto`, `ilustracao` e `ordem`.
2. THE Colecao_Cronologia SHALL armazenar o campo `ano` como texto, aceitando valores como "ano a confirmar" e "hoje".
3. THE Colecao_Cronologia SHALL definir o campo `ilustracao` como um upload de imagem.
4. WHEN uma página pública lista marcos da cronologia, THE Payload SHALL ordenar os registros pelo campo `ordem` em ordem crescente.

### Requirement 8: Global configuracoes

**User Story:** Como editor de conteúdo, quero um painel único de configurações do estabelecimento, para manter contato, horários, entrega e Pix centralizados.

#### Acceptance Criteria

1. THE Global_Configuracoes SHALL fornecer os campos `endereco`, `linkMapa`, `horarios`, `whatsapp`, `instagram`, `email`, `chavePix`, `qrPix`, `taxasEntrega` e `avisoRetirada`.
2. THE Global_Configuracoes SHALL definir `horarios` como um array de itens com os campos `faixa` e `horário`.
3. THE Global_Configuracoes SHALL definir `taxasEntrega` como um array de itens com os campos `distância` e `valor`.
4. THE Global_Configuracoes SHALL definir o campo `qrPix` como um upload de imagem.

### Requirement 9: Dados iniciais (seed)

**User Story:** Como desenvolvedor, quero um script de seed com dados de exemplo, para inicializar o ambiente com conteúdo representativo.

#### Acceptance Criteria

1. THE Site SHALL fornecer um script de seed que popula a Colecao_Informes, a Colecao_Cardapio, a Colecao_Cronologia e o Global_Configuracoes.
2. WHEN o script de seed executa, THE Site SHALL criar no máximo um Informe_Destaque.
3. THE script de seed SHALL preservar os textos do cardápio impresso palavra por palavra nos registros da Colecao_Cardapio.
4. WHERE um dado real é desconhecido (horários, endereço, link do Maps, WhatsApp, Instagram, e-mail, chave Pix, QR Pix, anos da cronologia), THE script de seed SHALL registrar o valor como marcador "a confirmar" em vez de fabricar dados.

### Requirement 10: Página inicial (`/`)

**User Story:** Como visitante, quero uma página inicial com destaque e informes recentes, para conhecer as novidades e navegar às seções principais.

#### Acceptance Criteria

1. WHEN a rota `/` é carregada, THE Site SHALL exibir no hero o Informe_Destaque atual.
2. WHEN a rota `/` é carregada, THE Site SHALL exibir os 3 informes publicados mais recentes que não sejam o Informe_Destaque.
3. THE Site SHALL exibir na rota `/` 3 cartões de navegação apontando para `/processo`, `/delivery` e `/pizzaria`.
4. IF não existir um Informe_Destaque, THEN THE Site SHALL exibir o hero sem conteúdo fabricado, aplicando o Placeholder_AConfirmar quando aplicável.

### Requirement 11: Listagem de informes (`/informes`)

**User Story:** Como visitante, quero navegar pela lista de informes em ordem cronológica, para acompanhar as publicações ao longo do tempo.

#### Acceptance Criteria

1. WHEN a rota `/informes` é carregada, THE Site SHALL listar informes publicados em ordem cronológica inversa pelo campo `data`.
2. THE Site SHALL exibir 4 informes por página na rota `/informes`.
3. WHILE existem informes publicados além dos exibidos, THE Site SHALL apresentar o botão "Publicações mais antigas".
4. THE Site SHALL exibir um contador indicando a quantidade de informes exibidos em relação ao total de informes publicados.
5. WHEN o visitante aciona o botão "Publicações mais antigas", THE Site SHALL exibir os 4 informes publicados seguintes em ordem cronológica inversa.

### Requirement 12: Detalhe do informe (`/informes/[slug]`)

**User Story:** Como visitante, quero ler um informe completo, para acessar o conteúdo detalhado com opções de compartilhamento.

#### Acceptance Criteria

1. WHEN a rota `/informes/[slug]` é carregada com um `slug` de informe publicado, THE Site SHALL exibir a etiqueta, a data, o título, a capa 1:1, o resumo destacado, o corpo e o resumo em inglês do informe.
2. THE Site SHALL exibir botões de compartilhamento na página de detalhe do informe.
3. IF o `slug` não corresponder a um informe publicado, THEN THE Site SHALL responder com a página de erro 404.
4. IF o resumo em inglês do informe estiver ausente, THEN THE Site SHALL omitir a seção de resumo em inglês sem exibir conteúdo fabricado.

### Requirement 13: Página pizzaria (`/pizzaria`)

**User Story:** Como visitante, quero ver localização, horários e contato, para saber como e quando visitar a pizzaria.

#### Acceptance Criteria

1. WHEN a rota `/pizzaria` é carregada, THE Site SHALL exibir o mapa a partir de `linkMapa`, a tabela de horários a partir de `horarios` e as informações de contato do Global_Configuracoes.
2. IF um campo de contato, o `linkMapa` ou os `horarios` estiverem ausentes ou marcados como "a confirmar", THEN THE Site SHALL exibir o Placeholder_AConfirmar em cinza no lugar do valor.

### Requirement 14: Página cardápio (`/cardapio`)

**User Story:** Como visitante, quero ver o cardápio agrupado por seção, para consultar itens e preços.

#### Acceptance Criteria

1. WHEN a rota `/cardapio` é carregada, THE Site SHALL agrupar os itens ativos do cardápio por `secao`.
2. THE Site SHALL ordenar os itens dentro de cada `secao` pelo campo `ordem` em ordem crescente.
3. THE Site SHALL exibir o preço de cada item alinhado à direita.
4. THE Site SHALL exibir o texto de `preco` palavra por palavra, sem reformatação.

### Requirement 15: Página delivery (`/delivery`)

**User Story:** Como visitante, quero entender como pedir por entrega, para fazer o pedido via WhatsApp e pagar por Pix.

#### Acceptance Criteria

1. WHEN a rota `/delivery` é carregada, THE Site SHALL exibir 3 passos: pedido por WhatsApp, pagamento por Pix com QR, e taxa por distância.
2. THE Site SHALL exibir a chave Pix e o QR Pix a partir do Global_Configuracoes.
3. THE Site SHALL exibir as taxas por distância a partir do array `taxasEntrega`.
4. IF a chave Pix, o QR Pix, o WhatsApp ou as `taxasEntrega` estiverem ausentes ou marcados como "a confirmar", THEN THE Site SHALL exibir o Placeholder_AConfirmar em cinza no lugar do valor.

### Requirement 16: Página processo (`/processo`)

**User Story:** Como visitante, quero conhecer o processo de produção, para entender como os produtos são feitos.

#### Acceptance Criteria

1. WHEN a rota `/processo` é carregada, THE Site SHALL exibir os 5 passos do processo de produção.
2. IF os detalhes de massa ou fotos quadradas estiverem ausentes, THEN THE Site SHALL exibir o Placeholder_AConfirmar em cinza sem fabricar dados.

### Requirement 17: Página sobre (`/sobre`)

**User Story:** Como visitante, quero conhecer a história e o reflorestamento, para entender a trajetória do Capão Grande desde 1992.

#### Acceptance Criteria

1. WHEN a rota `/sobre` é carregada, THE Site SHALL exibir a história desde 1992 e a linha do tempo de reflorestamento a partir da Colecao_Cronologia.
2. THE Site SHALL ordenar os marcos da linha do tempo pelo campo `ordem` em ordem crescente.
3. WHERE um marco possui o campo `ano` com valor "a confirmar", THE Site SHALL exibir o ano como Placeholder_AConfirmar em cinza.

### Requirement 18: Fidelidade ao sistema de design

**User Story:** Como visitante, quero uma experiência visual consistente, para reconhecer a identidade da marca Capão Grande.

#### Acceptance Criteria

1. THE Site SHALL aplicar a fonte EB Garamond em títulos, números e itálicos em inglês, e a fonte Karla em corpo de texto, navegação e botões.
2. THE Site SHALL usar exclusivamente as cores da paleta: #55453a, #6b6052, #86a544, #b9cc6a, #faf7f0, #fffdf8, #e4dfd2, #ece8dc.
3. THE Site SHALL aplicar raios de canto entre 4px e 6px, bordas de 1px na cor #e4dfd2 e nenhuma sombra.
4. WHEN o ponteiro passa sobre um elemento interativo, THE Site SHALL aplicar a cor verde #86a544 no estado de hover.
5. WHEN o ponteiro passa sobre um botão primário, THE Site SHALL escurecer o botão para a cor #3e3229.
6. THE Site SHALL limitar a largura máxima do conteúdo a 1120px, com 760px a 900px em páginas de leitura e 24px de espaçamento lateral.
7. WHERE uma grade de conteúdo é usada, THE Site SHALL reflowar automaticamente com colunas de largura mínima entre 240px e 320px.
8. THE Site SHALL usar apenas os assets de aquarela em `docs/design/assets` como repertório de ilustração.

### Requirement 19: Comportamento de placeholders "a confirmar"

**User Story:** Como responsável pelo conteúdo, quero que dados desconhecidos apareçam como placeholders, para nunca publicar informações fabricadas.

#### Acceptance Criteria

1. WHERE um valor está ausente ou marcado como "a confirmar", THE Site SHALL renderizar o Placeholder_AConfirmar em cinza.
2. THE Site SHALL exibir o Placeholder_AConfirmar em vez de dados fabricados para horários, endereço, link do Maps, WhatsApp, Instagram, e-mail, chave Pix, QR Pix, anos da cronologia, detalhes de massa e fotos quadradas.

### Requirement 20: Acessibilidade

**User Story:** Como visitante que usa tecnologia assistiva, quero páginas acessíveis, para navegar e compreender o conteúdo.

#### Acceptance Criteria

1. WHEN uma imagem de conteúdo é renderizada, THE Site SHALL fornecer texto alternativo a partir do campo de texto alternativo da Colecao_Media.
2. THE Site SHALL manter uma hierarquia de cabeçalhos sequencial em cada página pública.
3. WHEN um elemento interativo recebe foco de teclado, THE Site SHALL exibir um indicador de foco visível.
4. THE Site SHALL fornecer nomes acessíveis para os botões de compartilhamento e para os controles de navegação e paginação.
