# Pedidos no painel, cadastro pelo balcão, cardápio do delivery e frete

## CONTEXTO

Os formulários de pedido (`/pedido` e `/pimenta-em-mel/pedido`) ficavam no
site público. A equipe não conseguia registrar o pedido de quem só fala pelo
WhatsApp e recusa o formulário. O delivery oferecia o cardápio inteiro, e o
frete era combinado fora do sistema, então o cliente nunca via o total.

Esta feature:

1. Move os formulários para o painel (`app/(painel)`), para cliente e
   funcionário. As URLs públicas continuam as mesmas e redirecionam.
2. Dá à equipe um formulário com busca de cliente (autopreenchimento) e
   cadastro do cliente junto com o pedido.
3. Cria o global `cardapio-delivery`, em que o admin escolhe os itens do
   cardápio disponíveis no delivery. A aba Delivery do cliente mostra esses
   itens num aside.
4. Cria o status `validado`, que exige o frete. A partir dele o cliente vê o
   total (produtos + frete).

## REGRAS DE NEGÓCIO

- RN-PP01: os formulários ficam em `/area-cliente/{delivery,pimenta}/novo`
  (cliente) e `/area-funcionario/{delivery,pimenta}/novo` (funcionário e
  admin).
- RN-PP02: `/pedido` e `/pimenta-em-mel/pedido` continuam sendo o destino dos
  CTAs e dos links do WhatsApp. Sem sessão, levam a `/login?next=<url>`. Com
  sessão, levam ao formulário do papel (`rotaFormularioPedido` em
  `lib/permissoes.ts`). No preview estático, mostram o aviso de
  indisponibilidade.
- RN-PP03: no menu do cliente, "Meus pedidos" passa a se chamar "Delivery"
  (`/area-cliente`).
- RN-PP04: no formulário da equipe, o bloco "Cliente" fica acima do pedido.
  - A busca (nome, telefone ou e-mail) usa `GET /api/buscar-clientes`,
    restrito a funcionário e admin.
  - Escolher um cliente preenche os dados, o ponto no mapa e a referência.
  - Sem cliente escolhido, os campos de cadastro são obrigatórios: nome,
    sobrenome e telefone. O e-mail é opcional.
- RN-PP05: no envio pela equipe, o cliente é resolvido no servidor
  (`src/endpoints/cliente-do-pedido.ts`).
  - Com `{ id }`, o pedido usa o nome e o telefone da conta.
  - Um cliente novo com telefone que já tem conta reaproveita essa conta.
  - Um cliente com telefone novo ganha uma conta com senha aleatória. Sem
    e-mail, recebe o e-mail interno `<telefone>@cliente.capaogrande.local`.
  - O vínculo com o painel do cliente continua sendo o telefone.
- RN-PP06: os pedidos da equipe não passam pelo rate limit por IP. O
  honeypot continua valendo.
- RN-PP07: o global `cardapio-delivery` (edição só por admin, leitura
  pública) tem duas listas.
  - `itens`: os produtos liberados, sem os tamanhos.
  - `tamanhos`: os tamanhos de pizza que o cliente pode escolher. Sem nenhum
    tamanho liberado, as pizzas saem do delivery.
  - Na criação, o hook de `pedidos` rejeita item ou tamanho fora das listas
    (400).
  - A migration preenche as duas listas com todos os itens ativos de cada
    tipo.
- RN-PP08: a aba Delivery do cliente mostra os pedidos na área principal. No
  aside ficam os produtos disponíveis (com preço) e o botão "Fazer pedido".
- RN-PP09: o funil passa a ser pendente → **validado** → pago → em_transito →
  finalizado, em `pedidos` e `pedidos-pimenta`.
  - Rótulos: "Validado" para a operação, "Pedido confirmado" para o cliente.
  - Só na transição a partir de `pendente`, o hook exige `frete` (delivery e
    pimenta com entrega) e responde 400 sem ele.
  - Na retirada, o frete é gravado como 0.
  - Pedidos antigos, que já passaram de `pendente`, não são afetados.
- RN-PP10: no card `pendente` do funcionário há o campo "Frete (R$)". O botão
  "Validar pedido" só é habilitado com um valor válido e grava frete e status
  num único PATCH.
- RN-PP11: a partir de `validado`, os cards do cliente e do funcionário
  mostram produtos, frete e total (`totalPedido` em `lib/status-pedido.ts`).
- RN-PP12: em `pedidos`, itens, subtotal e código ficam congelados após a
  criação, como já acontecia em `pedidos-pimenta`. Assim o total mostrado ao
  cliente não muda se o cardápio mudar.
- RN-PP13: os formulários (as quatro rotas `.../novo`) têm no topo o link
  "Voltar para os pedidos", para a lista da mesma visão
  (`rotaListaPedidos` em `lib/permissoes.ts`).
- RN-PP14: as listas da equipe têm botões para copiar, para a conversa do
  WhatsApp, o link público do formulário (delivery em `/area-funcionario`,
  pimenta em mel em `/area-funcionario/pimenta`) e a chave Pix das
  Configurações. O botão da chave Pix não aparece enquanto ela estiver "a
  confirmar".

## TAREFAS

### Tarefa 1 — Domínio e dados

**Descrição**

Status `validado`, frete, global do cardápio do delivery e migration.

**Critérios de Aceite**

- [x] `lib/status-pedido.ts`: `validado`, `exigeFrete` e `totalPedido`.
- [x] Campo `frete` e regra de validação em `src/collections/frete.ts`,
      usada por `Pedidos` e `PedidosPimenta`.
- [x] Global `cardapio-delivery`, `filtrarCardapioDelivery` e
      `getCardapioDelivery`.
- [x] Migration `20260927_125035_pedidos_painel_frete`, com o seed do global,
      e `scripts/seed.ts` preenchendo o global.

### Tarefa 2 — Pedido pela equipe

**Descrição**

Busca de cliente e cadastro no envio.

**Critérios de Aceite**

- [x] `GET /api/buscar-clientes` (403 para cliente).
- [x] `cliente-do-pedido.ts` nos dois endpoints de submissão, e
      `validarClienteBalcao` em `lib/cadastro.ts`.
- [x] `<BuscaCliente>` e a prop `modo` em `PedidoForm` e
      `PedidoPimentaForm`.

### Tarefa 3 — Painel

**Descrição**

Rotas, menu, aside e cards.

**Critérios de Aceite**

- [x] As 4 rotas `.../novo` (`PaginaPedidoDelivery` e `PaginaPedidoPimenta`)
      e o `<RedirecionarPedido>` nas URLs públicas.
- [x] "Delivery" no menu do cliente, e o aside `<CardapioDeliveryAside>`.
- [x] Frete e validação no `<PedidosFuncionario>`; total no
      `<PedidosCliente>`.
- [x] Link de volta nos formulários, e `<BotaoCopiar>` (link do pedido e
      chave Pix) nas listas da equipe.

## FORA DO ESCOPO

- Frete no Histórico do dia: o resumo continua somando só o subtotal.
- Envio de senha ao cliente cadastrado pelo balcão (não há adaptador de
  e-mail).

## REFERÊNCIAS

- `docs/features/delivery-pedidos.md`, `docs/features/dashboard-pedidos.md`,
  `docs/features/pimenta-em-mel.md`
- Testes: `tests/status-pedido.test.ts`, `tests/cadastro.test.ts`,
  `tests/cardapio-delivery.test.ts`, `tests/permissoes.test.ts`,
  `tests/pedido-pimenta-form.test.tsx`, `tests/acessibilidade.test.tsx`
