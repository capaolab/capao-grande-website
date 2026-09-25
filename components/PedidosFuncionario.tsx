'use client'

// <PedidosFuncionario> — dashboard da equipe (docs/features/dashboard-pedidos.md).
//
// Lista TODOS os pedidos (o access da collection libera leitura total para
// funcionário/admin) e faz GESTÃO MANUAL do status: cada card mostra o botão
// da próxima transição do funil (pendente → pago → em_transito → finalizado),
// que faz PATCH /api/pedidos/:id com atualização otimista (reverte e avisa
// com role="alert" em caso de erro).
//
// Visão inicial: pedidos do DIA (usePedidosFiltrados), com filtro por status
// em chips com contagem — o dia inteiro está em memória, então o filtro é
// client-side e as contagens refletem a fila do dia. No modo "Todos os
// pedidos" (paginado no servidor) os chips filtram no SERVIDOR (parâmetro
// `status` do hook) e as contagens são omitidas — a paginação vem da API.
//
// Estados de carregamento/erro seguem o padrão de <PedidosCliente>.
//
// `colecao` (pimenta-em-mel.md, RN-P05): a mesma tela serve aos pedidos de
// delivery (`pedidos`, padrão) e aos de pimenta em mel (`pedidos-pimenta`,
// em /area-funcionario/pimenta) — mesmo funil de status. Nos de pimenta o
// card mostra estabelecimento e modalidade; na retirada, o rótulo da ação de
// `em_transito` vira "Pronto para retirada".

import { useMemo, useState, type ReactElement } from 'react'

import { PedidosFiltro } from '@/components/PedidosFiltro'
import { StatusPedidoBadge } from '@/components/StatusPedidoBadge'
import { usePedidosFiltrados } from '@/components/use-pedidos-filtrados'
import { renderPreco } from '@/lib/cardapio'
import { formatarDataHora, type ColecaoPedidos, type PedidoResumo } from '@/lib/pedidos-api'
import { ROTULO_MODALIDADE } from '@/lib/pimenta'
import {
  ehStatusPedido,
  proximoStatus,
  ROTULO_STATUS,
  STATUS_PEDIDO,
  type StatusPedido,
} from '@/lib/status-pedido'

/** Filtro ativo: 'todos' ou um dos status canônicos. */
type Filtro = 'todos' | StatusPedido

export interface PedidosFuncionarioProps {
  /** Collection de pedidos gerenciada (padrão: delivery). */
  colecao?: ColecaoPedidos
}

