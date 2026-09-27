// Página pública `/pimenta-em-mel/pedido` — entrada do formulário de pimenta
// em mel (docs/features/pimenta-em-mel.md e docs/features/pedidos-painel.md).
//
// Mesmo desenho de `/pedido`: a URL dos CTAs continua a mesma, mas o
// formulário vive no painel — <RedirecionarPedido> leva ao login
// (`?next=/pimenta-em-mel/pedido`) ou a `/area-cliente/pimenta/novo`
// (cliente) / `/area-funcionario/pimenta/novo` (equipe). No preview estático
// (sem backend), aviso de indisponibilidade com o WhatsApp.
//
// Acessibilidade: exatamente UM <h1>.

import type { ReactElement } from 'react'

import { Placeholder } from '@/components/Placeholder'
import { RedirecionarPedido } from '@/components/RedirecionarPedido'
import { isAConfirmar } from '@/lib/design/placeholder'
import { getConfiguracoes } from '@/lib/queries'

export const metadata = {
  title: 'Pedido de pimenta em mel | Capão Grande',
  description:
    'Peça pimenta em mel por unidade ou em lote: escolha as quantidades, entrega ou retirada, e receba o código do pedido para a conversa no WhatsApp.',
}

const CONTEUDO_ESTATICO = process.env.CONTENT_SOURCE === 'static'

export default async function PedidoPimentaPage(): Promise<ReactElement> {
  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Pimenta em mel
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          Faça seu pedido
        </h1>
      </header>

      {CONTEUDO_ESTATICO ? <PedidoIndisponivel /> : <RedirecionarPedido tipo="pimenta" />}
    </article>
  )
}

/** Aviso do preview estático: sem backend, o pedido é pelo WhatsApp. */
async function PedidoIndisponivel(): Promise<ReactElement> {
  const cfg = await getConfiguracoes()
  const whatsappDigitos = isAConfirmar(cfg.whatsapp)
    ? null
    : (cfg.whatsapp as string).replace(/\D/g, '')

  return (
    <section
      aria-labelledby="pimenta-indisponivel"
      className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6"
    >
      <h2 id="pimenta-indisponivel" className="font-serif text-2xl text-[color:var(--color-marrom)]">
        Pedidos online indisponíveis neste ambiente
      </h2>
      <p className="font-sans text-[color:var(--color-paragrafo)]">
        O formulário não está disponível nesta versão do site. Faça seu pedido pela conversa
        no WhatsApp.
      </p>
      {whatsappDigitos ? (
        <a
          href={`https://wa.me/${whatsappDigitos}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Pedir pelo WhatsApp: ${cfg.whatsapp as string}`}
          className="borda-sistema hover-verde inline-flex w-fit items-center rounded-[var(--radius)] px-4 py-2 font-sans text-[color:var(--color-marrom)] transition-colors"
        >
          {cfg.whatsapp as string}
        </a>
      ) : (
        <Placeholder label="WhatsApp a confirmar" as="p" />
      )}
    </section>
  )
}
