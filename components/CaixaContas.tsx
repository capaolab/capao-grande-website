'use client'

// <CaixaContas> — aba "Contas" do caixa (docs/features/caixa-contas-fechadas.md).
//
// - Contas fechadas (RN-CF03): as mais antigas primeiro, com as ações
//   "Reabrir" (volta ao lançamento com os itens da conta) e "Seguir para
//   pagamento". Seguir abre os ajustes do caixa — taxa de serviço de 10% e
//   desconto (RN-CF05) — com o total ao vivo; confirmar congela a conta e
//   abre o rateio (<CaixaPagamento>).
// - Contas em pagamento: rateio ainda não quitado, para retomar.

import { useEffect, useId, useState, type ReactElement } from 'react'

import {
  calcularTotalConta,
  formatarCentavos,
  lerValorReais,
  paraCentavos,
} from '@/lib/caixa'
import { buscarContas, seguirParaPagamento, type ContaCaixa } from '@/lib/caixa-api'
import { formatarDataHora } from '@/lib/pedidos-api'

export interface CaixaContasProps {
  /** Reabre a conta fechada no lançamento. */
  onReabrir: (conta: ContaCaixa) => void
  /** Abre o rateio de uma conta em pagamento. */
  onPagar: (conta: ContaCaixa) => void
}

