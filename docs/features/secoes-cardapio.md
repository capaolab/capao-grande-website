# Seções do cardápio

## CONTEXTO

As seções do cardápio eram fixas no código (Pizzas, Tamanhos, Bebidas,
Vinhos). Para acrescentar produtos fora dessas seções (ex.: Sobremesas) era
preciso deploy.

Esta feature cria a collection `secoes-cardapio`, com CRUD no Payload
(`/admin`), e faz o item do cardápio apontar para ela.

Duas seções têm comportamento especial, que dependia do **nome**: os
**Tamanhos** definem o preço das pizzas e não são pedidos sozinhos, e as
**Pizzas** não têm preço próprio ("ver tamanhos" no site). Esse
comportamento passou a vir do campo `tipo` da seção, então renomear uma seção
não quebra o delivery nem o caixa.

## REGRAS DE NEGÓCIO

- RN-S01: a seção tem `nome` (obrigatório e único), `ordem` (a ordem de
  exibição no site, no delivery e no caixa) e `tipo`. A leitura é pública e só
  o admin cria, edita e remove. O CRUD fica só no `/admin`.
- RN-S02: o `tipo` da seção pode ser:
  - `comum`: os itens têm preço próprio. É o padrão para seções novas.
  - `por-tamanho`: os itens podem ficar sem preço e o preço vem do tamanho
    escolhido. No site, item sem preço mostra "ver tamanhos" (Pizzas).
  - `tamanhos`: os itens são os tamanhos. Não são pedidos sozinhos e definem
    o preço dos itens sem preço próprio (Tamanhos).
- RN-S03: existe no máximo uma seção do tipo `tamanhos`.
- RN-S04: o item do cardápio aponta para uma seção (`relationship`,
  obrigatório).
- RN-S05: uma seção com itens não pode ser removida. Para tirar um produto do
  site, continua valendo o `ativo` do item.
- RN-S06: a migração cria as 4 seções atuais com os tipos corretos e faz os
  itens existentes apontarem para elas. Pedidos e contas antigos não mudam,
  porque guardam snapshots de nome e preço.

## TAREFAS

### Tarefa 1: Collection `secoes-cardapio`

**Critérios de Aceite**

- [x] CRUD no `/admin` com `nome`, `ordem` e `tipo` (RN-S01, RN-S02).
- [x] A validação impede uma segunda seção `tamanhos` (RN-S03).
- [x] `beforeDelete` bloqueia a remoção de seção com itens (RN-S05).

### Tarefa 2: Relação no cardápio e migração

**Critérios de Aceite**

- [x] `Cardapio.secao` vira `relationship`. `SECOES` e `ORDEM_SECOES` saem
      do código.
- [x] A migração `20260926_113948_secoes_cardapio` converte os itens
      (RN-S06). O `down` volta às seções fixas e falha se houver item numa
      seção nova.
- [x] O seed (`SECOES_CARDAPIO` em `content/seed-data.ts`) e a fixture
      estática seguem a nova forma.

### Tarefa 3: Comportamento pelo tipo, não pelo nome

**Critérios de Aceite**

- [x] `lib/pedidos.ts` reconhece o tamanho por `tipoSecao === 'tamanhos'`.
      `lib/cardapio.ts` ordena as seções pela `ordem` delas.
      `SeletorItensCardapio` e `MenuSection` usam o `tipo`.
- [x] Não sobra nenhuma comparação com `'Tamanhos'` ou `'Pizzas'` na lógica.

## FORA DO ESCOPO

- Tamanhos diferentes por seção (os tamanhos valem para todas as seções
  `por-tamanho`).
- Tradução pt/en do nome da seção.

## REFERÊNCIAS

- `src/collections/SecoesCardapio.ts`, `src/collections/Cardapio.ts`,
  `src/collections/itens-cardapio.ts`, `lib/cardapio.ts`, `lib/pedidos.ts`
- `components/MenuSection.tsx`, `components/SeletorItensCardapio.tsx`
- `src/migrations/20260926_113948_secoes_cardapio.ts`
- Testes: `tests/cadastros.integration.test.ts`,
  `tests/cardapio-agrupamento.property.test.ts`
