# Pedidos de Delivery via Formulário

> **Status: implementado (v1).** Collection `pedidos`, endpoint público de
> submissão, formulário `/pedido` com seletor de produtos e mapa Leaflet
> entregues. Critérios de aceite marcados abaixo. Pendente: validação com
> Postgres real (testes de integração rodam apenas com o banco de pé) e
> deploy/seed do ambiente completo.

## CONTEXTO

Hoje a pizzaria atende pedidos de delivery exclusivamente pelo WhatsApp: a página
pública `/delivery` (app/(frontend)/delivery/page.tsx) orienta o cliente a pedir
pelo WhatsApp, pagar por Pix e informa a taxa por distância. Na prática, o pedido
chega como texto livre na conversa — sem estrutura, sem registro e sem histórico.

Esta funcionalidade introduz um **formulário público de pedido** hospedado no
próprio site. O fluxo passa a ser:

1. O cliente entra em contato com a pizzaria pelo WhatsApp (atendimento humano
   ou bot).
2. O atendente (ou bot) responde com o **link do formulário** do site.
3. O cliente preenche o pedido no formulário: informa **nome e telefone
   (WhatsApp)** — obrigatórios, para registro interno — escolhe os itens do
   cardápio em um **seletor visual de produtos** (interação tipo seletor de
   tags) e informa a **geolocalização de entrega**, capturada em um clique com
   mapa Leaflet/OpenStreetMap. Um campo textual **opcional** permite indicar a
   localidade/referência (no Vale do Capão endereços formais não se aplicam).
4. O formulário exibe o **preço parcial dos produtos**, deixando claro que o
   valor final (com frete) será informado depois, pelo atendente, via mensagem —
   o frete depende de variáveis que não são resolvidas no formulário.
5. O pedido submetido é **registrado no CMS** (Payload) com um **código público
   gerado automaticamente**, que o cliente usa como referência na conversa.
6. O atendente consulta os pedidos **filtrados por data/hora e por status**:
   `pendente`, `pago`, `em trânsito`, `finalizado`.
7. O status é uma ferramenta **interna de organização do atendente** — o cliente
   recebe as atualizações (confirmação, preço final com frete, saída para
   entrega) exclusivamente **via mensagem** no WhatsApp.

O formulário não substitui o WhatsApp: ele estrutura o pedido, mas a comunicação
com o cliente (preço final, confirmação, avisos de entrega) continua acontecendo
na conversa.

## REGRAS DE NEGÓCIO

- RN01 — ~~A origem do pedido é sempre o WhatsApp~~ **REVISADA (2026-09-25):**
  o fluxo continua **gerenciado pelo WhatsApp**, mas o pedido pode **começar no
  site**: o cliente acessa o site (CTA da home `<PedidoCta>` ou bloco destacado
  no passo 1 de `/delivery`), monta o pedido em `/pedido` e **só depois**
  informa o código na conversa (botão `wa.me` da confirmação). O link do
  formulário também pode ser enviado na conversa, como antes. Preço final,
  frete e confirmação continuam no WhatsApp; `/pedido` segue **fora da
  navegação global** (SiteHeader). Pedido registrado sem comunicação no
  WhatsApp fica `pendente` — ver P9.
- RN02 — O formulário lista **todos os itens ativos do cardápio** (collection
  `cardapio`, filtrados por `ativo = true`, agrupados nas seções canônicas
  Pizzas, Tamanhos, Bebidas e Vinhos — ver `lib/cardapio.ts`).
- RN03 — A seleção de produtos é visual, no estilo **seletor de tags**: o cliente
  vê o que está sendo pedido à medida que seleciona, podendo remover itens e
  ajustar quantidades.
- RN04 — Todo pedido submetido é **registrado** com data/hora de criação, status
  inicial `pendente` e um **código público único** gerado na criação.
- RN05 — O atendente dispõe da lista de pedidos **filtrada por data/hora e por
  status** (`pendente`, `pago`, `em trânsito`, `finalizado`).
