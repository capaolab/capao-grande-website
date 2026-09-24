// Página pública `/pedido` — formulário de pedidos de delivery
// (docs/features/delivery-pedidos.md, Tarefa 2) — Server Component assíncrono.
//
// ENTRADA POR LINK DIRETO (RN01): o funil começa no WhatsApp — o atendente
// (ou bot) envia este link na conversa. Por isso `/pedido` NÃO consta na
// navegação global (components/SiteHeader.tsx); a única referência interna
// fica no passo 1 da página `/delivery`.
//
// Estrutura:
//  - Carrega o cardápio ATIVO agrupado (getCardapioAgrupado) e as
//    configurações (getConfiguracoes) via camada de queries.
//  - Com CONTENT_SOURCE=static (staging estático, sem backend): NÃO renderiza
//    o formulário — o endpoint /api/submeter-pedido não existe no export
//    estático. Renderiza um aviso de indisponibilidade orientando a pedir
//    pelo WhatsApp (link wa.me quando configurado). Decisão deliberada.
//  - Senão: header (eyebrow "Delivery" + único <h1> "Monte seu pedido"),
//    aviso de horário de funcionamento (P8 — só com faixas válidas; nada é
//    fabricado, Req 19) e o <PedidoForm> (Client Component) com os itens
//    serializáveis do cardápio e os dígitos do WhatsApp para o retorno à
//    conversa na confirmação (omitido quando "a confirmar"/ausente).
//  - Cardápio vazio → mensagem de indisponibilidade com <Placeholder>
//    (RN11, Req 19): nunca itens fictícios.
//
// Acessibilidade (Req 20.2): exatamente UM <h1>; o formulário usa <h2>/<h3>
// abaixo dele, mantendo a hierarquia sequencial.
//
// Design: sem sombra; tokens do sistema de design (app/globals.css).
// Next 16 App Router: página é async (Server Component).

import type { ReactElement } from 'react'

import { HoursTable } from '@/components/HoursTable'
import { PedidoForm, type SecaoPedido } from '@/components/PedidoForm'
import { Placeholder } from '@/components/Placeholder'
import { isAConfirmar } from '@/lib/design/placeholder'
import { getCardapioAgrupado, getConfiguracoes } from '@/lib/queries'

export const metadata = {
  title: 'Monte seu pedido | Capão Grande',
  description:
    'Formulário de pedido de delivery: escolha os itens do cardápio, marque o ponto de entrega no mapa e receba o código do pedido para a conversa no WhatsApp.',
}

// Staging estático (CONTENT_SOURCE=static): sem backend, o endpoint
// /api/submeter-pedido não existe no export — ver scripts/build-static.mjs.
const CONTEUDO_ESTATICO = process.env.CONTENT_SOURCE === 'static'

export default async function PedidoPage(): Promise<ReactElement> {
  const [grupos, cfg] = await Promise.all([getCardapioAgrupado(), getConfiguracoes()])

  const whatsappPendente = isAConfirmar(cfg.whatsapp)
  const whatsappDigitos = whatsappPendente ? null : (cfg.whatsapp as string).replace(/\D/g, '')

  // Aviso de horário de funcionamento (P8): só entram faixas com `faixa` E
  // `horario` válidos; se nenhuma for válida, a seção é omitida sem fabricar
  // conteúdo (Req 19).
  const horariosValidos = (cfg.horarios ?? []).filter(
    (linha) => !isAConfirmar(linha.faixa) && !isAConfirmar(linha.horario),
  )

  // Itens do cardápio em forma serializável mínima para o Client Component.
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
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Delivery
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          Monte seu pedido
        </h1>
        <p className="font-sans text-[color:var(--color-paragrafo)]">
          Escolha os itens, marque o ponto de entrega no mapa e envie. Você recebe um código
          para acompanhar o pedido pela conversa no WhatsApp.
        </p>
      </header>

      {CONTEUDO_ESTATICO ? (
        // Sem backend neste ambiente: o formulário não pode submeter, então
        // não é renderizado — aviso + caminho do WhatsApp (decisão deliberada).
        <section
          aria-labelledby="pedido-indisponivel"
          className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6"
        >
          <h2
            id="pedido-indisponivel"
            className="font-serif text-2xl text-[color:var(--color-marrom)]"
          >
            Pedidos online indisponíveis neste ambiente
          </h2>
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            O formulário de pedidos não está disponível nesta versão do site. Faça seu
            pedido normalmente pela conversa no WhatsApp.
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
      ) : secoes.length === 0 ? (
        // Cardápio vazio/indisponível: nenhum item fictício (RN11, Req 19).
        <section aria-labelledby="pedido-cardapio-vazio" className="flex flex-col gap-3">
          <h2
            id="pedido-cardapio-vazio"
            className="font-serif text-2xl text-[color:var(--color-marrom)]"
          >
            Cardápio indisponível
          </h2>
          <Placeholder label="Cardápio a confirmar" as="p" />
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            Não foi possível carregar o cardápio agora. Tente novamente mais tarde ou peça
            pelo WhatsApp.
          </p>
        </section>
      ) : (
        <>
          {horariosValidos.length > 0 ? (
            <section aria-labelledby="pedido-horarios" className="flex flex-col gap-3">
              <h2
                id="pedido-horarios"
                className="font-serif text-2xl text-[color:var(--color-marrom)]"
              >
                Horário de funcionamento
              </h2>
              <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
                Pedidos enviados fora do horário são atendidos na próxima abertura.
              </p>
              <HoursTable horarios={horariosValidos} />
            </section>
          ) : null}

          <PedidoForm secoes={secoes} whatsappDigitos={whatsappDigitos} />
        </>
      )}
    </article>
  )
}
