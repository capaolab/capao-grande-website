// Página /area-funcionario/pimenta — pedidos de pimenta em mel
// (docs/features/pimenta-em-mel.md, RN-P05).
//
// Mesma tela de gestão do delivery (<PedidosFuncionario>) sobre a collection
// `pedidos-pimenta`: filtro por dia/status e botão da próxima transição do
// funil pendente → pago → em_transito ("pronto para retirada" na retirada)
// → finalizado. Acesso: funcionário (ou admin) — AreaInternaGuard + access da
// collection.

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PedidosFuncionario } from '@/components/PedidosFuncionario'

export const metadata: Metadata = {
  title: 'Pimenta em mel | Capão Grande',
  description: 'Acompanhe e gerencie os pedidos de pimenta em mel do Capão Grande.',
}

export default function PimentaFuncionarioPage(): ReactElement {
  return (
    <AreaInternaGuard area="funcionario">
      <article className="flex w-full flex-col gap-4">
        <h1 className="font-serif text-4xl text-verde">Pedidos de pimenta em mel</h1>
        <p className="font-sans text-paragrafo">
          Pedidos por unidade e em lote. Atualize o status conforme o atendimento avança no
          WhatsApp — na retirada, &ldquo;em trânsito&rdquo; significa pronto para retirada.
        </p>
        <PedidosFuncionario colecao="pedidos-pimenta" />
      </article>
    </AreaInternaGuard>
  )
}
