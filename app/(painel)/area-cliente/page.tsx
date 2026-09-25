// Página /area-cliente — dashboard do cliente
// (docs/features/dashboard-pedidos.md).
//
// Acessível apenas para usuários autenticados com papel `cliente` (ou `admin`,
// para suporte) — ver components/AreaInternaGuard.tsx e
// src/collections/Users.ts. Lista os pedidos do próprio cliente com o status
// em destaque (badge colorido); a API devolve apenas os pedidos cujo telefone
// bate com o da conta (access da collection `pedidos`).

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PedidosCliente } from '@/components/PedidosCliente'

export const metadata: Metadata = {
  title: 'Meus pedidos | Capão Grande',
  description: 'Acompanhe o status dos seus pedidos de delivery do Capão Grande.',
}

export default function AreaClientePage(): ReactElement {
  return (
    <AreaInternaGuard area="cliente">
      <article className="flex w-full flex-col gap-4">
        <h1 className="font-serif text-4xl text-verde">Meus pedidos</h1>
        <p className="font-sans text-paragrafo">
          Acompanhe aqui o andamento dos seus pedidos de delivery.
        </p>
        <PedidosCliente />
      </article>
    </AreaInternaGuard>
  )
}
