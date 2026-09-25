import type { CollectionConfig } from 'payload'

import { OPCOES_STATUS_PEDIDO } from '@/lib/status-pedido'
import { normalizarTelefone } from '@/lib/telefone'

import { gerarCodigoUnico } from './codigo-unico'
import { resolverItensCardapio } from './itens-cardapio'

// Colecao_Pedidos (docs/features/delivery-pedidos.md, Tarefa 1): pedidos de
// delivery submetidos pelo formulário público.
//
// Campos:
// - `codigo`: código público curto (ex.: "A3F7"), gerado em hook na criação —
//   é a referência que o cliente menciona na conversa de WhatsApp (P2, RN04).
// - `nome`/`telefone`: obrigatórios, para registro interno e vínculo com a
//   conversa (RN06).
// - `itens`: array de item do cardápio + quantidade (+ tamanho, quando o item
//   é pizza sem preço próprio), com snapshots de nome/preço unitário
//   preenchidos no servidor no momento do pedido.
// - `latitude`/`longitude`: geolocalização de entrega obrigatória (RN07 — não
//   há endereço formal no Vale do Capão, P4); `localidade` é a indicação
//   textual opcional de referência.
// - `subtotal`: soma dos produtos, calculada NO SERVIDOR a partir dos preços
//   atuais do cardápio — nunca confiando no cliente (Tarefa 4). Não inclui
//   frete: o preço final é informado pelo atendente via mensagem (RN08).
// - `status`: pendente → pago → em_transito → finalizado. Era interno do
//   atendente (antiga RN09 — REVOGADA pela feature dashboard-pedidos.md):
//   agora o CLIENTE acompanha o status dos próprios pedidos no dashboard
//   `/area-cliente` e o funcionário o gerencia em `/area-funcionario`.
//
// Filtros: o admin do Payload gera automaticamente filtros por campos select
// (`status`) e date (`createdAt`, que marca a data/hora do pedido), cobrindo
// o RN05 sem configuração extra.
//
// Access control (dashboard-pedidos.md, RN-D05): criação liberada (a
// submissão pública passa pelo endpoint customizado /api/submeter-pedido, que
// valida honeypot, rate limit e campos ANTES de criar — ver
// src/endpoints/submeter-pedido.ts); leitura por papel — admin/funcionário
// leem TODOS os pedidos, CLIENTE lê apenas os pedidos cujo `telefone` bate
// com o da sua conta (vínculo por telefone normalizado); atualização restrita
// a admin/funcionário (gestão manual de status); remoção só de admin.

