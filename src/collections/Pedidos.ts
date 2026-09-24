import type { CollectionConfig } from 'payload'

import {
  calcularSubtotal,
  descreverErroSubtotal,
  gerarCodigoPedido,
  type ItemPedidoEntrada,
} from '@/lib/pedidos'

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
// - `status`: interno do atendente (RN09), pendente → pago → em_transito →
//   finalizado. A comunicação com o cliente é sempre via WhatsApp.
//
// Filtros: o admin do Payload gera automaticamente filtros por campos select
// (`status`) e date (`createdAt`, que marca a data/hora do pedido), cobrindo
// o RN05 sem configuração extra.
//
// Access control: criação liberada (a submissão pública passa pelo endpoint
// customizado /api/submeter-pedido, que valida honeypot, rate limit e campos
// ANTES de criar — ver src/endpoints/submeter-pedido.ts); leitura, edição e
// remoção restritas a usuários autenticados.

// Opções fixas de `status` (RN05). Labels pt-BR; `em_transito` sem espaço no
// value para não vazar caracteres especiais em queries/URLs.
const STATUS = [
  { label: 'Pendente', value: 'pendente' },
  { label: 'Pago', value: 'pago' },
  { label: 'Em trânsito', value: 'em_transito' },
  { label: 'Finalizado', value: 'finalizado' },
] as const

// Tentativas de geração de código antes de desistir por colisão. Com 4
// caracteres sobre um alfabeto de 32 símbolos há ~1M de códigos, então uma
// colisão é rara — mas o retry garante unicidade mesmo assim (RN04).
const TENTATIVAS_CODIGO = 10

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
    // Criação pública: a validação real acontece no endpoint de submissão
    // (honeypot + rate limit + validação server-side); a Local API do hook é
    // interna e bypassa access de qualquer forma.
    create: () => true,
    // Leitura/edição/remoção exigem usuário autenticado do admin (RN09: o
    // status e os dados do pedido não são expostos publicamente).
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
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
      options: [...STATUS],
      label: 'Status',
      admin: {
        description:
          'Status INTERNO do atendente (RN09). Não é exposto ao cliente: toda a comunicação (confirmação, preço final com frete, saída para entrega) é feita via WhatsApp.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const { payload } = req

        // Código público: gerado apenas na CRIAÇÃO (RN04), com retry em caso
        // de colisão (verificação real via payload.find, não só o índice
        // unique do banco).
        if (operation === 'create' && !data.codigo) {
          for (let tentativa = 0; tentativa < TENTATIVAS_CODIGO; tentativa++) {
            const candidato = gerarCodigoPedido()
            const { totalDocs } = await payload.find({
              collection: 'pedidos',
              where: { codigo: { equals: candidato } },
              limit: 1,
              depth: 0,
              req,
            })
            if (totalDocs === 0) {
              data.codigo = candidato
              break
            }
          }
          if (!data.codigo) {
            throw new Error(
              `Não foi possível gerar um código único de pedido após ${TENTATIVAS_CODIGO} tentativas.`,
            )
          }
        }

        // Subtotal: recalculado SEMPRE no servidor a partir dos preços atuais
        // do cardápio (Tarefa 4 — nunca confiar no cliente). Erros de domínio
        // (item inexistente, pizza sem tamanho, quantidade inválida) REJEITAM
        // a gravação com mensagem clara.
        const entradas: ItemPedidoEntrada[] = (data.itens ?? []).map(
          (item: { item: unknown; quantidade: unknown; tamanho?: unknown }) => ({
            item: item.item as number | string,
            quantidade: item.quantidade as number,
            tamanho: (item.tamanho ?? null) as number | string | null,
          }),
        )

        const ids = [
          ...new Set(
            entradas.flatMap((e) => [e.item, e.tamanho]).filter((id) => id != null),
          ),
        ] as (number | string)[]

        const { docs: cardapio } = await payload.find({
          collection: 'cardapio',
          where: { id: { in: ids } },
          limit: 0,
          depth: 0,
          req,
        })

        const resultado = calcularSubtotal(entradas, cardapio)

        if (!resultado.ok) {
          throw new Error(
            `Pedido inválido: ${resultado.erros.map(descreverErroSubtotal).join(' ')}`,
          )
        }

        // Snapshots (nome/preço unitário) gravados por item: preservam o valor
        // cobrado mesmo que o cardápio mude depois.
        data.itens = (data.itens ?? []).map(
          (item: Record<string, unknown>, indice: number) => ({
            ...item,
            tamanho: resultado.itens[indice].tamanho,
            nomeSnapshot: resultado.itens[indice].nomeSnapshot,
            precoUnitario: resultado.itens[indice].precoUnitario,
          }),
        )
        data.subtotal = resultado.subtotal

        return data
      },
    ],
  },
  // createdAt (timestamps) registra a data/hora do pedido (RN04) e habilita o
  // filtro por intervalo de data/hora no admin (RN05).
  timestamps: true,
}

export default Pedidos
