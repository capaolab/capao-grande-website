// Página /area-funcionario — dashboard da equipe
// (docs/features/dashboard-pedidos.md).
//
// Acessível apenas para usuários autenticados com papel `funcionario` (ou
// `admin`, para suporte) — ver components/AreaInternaGuard.tsx e
// src/collections/Users.ts. Lista todos os pedidos de delivery com filtro por
// status e gestão manual do status (funil pendente → validado → pago →
// em_transito → finalizado; validar exige o frete — pedidos-painel.md). O
// botão "Novo pedido" registra um pedido para um cliente do WhatsApp.
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
  title: 'Pedidos | Capão Grande',
  description: 'Acompanhe e gerencie os pedidos de delivery do Capão Grande.',
}

export default async function AreaFuncionarioPage(): Promise<ReactElement> {
  const { chavePix } = await getConfiguracoes()
  return (
    <AreaInternaGuard area="funcionario">
      <article className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-4xl text-verde">Pedidos de delivery</h1>
          <Link href={rotaFormularioPedido('delivery', 'funcionario')!} className="btn-primario">
            Novo pedido
          </Link>
        </div>
        <p className="font-sans text-paragrafo">
          Acompanhe a fila de pedidos e atualize o status conforme o atendimento
          avança no WhatsApp.
        </p>
        {/* Atalhos para a conversa do WhatsApp (pedidos-painel.md): link do
            formulário para o cliente e chave Pix para o pagamento. */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <BotaoCopiar valor={ROTA_PUBLICA_PEDIDO.delivery} rotulo="Copiar link do pedido de delivery" />
          {isAConfirmar(chavePix) ? null : (
            <BotaoCopiar valor={chavePix as string} rotulo="Copiar chave Pix" />
          )}
        </div>
        <PedidosFuncionario />
      </article>
    </AreaInternaGuard>
  )
}
