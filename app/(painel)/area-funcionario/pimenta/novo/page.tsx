// Página /area-funcionario/pimenta/novo — formulário de pedido de pimenta em
// mel no painel, visão do funcionário (docs/features/pedidos-painel.md).
// Acesso: funcionário (ou admin) via AreaInternaGuard; o conteúdo é o
// <PaginaPedidoPimenta modo="funcionario">.

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PaginaPedidoPimenta } from '@/components/PaginaPedidoPimenta'

export const metadata: Metadata = {
  title: 'Novo pedido de pimenta em mel | Capão Grande',
  description: 'Registre um pedido de pimenta em mel para um cliente que pediu pelo WhatsApp.',
}

export default function NovoPedidoPage(): ReactElement {
  return (
    <AreaInternaGuard area="funcionario">
      <PaginaPedidoPimenta modo="funcionario" />
    </AreaInternaGuard>
  )
}
