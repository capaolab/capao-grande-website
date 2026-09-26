# Caixa: lista de contas fechadas

## CONTEXTO

Antes, o caixa funcionava em uma etapa contínua (`caixa-historico.md`): o
funcionário lançava os itens, clicava em "Fechar conta" e seguia direto para
o rateio, com os itens congelados a partir daí.

Na prática, quem fecha a conta da mesa nem sempre é quem processa o
pagamento. Esta feature separa as duas etapas:

1. **Fechar a conta**: os itens são lançados e a conta vai para a aba
   **Contas** do caixa, aguardando o caixa.
2. **Na aba Contas**, a conta pode ser **reaberta** para alterar os produtos
   ou **seguir para o pagamento**. Ao seguir, o caixa define a taxa de serviço
   e o desconto.
3. **Pagamento**: o fluxo que já existia (rateio, forma de pagamento, check
   de pago).

Esta feature **substitui a RN-C01** ("não existe comanda aberta") e **muda a
RN-C02** de `caixa-historico.md`: itens e valores deixam de ser congelados na
gravação e passam a ser congelados quando a conta segue para o pagamento.

## REGRAS DE NEGÓCIO

- RN-CF01: a conta tem três status:
  - `fechada`: os itens foram lançados e a conta aguarda o caixa. Ela é
    editável e não tem serviço, desconto nem rateio.
  - `pagamento`: a conta seguiu para o pagamento. Itens e valores ficam
    congelados.
  - `paga`: todas as partes foram pagas (derivado, como antes).
- RN-CF02: "Fechar conta" grava a conta como `fechada` e leva à aba
  **Contas** do caixa.
- RN-CF03: a aba Contas lista as contas `fechada`, as mais antigas primeiro,
  com código, mesa, itens, total e hora do fechamento. Cada uma tem as ações
  **Reabrir** e **Seguir para pagamento**. Abaixo aparecem as contas em
  `pagamento`, para retomar o rateio.
- RN-CF04: **Reabrir** carrega a conta na aba de lançamento com os itens, a
  mesa e as observações dela. Os itens podem ser incluídos, removidos e ter a
  quantidade alterada. Ao salvar, a conta continua `fechada` e volta à lista.
  Enquanto a conta está `fechada`, o servidor recalcula itens e total com os
  **preços atuais** do cardápio a cada gravação.
- RN-CF05: **Seguir para pagamento** abre os ajustes do caixa (taxa de
  serviço de 10% e desconto), com o total ao vivo. Ao confirmar, o status
  vira `pagamento`, os valores ficam congelados e o `<CaixaPagamento>` abre.
  Daí em diante vale o fluxo atual (RN-C04 a RN-C07).
- RN-CF06: o servidor só aceita alterar itens, serviço e desconto enquanto a
  conta está `fechada`. Uma conta em `pagamento` ou `paga` não volta para
  `fechada` (erro 400). O rateio só é aceito a partir de `pagamento`.
- RN-CF07: funcionários e admin podem fechar, reabrir e seguir para o
  pagamento (mesmo access de antes, RN-C08).
- RN-CF08: no histórico, contas `fechada` contam como abertas e **em
  débito**, junto com as contas em `pagamento`.
- RN-CF09: a migração converte as contas gravadas com status `aberta` para
  `pagamento`.

## TAREFAS

### Tarefa 1: Status e regras no servidor

**Critérios de Aceite**

- [x] Criar uma conta resulta em `fechada`, sem serviço, desconto nem rateio.
- [x] Alterar os itens de uma conta `fechada` recalcula o total com os
      preços atuais do cardápio (RN-CF04).
- [x] Seguir para o pagamento aplica serviço e desconto e congela os valores
      (RN-CF05).
- [x] Alterar os itens de uma conta em `pagamento` não tem efeito, e voltar
      para `fechada` retorna erro 400 (RN-CF06).
- [x] Migração `20260926_114349_caixa_contas_fechadas`: `aberta` →
      `pagamento` (RN-CF09).

### Tarefa 2: Aba de contas no caixa

**Critérios de Aceite**

- [x] O caixa tem as abas "Lançar conta" e "Contas" (`CaixaForm`,
      `CaixaContas`).
- [x] Depois de "Fechar conta", a aplicação vai para a aba Contas (RN-CF02).
- [x] Reabrir mostra os itens da conta, e salvar volta à lista com o total
      atualizado.
- [x] Seguir para pagamento pede serviço e desconto e abre o rateio.
- [x] As contas em `pagamento` aparecem para retomar o pagamento.

### Tarefa 3: Histórico

**Critérios de Aceite**

- [x] `lib/historico.ts` usa os rótulos Fechada / Em pagamento / Paga e trata
      `fechada` conforme RN-CF08.

## REFERÊNCIAS

- `docs/features/caixa-historico.md` (RN-C01 a RN-C10)
- `src/collections/Caixa.ts`, `lib/caixa-api.ts`, `lib/historico.ts`
- `components/CaixaForm.tsx`, `components/CaixaContas.tsx`,
  `components/CaixaPagamento.tsx`
- `src/migrations/20260926_114349_caixa_contas_fechadas.ts`
- Testes: `tests/caixa.integration.test.ts`, `tests/caixa-form.test.tsx`,
  `tests/historico.test.ts`
