# Pimenta em mel: página do produto, pedidos e localização do cliente

## CONTEXTO

A pizzaria produz pimenta em mel. Clientes compram algumas unidades para casa,
e restaurantes compram em lote para servir à mesa. Antes desta feature o site
não falava do produto e os pedidos chegavam só pelo WhatsApp.

A feature tem três partes:

1. **Página pública** `/pimenta-em-mel`, que apresenta o produto e as
   apresentações com preço, e leva ao formulário de pedido.
2. **Pedido online** `/pimenta-em-mel/pedido`, com login obrigatório. Segue o
   mesmo protocolo do delivery: código público, confirmação pelo WhatsApp e o
   mesmo funil de status. Tem tela própria no painel do funcionário e entra no
   Histórico do dia.
3. **Localização do cliente**: campos opcionais no cadastro e em
   Configurações (ponto no mapa e referência). Eles vêm preenchidos nos
   formulários de delivery e de pimenta em mel.

## REGRAS DE NEGÓCIO

- RN-P01: `/pimenta-em-mel` fica na navegação global e na home (NavCard).
  A home também tem o `<PedidoPimentaCta>`, logo abaixo do CTA do delivery e
  no mesmo modelo: leva direto a `/pimenta-em-mel/pedido`, com link
  secundário para a página do produto. Detalhes do produto ainda não fornecidos (ingredientes, conservação e
  validade) aparecem como `<Placeholder>`. Nada é inventado (Req 19).
- RN-P02: os produtos ficam na collection `produtos-pimenta`, separada do
  cardápio. Cada produto tem um preço unitário (obrigatório). Pode ter também
  um preço de lote e uma quantidade mínima (`loteMinimo` ≥ 2), que passa a ser
  obrigatória quando há preço de lote. Só os produtos `ativo` são listados e
  aceitos em pedidos.
- RN-P03: o pedido exige login (guard na página e 401 no endpoint), nome,
  telefone e ao menos um produto com quantidade inteira ≥ 1. O campo
  `estabelecimento` é opcional.
- RN-P04: a quantidade de cada item define o preço. A partir do `loteMinimo`,
  todas as unidades daquele item saem pelo preço de lote. O servidor calcula o
  preço e o subtotal (`lib/pimenta.ts`) na criação e os congela. Mudar o
  status não depende do catálogo atual.
- RN-P05: modalidade **entrega** (ponto no mapa obrigatório) ou **retirada**
  na pizzaria (coordenadas descartadas). O frete e o pagamento são combinados
  no WhatsApp.
- RN-P06: o status segue o funil do delivery: pendente → pago → em_transito →
  finalizado. Na retirada, `em_transito` aparece como "Pronto para retirada" e
  `finalizado` como "Retirado" para o cliente. O funcionário gerencia os
  pedidos em `/area-funcionario/pimenta` e o cliente os acompanha em
  `/area-cliente/pimenta`, que lista os pedidos pelo telefone da conta, como no
  delivery.
- RN-P07: a localização do cliente é opcional: `latitude`, `longitude` e
  `localidade` na collection `users`. Se uma das coordenadas for informada, as
  duas precisam formar um ponto válido. Enviar `null` limpa a localização. Os
  formulários de pedido usam o ponto salvo como pin inicial, que o cliente
  pode mover. Um pin que o cliente já posicionou nunca é sobrescrito.
- RN-P08: o Histórico do dia tem a origem "Pimenta em mel". Ela aparece no
  resumo (pedidos, subtotal e contagem por status), no total geral, na lista
  cronológica e no CSV.

## TAREFAS

### Tarefa 1: Domínio e dados

**Critérios de Aceite**

- [x] `lib/pimenta.ts` com `precoAplicavel`, `calcularSubtotalPimenta` e
  `validarPedidoPimenta`, e `lib/geolocalizacao.ts`.
- [x] Collections `produtos-pimenta` e `pedidos-pimenta`, com access igual ao
  de `pedidos`.
- [x] Campos de localização em `users`, validados no hook.
- [x] Endpoint `POST /api/submeter-pedido-pimenta`. O honeypot e o rate limit
  ficam em `src/endpoints/protecao.ts`, compartilhado com os outros endpoints.

### Tarefa 2: Páginas públicas

**Critérios de Aceite**

- [x] `/pimenta-em-mel` com os produtos e o CTA.
- [x] `/pimenta-em-mel/pedido` com o fallback do build estático.
- [x] `PedidoPimentaForm` com preço de lote ao vivo, entrega ou retirada, e a
  localização vinda do perfil.

### Tarefa 3: Localização no cadastro e no perfil

**Critérios de Aceite**

- [x] O cadastro tem a seção "Sua localização (opcional)". O mapa só é montado
  quando o cliente pede.
- [x] Em Configurações dá para editar e remover a localização.
- [x] `/pedido` (delivery) vem pré-preenchido com o ponto e a referência.

### Tarefa 4: Painéis e histórico

**Critérios de Aceite**

- [x] `/area-funcionario/pimenta` e `/area-cliente/pimenta` reaproveitam
  `PedidosFuncionario` e `PedidosCliente` com a prop `colecao`.
- [x] O Histórico tem a terceira origem no resumo, na lista e no CSV.

### Pendências

- [ ] Preencher no CMS os produtos reais (nomes, volumes, preços e lote) e os
  textos da página marcados como "a confirmar".
- [ ] Validação E2E contra Postgres real: cadastro com localização, pedido
  com lote na entrega, pedido na retirada, funil de status e Histórico.

## REFERÊNCIAS

- Collections: `src/collections/ProdutosPimenta.ts`,
  `src/collections/PedidosPimenta.ts` e `src/collections/itens-pimenta.ts`.
- Endpoint: `src/endpoints/submeter-pedido-pimenta.ts`.
- Libs: `lib/pimenta.ts`, `lib/geolocalizacao.ts`, `lib/status-pedido.ts`
  (rótulos de retirada) e `lib/historico.ts`.
- Telas: `app/(frontend)/pimenta-em-mel/`,
  `app/(painel)/area-funcionario/pimenta/`, `app/(painel)/area-cliente/pimenta/`,
  `components/PedidoPimentaForm.tsx` e `components/PedidoMapa.tsx`
  (`pontoInicial`, `permitirRemover`).
- Testes: `tests/pimenta.property.test.ts`,
  `tests/pedido-pimenta-form.test.tsx`, `tests/historico.test.ts`,
  `tests/status-pedido.test.ts`, `tests/cadastro.test.ts` e
  `tests/acessibilidade.test.tsx`.
