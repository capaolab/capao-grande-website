// <CardapioDeliveryAside> — aside da aba Delivery do cliente
// (docs/features/pedidos-painel.md): os produtos disponíveis para delivery
// (global `cardapio-delivery`), com preço, e o botão para o formulário.
// Server Component: recebe as seções já filtradas (getCardapioDelivery).
//
// Pizzas não têm preço próprio (preço pelo tamanho): o preço aparece na
// seção de tamanhos, como no cardápio público.

import Link from 'next/link'
import type { ReactElement } from 'react'

import { renderPreco, type SecaoAgrupada } from '@/lib/cardapio'
import type { Cardapio } from '@/src/payload-types'

export function CardapioDeliveryAside({
  secoes,
  hrefPedido,
}: {
  secoes: SecaoAgrupada<Cardapio>[]
  hrefPedido: string
}): ReactElement {
  return (
    <aside
      aria-labelledby="delivery-produtos-titulo"
      className="borda-sistema bg-papel flex flex-col gap-4 rounded-lg p-4 lg:sticky lg:top-24"
    >
      <h2 id="delivery-produtos-titulo" className="font-serif text-2xl text-marrom">
        Disponível no delivery
      </h2>

      <Link href={hrefPedido} className="btn-primario w-full">
        Fazer pedido
      </Link>

      {secoes.length === 0 ? (
        <p className="font-sans text-sm text-paragrafo">
          Nenhum produto disponível para delivery no momento.
        </p>
      ) : (
        secoes.map((secao) => (
          <section key={secao.secao} className="flex flex-col gap-1">
            <h3 className="font-sans text-sm uppercase tracking-[0.12em] text-verde">
              {secao.secao}
            </h3>
            <ul className="flex flex-col gap-1">
              {secao.itens.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 font-sans text-sm">
                  <span className="text-marrom">{item.nome}</span>
                  <span className="shrink-0 text-paragrafo">
                    {item.preco != null ? renderPreco(item.preco) : 'pelo tamanho'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </aside>
  )
}

export default CardapioDeliveryAside
