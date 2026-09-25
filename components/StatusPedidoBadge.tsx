// <StatusPedidoBadge> — pill colorido de status do pedido
// (docs/features/dashboard-pedidos.md). É o elemento de leitura rápida dos
// dashboards: o status precisa ser identificável de relance.
//
// `variant="cliente"` usa os rótulos amigáveis (RN-D02: "Recebido",
// "Pagamento confirmado", ...); `variant="operacao"` usa os rótulos internos
// (Pendente, Pago, ...). Cores vêm dos tokens do design system
// (app/globals.css), com contraste texto/fundo escolhido por status.
// `modalidade="retirada"` (pimenta em mel) troca os rótulos de em_transito/
// finalizado ("Pronto para retirada", "Retirado").

import type { ReactElement } from 'react'

import {
  ehStatusPedido,
  rotuloStatus,
  rotuloStatusCliente,
  type ModalidadeEntrega,
  type StatusPedido,
} from '@/lib/status-pedido'

// Fundo colorido por status. Texto escuro sobre oliva/verde e texto papel
// sobre marrom, para contraste legível; finalizado é neutro (borda).
const CORES_STATUS: Record<StatusPedido, string> = {
  pendente: 'bg-[color:var(--color-oliva)] text-[color:var(--color-marrom-escuro)]',
  pago: 'bg-[color:var(--color-verde)] text-[color:var(--color-marrom-escuro)]',
  em_transito: 'bg-[color:var(--color-marrom)] text-[color:var(--color-papel)]',
  finalizado: 'bg-[color:var(--color-borda)] text-[color:var(--color-paragrafo)]',
}

export interface StatusPedidoBadgeProps {
  /** Valor do campo `status` vindo da API. */
  status: string
  /** 'cliente' = rótulos amigáveis; 'operacao' = rótulos internos. */
  variant?: 'cliente' | 'operacao'
  /** Modalidade do pedido (padrão: entrega). */
  modalidade?: ModalidadeEntrega | null
}

export function StatusPedidoBadge({
  status,
  variant = 'operacao',
  modalidade,
}: StatusPedidoBadgeProps): ReactElement {
  const valido = ehStatusPedido(status)
  const rotulo =
    variant === 'cliente'
      ? rotuloStatusCliente(status, modalidade ?? 'entrega')
      : rotuloStatus(status, modalidade ?? 'entrega')
  const cores = valido
    ? CORES_STATUS[status]
    : 'bg-[color:var(--color-borda)] text-[color:var(--color-paragrafo)]'

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 font-sans text-sm font-medium ${cores}`}
    >
      {rotulo}
    </span>
  )
}

export default StatusPedidoBadge
