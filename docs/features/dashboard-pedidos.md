# Dashboard de Pedidos para Funcionários e Clientes

> **Status: implementado (v1).** Cadastro público de clientes (`/cadastro`),
> dashboards `/area-cliente` e `/area-funcionario`, vínculo pedido ↔ conta por
> telefone e access por papel na collection `pedidos` entregues. Revoga a RN09
> de `delivery-pedidos.md` (status deixa de ser interno).

## CONTEXTO

A feature `delivery-pedidos.md` registrou os pedidos no CMS, mas o acompanhamento
continuava 100% no WhatsApp: o cliente perguntava "saiu?" na conversa e o
atendente consultava o painel admin do Payload — que só admins acessam.

Esta feature cria um **painel de pedidos para a operação e para o cliente**:

1. O cliente se **cadastra** no site (`/cadastro`) com nome + sobrenome + e-mail
   + telefone (WhatsApp) + senha — o par (e-mail, telefone) é único. ~~O convite
   principal é o **follow-up pós-pedido**~~ **Atualizado (2026-09-25):** com o
   login obrigatório para pedir (RN12 de `delivery-pedidos.md`), o cadastro
   acontece ANTES do pedido (`/login?next=/pedido` → `/cadastro`), e a
   confirmação do pedido linka para "Meus pedidos" (`/area-cliente`).
2. O **vínculo pedido ↔ conta é pelo telefone**: o cliente vê todos os pedidos
   cujo telefone bate com o da conta, inclusive os anteriores ao cadastro.
3. O **cliente** acompanha os próprios pedidos em `/area-cliente`, com o status
   em badge colorido e rótulos amigáveis.
4. O **funcionário** acompanha todos os pedidos em `/area-funcionario`, filtra
   por status (chips com contagem) e **gerencia o status manualmente** (funil
   pendente → pago → em_transito → finalizado), sem precisar de acesso ao
   painel admin.

O WhatsApp continua sendo o canal de comunicação (preço final com frete,
confirmações); o dashboard tira do atendente o trabalho de responder status.

## REGRAS DE NEGÓCIO

- RN-D01 — O acesso aos dashboards exige cadastro/login: cliente em
  `/area-cliente`, funcionário em `/area-funcionario` (admin enxerga ambas,
  para suporte). Sem conta, o cliente não vê pedidos.
- RN-D02 — O cliente vê o status real do pedido com **rótulos amigáveis**:
  pendente → "Recebido", pago → "Pagamento confirmado", em_transito → "Saiu
  para entrega", finalizado → "Entregue". **Revoga a RN09** de
  `delivery-pedidos.md` (o status não é mais interno).
- RN-D03 — O vínculo pedido ↔ conta é o **telefone (WhatsApp)**, normalizado
  para apenas dígitos nas duas collections (`users` e `pedidos`) via hook de
  escrita. Cadastro feito com o mesmo telefone do pedido vê o histórico
  completo daquele número.
- RN-D04 — O cadastro exige **nome + sobrenome** (identificação do titular),
  **e-mail** e **telefone** válidos e **senha** (mínimo 8 caracteres). O par
  (e-mail, telefone) é único na collection `users`.
- RN-D05 — Access por papel na collection `pedidos`: criação continua pública
  (via endpoint validado); **leitura** — admin/funcionário leem tudo, cliente
  lê só os pedidos do próprio telefone, anônimo não lê; **atualização** —
  apenas admin/funcionário (cliente nunca altera pedido nem status);
  **remoção** — apenas admin.
- RN-D06 — A gestão de status pelo funcionário é **manual e linear**:
  pendente → pago → em_transito → finalizado. Um botão por card executa a
  próxima transição; pedido finalizado não tem ação.
- RN-D07 — O cadastro público é protegido contra abuso com honeypot + rate
  limit por IP (mesmo padrão do endpoint de submissão de pedidos).
- RN-D08 — O cadastro já autentica: ao criar a conta, o endpoint define o
  cookie de sessão e o cliente cai direto no dashboard.
