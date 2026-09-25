'use client'

// <HistoricoDia> — histórico de um dia de operação (caixa + delivery +
// pimenta em mel) para análise posterior (docs/features/caixa-historico.md,
// docs/features/pimenta-em-mel.md RN-P08).
//
// - Filtro de data (padrão: hoje) com o mesmo <input type="date"> do
//   dashboard de pedidos.
// - Resumo do dia: caixa (contas, faturado, recebido por forma de pagamento,
//   em débito, serviço, descontos, ticket médio) e delivery (pedidos,
//   subtotal, contagem por status); pimenta em mel com o mesmo resumo do
//   delivery. Resumo calculado por lib/historico.ts.
// - Lista cronológica unificada, com detalhes expansíveis por linha
//   (<details>, acessível por teclado sem JS extra).
// - "Exportar CSV" gera a planilha do dia no navegador.

import { useEffect, useMemo, useState, type ReactElement } from 'react'

import { buscarContas, type ContaCaixa } from '@/lib/caixa-api'
import { formatarCentavos, FORMAS_PAGAMENTO, ROTULO_FORMA_PAGAMENTO } from '@/lib/caixa'
import {
  gerarCsv,
  montarLinhas,
  resumirDia,
  ROTULO_ORIGEM,
  type OrigemHistorico,
  type ResumoDeliveryDia,
} from '@/lib/historico'
import {
  buscarPedidosPaginado,
  dataParaInput,
  formatarDataHora,
  inputParaData,
  intervaloDoDia,
  type PedidoResumo,
} from '@/lib/pedidos-api'
import { ROTULO_MODALIDADE } from '@/lib/pimenta'
import { ROTULO_STATUS, STATUS_PEDIDO } from '@/lib/status-pedido'

import { StatusPedidoBadge } from './StatusPedidoBadge'

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | {
      tipo: 'pronto'
      pedidos: PedidoResumo[]
      contas: ContaCaixa[]
      pedidosPimenta: PedidoResumo[]
    }

// Cor do pill de origem na lista de movimento.
const CORES_ORIGEM: Record<OrigemHistorico, string> = {
  caixa: 'bg-oliva text-marrom',
  delivery: 'bg-borda text-marrom',
  pimenta: 'bg-marrom text-papel',
}

function formatarHora(iso: string): string {
  const data = new Date(iso)
  return Number.isNaN(data.getTime())
    ? iso
    : new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(data)
}

/** Cartão de indicador do resumo. */
function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-sans text-sm text-paragrafo">{rotulo}</dt>
      <dd className={destaque ? 'font-serif text-2xl text-marrom' : 'font-sans text-lg text-marrom'}>
        {valor}
      </dd>
    </div>
  )
}

/** Cartão de resumo de pedidos (delivery ou pimenta): quantidade, subtotal e status. */
function CartaoPedidos({
  titulo,
  resumo,
  nota,
}: {
  titulo: string
  resumo: ResumoDeliveryDia
  nota: string
}) {
  return (
    <div className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-papel p-4">
      <h3 className="font-serif text-xl text-marrom">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-3">
        <Indicador rotulo="Pedidos" valor={String(resumo.pedidos)} />
        <Indicador rotulo="Subtotal dos produtos" valor={formatarCentavos(resumo.subtotal)} />
        {STATUS_PEDIDO.map((status) => (
          <Indicador
            key={status}
            rotulo={ROTULO_STATUS[status]}
            valor={String(resumo.porStatus[status] ?? 0)}
          />
        ))}
      </dl>
      <p className="font-sans text-sm text-paragrafo">{nota}</p>
    </div>
  )
}

