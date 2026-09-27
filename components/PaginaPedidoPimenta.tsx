// Conteúdo da página do formulário de pimenta em mel no painel
// (docs/features/pedidos-painel.md) — Server Component assíncrono usado por
// /area-cliente/pimenta/novo (modo cliente) e
// /area-funcionario/pimenta/novo (modo funcionário). Antes vivia em
// `/pimenta-em-mel/pedido`, que agora só redireciona para cá.
//
// Catálogo vazio ⇒ <Placeholder>, nunca produtos fictícios (Req 19).
// Acessibilidade: exatamente UM <h1>; o formulário usa <h2>/<h3>.
// O controle de acesso fica na página (AreaInternaGuard da área).

import Link from 'next/link'
import type { ReactElement } from 'react'

import { PedidoPimentaForm, type ProdutoPimentaForm } from '@/components/PedidoPimentaForm'
import { Placeholder } from '@/components/Placeholder'
import { isAConfirmar } from '@/lib/design/placeholder'
import { rotaListaPedidos } from '@/lib/permissoes'
import { getConfiguracoes, getProdutosPimenta } from '@/lib/queries'

export async function PaginaPedidoPimenta({
  modo,
}: {
  modo: 'cliente' | 'funcionario'
}): Promise<ReactElement> {
  const [docs, cfg] = await Promise.all([getProdutosPimenta(), getConfiguracoes()])

  const whatsappDigitos = isAConfirmar(cfg.whatsapp)
    ? null
    : (cfg.whatsapp as string).replace(/\D/g, '')

  // Forma serializável mínima para o Client Component.
  const produtos: ProdutoPimentaForm[] = docs.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    volume: produto.volume ?? null,
    descricao: produto.descricao ?? null,
    preco: produto.preco,
    precoLote: produto.precoLote ?? null,
    loteMinimo: produto.loteMinimo ?? null,
  }))

  return (
    <article className="mx-auto flex w-full max-w-conteudo flex-col gap-10">
      <header className="flex flex-col gap-2">
        {/* Volta para a lista de pedidos da mesma visão (cliente/equipe). */}
        <Link
          href={rotaListaPedidos('pimenta', modo)}
          className="hover-verde mb-4 w-fit font-sans text-sm text-[color:var(--color-marrom)] underline underline-offset-4 transition-colors"
        >
          <span aria-hidden="true">←</span> Voltar para os pedidos
        </Link>
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Pimenta em mel
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          {modo === 'funcionario' ? 'Novo pedido de pimenta em mel' : 'Faça seu pedido'}
        </h1>
        <p className="font-sans text-[color:var(--color-paragrafo)]">
          {modo === 'funcionario'
            ? 'Registre o pedido de um cliente que pediu pela conversa no WhatsApp: busque o cliente ou cadastre os dados dele, escolha as quantidades e a forma de recebimento.'
            : 'Escolha as quantidades, diga se prefere entrega ou retirada e envie. Você recebe um código para confirmar o pedido pela conversa no WhatsApp.'}
        </p>
      </header>

      {produtos.length === 0 ? (
        <section aria-labelledby="pimenta-sem-produtos" className="flex flex-col gap-3">
          <h2
            id="pimenta-sem-produtos"
            className="font-serif text-2xl text-[color:var(--color-marrom)]"
          >
            Produtos indisponíveis
          </h2>
          <Placeholder label="apresentações e preços a confirmar" as="p" />
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            Ainda não há produtos disponíveis para pedido online. Fale com a gente pelo
            WhatsApp.
          </p>
        </section>
      ) : (
        <PedidoPimentaForm produtos={produtos} whatsappDigitos={whatsappDigitos} modo={modo} />
      )}
    </article>
  )
}

export default PaginaPedidoPimenta
