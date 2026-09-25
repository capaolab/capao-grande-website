'use client'

// <CaixaPagamento> — rateio e confirmação do pagamento de uma conta de mesa
// (docs/features/caixa-historico.md, RN-C04..C07).
//
// - "Dividir por N" divide o total em partes IGUAIS (centavos: a sobra vai
//   para as primeiras pessoas). Partes já pagas são preservadas.
// - O valor de cada pessoa é editável: a parte ajustada fica fixa e o
//   restante é redistribuído igualmente entre as demais (lib/caixa.ts).
// - Cada pessoa escolhe a forma de pagamento (pix, dinheiro, cartão) e tem um
//   check de "pago". Ao marcar, o valor em débito é recalculado e a soma já
//   paga aparece no rodapé.
//
// Cada alteração é gravada na hora (PATCH /api/caixa/:id): o servidor valida
// a soma, carimba `pagoEm` e deriva o status `paga`. Em erro, a tela volta ao
// último estado salvo e mostra a mensagem (role="alert").

import { useId, useRef, useState, type ReactElement } from 'react'

import {
  centavosParaTexto,
  desfazerAjustes,
  dividirConta,
  formatarCentavos,
  FORMAS_PAGAMENTO,
  lerValorReais,
  paraCentavos,
  redistribuir,
  resumoPagamento,
  ROTULO_FORMA_PAGAMENTO,
  type FormaPagamento,
  type ResultadoRateio,
} from '@/lib/caixa'
import { partesDaConta, salvarPagamentos, type ContaCaixa, type ParteConta } from '@/lib/caixa-api'

export interface CaixaPagamentoProps {
  conta: ContaCaixa
  onAtualizada: (conta: ContaCaixa) => void
  onNovaConta: () => void
}

/** Rateio salvo da conta; sem rateio ainda, 1 pessoa pagando tudo. */
function partesIniciais(conta: ContaCaixa): ParteConta[] {
  const salvas = partesDaConta(conta)
  if (salvas.length > 0) return salvas
  const inicial = dividirConta(paraCentavos(conta.total), [], 1)
  return inicial.ok ? inicial.partes : []
}

