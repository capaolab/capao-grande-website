'use client'

// <PedidosFuncionario> — dashboard da equipe (docs/features/dashboard-pedidos.md).
//
// Lista TODOS os pedidos (o access da collection libera leitura total para
// funcionário/admin) e faz GESTÃO MANUAL do status: cada card mostra o botão
// da próxima transição do funil (pendente → validado → pago → em_transito →
// finalizado), que faz PATCH /api/pedidos/:id com atualização otimista
// (reverte e avisa com role="alert" em caso de erro).
//
// Validar (pedidos-painel.md): no card `pendente` com entrega há um campo
// "Frete (R$)"; o botão "Validar pedido" só fica ativo com um valor válido e
// grava frete + status num único PATCH. Na retirada o servidor grava frete 0.
// A partir de `validado` o card mostra frete e total.
//
// Visão inicial: pedidos do DIA (usePedidosFiltrados), com filtro por status
// em chips com contagem — o dia inteiro está em memória, então o filtro é
// client-side e as contagens refletem a fila do dia. No modo "Todos os
// pedidos" (paginado no servidor) os chips filtram no SERVIDOR (parâmetro
// `status` do hook) e as contagens são omitidas — a paginação vem da API.
//
// Estados de carregamento/erro seguem o padrão de <PedidosCliente>.
//
// Concorrência: a lista se atualiza sozinha a cada 15 s
// (ATUALIZACAO_FUNCIONARIO_MS) e logo após cada mudança de status. Se a tela
// estava desatualizada, o servidor recusa a transição com 409
// (src/collections/transicao-status.ts): a mudança otimista é desfeita, a
// lista é recarregada e o aviso explica o que houve.
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
import { lerValorReais, paraReais } from '@/lib/caixa'
import { renderPreco } from '@/lib/cardapio'
import { formatarDataHora, type ColecaoPedidos, type PedidoResumo } from '@/lib/pedidos-api'
import { ROTULO_MODALIDADE } from '@/lib/pimenta'
import {
  ehStatusPedido,
  exigeFrete,
  proximoStatus,
  ROTULO_STATUS,
  STATUS_PEDIDO,
  totalPedido,
  type StatusPedido,
} from '@/lib/status-pedido'

/** Intervalo da atualização automática da fila do funcionário. */
const ATUALIZACAO_FUNCIONARIO_MS = 15_000

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
  // Frete digitado por pedido (texto pt-BR, ex.: "12,50").
  const [fretes, setFretes] = useState<Record<number, string>>({})

  // No modo 'todos' o status vai no query string (filtro server-side); no
  // modo 'dia' o hook ignora o parâmetro e o filtro é client-side.
  const {
    estado,
    modo,
    dia,
    pagina,
    atualizadoEm,
    escolherDia,
    mostrarTodos,
    setPagina,
    recarregar,
    atualizarLocal,
  } = usePedidosFiltrados(
    filtro === 'todos' ? undefined : filtro,
    colecao,
    ATUALIZACAO_FUNCIONARIO_MS,
  )

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

  /** Frete a gravar ao validar: null = ainda não informado (ou inválido). */
  function freteParaValidar(pedido: PedidoResumo): number | null {
    if (!exigeFrete(pedido.modalidade ?? 'entrega')) return 0
    const centavos = lerValorReais(fretes[pedido.id] ?? '')
    return centavos == null ? null : paraReais(centavos)
  }

  async function mudarStatus(pedido: PedidoResumo): Promise<void> {
    if (!ehStatusPedido(pedido.status)) return
    const proximo = proximoStatus(pedido.status, pedido.modalidade ?? 'entrega')
    if (!proximo) return

    // Validar grava o frete junto com o status (pedidos-painel.md).
    const validando = pedido.status === 'pendente'
    const frete = validando ? freteParaValidar(pedido) : undefined
    if (frete === null) return

    setErroAtualizacao(null)
    setAtualizando((atual) => new Set(atual).add(pedido.id))

    // Atualização otimista: o badge muda na hora; erro reverte.
    const anterior = { status: pedido.status, frete: pedido.frete }
    const atualizacao = validando
      ? { status: proximo.status, frete }
      : { status: proximo.status }
    atualizarLocal(pedido.id, atualizacao)

    try {
      const res = await fetch(`/api/${colecao}/${pedido.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(atualizacao),
      })
      if (res.status === 409) {
        // Outra pessoa/aba já mudou o pedido: mostra o estado real.
        atualizarLocal(pedido.id, anterior)
        setErroAtualizacao(
          `O pedido #${pedido.codigo} já tinha sido atualizado por outra pessoa. A lista foi recarregada — confira antes de continuar.`,
        )
        void recarregar()
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Sincroniza com o servidor (e com o que outros mudaram).
      void recarregar()
    } catch {
      atualizarLocal(pedido.id, anterior)
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
        atualizadoEm={atualizadoEm}
        onAtualizar={recarregar}
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
            const pedeFrete =
              pedido.status === 'pendente' && exigeFrete(pedido.modalidade ?? 'entrega')
            const semFrete = pedido.status === 'pendente' && freteParaValidar(pedido) === null
            const idFrete = `frete-${colecao}-${pedido.id}`
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

                <p className="font-sans text-sm text-paragrafo">
                  {pedido.subtotal != null ? (
                    <>
                      Produtos:{' '}
                      <strong className="text-marrom">{renderPreco(pedido.subtotal)}</strong>
                    </>
                  ) : null}
                  {pedido.frete != null ? (
                    <>
                      {' '}
                      · Frete: <strong className="text-marrom">{renderPreco(pedido.frete)}</strong>
                      {pedido.subtotal != null ? (
                        <>
                          {' '}
                          · Total:{' '}
                          <strong className="text-marrom">
                            {renderPreco(totalPedido(pedido.subtotal, pedido.frete))}
                          </strong>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {pedido.localidade ? <> · {pedido.localidade}</> : null}
                </p>

                <div className="flex flex-wrap items-end justify-between gap-2">
                  {pedeFrete ? (
                    <div className="flex flex-col gap-1">
                      <label htmlFor={idFrete} className="font-sans text-sm text-marrom">
                        Frete (R$)
                      </label>
                      <input
                        id={idFrete}
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={fretes[pedido.id] ?? ''}
                        onChange={(e) =>
                          setFretes((atual) => ({ ...atual, [pedido.id]: e.target.value }))
                        }
                        className="borda-sistema w-28 rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 font-sans text-marrom"
                      />
                    </div>
                  ) : (
                    <span aria-hidden="true" />
                  )}

                  {proximo ? (
                    <button
                      type="button"
                      onClick={() => mudarStatus(pedido)}
                      disabled={atualizando.has(pedido.id) || semFrete}
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
