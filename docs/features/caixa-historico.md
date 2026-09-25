# Caixa da pizzaria e histórico do dia

## CONTEXTO

A área interna do funcionário (`/area-funcionario`) cuidava só do delivery.
Esta feature acrescenta:

- **Caixa** (`/area-funcionario/caixa`): registro da conta das mesas do salão.
  Quando a mesa vai pagar, o funcionário lança os itens consumidos e o sistema
  calcula o valor da conta. Depois ele divide o pagamento entre as pessoas e
  registra a forma de pagamento de cada uma e o que já foi pago.
- **Histórico** (`/area-funcionario/historico`): junta caixa e delivery de um
  dia, com resumo e lista detalhada, para análise posterior (também em CSV).

Também muda o menu do funcionário: "Todos os pedidos" passa a se chamar
**"Delivery"** e **"Configurações" sai do menu**. A conta do funcionário é
criada e habilitada pelo admin no Payload (`/admin`), e `/configuracoes` o
redireciona para a própria área.

## REGRAS DE NEGÓCIO

- RN-C01: os itens da mesa são lançados **de uma vez, no caixa**, quando a mesa
  vai pagar. Não existe comanda aberta durante o atendimento.
- RN-C02: o valor da conta é calculado **no servidor** com os preços atuais do
  cardápio (mesma regra dos pedidos de delivery). A conta aplica uma taxa de
  serviço opcional de 10% sobre o subtotal, arredondada ao centavo, e um
  desconto manual em R$, que não pode passar do valor da conta. Itens e
  valores ficam **congelados** depois de gravados, porque mudar o preço no
  cardápio não pode alterar uma conta já rateada.
- RN-C03: o funcionário pode informar o número da mesa (opcional) e
  observações. A conta recebe um código curto (ex.: `A3F7`).
- RN-C04: o pagamento pode ser dividido por N pessoas. Por padrão as partes
  são **iguais**, calculadas em centavos: a sobra vai para as primeiras
  pessoas (R$ 100 / 3 = 33,34 + 33,33 + 33,33).
- RN-C05: o valor de qualquer pessoa pode ser **editado**. Essa parte fica
  fixa e o restante é redistribuído igualmente entre as demais partes não
  ajustadas e não pagas. A soma das partes sempre fecha o total. Partes já
  pagas nunca são alteradas.
- RN-C06: cada pessoa tem a própria forma de pagamento (**pix, dinheiro ou
  cartão**) e um **check de pago**. A forma é obrigatória para confirmar.
  Ao confirmar, a tela recalcula o valor **em débito** e mostra a soma **já
  paga**. O momento do check fica gravado (`pagoEm`).
- RN-C07: a conta fica `aberta` até todas as partes estarem pagas e então vira
  `paga`. Esse status é derivado pelo servidor. Contas abertas aparecem no
  topo do caixa para retomar o pagamento.
- RN-C08: só admin e funcionário criam, leem e alteram contas do caixa, e só o
  admin remove.
- RN-C09: o histórico mostra, para o dia escolhido:
  - **Caixa**: contas pagas e abertas, pessoas pagantes, faturado, recebido
    por forma de pagamento, valor em débito, taxa de serviço, descontos e
    ticket médio.
  - **Delivery**: pedidos, subtotal dos produtos e contagem por status.
  - **Pimenta em mel**: o mesmo resumo do delivery (pimenta-em-mel.md,
    RN-P08).
  - A lista cronológica de todas as origens, com detalhes de cada registro.

  O delivery não registra forma de pagamento nem frete, porque o valor final
  é combinado no WhatsApp. Ele entra no histórico só com o subtotal.
- RN-C10: o histórico pode ser exportado em CSV no padrão de planilha pt-BR
  (separador `;` e vírgula decimal).

## TAREFAS

### Tarefa 1: Menu do funcionário

**Critérios de Aceite**

- [x] O menu do funcionário mostra "Delivery", "Caixa" e "Histórico", sem "Configurações".
- [x] "Delivery" só fica ativo em `/area-funcionario`, não nas sub-rotas.
- [x] `/configuracoes` redireciona o funcionário para a área dele.

### Tarefa 2: Domínio do caixa (`lib/caixa.ts`)

**Critérios de Aceite**

- [x] Total da conta com serviço e desconto (RN-C02).
- [x] Divisão igual, redistribuição e resumo pago/em débito (RN-C04 a RN-C06).
- [x] Testes de propriedade em `tests/caixa.property.test.ts`.

### Tarefa 3: Collection `caixa`

**Critérios de Aceite**

- [x] O servidor calcula e congela o total. O rateio é validado (a soma fecha o total e a parte paga tem forma).
- [x] `pagoEm` é carimbado no check e `status` é derivado.
- [x] Access conforme RN-C08.

### Tarefa 4: Telas do caixa e do histórico

**Critérios de Aceite**

- [x] Caixa: lançamento, total ao vivo, rateio, check por pessoa e retomada de contas abertas.
- [x] Histórico: filtro por dia, resumo, lista unificada e CSV.

## REFERÊNCIAS

- Collection: `src/collections/Caixa.ts`. Helpers compartilhados com
  `pedidos`: `src/collections/itens-cardapio.ts` e
  `src/collections/codigo-unico.ts`.
- Libs puras: `lib/caixa.ts` e `lib/historico.ts`. Fetch: `lib/caixa-api.ts`.
- Telas: `app/(painel)/area-funcionario/caixa/page.tsx`,
  `app/(painel)/area-funcionario/historico/page.tsx`,
  `components/CaixaForm.tsx`, `components/CaixaPagamento.tsx` e
  `components/HistoricoDia.tsx`.
- Seletor de itens compartilhado com o delivery:
  `components/SeletorItensCardapio.tsx`.
- Testes: `tests/caixa.property.test.ts`, `tests/caixa-pagamento.test.tsx` e
  `tests/historico.test.ts`.