- RN06 — **Nome e número de telefone (WhatsApp) são obrigatórios** no formulário,
  para registro interno e para facilitar o atendimento na conversa.
- RN07 — A **geolocalização de entrega é obrigatória** e capturada em um clique
  (Geolocation API do navegador + mapa Leaflet/OpenStreetMap com pin ajustável).
  Não há campo de endereço formal; um campo textual **opcional** registra
  indicação de localidade/ponto de referência. Quando o cliente salvou uma
  localização no perfil, o pin e a referência já vêm preenchidos e continuam
  editáveis (ver pimenta-em-mel.md, RN-P07).
- RN08 — O formulário exibe apenas o **preço parcial dos produtos**. O frete não
  é calculado no formulário; a interface deve indicar explicitamente que o
  **preço final (produtos + frete) será informado pelo atendente via mensagem**.
- RN09 — ~~O status do pedido é **interno**~~ **REVOGADA por
  `docs/features/dashboard-pedidos.md` (RN-D02):** o status passou a ser
  visível ao cliente dono do pedido no dashboard `/area-cliente`, com rótulos
  amigáveis. A comunicação detalhada (preço final com frete, confirmações)
  continua via WhatsApp.
- RN10 — Itens inativos do cardápio nunca aparecem no formulário.
- RN11 — Nenhum dado é fabricado: se o cardápio estiver vazio ou indisponível, o
  formulário informa a indisponibilidade em vez de exibir itens fictícios
  (alinhado ao Requisito 19 do projeto).
- RN12 — **Login obrigatório para pedir (2026-09-25).** Antes de exibir o
  formulário `/pedido`, o sistema verifica a sessão; sem login, o usuário vai
  para `/login?next=/pedido` (com atalho para `/cadastro`, que preserva o
  retorno) e, ao entrar ou se cadastrar, volta ao formulário. Vale para todas as
  entradas (CTA da home, `/delivery`, link enviado no WhatsApp). Nome e telefone
  vêm pré-preenchidos com os dados da conta (editáveis). No servidor,
  `/api/submeter-pedido` responde 401 sem sessão e o `create` da collection
  `pedidos` exige usuário autenticado. A rota de retorno é validada (só
  caminhos internos — sem open redirect). Staging estático: sem API nem login,
  `/pedido` mantém o aviso de indisponibilidade.

## PROBLEMAS E MELHORIAS IDENTIFICADOS

Pontos levantados na análise do processo e decisões tomadas:

- **P1 — Preço do cardápio é texto livre (bloqueia o preço parcial).** O campo
  `preco` da collection `cardapio` era `text` por decisão de design (antigo
  Requisito 6.3). **Decisão implementada: o campo virou `number`** (Tarefa 6) e
  a conversão para texto acontece na renderização (`renderPreco` formata pt-BR
  em `lib/cardapio.ts`). Pizzas ficam com `preco: null`: o preço vem do tamanho
  escolhido (seção Tamanhos) — o cardápio público exibe "ver tamanhos" para
  elas, preservando a fidelidade ao cardápio impresso.
- **P2 — Vínculo pedido ↔ conversa é frágil.** **Decisão implementada: o
  servidor gera um código público do pedido** (4 caracteres, alfabeto sem
  ambíguos) e **nome e telefone (WhatsApp) são obrigatórios** (RN04, RN06); a
  confirmação exibe o código e um botão `wa.me` com mensagem pré-preenchida
  contendo o código.
- **P3 — Status invisível para o cliente gera retrabalho.** Como o cliente não
  consulta status (RN09), ele tende a perguntar no WhatsApp ("saiu?"). Aceitável
  na v1, mas a melhoria natural é uma página pública de acompanhamento por
  código do pedido.
