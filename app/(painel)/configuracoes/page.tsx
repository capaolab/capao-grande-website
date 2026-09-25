// Página /configuracoes — dados da conta do usuário autenticado.
//
// Acessível ao cliente (e ao admin, via podeAcessarArea). O funcionário NÃO
// tem configurações: a conta dele é criada e habilitada pelo admin no Payload
// — o guard o redireciona para /area-funcionario.
// E-mail e papel são somente leitura; nome, sobrenome e telefone (WhatsApp)
// podem ser editados — o telefone é o vínculo com os pedidos de delivery
// (docs/features/dashboard-pedidos.md).

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { ConfiguracoesUsuario } from '@/components/ConfiguracoesUsuario'

export const metadata: Metadata = {
  title: 'Configurações | Capão Grande',
  description: 'Veja e atualize os dados da sua conta do Capão Grande.',
}

export default function ConfiguracoesPage(): ReactElement {
  return (
    <AreaInternaGuard area="cliente">
      <article className="mx-auto flex w-full max-w-[var(--spacing-leitura)] flex-col gap-4">
        <h1 className="font-serif text-4xl text-verde">Configurações</h1>
        <p className="font-sans text-paragrafo">
          Veja e atualize os dados da sua conta.
        </p>
        <ConfiguracoesUsuario />
      </article>
    </AreaInternaGuard>
  )
}
