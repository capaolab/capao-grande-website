'use client'

// <PedidosCliente> — dashboard do cliente (docs/features/dashboard-pedidos.md).
//
// Lista os pedidos do PRÓPRIO cliente: a REST API já filtra pelo telefone da
// conta (access da collection `pedidos`). O status vem em badge colorido com
// rótulo amigável ("Recebido", "Pagamento confirmado", ...) — leitura rápida
// sem treinamento.
//
// Visão inicial: pedidos do DIA (usePedidosFiltrados). <PedidosFiltro> permite
// escolher outra data ou ver todos (com paginação). Em telas largas os cards
// formam um grid de 2–3 colunas, aproveitando o layout full width do painel.
//
// `colecao` (pimenta-em-mel.md): a mesma lista serve aos pedidos de delivery
// (/area-cliente) e aos de pimenta em mel (/area-cliente/pimenta), com os
// rótulos de retirada quando for o caso.
//
// Estados: carregando → lista | vazio (com link para a página do produto) | erro
// (offline/preview estático/sessão expirada — mensagem sem quebrar a página).

import Link from 'next/link'
import type { ReactElement } from 'react'

import { PedidosFiltro } from '@/components/PedidosFiltro'
import { StatusPedidoBadge } from '@/components/StatusPedidoBadge'
import { usePedidosFiltrados } from '@/components/use-pedidos-filtrados'
import { renderPreco } from '@/lib/cardapio'
import { formatarDataHora, type ColecaoPedidos } from '@/lib/pedidos-api'
import { ROTULO_MODALIDADE } from '@/lib/pimenta'

// Link do estado vazio, por collection.
const LINK_VAZIO: Record<ColecaoPedidos, { href: string; rotulo: string }> = {
  pedidos: { href: '/delivery', rotulo: 'Como pedir delivery' },
  'pedidos-pimenta': { href: '/pimenta-em-mel', rotulo: 'Conhecer a pimenta em mel' },
}

export interface PedidosClienteProps {
  /** Collection de pedidos listada (padrão: delivery). */
  colecao?: ColecaoPedidos
}

export function PedidosCliente({ colecao = 'pedidos' }: PedidosClienteProps = {}): ReactElement {
  const {
    estado,
    modo,
    dia,
    pagina,
    escolherDia,
    mostrarTodos,
    setPagina,
  } = usePedidosFiltrados(undefined, colecao)

  if (estado.tipo === 'erro') {
    return (
      <p role="alert" className="py-6 font-sans text-paragrafo">
        Não foi possível carregar seus pedidos agora. Tente novamente mais tarde.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PedidosFiltro
        modo={modo}
        dia={dia}
        pagina={pagina}
        totalPaginas={estado.tipo === 'pronto' ? estado.totalPaginas : 1}
        totalDocs={estado.tipo === 'pronto' ? estado.totalDocs : 0}
        onEscolherDia={escolherDia}
        onMostrarTodos={mostrarTodos}
        onPagina={setPagina}
      />

      {estado.tipo === 'carregando' ? (
        <p role="status" className="py-6 font-sans text-paragrafo">
          Carregando seus pedidos…
        </p>
      ) : estado.pedidos.length === 0 ? (
        <div className="flex flex-col gap-2 py-6">
          <p className="font-sans text-paragrafo">
            {modo === 'dia'
              ? 'Nenhum pedido neste dia. Escolha outra data ou veja todos os pedidos.'
              : 'Você ainda não tem pedidos por aqui. Pedidos feitos com o telefone (WhatsApp) da sua conta aparecem automaticamente.'}
          </p>
          <Link
            href={LINK_VAZIO[colecao].href}
            className="hover-verde w-fit font-sans text-marrom underline transition-colors"
          >
            {LINK_VAZIO[colecao].rotulo}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {estado.pedidos.map((pedido) => (
            <li
              key={pedido.id}
              className="borda-sistema bg-papel flex flex-col gap-3 rounded-lg p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-serif text-xl text-verde">#{pedido.codigo}</span>
                <StatusPedidoBadge
                  status={pedido.status}
                  variant="cliente"
                  modalidade={pedido.modalidade}
                />
              </div>

              <p className="font-sans text-sm text-paragrafo">
                {formatarDataHora(pedido.createdAt)}
                {pedido.modalidade ? <> · {ROTULO_MODALIDADE[pedido.modalidade]}</> : null}
              </p>

              <ul className="flex flex-col gap-1 font-sans text-marrom">
                {pedido.itens.map((item) => (
                  <li key={item.id ?? item.nomeSnapshot}>
                    {item.quantidade}× {item.nomeSnapshot ?? 'item'}
                  </li>
                ))}
              </ul>

              {pedido.subtotal != null ? (
                <p className="font-sans text-sm text-paragrafo">
                  Produtos:{' '}
                  <strong className="text-marrom">{renderPreco(pedido.subtotal)}</strong>{' '}
                  {pedido.modalidade === 'retirada'
                    ? '(o valor final é confirmado no WhatsApp)'
                    : '(o valor final, com frete, é confirmado no WhatsApp)'}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PedidosCliente