export function HistoricoDia(): ReactElement {
  const [dia, setDia] = useState(() => new Date())
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })

  useEffect(() => {
    let ativo = true
    const intervalo = intervaloDoDia(dia)
    Promise.all([
      buscarPedidosPaginado({ pagina: 1, limite: 0, dia: intervalo }),
      buscarContas({ dia: intervalo }),
      buscarPedidosPaginado({ pagina: 1, limite: 0, dia: intervalo }, 'pedidos-pimenta'),
    ])
      .then(([pedidos, contas, pedidosPimenta]) => {
        if (ativo) {
          setEstado({
            tipo: 'pronto',
            pedidos: pedidos.docs,
            contas,
            pedidosPimenta: pedidosPimenta.docs,
          })
        }
      })
      .catch((e: unknown) => {
        if (ativo) {
          setEstado({
            tipo: 'erro',
            mensagem: e instanceof Error ? e.message : 'Falha ao carregar o histórico.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [dia])

  const pronto = estado.tipo === 'pronto' ? estado : null
  const resumo = useMemo(
    () => (pronto ? resumirDia(pronto.pedidos, pronto.contas, pronto.pedidosPimenta) : null),
    [pronto],
  )
  const linhas = useMemo(
    () => (pronto ? montarLinhas(pronto.pedidos, pronto.contas, pronto.pedidosPimenta) : []),
    [pronto],
  )

  function exportarCsv() {
    // BOM: o Excel reconhece o arquivo como UTF-8 (acentos corretos).
    const csv = '﻿' + gerarCsv(linhas, formatarDataHora)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `historico-${dataParaInput(dia)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="historico-dia" className="font-sans text-marrom">
          Dia
        </label>
        <input
          id="historico-dia"
          type="date"
          value={dataParaInput(dia)}
          max={dataParaInput(new Date())}
          onChange={(evento) => {
            const data = inputParaData(evento.target.value)
            if (data) {
              setEstado({ tipo: 'carregando' })
              setDia(data)
            }
          }}
          className="border-borda bg-fundo rounded-sm border px-3 py-1 font-sans text-sm text-marrom"
        />
        <button
          type="button"
          onClick={exportarCsv}
          disabled={!pronto || linhas.length === 0}
          className="btn-primario ml-auto px-3 py-1.5 text-[0.95rem] disabled:opacity-60"
        >
          Exportar CSV
        </button>
      </div>

      {estado.tipo === 'carregando' ? (
        <p role="status" className="font-sans text-paragrafo">
          Carregando histórico…
        </p>
      ) : null}
      {estado.tipo === 'erro' ? (
        <p role="alert" className="font-sans text-marrom">
          {estado.mensagem}
        </p>
      ) : null}

      {resumo ? (
        <>
          {/* Resumo -------------------------------------------------------- */}
          <section aria-labelledby="historico-resumo" className="flex flex-col gap-4">
            <h2
              id="historico-resumo"
              className="border-b-2 border-oliva pb-1 font-serif text-2xl text-marrom"
            >
              Resumo do dia
            </h2>

            <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              <Indicador rotulo="Total do dia" valor={formatarCentavos(resumo.totalGeral)} destaque />
              <Indicador rotulo="Caixa (faturado)" valor={formatarCentavos(resumo.caixa.total)} />
              <Indicador rotulo="Delivery (produtos)" valor={formatarCentavos(resumo.delivery.subtotal)} />
              <Indicador rotulo="Pimenta em mel (produtos)" valor={formatarCentavos(resumo.pimenta.subtotal)} />
              <Indicador rotulo="Em débito no caixa" valor={formatarCentavos(resumo.caixa.emDebito)} />
            </dl>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-papel p-4">
                <h3 className="font-serif text-xl text-marrom">Caixa</h3>
                <dl className="grid grid-cols-2 gap-3">
                  <Indicador
                    rotulo="Contas"
                    valor={`${resumo.caixa.contas} (${resumo.caixa.pagas} pagas, ${resumo.caixa.abertas} abertas)`}
                  />
                  <Indicador rotulo="Pessoas pagantes" valor={String(resumo.caixa.pessoas)} />
                  <Indicador rotulo="Recebido" valor={formatarCentavos(resumo.caixa.recebido)} />
                  <Indicador rotulo="Ticket médio" valor={formatarCentavos(resumo.caixa.ticketMedio)} />
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <Indicador
                      key={forma}
                      rotulo={ROTULO_FORMA_PAGAMENTO[forma]}
                      valor={formatarCentavos(resumo.caixa.porForma[forma])}
                    />
                  ))}
                  <Indicador rotulo="Taxa de serviço" valor={formatarCentavos(resumo.caixa.taxaServico)} />
                  <Indicador rotulo="Descontos" valor={formatarCentavos(resumo.caixa.desconto)} />
                </dl>
              </div>

              <CartaoPedidos
                titulo="Delivery"
                resumo={resumo.delivery}
                nota="O delivery não registra forma de pagamento nem frete: o valor final é combinado com o cliente no WhatsApp."
              />
              <CartaoPedidos
                titulo="Pimenta em mel"
                resumo={resumo.pimenta}
                nota="Pedidos por unidade e em lote (entrega ou retirada); pagamento e frete são combinados no WhatsApp."
              />
            </div>
          </section>

          {/* Movimento ----------------------------------------------------- */}
          <section aria-labelledby="historico-movimento" className="flex flex-col gap-3">
            <h2
              id="historico-movimento"
              className="border-b-2 border-oliva pb-1 font-serif text-2xl text-marrom"
            >
              Movimento ({linhas.length})
            </h2>
            {linhas.length === 0 ? (
              <p className="font-sans text-paragrafo">Nenhum registro neste dia.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {linhas.map((linha) => (
                  <li key={`${linha.origem}-${linha.id}`}>
                    <details className="borda-sistema group rounded-[var(--radius)] bg-papel">
                      <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 p-4 font-sans">
                        <span className="text-sm text-paragrafo">{formatarHora(linha.criadoEm)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_ORIGEM[linha.origem]}`}
                        >
                          {ROTULO_ORIGEM[linha.origem]}
                        </span>
                        <span className="text-marrom">#{linha.codigo}</span>
                        {linha.referencia ? (
                          <span className="text-paragrafo">{linha.referencia}</span>
                        ) : null}
                        <span className="ml-auto text-marrom">{formatarCentavos(linha.total)}</span>
                        {linha.origem !== 'caixa' ? (
                          <StatusPedidoBadge status={linha.statusValor} modalidade={linha.modalidade} />
                        ) : (
                          <span className={`text-sm ${linha.statusValor === 'paga' ? 'text-verde' : 'text-paragrafo'}`}>
                            {linha.status}
                          </span>
                        )}
                      </summary>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-borda p-4 font-sans text-sm">
                        <dt className="text-paragrafo">Itens</dt>
                        <dd className="text-marrom">{linha.itens}</dd>
                        <dt className="text-paragrafo">Subtotal</dt>
                        <dd className="text-marrom">{formatarCentavos(linha.subtotal)}</dd>
                        {linha.modalidade ? (
                          <>
                            <dt className="text-paragrafo">Recebimento</dt>
                            <dd className="text-marrom">{ROTULO_MODALIDADE[linha.modalidade]}</dd>
                          </>
                        ) : null}
                        {linha.origem === 'caixa' ? (
                          <>
                            <dt className="text-paragrafo">Serviço</dt>
                            <dd className="text-marrom">{formatarCentavos(linha.taxaServico)}</dd>
                            <dt className="text-paragrafo">Desconto</dt>
                            <dd className="text-marrom">{formatarCentavos(linha.desconto)}</dd>
                            <dt className="text-paragrafo">Pago / em débito</dt>
                            <dd className="text-marrom">
                              {formatarCentavos(linha.pago)} / {formatarCentavos(linha.emDebito)}
                            </dd>
                            <dt className="text-paragrafo">Pagamentos</dt>
                            <dd className="text-marrom">{linha.pagamentos || '—'}</dd>
                          </>
                        ) : null}
                      </dl>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

export default HistoricoDia