- Os mesmos dashboards atendem aos pedidos de pimenta em mel
  (`/area-funcionario/pimenta` e `/area-cliente/pimenta`), com o mesmo funil
  de status — ver pimenta-em-mel.md.

## TAREFAS

### Tarefa 1 — Identificação do titular na collection `users` ✅

**Descrição**

Implementada em `src/collections/Users.ts`: campos `nome`, `sobrenome` e
`telefone` (este com `saveToJWT`, pois o access de `pedidos` lê
`req.user.telefone`). Obrigatoriedade dos três para `role: 'cliente'` enforced
em hook `beforeValidate` (não no campo, para não quebrar a tela nativa de
criação do primeiro usuário do Payload). O hook também normaliza o telefone
para dígitos e garante a **unicidade do par (e-mail, telefone)** via consulta
excluindo o próprio documento. Seed cria o admin com nome/sobrenome fixos.

**Critérios de Aceite**

- [x] Cliente sem nome, sobrenome ou telefone plausível (≥ 10 dígitos) é
  rejeitado com mensagem clara.
- [x] Telefone é gravado normalizado (só dígitos).
- [x] Par (e-mail, telefone) duplicado é rejeitado; e-mails distintos com o
  mesmo telefone são permitidos.
- [x] Tela nativa `create-first-user` continua funcional (campos não são
  `required` no nível do campo).

### Tarefa 2 — Access por papel e normalização em `pedidos` ✅

**Descrição**

Em `src/collections/Pedidos.ts`: hook `beforeValidate` normaliza `telefone`;
`access.read` por papel (RN-D05); `update` restrito a admin/funcionário;
`delete` restrito a admin. Fecha a brecha em que qualquer usuário autenticado
lia todos os pedidos.

**Critérios de Aceite**

- [x] Cliente autenticado recebe da REST API apenas os pedidos do próprio
  telefone.
- [x] Funcionário/admin leem todos os pedidos.
- [x] Cliente não consegue `PATCH`/`DELETE` em pedidos.
- [x] Anônimo não lê pedidos.

### Tarefa 3 — Endpoint público de cadastro ✅

**Descrição**

`POST /api/cadastro-cliente` (`src/endpoints/cadastro-cliente.ts`): honeypot +
rate limit por IP (RN-D07), validação server-side via `lib/cadastro.ts`
(função pura), criação com `role: 'cliente'` e login imediato via
`payload.login` + cookie `payload-token` na resposta (RN-D08). Duplicidade →
409; falha de validação → 400 com lista de erros.

**Critérios de Aceite**

- [x] Cadastro válido retorna 201 e o cliente sai autenticado.
- [x] Par (e-mail, telefone) duplicado retorna 409.
- [x] Honeypot preenchido retorna 201 falso sem gravar; rate limit ativo.

### Tarefa 4 — Página `/cadastro` + follow-up pós-pedido ✅

**Descrição**

`app/(auth)/cadastro/page.tsx` + `CadastroForm.tsx`: mesma moldura visual do
login, campos nome/sobrenome/e-mail/telefone/senha/confirmar, pré-preenchimento
do telefone via `?telefone=`, redirecionamento de quem já tem sessão. A tela de
confirmação do `PedidoForm` ganhou o convite "Criar conta para acompanhar" com
o telefone do formulário; a página de login linka para o cadastro.
**Atualizado (RN12, login obrigatório):** o convite foi substituído por "Ver
meus pedidos"; login e cadastro preservam a rota de retorno `?next=`.

**Critérios de Aceite**

- [x] Confirmação do pedido leva ao cadastro com o telefone pré-preenchido.
- [x] Cadastro com sucesso cai logado em `/area-cliente`.
- [x] Senhas divergentes são rejeitadas no cliente antes do envio.

### Tarefa 5 — Dashboard do cliente ✅

**Descrição**

