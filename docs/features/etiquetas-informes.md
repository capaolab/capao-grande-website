# Etiquetas dos informes

## CONTEXTO

A etiqueta de um informe era um `select` com 7 opções fixas no código
(Funcionamento, Reflorestamento, Horta, Compostagem, Apiário, Viveiro,
Cardápio). Para criar, renomear ou remover uma etiqueta era preciso mexer no
código e fazer deploy.

Esta feature transforma as etiquetas numa collection própria, `etiquetas`,
com CRUD no Payload (`/admin`). Cada informe pode ter várias etiquetas.

## REGRAS DE NEGÓCIO

- RN-E01: a etiqueta tem `nome` (obrigatório e único). A leitura é pública e
  só o admin cria, edita e remove. O CRUD fica só no `/admin`.
- RN-E02: o informe tem **uma ou mais** etiquetas (`etiquetas`,
  relationship `hasMany` para `etiquetas`, obrigatório).
- RN-E03: uma etiqueta usada por algum informe não pode ser removida. O admin
  recebe um erro que diz quantos informes a usam.
- RN-E04: renomear uma etiqueta muda o texto em todos os informes que a usam,
  porque a relação é por id.
- RN-E05: a migração cria as 7 etiquetas atuais como registros e faz cada
  informe existente apontar para a etiqueta que tinha. Nenhum informe fica sem
  etiqueta.
- RN-E06: o site público (card, destaque na home e página do informe) exibe
  os nomes das etiquetas separados por " · ", com a mesma aparência de antes.

## TAREFAS

### Tarefa 1: Collection `etiquetas`

**Critérios de Aceite**

- [x] CRUD no `/admin` com `nome` único (RN-E01).
- [x] Access conforme RN-E01.
- [x] Hook `beforeDelete` bloqueia a remoção de etiqueta em uso (RN-E03).

### Tarefa 2: Relação no informe e migração

**Critérios de Aceite**

- [x] `ETIQUETAS` sai de `Informes.ts`, e `etiqueta` vira `etiquetas`
      (`hasMany`).
- [x] A migração `20260926_113113_etiquetas` converte os dados (RN-E05) e tem
      `down` que volta à etiqueta única (a primeira de cada informe).
- [x] `scripts/seed.ts` cria as etiquetas antes dos informes, e a fixture
      estática segue a mesma forma.

### Tarefa 3: Leitura no site

**Critérios de Aceite**

- [x] `InformeCard`, a home e `informes/[slug]` exibem os nomes via
      `nomesEtiquetas` (`lib/etiquetas.ts`) (RN-E06).

## FORA DO ESCOPO

- Tradução pt/en do nome da etiqueta.
- Filtro por etiqueta em `/informes`.

## REFERÊNCIAS

- `src/collections/Etiquetas.ts`, `src/collections/Informes.ts`,
  `lib/etiquetas.ts`
- `src/migrations/20260926_113113_etiquetas.ts`
- Testes: `tests/cadastros.integration.test.ts`
