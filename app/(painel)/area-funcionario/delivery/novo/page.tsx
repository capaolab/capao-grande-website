// Página /area-funcionario/delivery/novo — formulário de pedido de delivery no
// painel, visão do funcionário (docs/features/pedidos-painel.md). Acesso:
// funcionário (ou admin) via AreaInternaGuard; o conteúdo é o
// <PaginaPedidoDelivery modo="funcionario">.

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PaginaPedidoDelivery } from '@/components/PaginaPedidoDelivery'

export const metadata: Metadata = {
  title: 'Novo pedido de delivery | Capão Grande',
  description: 'Registre um pedido de delivery para um cliente que pediu pelo WhatsApp.',
}

export default function NovoPedidoPage(): ReactElement {
  return (
    <AreaInternaGuard area="funcionario">
      <PaginaPedidoDelivery modo="funcionario" />
    </AreaInternaGuard>
  )
}
