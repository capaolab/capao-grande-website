// Página /area-cliente/pimenta/novo — formulário de pedido de pimenta em mel
// no painel, visão do cliente (docs/features/pedidos-painel.md). Acesso:
// cliente (ou admin) via AreaInternaGuard; o conteúdo é o <PaginaPedidoPimenta
// modo="cliente">.

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PaginaPedidoPimenta } from '@/components/PaginaPedidoPimenta'

export const metadata: Metadata = {
  title: 'Pedido de pimenta em mel | Capão Grande',
  description: 'Faça seu pedido de pimenta em mel: quantidades, entrega ou retirada.',
}

export default function NovoPedidoPage(): ReactElement {
  return (
    <AreaInternaGuard area="cliente">
      <PaginaPedidoPimenta modo="cliente" />
    </AreaInternaGuard>
  )
}