export function CaixaContas({ onReabrir, onPagar }: CaixaContasProps): ReactElement {
  const idBase = useId()
  const [fechadas, setFechadas] = useState<ContaCaixa[] | null>(null)
  const [emPagamento, setEmPagamento] = useState<ContaCaixa[]>([])
  const [erro, setErro] = useState<string | null>(null)
  // Conta cujos ajustes de pagamento estão abertos.
  const [ajustando, setAjustando] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      buscarContas({ status: 'fechada', sort: 'createdAt' }),
      buscarContas({ status: 'pagamento' }),
    ])
      .then(([f, p]) => {
        setFechadas(f)
        setEmPagamento(p)
      })
      .catch(() => {
        setFechadas([])
        setErro('Não foi possível carregar as contas.')
      })
  }, [])

  if (fechadas === null) {
    return (
      <p role="status" className="font-sans text-paragrafo">
        Carregando contas…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {erro ? (
        <p role="alert" className="font-sans text-sm text-marrom">
          {erro}
        </p>
      ) : null}

      <section aria-labelledby={`${idBase}-fechadas`} className="flex flex-col gap-3">
        <h2
          id={`${idBase}-fechadas`}
          className="border-b-2 border-oliva pb-1 font-serif text-2xl text-marrom"
        >
          Contas fechadas
        </h2>
        {fechadas.length === 0 ? (
          <p className="font-sans text-paragrafo">Nenhuma conta aguardando o caixa.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {fechadas.map((conta) => (
              <li
                key={conta.id}
                className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-papel p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-sans text-marrom">
                    #{conta.codigo}
                    {conta.mesa ? ` · Mesa ${conta.mesa}` : ''}
                  </span>
                  <span className="font-serif text-xl text-marrom">
                    {formatarCentavos(paraCentavos(conta.total))}
                  </span>
                </div>
                <p className="font-sans text-sm text-paragrafo">
                  {conta.itens
                    .map((item) => `${item.quantidade}× ${item.nomeSnapshot ?? 'item'}`)
                    .join(', ')}
                </p>
                <p className="font-sans text-sm text-paragrafo">
                  Fechada em {formatarDataHora(conta.createdAt)}
                </p>

                {ajustando === conta.id ? (
                  <AjustesPagamento
                    conta={conta}
                    onCancelar={() => setAjustando(null)}
                    onConfirmada={onPagar}
                  />
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => onReabrir(conta)}
                      className="borda-sistema hover-verde rounded-[var(--radius)] px-4 py-2 font-sans text-marrom transition-colors"
                    >
                      Reabrir
                    </button>
                    <button
                      type="button"
                      onClick={() => setAjustando(conta.id)}
                      className="btn-primario"
                    >
                      Seguir para pagamento
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {emPagamento.length > 0 ? (
        <section aria-labelledby={`${idBase}-pagamento`} className="flex flex-col gap-3">
          <h2
            id={`${idBase}-pagamento`}
            className="border-b-2 border-oliva pb-1 font-serif text-2xl text-marrom"
          >
            Em pagamento
          </h2>
          <ul className="flex flex-wrap gap-2">
            {emPagamento.map((conta) => (
              <li key={conta.id}>
                <button
                  type="button"
                  onClick={() => onPagar(conta)}
                  className="borda-sistema hover-verde flex flex-col gap-0.5 rounded-[var(--radius)] bg-papel px-4 py-2 text-left font-sans transition-colors"
                >
                  <span className="text-marrom">
                    #{conta.codigo}
                    {conta.mesa ? ` · Mesa ${conta.mesa}` : ''}
                  </span>
                  <span className="text-sm text-paragrafo">
                    {formatarCentavos(paraCentavos(conta.total))} ·{' '}
                    {formatarDataHora(conta.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/** Serviço e desconto definidos pelo caixa antes de congelar a conta. */
function AjustesPagamento({
  conta,
  onCancelar,
  onConfirmada,
}: {
  conta: ContaCaixa
  onCancelar: () => void
  onConfirmada: (conta: ContaCaixa) => void
}): ReactElement {
  const idBase = useId()
  const [servico, setServico] = useState(false)
  const [descontoTexto, setDescontoTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Total ao vivo (centavos), espelhando o cálculo do servidor.
  const desconto = descontoTexto.trim() === '' ? 0 : lerValorReais(descontoTexto)
  const totalConta =
    desconto === null
      ? null
      : calcularTotalConta({ subtotal: paraCentavos(conta.subtotal), servico, desconto })

  async function confirmar() {
    setErro(null)
    if (desconto === null) {
      setErro('Desconto inválido: use o formato 12,50.')
      return
    }
    if (totalConta && !totalConta.ok) {
      setErro(totalConta.erro)
      return
    }
    setEnviando(true)
    try {
      onConfirmada(await seguirParaPagamento(conta.id, { servico, desconto }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível seguir para o pagamento.')
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-borda pt-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 font-sans text-marrom">
        <input
          type="checkbox"
          checked={servico}
          onChange={(e) => setServico(e.target.checked)}
          className="h-5 w-5 accent-[color:var(--color-verde)]"
        />
        Taxa de serviço (10%)
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idBase}-desconto`} className="font-sans text-marrom">
          Desconto (R$)
        </label>
        <input
          id={`${idBase}-desconto`}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={descontoTexto}
          onChange={(e) => setDescontoTexto(e.target.value)}
          aria-invalid={desconto === null ? true : undefined}
          className="borda-sistema w-32 rounded-[var(--radius)] bg-papel px-3 py-2 font-sans text-marrom"
        />
      </div>

      <div aria-live="polite">
        {totalConta && totalConta.ok ? (
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-sans text-sm">
            <dt className="text-paragrafo">Subtotal</dt>
            <dd className="text-right text-marrom">{formatarCentavos(totalConta.subtotal)}</dd>
            {servico ? (
              <>
                <dt className="text-paragrafo">Taxa de serviço (10%)</dt>
                <dd className="text-right text-marrom">
                  {formatarCentavos(totalConta.taxaServico)}
                </dd>
              </>
            ) : null}
            {totalConta.desconto > 0 ? (
              <>
                <dt className="text-paragrafo">Desconto</dt>
                <dd className="text-right text-marrom">
                  − {formatarCentavos(totalConta.desconto)}
                </dd>
              </>
            ) : null}
            <dt className="font-serif text-xl text-marrom">Total</dt>
            <dd className="text-right font-serif text-xl text-marrom">
              {formatarCentavos(totalConta.total)}
            </dd>
          </dl>
        ) : (
          <p className="font-sans text-sm text-marrom">
            {totalConta && !totalConta.ok
              ? totalConta.erro
              : 'Desconto inválido: use o formato 12,50.'}
          </p>
        )}
      </div>

      {erro ? (
        <p role="alert" className="font-sans text-sm text-marrom">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="hover-verde font-sans text-sm text-paragrafo underline transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando}
          className="btn-primario disabled:opacity-60"
        >
          {enviando ? 'Confirmando…' : 'Confirmar e ir para o pagamento'}
        </button>
      </div>
    </div>
  )
}

export default CaixaContas