- **P4 — Endereço formal não se aplica ao Vale do Capão.** **Decisão
  implementada: o pedido não tem endereço; a geolocalização (lat/lng) é
  obrigatória** (RN07). O pin é ajustável por arrasto e por clique/toque no mapa
  (caminho manual quando o GPS é negado ou impreciso), e um campo textual
  **opcional** registra indicação de localidade/referência.
- **P5 — Custo e dependência do Google Maps.** **Decisão implementada: Leaflet
  1.9 + OpenStreetMap**, sem chave de API nem custo por uso. Ícones via
  `L.divIcon` (sem depender dos PNGs do Leaflet, que quebram com bundlers) e
  import dinâmico do módulo no `useEffect` (o Leaflet toca `window` na
  importação e quebraria o pré-render).
- **P6 — Status `pago` é manual.** Não há webhook Pix: o atendente confere o
  recebimento e marca `pago` à mão. Assumido como limitação da v1; integração de
  pagamento fica fora de escopo.
- **P7 — Formulário público é alvo de spam/abuso.** **Implementado:** honeypot
  (campo `website` oculto; preenchido → 201 falso sem gravar) + rate limit em
  memória por IP no endpoint (máx. 5 submissões / 10 min; resposta 429).
- **P8 — Pedidos fora do horário de funcionamento.** **Implementado:** o
  formulário exibe os horários de funcionamento vindos do CMS quando válidos
  (sem fabricar quando "a confirmar") — sem bloquear a submissão na v1.
- **P9 — Cliente registra o pedido no site e esquece de avisar no WhatsApp.**
  Consequência da RN01 revisada: o pedido fica `pendente` sem conversa aberta.
  **Mitigação atual:** a confirmação diz explicitamente que o envio do código no
  WhatsApp é o último passo e que o pedido só é confirmado depois dele; o
  atendente vê os `pendente` do dia no dashboard `/area-funcionario` (nome e
  telefone obrigatórios, RN06) e pode chamar o cliente. **Futuro:** automação de
  callback — contatar automaticamente o cliente quando um pedido fica
  `pendente` sem comunicação no WhatsApp após um intervalo (fora de escopo
  nesta versão).

## TAREFAS

### Tarefa 1 — Collection `pedidos` no Payload ✅

**Descrição**

Implementada em `src/collections/Pedidos.ts` e registrada em
`src/payload.config.ts`: nome e telefone obrigatórios; itens (relacionamento
com `cardapio` + quantidade + tamanho opcional + snapshots de nome/preço);
lat/lng obrigatórios; localidade opcional; observações; subtotal (readOnly,
calculado em hook no servidor a partir dos preços atuais do cardápio); status
(select `pendente`/`pago`/`em_transito`/`finalizado`, default `pendente`);
código público gerado em hook `beforeChange` na criação; `timestamps: true`.
Access control: criação pública (canal validado pelo endpoint), leitura/
atualização/delete restritos a usuários autenticados.

**Critérios de Aceite**

- [x] Collection registrada em `src/payload.config.ts` e tipos regenerados em
  `src/payload-types.ts`.
- [x] Nome e telefone são obrigatórios; a collection rejeita registros sem eles.
- [x] Lat/lng são obrigatórios; indicação textual de localidade é opcional.
- [x] Status inicial de todo pedido novo é `pendente`.
- [x] No admin, é possível filtrar pedidos por status e por intervalo de
  data/hora (filtros nativos do Payload sobre campos select/date).
- [x] Cada pedido recebe um código público único e legível.
- [x] Leitura e alteração de status exigem autenticação; criação é possível sem
  login (somente via payload da submissão validado no servidor).

### Tarefa 2 — Página pública do formulário de pedido ✅

**Descrição**