export const Pedidos: CollectionConfig = {
  slug: 'pedidos',
  // Lista padrão: pedidos mais recentes primeiro (RN05).
  defaultSort: '-createdAt',
  admin: {
    useAsTitle: 'codigo',
    // Código, cliente, contato, status, subtotal e data/hora na listagem
    // (Tarefa 5: operação do atendente). Filtros por status e por intervalo
    // de data/hora são automáticos no admin (campos select e date).
    defaultColumns: ['codigo', 'nome', 'telefone', 'status', 'subtotal', 'createdAt'],
  },
  access: {
    // Criação exige sessão (RN12 — login obrigatório para pedir). O fluxo
    // normal passa pelo endpoint /api/submeter-pedido (honeypot + rate limit +
    // validação server-side), que usa a Local API (overrideAccess); esta
    // regra fecha o POST anônimo direto em /api/pedidos.
    create: ({ req: { user } }) => Boolean(user),
    // Leitura por papel (RN-D05): admin/funcionário leem todos (operação);
    // cliente lê apenas os pedidos do PRÓPRIO telefone (vínculo por telefone
    // normalizado, gravado só com dígitos — ver hook beforeValidate); anônimo
    // não lê nada.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'funcionario') return true
      if (user.role === 'cliente' && typeof user.telefone === 'string' && user.telefone) {
        return { telefone: { equals: user.telefone } }
      }
      return false
    },
    // Gestão manual de status (e demais campos) é exclusiva da operação:
    // admin e funcionário. Cliente nunca altera pedido.
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'funcionario',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'codigo',
      type: 'text',
      unique: true,
      index: true,
      label: 'Código',
      admin: {
        readOnly: true,
        description:
          'Código público gerado automaticamente na criação. O cliente o usa como referência na conversa do WhatsApp.',
      },
    },
    {
      name: 'nome',
      type: 'text',
      required: true, // RN06
      label: 'Nome',
    },
    {
      name: 'telefone',
      type: 'text',
      required: true, // RN06
      label: 'Telefone (WhatsApp)',
    },
    {
      name: 'itens',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Itens do pedido',
      fields: [
        {
          name: 'item',
          type: 'relationship',
          relationTo: 'cardapio',
          required: true,
          label: 'Item do cardápio',
        },
        {
          name: 'quantidade',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
          label: 'Quantidade',
        },
        {
          name: 'tamanho',
          type: 'relationship',
          relationTo: 'cardapio',
          label: 'Tamanho',
          admin: {
            description:
              'Obrigatório quando o item é uma pizza (sem preço próprio): o preço vem do item da seção Tamanhos.',
          },
        },
        {
          name: 'nomeSnapshot',
          type: 'text',
          label: 'Nome (snapshot)',
          admin: {
            readOnly: true,
            description: 'Nome do item no momento do pedido, preenchido no servidor.',
          },
        },
        {
          name: 'precoUnitario',
          type: 'number',
          label: 'Preço unitário (snapshot)',
          admin: {
            readOnly: true,
            description:
              'Preço unitário resolvido no servidor a partir do cardápio (item ou tamanho) no momento do pedido.',
          },
        },
      ],
    },
    {
      name: 'latitude',
      type: 'number',
      required: true, // RN07
      label: 'Latitude da entrega',
    },
    {
      name: 'longitude',
      type: 'number',
      required: true, // RN07
      label: 'Longitude da entrega',
    },
    {
      name: 'localidade',
      type: 'text',
      label: 'Localidade / referência',
      admin: {
        description:
          'Indicação textual opcional de localidade ou ponto de referência (no Vale do Capão não há endereço formal).',
      },
    },
    {
      name: 'observacoes',
      type: 'textarea',
      label: 'Observações',
    },
    {
      name: 'subtotal',
      type: 'number',
      label: 'Subtotal dos produtos (R$)',
      admin: {
        readOnly: true,
        description:
          'Soma dos produtos calculada no servidor a partir dos preços atuais do cardápio. NÃO inclui frete — o preço final é informado ao cliente pelo atendente via mensagem.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pendente',
      // Opções fixas (RN05), compartilhadas com `pedidos-pimenta`.
      options: OPCOES_STATUS_PEDIDO,
      label: 'Status',
      admin: {
        description:
          'Visível ao cliente no dashboard /area-cliente (RN09 revogada): pendente → "Recebido", pago → "Pagamento confirmado", em_transito → "Saiu para entrega", finalizado → "Entregue". Atualize conforme a conversa no WhatsApp avança.',
      },
    },
  ],
  hooks: {
    // Telefone gravado NORMALIZADO (só dígitos): o vínculo pedido ↔ conta do
    // cliente compara `pedidos.telefone` com `users.telefone` (normalizado do
    // mesmo jeito no hook da collection users).
    beforeValidate: [
      ({ data }) => {
        if (data && typeof data.telefone === 'string' && data.telefone.trim() !== '') {
          data.telefone = normalizarTelefone(data.telefone)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation }) => {
        // Código público: gerado apenas na CRIAÇÃO (RN04), único na collection.
        if (operation === 'create' && !data.codigo) {
          data.codigo = await gerarCodigoUnico(req, 'pedidos')
        }

        // Subtotal: recalculado SEMPRE no servidor a partir dos preços atuais
        // do cardápio (Tarefa 4 — nunca confiar no cliente). Erros de domínio
        // (item inexistente, pizza sem tamanho, quantidade inválida) REJEITAM
        // a gravação com mensagem clara. Snapshots (nome/preço unitário) por
        // item preservam o valor cobrado mesmo que o cardápio mude depois.
        const resolvido = await resolverItensCardapio(data.itens ?? [], req, 'Pedido')
        data.itens = resolvido.itens
        data.subtotal = resolvido.subtotal

        return data
      },
    ],
  },
  // createdAt (timestamps) registra a data/hora do pedido (RN04) e habilita o
  // filtro por intervalo de data/hora no admin (RN05).
  timestamps: true,
}

export default Pedidos