export function PedidosFuncionario({
  colecao = 'pedidos',
}: PedidosFuncionarioProps = {}): ReactElement {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  // Ids com PATCH em andamento: desabilita o botão do card.
  const [atualizando, setAtualizando] = useState<Set<number>>(new Set())
  const [erroAtualizacao, setErroAtualizacao] = useState<string | null>(null)

  // No modo 'todos' o status vai no query string (filtro server-side); no
  // modo 'dia' o hook ignora o parâmetro e o filtro é client-side.
  const {
    estado,
    modo,
    dia,
    pagina,
    escolherDia,
    mostrarTodos,
    setPagina,
    atualizarLocal,
  } = usePedidosFiltrados(filtro === 'todos' ? undefined : filtro, colecao)

  const pedidos = useMemo(
    () => (estado.tipo === 'pronto' ? estado.pedidos : []),
    [estado],
  )

  // Contagem por status para os chips — só exibida no modo 'dia', onde o
  // conjunto completo do dia está carregado.
  const contagem = useMemo(() => {
    const mapa = new Map<StatusPedido, number>()
    for (const status of STATUS_PEDIDO) mapa.set(status, 0)
    for (const pedido of pedidos) {
      if (ehStatusPedido(pedido.status)) {
        mapa.set(pedido.status, (mapa.get(pedido.status) ?? 0) + 1)
      }
    }
    return mapa
  }, [pedidos])

  // Modo 'dia': filtro por status client-side. Modo 'todos': a lista já vem
  // filtrada do servidor.
  const visiveis =
    modo === 'dia' && filtro !== 'todos'
      ? pedidos.filter((p) => p.status === filtro)
      : pedidos

  async function mudarStatus(pedido: PedidoResumo): Promise<void> {
    if (!ehStatusPedido(pedido.status)) return
    const proximo = proximoStatus(pedido.status, pedido.modalidade ?? 'entrega')
    if (!proximo) return

    setErroAtualizacao(null)
    setAtualizando((atual) => new Set(atual).add(pedido.id))

    // Atualização otimista: o badge muda na hora; erro reverte.
    const anterior = pedido.status
    atualizarLocal(pedido.id, { status: proximo.status })

    try {
      const res = await fetch(`/api/${colecao}/${pedido.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: proximo.status }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      atualizarLocal(pedido.id, { status: anterior })
      setErroAtualizacao(
        `Não foi possível atualizar o pedido #${pedido.codigo}. Tente novamente.`,
      )
    } finally {
      setAtualizando((atual) => {
        const proximoConjunto = new Set(atual)
        proximoConjunto.delete(pedido.id)
        return proximoConjunto
      })
    }
  }

  if (estado.tipo === 'erro') {
    return (
      <p role="alert" className="py-6 font-sans text-paragrafo">
        Não foi possível carregar os pedidos agora. Tente novamente mais tarde.
      </p>
    )
  }

  const rotuloChip = (status: StatusPedido): string =>
    modo === 'dia'
      ? `${ROTULO_STATUS[status]} (${contagem.get(status) ?? 0})`
      : ROTULO_STATUS[status]

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

      {/* Filtros por status. No modo 'dia' com contagem (conjunto completo em
          memória); no modo 'todos' sem contagem (filtro server-side). */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        <button
          type="button"
          aria-pressed={filtro === 'todos'}
          onClick={() => setFiltro('todos')}
          className={`borda-sistema rounded-full px-3 py-1 font-sans text-sm transition-colors ${
            filtro === 'todos'
              ? 'border-[color:var(--color-marrom)] bg-[color:var(--color-marrom)] text-[color:var(--color-papel)]'
              : 'text-[color:var(--color-paragrafo)] hover-verde'
          }`}
        >
          Todos{modo === 'dia' ? ` (${pedidos.length})` : ''}
        </button>
        {STATUS_PEDIDO.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filtro === status}
            onClick={() => setFiltro(status)}
            className={`borda-sistema rounded-full px-3 py-1 font-sans text-sm transition-colors ${
              filtro === status
                ? 'border-[color:var(--color-marrom)] bg-[color:var(--color-marrom)] text-[color:var(--color-papel)]'
                : 'text-[color:var(--color-paragrafo)] hover-verde'
            }`}
          >
            {rotuloChip(status)}
          </button>
        ))}
      </div>

      {erroAtualizacao ? (
        <p role="alert" className="font-sans text-sm text-marrom-escuro">
          {erroAtualizacao}
        </p>
      ) : null}

      {estado.tipo === 'carregando' ? (
        <p role="status" className="py-6 font-sans text-paragrafo">
          Carregando pedidos…
        </p>
      ) : visiveis.length === 0 ? (
        <p className="py-6 font-sans text-paragrafo">
          {filtro === 'todos'
            ? modo === 'dia'
              ? 'Nenhum pedido neste dia. Escolha outra data ou veja todos os pedidos.'
              : 'Nenhum pedido registrado ainda.'
            : `Nenhum pedido com status "${ROTULO_STATUS[filtro]}".`}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visiveis.map((pedido) => {
            const proximo = ehStatusPedido(pedido.status)
              ? proximoStatus(pedido.status, pedido.modalidade ?? 'entrega')
              : null
            return (
              <li
                key={pedido.id}
                className="borda-sistema bg-papel flex flex-col gap-3 rounded-lg p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-serif text-xl text-verde">#{pedido.codigo}</span>
                  <StatusPedidoBadge status={pedido.status} modalidade={pedido.modalidade} />
                </div>

                <p className="font-sans text-sm text-paragrafo">
                  {pedido.estabelecimento ? (
                    <strong className="text-marrom">{pedido.estabelecimento} · </strong>
                  ) : null}
                  {pedido.nome} · {pedido.telefone} · {formatarDataHora(pedido.createdAt)}
                </p>

                {pedido.modalidade ? (
                  <p className="font-sans text-sm text-marrom">
                    {ROTULO_MODALIDADE[pedido.modalidade]}
                  </p>
                ) : null}

                <ul className="flex flex-col gap-1 font-sans text-marrom">
                  {pedido.itens.map((item) => (
                    <li key={item.id ?? item.nomeSnapshot}>
                      {item.quantidade}× {item.nomeSnapshot ?? 'item'}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-sans text-sm text-paragrafo">
                    {pedido.subtotal != null ? (
                      <>
                        Produtos:{' '}
                        <strong className="text-marrom">{renderPreco(pedido.subtotal)}</strong>
                      </>
                    ) : null}
                    {pedido.localidade ? <> · {pedido.localidade}</> : null}
                  </p>

                  {proximo ? (
                    <button
                      type="button"
                      onClick={() => mudarStatus(pedido)}
                      disabled={atualizando.has(pedido.id)}
                      className="btn-primario disabled:opacity-60"
                    >
                      {atualizando.has(pedido.id) ? 'Atualizando…' : proximo.rotuloAcao}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default PedidosFuncionario
