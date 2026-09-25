// Página /area-funcionario/historico — histórico do dia (caixa + delivery)
// para análise posterior (docs/features/caixa-historico.md).
//
// Acessível a `funcionario` (e `admin`, para suporte) — AreaInternaGuard.

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { HistoricoDia } from '@/components/HistoricoDia'

export const metadata: Metadata = {
  title: 'Histórico | Capão Grande',
  description: 'Resumo e movimento do dia: contas do caixa e pedidos de delivery.',
}

export default function HistoricoPage(): ReactElement {
  return (
    <AreaInternaGuard area="funcionario">
      <article className="flex w-full flex-col gap-4">
        <h1 className="font-serif text-4xl text-verde">Histórico do dia</h1>
        <p className="font-sans text-paragrafo">
          Tudo o que passou pelo caixa e pelo delivery no dia escolhido.
        </p>
        <HistoricoDia />
      </article>
    </AreaInternaGuard>
  )
}