export function CaixaPagamento({
  conta,
  onAtualizada,
  onNovaConta,
}: CaixaPagamentoProps): ReactElement {
  const idBase = useId()
  const total = paraCentavos(conta.total)

  // Estado local = rateio exibido; `ultimaSalva` = último confirmado.
  const [partes, setPartes] = useState<ParteConta[]>(() => partesIniciais(conta))
  const [pessoas, setPessoas] = useState(String(Math.max(partes.length, 1)))
  // Texto em edição dos valores (índice -> texto), aplicado no blur/Enter.
  const [rascunhos, setRascunhos] = useState<Record<number, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Gravações em série: a próxima só sai depois da anterior (sem corrida).
  const fila = useRef<Promise<unknown>>(Promise.resolve())
  // Último estado confirmado pelo servidor (para reverter em caso de erro).
  const ultimaSalva = useRef(conta)

  const resumo = resumoPagamento(total, partes)

  function salvar(novas: ParteConta[]) {
    setPartes(novas)
    setErro(null)
    setSalvando(true)
    fila.current = fila.current.then(async () => {
      try {
        const atualizada = await salvarPagamentos(conta.id, novas)
        // Ids das linhas novas (e `pagoEm`) vêm do servidor.
        ultimaSalva.current = atualizada
        setPartes(partesDaConta(atualizada))
        onAtualizada(atualizada)
      } catch (e) {
        setPartes(partesIniciais(ultimaSalva.current))
        setErro(e instanceof Error ? e.message : 'Não foi possível salvar o pagamento.')
      } finally {
        setSalvando(false)
      }
    })
  }

  function aplicar(resultado: ResultadoRateio) {
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    salvar(resultado.partes)
  }

  function dividir() {
    const n = Number(pessoas)
    const resultado = dividirConta(total, partes, n)
    if (resultado.ok) setRascunhos({})
    aplicar(resultado)
  }

  function confirmarValor(indice: number) {
    const texto = rascunhos[indice]
    if (texto === undefined) return
    setRascunhos((atual) => {
      const resto = { ...atual }
      delete resto[indice]
      return resto
    })
    const centavos = lerValorReais(texto)
    if (centavos === null) {
      setErro('Valor inválido: use o formato 12,50.')
      return
    }
    if (centavos === partes[indice].valor) return
    aplicar(redistribuir(total, partes, indice, centavos))
  }

  function escolherForma(indice: number, forma: FormaPagamento) {
    salvar(partes.map((p, i) => (i === indice ? { ...p, forma } : p)))
  }

  function alternarPago(indice: number) {
    const parte = partes[indice]
    if (!parte.pago && !parte.forma) {
      setErro(`Escolha a forma de pagamento da pessoa ${indice + 1} antes de confirmar.`)
      return
    }
    salvar(partes.map((p, i) => (i === indice ? { ...p, pago: !p.pago } : p)))
  }

  const temAjuste = partes.some((p) => p.editado && !p.pago)

  return (
    <div className="flex flex-col gap-8">
      {/* Resumo da conta ------------------------------------------------------ */}
      <section
        aria-labelledby={`${idBase}-conta`}
        className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`${idBase}-conta`} className="font-serif text-2xl text-marrom">
            Conta #{conta.codigo}
            {conta.mesa ? ` · Mesa ${conta.mesa}` : ''}
          </h2>
          <span
            className={`font-sans text-sm ${conta.status === 'paga' ? 'text-verde' : 'text-paragrafo'}`}
          >
            {conta.status === 'paga' ? 'Paga' : 'Aberta'}
          </span>
        </div>
        <ul className="flex flex-col gap-1 font-sans text-sm text-paragrafo">
          {conta.itens.map((item, i) => (
            <li key={item.id ?? i} className="flex justify-between gap-4">
              <span>
                {item.quantidade}× {item.nomeSnapshot}
              </span>
              <span>{formatarCentavos(paraCentavos((item.precoUnitario ?? 0) * item.quantidade))}</span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-borda pt-3 font-sans text-sm">
          <dt className="text-paragrafo">Subtotal</dt>
          <dd className="text-right text-marrom">{formatarCentavos(paraCentavos(conta.subtotal))}</dd>
          {conta.taxaServico > 0 ? (
            <>
              <dt className="text-paragrafo">Taxa de serviço (10%)</dt>
              <dd className="text-right text-marrom">
                {formatarCentavos(paraCentavos(conta.taxaServico))}
              </dd>
            </>
          ) : null}
          {conta.desconto > 0 ? (
            <>
              <dt className="text-paragrafo">Desconto</dt>
              <dd className="text-right text-marrom">
                − {formatarCentavos(paraCentavos(conta.desconto))}
              </dd>
            </>
          ) : null}
          <dt className="font-serif text-lg text-marrom">Total</dt>
          <dd className="text-right font-serif text-lg text-marrom">{formatarCentavos(total)}</dd>
        </dl>
      </section>

      {/* Divisão ------------------------------------------------------------- */}
      <section aria-labelledby={`${idBase}-divisao`} className="flex flex-col gap-4">
        <h2
          id={`${idBase}-divisao`}
          className="border-b-2 border-oliva pb-1 font-serif text-2xl text-marrom"
        >
          Pagamento
        </h2>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            dividir()
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idBase}-pessoas`} className="font-sans text-marrom">
              Dividir por quantas pessoas?
            </label>
            <input
              id={`${idBase}-pessoas`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={pessoas}
              onChange={(e) => setPessoas(e.target.value)}
              className="borda-sistema w-28 rounded-[var(--radius)] bg-papel px-3 py-2 font-sans text-marrom"
            />
          </div>
          <button type="submit" disabled={salvando} className="btn-primario disabled:opacity-60">
            Dividir igualmente
          </button>
          {temAjuste ? (
            <button
              type="button"
              disabled={salvando}
              onClick={() => aplicar(desfazerAjustes(total, partes))}
              className="hover-verde font-sans text-sm text-paragrafo underline transition-colors"
            >
              Desfazer ajustes
            </button>
          ) : null}
        </form>

        {erro ? (
          <p role="alert" className="font-sans text-sm text-marrom">
            {erro}
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {partes.map((parte, indice) => {
            const idValor = `${idBase}-valor-${indice}`
            const rotulo = `Pessoa ${indice + 1}`
            return (
              <li
                key={parte.id ?? `nova-${indice}`}
                className={`borda-sistema flex flex-col gap-3 rounded-[var(--radius)] p-4 ${
                  parte.pago ? 'bg-[color:var(--color-fundo)]' : 'bg-papel'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-sans text-marrom">
                    {rotulo}
                    {parte.editado && !parte.pago ? (
                      <span className="ml-2 text-sm text-paragrafo">(valor ajustado)</span>
                    ) : null}
                  </span>

                  <div className="flex items-center gap-3">
                    <label htmlFor={idValor} className="sr-only">
                      Valor da {rotulo.toLowerCase()} em reais
                    </label>
                    <div className="flex items-center gap-1 font-sans text-marrom">
                      <span aria-hidden="true">R$</span>
                      <input
                        id={idValor}
                        type="text"
                        inputMode="decimal"
                        disabled={parte.pago || salvando}
                        value={rascunhos[indice] ?? centavosParaTexto(parte.valor)}
                        onChange={(e) =>
                          setRascunhos((atual) => ({ ...atual, [indice]: e.target.value }))
                        }
                        onBlur={() => confirmarValor(indice)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            confirmarValor(indice)
                          }
                        }}
                        className="borda-sistema w-28 rounded-[var(--radius)] bg-papel px-3 py-2 text-right disabled:opacity-70"
                      />
                    </div>

                    {/* Check de pagamento: exige forma escolhida. */}
                    <button
                      type="button"
                      aria-pressed={parte.pago}
                      aria-label={
                        parte.pago
                          ? `${rotulo}: pago. Desmarcar pagamento`
                          : `Confirmar pagamento da ${rotulo.toLowerCase()}`
                      }
                      disabled={salvando}
                      onClick={() => alternarPago(indice)}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60 ${
                        parte.pago
                          ? 'border-verde bg-verde text-papel'
                          : 'border-borda text-paragrafo hover-verde'
                      }`}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>

                <fieldset className="flex flex-wrap items-center gap-2" disabled={parte.pago || salvando}>
                  <legend className="sr-only">Forma de pagamento da {rotulo.toLowerCase()}</legend>
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <label
                      key={forma}
                      className={`borda-sistema cursor-pointer rounded-[var(--radius)] px-3 py-1.5 font-sans text-sm transition-colors ${
                        parte.forma === forma
                          ? 'border-marrom bg-marrom text-papel'
                          : 'text-paragrafo hover-verde'
                      } ${parte.pago ? 'cursor-default' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`${idBase}-forma-${indice}`}
                        value={forma}
                        checked={parte.forma === forma}
                        onChange={() => escolherForma(indice, forma)}
                        className="sr-only"
                      />
                      {ROTULO_FORMA_PAGAMENTO[forma]}
                    </label>
                  ))}
                </fieldset>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Totais do pagamento ------------------------------------------------- */}
      <section
        aria-live="polite"
        aria-label="Situação do pagamento"
        className="borda-sistema sticky bottom-0 flex flex-col gap-2 rounded-[var(--radius)] bg-papel p-4"
      >
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-sans">
          <dt className="text-paragrafo">Já pago</dt>
          <dd className="text-right text-verde">{formatarCentavos(resumo.pago)}</dd>
          <dt className="text-marrom">Em débito</dt>
          <dd className="text-right font-serif text-xl text-marrom">
            {formatarCentavos(resumo.emDebito)}
          </dd>
        </dl>
        {resumo.pago > 0 ? (
          <p className="font-sans text-sm text-paragrafo">
            {FORMAS_PAGAMENTO.filter((f) => resumo.porForma[f] > 0)
              .map((f) => `${ROTULO_FORMA_PAGAMENTO[f]}: ${formatarCentavos(resumo.porForma[f])}`)
              .join(' · ')}
          </p>
        ) : null}
        {salvando ? (
          <p role="status" className="font-sans text-sm text-paragrafo">
            Salvando…
          </p>
        ) : null}
        {resumo.quitada ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-3">
            <p className="font-serif text-xl text-verde">Conta paga</p>
            <button type="button" onClick={onNovaConta} className="btn-primario">
              Nova conta
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default CaixaPagamento
