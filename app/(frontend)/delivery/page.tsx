// Página pública `/delivery` (task 12.6) — Server Component assíncrono.
//
// Estrutura (Requisitos 15.1–15.4, 19.1, 19.2, 20.2):
//  - Lê o Global_Configuracoes via `getConfiguracoes()` (lib/queries.ts).
//  - Monta um <StepList> com EXATAMENTE 3 passos (Req 15.1):
//      1. Pedido por WhatsApp — link wa.me/<dígitos> com nome acessível, ou
//         <Placeholder> quando `whatsapp` está ausente/"a confirmar".
//      2. Pagamento por Pix com QR — chave Pix (ou <Placeholder>) + imagem do
//         QR via <CmsImage> (que exibe placeholder listrado quando `qrPix`
//         está ausente) (Req 15.2, 15.3).
//      3. Taxa por distância — lista das `taxasEntrega` (distância → valor,
//         ambos texto). Array vazio/ausente ⇒ <Placeholder>; cada campo
//         ausente/"a confirmar" ⇒ <Placeholder> na célula (Req 15.3, 15.4).
//  - Exibe também o `avisoRetirada` do global (ou <Placeholder> quando
//    ausente) numa seção à parte (Req 15.4).
//
// A página NUNCA fabrica dados (Req 19): chave Pix, WhatsApp, QR e taxas só
// aparecem quando vêm do CMS; ausentes/"a confirmar" viram <Placeholder> cinza.
//
// Acessibilidade (Req 20.2): exatamente UM <h1>. O <StepList> usa <ol> com um
// <h3> por passo; a seção de aviso usa <h2>, mantendo a hierarquia sequencial.
//
// Design: sem sombra; tokens do sistema de design (app/globals.css). Next 16
// App Router: página é async (Server Component).

import type { ReactElement } from 'react'

import { CmsImage } from '@/components/CmsImage'
import { Placeholder } from '@/components/Placeholder'
import { StepList, type Step } from '@/components/StepList'
import { isAConfirmar } from '@/lib/design/placeholder'
import { getConfiguracoes } from '@/lib/queries'

export const metadata = {
  title: 'Peça e receba | Capão Grande',
  description:
    'Como pedir por delivery: pedido pelo WhatsApp, pagamento por Pix e taxa por distância.',
}

/** Conteúdo extra do passo 2: chave Pix + QR (Req 15.2, 15.3). */
function PagamentoPix({
  chavePix,
  qrPix,
}: {
  chavePix?: string | null
  qrPix: Awaited<ReturnType<typeof getConfiguracoes>>['qrPix']
}): ReactElement {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[color:var(--color-marrom)]">Chave Pix</span>
        {isAConfirmar(chavePix) ? (
          <Placeholder label="chave Pix a confirmar" />
        ) : (
          // `chavePix` é string não pendente aqui (isAConfirmar cobriu null/vazio).
          <span className="font-sans break-all text-[color:var(--color-paragrafo)]">
            {chavePix as string}
          </span>
        )}
      </div>

      {/* QR do Pix: <CmsImage> já mostra um placeholder listrado com legenda
          quando `qrPix` está ausente/não populado (Req 15.2, 15.4). */}
      <CmsImage
        media={qrPix}
        square
        width={160}
        className="w-40 shrink-0"
        placeholderLabel="QR Pix a confirmar"
      />
    </div>
  )
}

/** Conteúdo extra do passo 3: taxas por distância (Req 15.3, 15.4). */
function TaxasEntrega({
  taxas,
}: {
  taxas: Awaited<ReturnType<typeof getConfiguracoes>>['taxasEntrega']
}): ReactElement {
  // Array vazio/ausente ⇒ nenhuma taxa fabricada (Req 15.4, 19.1).
  if (taxas == null || taxas.length === 0) {
    return <Placeholder label="taxas a confirmar" as="p" />
  }

  return (
    <dl className="borda-sistema flex flex-col rounded-[var(--radius)]">
      {taxas.map((taxa, index) => (
        <div
          key={taxa.id ?? index}
          className="flex items-baseline justify-between gap-4 border-b border-[color:var(--color-borda-clara)] px-4 py-2 last:border-b-0"
        >
          <dt className="font-sans text-[color:var(--color-marrom)]">
            {isAConfirmar(taxa.distancia) ? (
              <Placeholder label="distância a confirmar" />
            ) : (
              (taxa.distancia as string)
            )}
          </dt>
          <dd className="font-sans text-right text-[color:var(--color-paragrafo)]">
            {isAConfirmar(taxa.valor) ? (
              <Placeholder label="valor a confirmar" />
            ) : (
              (taxa.valor as string)
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default async function DeliveryPage(): Promise<ReactElement> {
  const cfg = await getConfiguracoes()

  // Passo 1 — WhatsApp: link wa.me/<dígitos> ou <Placeholder> (Req 15.1, 15.4).
  const whatsappPendente = isAConfirmar(cfg.whatsapp)
  const passoWhatsApp: Step = {
    titulo: 'Peça pelo WhatsApp',
    descricao: 'Monte seu pedido e envie a mensagem pelo WhatsApp da pizzaria.',
    watercolor: 'molho',
    children: whatsappPendente ? (
      <Placeholder label="WhatsApp a confirmar" as="p" />
    ) : (
      <a
        className="borda-sistema hover-verde inline-flex w-fit items-center rounded-[var(--radius)] px-4 py-2 font-sans text-[color:var(--color-marrom)] transition-colors"
        href={`https://wa.me/${(cfg.whatsapp as string).replace(/\D/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir conversa no WhatsApp: ${cfg.whatsapp as string}`}
      >
        {cfg.whatsapp as string}
      </a>
    ),
  }

  // Passo 2 — Pix com QR (Req 15.2, 15.3).
  const passoPix: Step = {
    titulo: 'Pague por Pix',
    descricao: 'Faça o pagamento por Pix usando a chave ou lendo o QR code abaixo.',
    children: <PagamentoPix chavePix={cfg.chavePix} qrPix={cfg.qrPix} />,
  }

  // Passo 3 — Taxa por distância (Req 15.3, 15.4).
  const passoTaxa: Step = {
    titulo: 'Taxa por distância',
    descricao: 'A taxa de entrega varia conforme a distância até o seu endereço.',
    children: <TaxasEntrega taxas={cfg.taxasEntrega} />,
  }

  const steps: Step[] = [passoWhatsApp, passoPix, passoTaxa]

  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Delivery
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          Peça e receba
        </h1>
        <p className="font-sans text-[color:var(--color-paragrafo)]">
          Em três passos: peça pelo WhatsApp, pague por Pix e receba em casa.
        </p>
      </header>

      {/* 3 passos do delivery (Req 15.1) ------------------------------------- */}
      {/* Seção com <h2> antes dos passos: os passos usam <h3>, então o <h2>
          mantém a hierarquia sequencial h1 -> h2 -> h3 (Req 20.2). */}
      <section className="flex flex-col gap-4" aria-labelledby="delivery-passos">
        <h2
          id="delivery-passos"
          className="font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Como pedir
        </h2>
        <StepList steps={steps} />
      </section>

      {/* Retirada / aviso (Req 15.4) ----------------------------------------- */}
      <section className="flex flex-col gap-2" aria-labelledby="delivery-retirada">
        <h2
          id="delivery-retirada"
          className="font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Retirada
        </h2>
        {isAConfirmar(cfg.avisoRetirada) ? (
          <Placeholder label="aviso de retirada a confirmar" as="p" />
        ) : (
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            {cfg.avisoRetirada as string}
          </p>
        )}
      </section>
    </article>
  )
}
