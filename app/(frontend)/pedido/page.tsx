// Página pública `/pedido` — entrada do formulário de delivery
// (docs/features/delivery-pedidos.md e docs/features/pedidos-painel.md).
//
// A URL continua a mesma para os CTAs (home, /delivery) e para o link
// enviado na conversa do WhatsApp, mas o formulário vive no painel:
// <RedirecionarPedido> manda o visitante sem sessão para
// `/login?next=/pedido` e, com sessão, para `/area-cliente/delivery/novo`
// (cliente) ou `/area-funcionario/delivery/novo` (equipe). `/pedido`
// continua FORA da navegação global.
//
// Preview estático (CONTENT_SOURCE=static): sem backend não há login nem
// painel — aviso de indisponibilidade orientando a pedir pelo WhatsApp.
//
// Acessibilidade (Req 20.2): exatamente UM <h1>.

import type { ReactElement } from 'react'

import { Placeholder } from '@/components/Placeholder'
import { RedirecionarPedido } from '@/components/RedirecionarPedido'
import { isAConfirmar } from '@/lib/design/placeholder'
import { getConfiguracoes } from '@/lib/queries'

export const metadata = {
  title: 'Monte seu pedido | Capão Grande',
  description:
    'Formulário de pedido de delivery: escolha os itens do cardápio, marque o ponto de entrega no mapa e receba o código do pedido para a conversa no WhatsApp.',
}

const CONTEUDO_ESTATICO = process.env.CONTENT_SOURCE === 'static'

export default async function PedidoPage(): Promise<ReactElement> {
  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Delivery
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          Monte seu pedido
        </h1>
      </header>

      {CONTEUDO_ESTATICO ? <PedidoIndisponivel /> : <RedirecionarPedido tipo="delivery" />}
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
      aria-labelledby="pedido-indisponivel"
      className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6"
    >
      <h2 id="pedido-indisponivel" className="font-serif text-2xl text-[color:var(--color-marrom)]">
        Pedidos online indisponíveis neste ambiente
      </h2>
      <p className="font-sans text-[color:var(--color-paragrafo)]">
        O formulário de pedidos não está disponível nesta versão do site. Faça seu pedido
        normalmente pela conversa no WhatsApp.
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
