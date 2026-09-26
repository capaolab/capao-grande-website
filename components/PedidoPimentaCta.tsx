// <PedidoPimentaCta> — chamada para o formulário de pedidos de pimenta em mel
// (`/pimenta-em-mel/pedido`) na home, no mesmo modelo do <PedidoCta> do
// delivery (docs/features/pimenta-em-mel.md).
//
// Layout: faixa em papel com borda do sistema (sem sombra, Req 18.3);
// aquarela decorativa à esquerda a partir de `sm`, texto e ações à direita.
// Ação principal em `btn-primario` (formulário, login obrigatório) e
// secundária em link de texto para a página do produto (apresentações e
// preços).
//
// Acessibilidade: seção rotulada pelo próprio <h2> (a home tem um único
// <h1> no hero); a seta é `aria-hidden`.

import Link from 'next/link'
import type { ReactElement } from 'react'

import { SetaAcao } from './PedidoCta'
import { Watercolor } from './Watercolor'

export function PedidoPimentaCta(): ReactElement {
  return (
    <section
      aria-labelledby="pedido-pimenta-cta-heading"
      className="borda-sistema flex flex-col gap-6 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6 sm:flex-row sm:items-center md:p-8"
    >
      <Watercolor
        name="mel"
        width={159}
        height={187}
        className="hidden h-auto w-28 shrink-0 sm:block"
      />

      <div className="flex flex-1 flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Produção da casa
        </p>
        <h2
          id="pedido-pimenta-cta-heading"
          className="font-serif text-2xl leading-tight text-[color:var(--color-marrom)] md:text-3xl"
        >
          Peça sua pimenta em mel
        </h2>
        <p className="text-[color:var(--color-paragrafo)]">
          Por unidade para levar para casa ou em lote para restaurantes. Escolha as
          apresentações, entrega ou retirada, e combine o valor final pelo WhatsApp.
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/pimenta-em-mel/pedido" className="btn-primario group gap-2 text-lg">
            Pedir pimenta em mel
            <SetaAcao />
          </Link>
          <Link
            href="/pimenta-em-mel"
            className="font-sans text-[color:var(--color-marrom)] underline underline-offset-4 hover-verde transition-colors"
          >
            Conheça a pimenta em mel
          </Link>
        </div>
      </div>
    </section>
  )
}

export default PedidoPimentaCta
