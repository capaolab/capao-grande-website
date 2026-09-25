// Página /area-funcionario/caixa — caixa da pizzaria
// (docs/features/caixa-historico.md).
//
// Acessível a `funcionario` (e `admin`, para suporte) — AreaInternaGuard.
// Server Component: carrega o cardápio ATIVO agrupado (mesma fonte do
// formulário de delivery) e entrega ao <CaixaForm> em forma serializável.

import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { CaixaForm } from '@/components/CaixaForm'
import type { SecaoPedido } from '@/components/SeletorItensCardapio'
import { getCardapioAgrupado } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Caixa | Capão Grande',
  description: 'Registre a conta das mesas, divida o pagamento e confirme o que já foi pago.',
}

export default async function CaixaPage(): Promise<ReactElement> {
  const grupos = await getCardapioAgrupado()

  const secoes: SecaoPedido[] = grupos.map((grupo) => ({
    secao: grupo.secao,
    itens: grupo.itens.map((item) => ({
      id: item.id,
      nome: item.nome,
      detalhe: item.detalhe ?? null,
      preco: item.preco ?? null,
    })),
  }))

  return (
    <AreaInternaGuard area="funcionario">
      <article className="mx-auto flex w-full max-w-conteudo flex-col gap-4">
        <h1 className="font-serif text-4xl text-verde">Caixa</h1>
        <p className="font-sans text-paragrafo">
          Lance os itens da mesa, feche a conta e registre o pagamento de cada pessoa.
        </p>
        <CaixaForm secoes={secoes} />
      </article>
    </AreaInternaGuard>
  )
}
