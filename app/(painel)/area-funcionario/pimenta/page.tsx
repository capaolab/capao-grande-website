// Página /area-funcionario/pimenta — pedidos de pimenta em mel
// (docs/features/pimenta-em-mel.md, RN-P05).
//
// Mesma tela de gestão do delivery (<PedidosFuncionario>) sobre a collection
// `pedidos-pimenta`: filtro por dia/status e botão da próxima transição do
// funil pendente → validado → pago → em_transito ("pronto para retirada" na
// retirada) → finalizado. Acesso: funcionário (ou admin) — AreaInternaGuard + access da
// collection.
//
// Atalhos para o WhatsApp: copiar o link público do formulário e a chave
// Pix (omitida enquanto estiver "a confirmar").

import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { BotaoCopiar } from '@/components/BotaoCopiar'
import { PedidosFuncionario } from '@/components/PedidosFuncionario'
import { isAConfirmar } from '@/lib/design/placeholder'
import { ROTA_PUBLICA_PEDIDO, rotaFormularioPedido } from '@/lib/permissoes'
import { getConfiguracoes } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Pimenta em mel | Capão Grande',
  description: 'Acompanhe e gerencie os pedidos de pimenta em mel do Capão Grande.',
}

export default async function PimentaFuncionarioPage(): Promise<ReactElement> {
  const { chavePix } = await getConfiguracoes()
  return (
    <AreaInternaGuard area="funcionario">
      <article className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-4xl text-verde">Pedidos de pimenta em mel</h1>
          {/* Atalhos para a conversa do WhatsApp (pedidos-painel.md): link do
              formulário para o cliente e chave Pix para o pagamento. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <BotaoCopiar
              valor={ROTA_PUBLICA_PEDIDO.pimenta}
              rotulo="Copiar link do pedido de pimenta em mel"
            />
            {isAConfirmar(chavePix) ? null : (
              <BotaoCopiar valor={chavePix as string} rotulo="Copiar chave Pix" />
            )}
            <Link href={rotaFormularioPedido('pimenta', 'funcionario')!} className="btn-primario">
              Novo pedido
            </Link>
          </div>
        </div>
        <p className="font-sans text-paragrafo">
          Pedidos por unidade e em lote. Atualize o status conforme o atendimento avança no
          WhatsApp — na retirada, &ldquo;em trânsito&rdquo; significa pronto para retirada.
        </p>
        <PedidosFuncionario colecao="pedidos-pimenta" />
      </article>
    </AreaInternaGuard>
  )
}