`app/(painel)/area-cliente/page.tsx` + `components/PedidosCliente.tsx`:
cards com código, data/hora, **badge de status colorido** (rótulos amigáveis,
RN-D02 — `components/StatusPedidoBadge.tsx` + `lib/status-pedido.ts`), itens e
subtotal. Estado vazio orienta; falha de API exibe indisponibilidade.

**Critérios de Aceite**

- [x] O cliente vê apenas os próprios pedidos, mais recentes primeiro.
- [x] O status é identificável de relance (badge colorido + rótulo amigável).
- [x] Sem pedidos: mensagem clara + link para `/delivery`.

### Tarefa 6 — Dashboard do funcionário ✅

**Descrição**

`app/(painel)/area-funcionario/page.tsx` + `components/PedidosFuncionario.tsx`:
todos os pedidos, chips de filtro por status com contagem, cards com dados do
cliente (nome/telefone), itens, subtotal, localidade e botão da próxima
transição (RN-D06) com atualização otimista (reverte + `role="alert"` em erro).

**Critérios de Aceite**

- [x] Filtro por status funciona e exibe contagem por status.
- [x] O botão de transição persiste a mudança (`PATCH /api/pedidos/:id`).
- [x] Erro de atualização reverte o badge e avisa sem perder a lista.
- [x] Pedido finalizado não exibe ação.

## VERIFICAÇÃO E PENDÊNCIAS

- `npm test`: 153 passando (incluindo suítes de integração com Postgres).
  Novos testes: `tests/telefone.property.test.ts`, `tests/cadastro.test.ts`,
  `tests/status-pedido.test.ts`.
- `tsc --noEmit` e `eslint` limpos; `npm run build:static` passa (as páginas
  novas exportam em modo estático e falham graciosamente sem a API).
- **E2E validado com Postgres real (docker compose):** pedido submetido com
  telefone mascarado → cadastro com o mesmo número em outro formato → cliente
  logado vê o pedido (vínculo por telefone normalizado) → cadastro duplicado
  retorna 409 → cliente recebe 403 ao tentar PATCH em pedido → funcionário
  criado pelo admin lista todos os pedidos e avança o status (persistido e
  visível ao cliente) → anônimo não lê pedidos.

## RISCOS / OBSERVAÇÕES

- **Vínculo por telefone (RN-D03):** quem se cadastrar com um telefone já usado
  em pedidos vê esses pedidos (inclui localização de entrega). Aceito para a
  v1; mitigação futura: verificação do número via WhatsApp.
- Telefones de pedidos gravados antes desta feature podem estar não
  normalizados; o hook normaliza em novas escritas (banco de dev é
  re-semeável; em produção, re-salvar os pedidos normaliza).

## REFERÊNCIAS

- Template: `docs/features/_template.md`
- Feature de origem: `docs/features/delivery-pedidos.md` (RN09 revogada aqui)
- Collections: `src/collections/Users.ts`, `src/collections/Pedidos.ts`
- Endpoint de cadastro: `src/endpoints/cadastro-cliente.ts`
- Libs puras: `lib/telefone.ts`, `lib/cadastro.ts`, `lib/status-pedido.ts`,
  `lib/pedidos-api.ts`
- Dashboards: `app/(painel)/area-cliente/page.tsx`,
  `app/(painel)/area-funcionario/page.tsx`, `components/PedidosCliente.tsx`,
  `components/PedidosFuncionario.tsx`, `components/StatusPedidoBadge.tsx`
  (route group `(painel)`: layout interno sem header/footer públicos —
  `app/(painel)/layout.tsx` + `components/PainelHeader.tsx`). Menu do
  funcionário: "Delivery" (este dashboard), "Caixa" e "Histórico" — ver
  `docs/features/caixa-historico.md`; o funcionário não tem
  "Configurações" (conta gerida pelo admin no Payload).
- Cadastro: `app/(auth)/cadastro/page.tsx`, `app/(auth)/cadastro/CadastroForm.tsx`