Implementada em `app/(frontend)/pedido/page.tsx` (Server Component) +
`components/PedidoForm.tsx` (cliente). A página carrega o cardápio ativo via
`getCardapioAgrupado()` e as configurações via `getConfiguracoes()`. Seletor de
produtos tipo tags com chips `aria-pressed` por seção (Tamanhos não vira seção
selecionável: é atributo da pizza), resumo do pedido com `aria-live`, stepper
de quantidade e remoção. Nome/telefone obrigatórios; localidade e observações
opcionais. Preço parcial com aviso de frete (RN08); horários de funcionamento
exibidos quando válidos (P8). No build estático (`CONTENT_SOURCE=static`), a
página renderiza aviso de indisponibilidade (o endpoint não existe no export).
A página `/delivery` passou a referenciar o formulário no passo 1.

**Critérios de Aceite**

- [x] O formulário lista somente itens `ativo = true`, agrupados na ordem
  canônica das seções (Pizzas, Tamanhos, Bebidas, Vinhos).
- [x] A seleção funciona como seletor de tags: itens selecionados ficam
  visíveis, com ajuste de quantidade e remoção.
- [x] Nome e telefone são validados como obrigatórios antes da submissão.
- [x] O preço parcial é exibido e acompanhado do aviso de que o frete/preço
  final será informado depois por mensagem.
- [x] Cardápio vazio/indisponível exibe mensagem de indisponibilidade, nunca
  itens fictícios (RN11).
- [x] A página `/delivery` passa a referenciar o formulário.

### Tarefa 3 — Geolocalização com mapa Leaflet (um clique) ✅

**Descrição**

Implementada em `components/PedidoMapa.tsx`: Leaflet puro (import dinâmico no
`useEffect`), tiles OpenStreetMap com attribution, pin via `L.divIcon` sempre
arrastável e reposicionável por clique/toque, botão "Usar minha localização"
(Geolocation API), vista inicial centrada no Vale do Capão (-12.6167, -41.5).
Permissão negada/indisponível orienta o posicionamento manual sem bloquear;
sem ponto confirmado no mapa, o formulário não submete.

**Critérios de Aceite**

- [x] Um clique captura a posição e exibe o pin no mapa.
- [x] O pin é ajustável por arrasto antes da submissão (e por clique no mapa).
- [x] Permissão negada/indisponível permite posicionar o pin manualmente, com
  mensagem clara; sem ponto confirmado no mapa, o formulário não submete.
- [x] Lat/lng confirmados são enviados e persistidos no pedido.
- [x] O mapa usa Leaflet + OpenStreetMap, sem chave de API (P5).

### Tarefa 4 — Submissão, validação e confirmação ✅

**Descrição**

Implementada no endpoint `POST /api/submeter-pedido`
(`src/endpoints/submeter-pedido.ts`) + fluxo do `PedidoForm`. Validação
server-side via funções puras de `lib/pedidos.ts` (`validarPedido`,
`calcularSubtotal`); subtotal recalculado em hook da collection a partir dos
preços do cardápio; código público gerado no servidor; honeypot + rate limit
por IP (429). Confirmação com código em destaque e botão `wa.me` com mensagem
pré-preenchida contendo o código.

**Critérios de Aceite**

- [x] Validação server-side rejeita submissões sem nome, telefone, itens ou
  geolocalização.
- [x] O subtotal persistido é recalculado no servidor a partir dos itens do
  cardápio.
- [x] O código público é gerado no servidor, é único e aparece na confirmação.
- [x] Submissões de bots via honeypot são descartadas silenciosamente; rate
  limit por IP ativo.
- [x] A tela de confirmação exibe o código do pedido e um link `wa.me` com
  mensagem pré-preenchida contendo o código.
- [x] Falha na gravação exibe erro amigável sem perder o conteúdo do
  formulário.

### Tarefa 5 — Operação do atendente (lista, filtro e mudança de status) ✅

**Descrição**

Admin do Payload configurado na collection: `useAsTitle: 'codigo'`,
`defaultColumns` (código, nome, telefone, status, subtotal, createdAt),
ordenação padrão por criação decrescente, descriptions documentando que o
status é interno e a comunicação é via WhatsApp (RN09). Filtros por status e
data/hora são nativos da listagem do Payload.

**Critérios de Aceite**

