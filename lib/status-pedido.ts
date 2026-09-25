// Vocabulário de status dos pedidos de delivery
// (docs/features/dashboard-pedidos.md). Funções/dados PUROS, sem dependência
// de Payload/Next — usados pelos dashboards (componentes client) e testados
// em tests/status-pedido.test.ts.
//
// O valor do campo `status` da collection `pedidos`
// (src/collections/Pedidos.ts) é o interno (pendente/pago/em_transito/
// finalizado). Para o CLIENTE, exibimos rótulos amigáveis (RN-D02: o status
// deixou de ser interno — revogação da RN09 de delivery-pedidos.md). Para o
// FUNCIONÁRIO, `proximoStatus` descreve a transição manual linear do funil.

/** Valores canônicos do campo `status` (espelham as options da collection). */
export const STATUS_PEDIDO = ['pendente', 'pago', 'em_transito', 'finalizado'] as const

export type StatusPedido = (typeof STATUS_PEDIDO)[number]

/** Modalidade de recebimento. Delivery é sempre `entrega`; pimenta em mel
    (docs/features/pimenta-em-mel.md) aceita também `retirada` na pizzaria —
    os VALORES de status são os mesmos, só os rótulos de `em_transito` e
    `finalizado` mudam. */
export type ModalidadeEntrega = 'entrega' | 'retirada'

/** Rótulos operacionais (visão do funcionário/admin). */
export const ROTULO_STATUS: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  em_transito: 'Em trânsito',
  finalizado: 'Finalizado',
}

/** Rótulos amigáveis para o cliente acompanhar o próprio pedido (RN-D02). */
export const ROTULO_STATUS_CLIENTE: Record<StatusPedido, string> = {
  pendente: 'Recebido',
  pago: 'Pagamento confirmado',
  em_transito: 'Saiu para entrega',
  finalizado: 'Entregue',
}

/** Opções do campo select `status` (collections `pedidos` e `pedidos-pimenta`). */
export const OPCOES_STATUS_PEDIDO = STATUS_PEDIDO.map((value) => ({
  label: ROTULO_STATUS[value],
  value,
}))

/** Rótulos do cliente que mudam quando o pedido é retirado na pizzaria. */
const ROTULO_STATUS_CLIENTE_RETIRADA: Partial<Record<StatusPedido, string>> = {
  em_transito: 'Pronto para retirada',
  finalizado: 'Retirado',
}

/** Type guard para valores vindos da API (campo select — sempre válido, mas o JSON é `unknown`). */
export function ehStatusPedido(valor: unknown): valor is StatusPedido {
  return typeof valor === 'string' && (STATUS_PEDIDO as readonly string[]).includes(valor)
}

/**
 * Rótulo operacional (funcionário) do status. Na retirada, `em_transito`
 * significa "pronto para retirada".
 */
export function rotuloStatus(status: string, modalidade: ModalidadeEntrega = 'entrega'): string {
  if (!ehStatusPedido(status)) return status
  if (modalidade === 'retirada' && status === 'em_transito') return 'Pronto para retirada'
  return ROTULO_STATUS[status]
}

/**
 * Rótulo amigável do status para o cliente. Valores inesperados (ex.: status
 * novo ainda não mapeado) caem no rótulo operacional ou no próprio valor —
 * nunca quebram a renderização.
 */
export function rotuloStatusCliente(
  status: string,
  modalidade: ModalidadeEntrega = 'entrega',
): string {
  if (!ehStatusPedido(status)) return status
  if (modalidade === 'retirada') {
    return ROTULO_STATUS_CLIENTE_RETIRADA[status] ?? ROTULO_STATUS_CLIENTE[status]
  }
  return ROTULO_STATUS_CLIENTE[status]
}

/**
 * Próximo status do funil linear pendente → pago → em_transito → finalizado,
 * com o rótulo da AÇÃO para o botão do funcionário (ex.: "Marcar como pago").
 * `finalizado` não tem próximo — retorna null (pedido encerrado, sem ação).
 * Em `retirada` (pimenta em mel), `em_transito` significa "pronto para
 * retirada" — mesmo valor, outro rótulo de ação.
 */
export function proximoStatus(
  status: StatusPedido,
  modalidade: ModalidadeEntrega = 'entrega',
): { status: StatusPedido; rotuloAcao: string } | null {
  switch (status) {
    case 'pendente':
      return { status: 'pago', rotuloAcao: 'Marcar como pago' }
    case 'pago':
      return {
        status: 'em_transito',
        rotuloAcao: modalidade === 'retirada' ? 'Pronto para retirada' : 'Saiu para entrega',
      }
    case 'em_transito':
      return { status: 'finalizado', rotuloAcao: 'Finalizar pedido' }
    case 'finalizado':
      return null
  }
}
