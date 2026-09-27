// Página /area-cliente — aba "Delivery" do cliente
// (docs/features/dashboard-pedidos.md e docs/features/pedidos-painel.md).
//
// Acessível apenas para usuários autenticados com papel `cliente` (ou `admin`,
// para suporte) — ver components/AreaInternaGuard.tsx e
// src/collections/Users.ts. Área principal: os pedidos do próprio cliente,
// com o status em destaque (badge colorido) e o total a partir de
// "validado"; a API devolve apenas os pedidos cujo telefone bate com o da
// conta (access da collection `pedidos`). Aside: produtos disponíveis para
// delivery e o botão para o formulário (/area-cliente/delivery/novo).

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { CardapioDeliveryAside } from '@/components/CardapioDeliveryAside'
import { PedidosCliente } from '@/components/PedidosCliente'
import { rotaFormularioPedido } from '@/lib/permissoes'
import { getCardapioDelivery } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Delivery | Capão Grande',
  description: 'Faça e acompanhe seus pedidos de delivery do Capão Grande.',
}

export default async function AreaClientePage(): Promise<ReactElement> {
  const secoes = await getCardapioDelivery()

  return (
    <AreaInternaGuard area="cliente">
      <div className="grid w-full items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="flex flex-col gap-4">
          <h1 className="font-serif text-4xl text-verde">Delivery</h1>
          <p className="font-sans text-paragrafo">
            Acompanhe aqui o andamento dos seus pedidos de delivery.
          </p>
          <PedidosCliente />
        </article>
        <CardapioDeliveryAside
          secoes={secoes}
          hrefPedido={rotaFormularioPedido('delivery', 'cliente')!}
        />
      </div>
    </AreaInternaGuard>
  )
}
