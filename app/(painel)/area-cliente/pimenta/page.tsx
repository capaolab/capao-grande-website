// Página /area-cliente/pimenta — pedidos de pimenta em mel do cliente
// (docs/features/pimenta-em-mel.md, RN-P06).
//
// Mesma lista de /area-cliente (<PedidosCliente>) sobre a collection
// `pedidos-pimenta`; a API devolve só os pedidos cujo telefone bate com o da
// conta.

import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PedidosCliente } from '@/components/PedidosCliente'
import { rotaFormularioPedido } from '@/lib/permissoes'

export const metadata: Metadata = {
  title: 'Meus pedidos de pimenta em mel | Capão Grande',
  description: 'Acompanhe o status dos seus pedidos de pimenta em mel do Capão Grande.',
}

export default function PimentaClientePage(): ReactElement {
  return (
    <AreaInternaGuard area="cliente">
      <article className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-4xl text-verde">Pedidos de pimenta em mel</h1>
          <Link href={rotaFormularioPedido('pimenta', 'cliente')!} className="btn-primario">
            Fazer pedido
          </Link>
        </div>
        <p className="font-sans text-paragrafo">
          Acompanhe aqui o andamento dos seus pedidos de pimenta em mel.
        </p>
        <PedidosCliente colecao="pedidos-pimenta" />
      </article>
    </AreaInternaGuard>
  )
}
