// <PedidoCta> — chamada para o formulário de pedidos `/pedido` na home.
//
// Encurta o fluxo "home → /delivery → passo 1 → /pedido": o visitante chega
// ao formulário direto da landing. Revisa a RN01 de
// docs/features/delivery-pedidos.md — `/pedido` continua FORA da navegação
// global, mas ganha esta entrada na home além do link enviado no WhatsApp.
//
// Layout: faixa em papel com borda do sistema (sem sombra, Req 18.3);
// aquarela decorativa à esquerda a partir de `sm`, texto e ações à direita.
// Ação principal em `btn-primario` ("Fazer meu pedido", com seta decorativa)
// e secundária em link de texto para `/delivery` (pagamento e taxas).
//
// Acessibilidade: seção rotulada pelo próprio <h2> (a home tem um único
// <h1> no hero); a seta é `aria-hidden`, então o nome acessível do link é
// só o texto.

import Link from 'next/link'
import type { ReactElement } from 'react'

import { Watercolor } from './Watercolor'

/** Seta decorativa "→" usada nos links de ação para o formulário. */
export function SetaAcao(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  )
}

export function PedidoCta(): ReactElement {
  return (
    <section
      aria-labelledby="pedido-cta-heading"
      className="borda-sistema flex flex-col gap-6 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6 sm:flex-row sm:items-center md:p-8"
    >
      <Watercolor
        name="molho"
        width={120}
        height={120}
        className="hidden h-auto w-28 shrink-0 sm:block"
      />

      <div className="flex flex-1 flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Delivery
        </p>
        <h2
          id="pedido-cta-heading"
          className="font-serif text-2xl leading-tight text-[color:var(--color-marrom)] md:text-3xl"
        >
          Peça sua pizza online
        </h2>
        <p className="text-[color:var(--color-paragrafo)]">
          Escolha os itens do cardápio, marque o local de entrega e envie. O valor
          final, com frete, é confirmado pelo WhatsApp.
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/pedido" className="btn-primario group gap-2 text-lg">
            Fazer meu pedido
            <SetaAcao />
          </Link>
          <Link
            href="/delivery"
            className="font-sans text-[color:var(--color-marrom)] underline underline-offset-4 hover-verde transition-colors"
          >
            Como funciona o delivery
          </Link>
        </div>
      </div>
    </section>
  )
}

export default PedidoCta
