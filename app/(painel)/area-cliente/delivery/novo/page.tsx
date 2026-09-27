// Página /area-cliente/delivery/novo — formulário de pedido de delivery no
// painel, visão do cliente (docs/features/pedidos-painel.md). Acesso: cliente
// (ou admin) via AreaInternaGuard; o conteúdo é o <PaginaPedidoDelivery
// modo="cliente">.

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PaginaPedidoDelivery } from '@/components/PaginaPedidoDelivery'

export const metadata: Metadata = {
  title: 'Monte seu pedido | Capão Grande',
  description: 'Faça seu pedido de delivery: escolha os itens e marque o ponto de entrega no mapa.',
}

export default function NovoPedidoPage(): ReactElement {
  return (
    <AreaInternaGuard area="cliente">
      <PaginaPedidoDelivery modo="cliente" />
    </AreaInternaGuard>
  )
}
