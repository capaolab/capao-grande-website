// Conteúdo da página do formulário de delivery no painel
// (docs/features/pedidos-painel.md) — Server Component assíncrono usado por
// /area-cliente/delivery/novo (modo cliente) e
// /area-funcionario/delivery/novo (modo funcionário). Antes vivia em
// `/pedido`, que agora só redireciona para cá.
//
// Estrutura (delivery-pedidos.md, Tarefa 2):
//  - Carrega o cardápio DO DELIVERY (getCardapioDelivery: só itens liberados
//    pelo admin no global `cardapio-delivery`) e as configurações.
//  - Header com o único <h1> da página, aviso de horário (P8 — só faixas
//    válidas; nada fabricado, Req 19) e o <PedidoForm>.
//  - Cardápio vazio → mensagem de indisponibilidade com <Placeholder>
//    (RN11, Req 19): nunca itens fictícios.
//
// O controle de acesso fica na página (AreaInternaGuard da área).

import Link from 'next/link'
import type { ReactElement } from 'react'

import { HoursTable } from '@/components/HoursTable'
import { PedidoForm, type SecaoPedido } from '@/components/PedidoForm'
import { Placeholder } from '@/components/Placeholder'
import { isAConfirmar } from '@/lib/design/placeholder'
import { rotaListaPedidos } from '@/lib/permissoes'
import { getCardapioDelivery, getConfiguracoes } from '@/lib/queries'

export async function PaginaPedidoDelivery({
  modo,
}: {
  modo: 'cliente' | 'funcionario'
}): Promise<ReactElement> {
  const [grupos, cfg] = await Promise.all([getCardapioDelivery(), getConfiguracoes()])

  const whatsappDigitos = isAConfirmar(cfg.whatsapp)
    ? null
    : (cfg.whatsapp as string).replace(/\D/g, '')

  const horariosValidos = (cfg.horarios ?? []).filter(
    (linha) => !isAConfirmar(linha.faixa) && !isAConfirmar(linha.horario),
  )

  // Itens do cardápio em forma serializável mínima para o Client Component.
  const secoes: SecaoPedido[] = grupos.map((grupo) => ({
    secao: grupo.secao,
    tipo: grupo.tipo,
    itens: grupo.itens.map((item) => ({
      id: item.id,
      nome: item.nome,
      detalhe: item.detalhe ?? null,
      preco: item.preco ?? null,
    })),
  }))

  return (
    <article className="mx-auto flex w-full max-w-conteudo flex-col gap-10">
      <header className="flex flex-col gap-2">
        {/* Volta para a lista de pedidos da mesma visão (cliente/equipe). */}
        <Link
          href={rotaListaPedidos('delivery', modo)}
          className="hover-verde mb-4 w-fit font-sans text-sm text-[color:var(--color-marrom)] underline underline-offset-4 transition-colors"
        >
          <span aria-hidden="true">←</span> Voltar para os pedidos
        </Link>
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Delivery
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          {modo === 'funcionario' ? 'Novo pedido de delivery' : 'Monte seu pedido'}
        </h1>
        <p className="font-sans text-[color:var(--color-paragrafo)]">
          {modo === 'funcionario'
            ? 'Registre o pedido de um cliente que pediu pela conversa no WhatsApp: busque o cliente ou cadastre os dados dele, escolha os itens e marque o ponto de entrega.'
            : 'Escolha os itens, marque o ponto de entrega no mapa e envie. Você recebe um código para acompanhar o pedido pela conversa no WhatsApp.'}
        </p>
      </header>

      {secoes.length === 0 ? (
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

          <PedidoForm secoes={secoes} whatsappDigitos={whatsappDigitos} modo={modo} />
        </>
      )}
    </article>
  )
}

export default PaginaPedidoDelivery
