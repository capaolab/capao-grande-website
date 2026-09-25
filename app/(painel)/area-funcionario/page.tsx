// Página /area-funcionario — dashboard da equipe
// (docs/features/dashboard-pedidos.md).
//
// Acessível apenas para usuários autenticados com papel `funcionario` (ou
// `admin`, para suporte) — ver components/AreaInternaGuard.tsx e
// src/collections/Users.ts. Lista todos os pedidos de delivery com filtro por
// status e gestão manual do status (funil pendente → pago → em_transito →
// finalizado).

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PedidosFuncionario } from '@/components/PedidosFuncionario'

export const metadata: Metadata = {
  title: 'Pedidos | Capão Grande',
  description: 'Acompanhe e gerencie os pedidos de delivery do Capão Grande.',
}

export default function AreaFuncionarioPage(): ReactElement {
  return (
    <AreaInternaGuard area="funcionario">
      <article className="flex w-full flex-col gap-4">
        <h1 className="font-serif text-4xl text-verde">Pedidos de delivery</h1>
        <p className="font-sans text-paragrafo">
          Acompanhe a fila de pedidos e atualize o status conforme o atendimento
          avança no WhatsApp.
        </p>
        <PedidosFuncionario />
      </article>
    </AreaInternaGuard>
  )
}