- [x] A lista padrão ordena por data/hora de criação decrescente.
- [x] É possível filtrar por cada um dos 4 status e por intervalo de data/hora.
- [x] O detalhe do pedido exibe nome, telefone, itens com quantidades, ponto
  geográfico (lat/lng), indicação de localidade e subtotal.
- [x] O atendente altera o status pelo admin e a mudança é persistida com
  timestamp.

### Tarefa 6 — Migração do preço do cardápio para numérico (P1) ✅

**Descrição**

Implementada: `preco` da collection `cardapio` virou `number` (opcional);
`renderPreco` (`lib/cardapio.ts`) formata pt-BR ("R$ 30,00", NBSP do Intl
normalizado para espaço comum); pizzas ficam `preco: null` e o cardápio público
exibe "ver tamanhos" para elas (`components/MenuSection.tsx`); seed convertido
para números; tipos regenerados; comentários da collection registram a
revogação do antigo Requisito 6.3.

**Critérios de Aceite**

- [x] `preco` é `number` na collection, nos tipos gerados e no seed.
- [x] A renderização pública do cardápio formata o número como texto (pt-BR),
  sem mudança visual perceptível para itens de preço fixo.
- [x] Pizzas + tamanhos resolvem um preço numérico consistente no formulário.
- [x] Testes de propriedade de preço atualizados e passando.
- [x] Comentários da collection e da página pública atualizados para refletir
  o novo tipo.

## VERIFICAÇÃO E PENDÊNCIAS

- `npm test`: 109 passando (13 skipped — testes de integração que exigem
  Postgres, comportamento pré-existente da suíte). Novos testes de propriedade
  em `tests/pedidos.property.test.ts` (código, subtotal, validação) e casos de
  acessibilidade para `/pedido` em `tests/acessibilidade.test.tsx`.
- `npm run lint`: sem erros novos (baseline pré-existente mantida).
- `npm run build:static`: passa; `/pedido` sai estática em modo aviso de
  indisponibilidade, sem referência ao endpoint.
- **Pendente:** validar com Postgres real (`docker compose up -d --build`,
  `npm run seed`) — hooks da collection, geração de código e submissão de ponta
  a ponta só foram exercitados em testes unitários/de propriedade; os testes de
  integração DB-backed foram atualizados para o novo modelo de preço, mas só
  rodam com o banco de pé. Se já existir banco com preços em texto, é preciso
  migração/reseed dos dados do cardápio.

- **Futuro (P9):** automação de callback para pedidos `pendente` sem
  comunicação no WhatsApp — a definir (gatilho, intervalo, canal/bot).

## REFERÊNCIAS

- Template desta documentação: `docs/features/_template.md`
- Página pública de delivery: `app/(frontend)/delivery/page.tsx`
- Formulário de pedido: `app/(frontend)/pedido/page.tsx`,
  `components/PedidoForm.tsx`, `components/PedidoMapa.tsx`
- Collection de pedidos: `src/collections/Pedidos.ts`
- Endpoint de submissão: `src/endpoints/submeter-pedido.ts`
- Lógica pura de pedidos: `lib/pedidos.ts` (+ `tests/pedidos.property.test.ts`)
- Collection do cardápio: `src/collections/Cardapio.ts`
- Funções puras do cardápio (seções, ordem, formatação de preço):
  `lib/cardapio.ts`
- Camada de queries e chaveamento estático/CMS: `lib/queries.ts`,
  `content/static-content.ts`
- Configuração do Payload: `src/payload.config.ts`
- Mapas (decisão P5): https://leafletjs.com/ + https://www.openstreetmap.org/
- Geolocation API (MDN): https://developer.mozilla.org/docs/Web/API/Geolocation_API
- Links de conversa WhatsApp (`wa.me`): https://faq.whatsapp.com/5913398998672934
- Formatação de moeda: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- Mockup: a definir (diretrizes visuais em `docs/Diretrizes do Site.pdf` e
  `docs/design/`)
