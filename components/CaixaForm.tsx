'use client'

// <CaixaForm> — caixa da pizzaria (docs/features/caixa-historico.md).
//
// Fluxo em duas etapas (RN-C01: os itens da mesa são lançados de uma vez,
// quando ela vai pagar):
//  1. Lançamento: mesa (opcional), itens do cardápio (<SeletorItensCardapio>,
//     o mesmo do delivery), taxa de serviço de 10% opcional e desconto
//     manual. O total aparece ao vivo (espelho do cálculo do servidor) e
//     "Fechar conta" grava a conta (POST /api/caixa) — o servidor recalcula
//     tudo a partir do cardápio.
//  2. Pagamento: <CaixaPagamento> — rateio por pessoa, forma de pagamento e
//     check de pago.
//
// Contas ainda abertas (rateio não quitado) aparecem no topo para retomar o
// pagamento — ex.: depois de recarregar a página ou atender outra mesa.

import { useCallback, useEffect, useId, useState, type ReactElement } from 'react'

import { buscarContas, criarConta, type ContaCaixa } from '@/lib/caixa-api'
import {
  calcularTotalConta,
  formatarCentavos,
  lerValorReais,
  paraCentavos,
} from '@/lib/caixa'
import { formatarDataHora } from '@/lib/pedidos-api'

import { CaixaPagamento } from './CaixaPagamento'
import {
  paraEntradas,
  SeletorItensCardapio,
  useSelecaoCardapio,
  type ItemSelecionado,
  type SecaoPedido,
} from './SeletorItensCardapio'

export interface CaixaFormProps {
  /** Seções do cardápio (apenas itens ativos), na ordem canônica. */
  secoes: SecaoPedido[]
}

export function CaixaForm({ secoes }: CaixaFormProps): ReactElement {
  const idBase = useId()
  const [conta, setConta] = useState<ContaCaixa | null>(null)
  const [abertas, setAbertas] = useState<ContaCaixa[]>([])

  const [mesa, setMesa] = useState('')
  const [selecionados, setSelecionados] = useState<ItemSelecionado[]>([])
  const [servico, setServico] = useState(false)
  const [descontoTexto, setDescontoTexto] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erroItens, setErroItens] = useState<string | undefined>()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const { subtotal, pizzasPendentes } = useSelecaoCardapio(secoes, selecionados)

  const carregarAbertas = useCallback(() => {
    buscarContas({ status: 'aberta' })
      .then(setAbertas)
      .catch(() => setAbertas([]))
  }, [])

  useEffect(() => {
    carregarAbertas()
  }, [carregarAbertas])

  // Total ao vivo (centavos), espelhando o cálculo do servidor.
  const desconto = descontoTexto.trim() === '' ? 0 : lerValorReais(descontoTexto)
  const totalConta =
    desconto === null
      ? null
      : calcularTotalConta({ subtotal: paraCentavos(subtotal), servico, desconto })

  function limpar() {
    setMesa('')
    setSelecionados([])
    setServico(false)
    setDescontoTexto('')
    setObservacoes('')
    setErroItens(undefined)
    setErro(null)
  }

  function novaConta() {
    setConta(null)
    limpar()
    carregarAbertas()
  }

  async function fecharConta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)

    if (selecionados.length === 0) {
      setErroItens('Selecione ao menos um item do cardápio.')
      return
    }
    if (pizzasPendentes.length > 0) {
      setErroItens('Escolha o tamanho de todas as pizzas.')
      return
    }
    setErroItens(undefined)
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
      const criada = await criarConta({
        mesa: mesa.trim() || undefined,
        itens: paraEntradas(selecionados),
        servico,
        desconto,
        observacoes: observacoes.trim() || undefined,
      })
      setConta(criada)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível fechar a conta.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Etapa 2: pagamento ────────────────────────────────────────────────────
  if (conta) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={novaConta}
          className="hover-verde w-fit font-sans text-sm text-paragrafo underline transition-colors"
        >
          ← Voltar ao caixa
        </button>
        <CaixaPagamento
          key={conta.id}
          conta={conta}
          onAtualizada={setConta}
          onNovaConta={novaConta}
        />
      </div>
    )
  }

  // ── Etapa 1: lançamento ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-10">
      {abertas.length > 0 ? (
        <section aria-labelledby={`${idBase}-abertas`} className="flex flex-col gap-3">
          <h2
            id={`${idBase}-abertas`}
            className="border-b-2 border-oliva pb-1 font-serif text-2xl text-marrom"
          >
            Contas aguardando pagamento
          </h2>
          <ul className="flex flex-wrap gap-2">
            {abertas.map((aberta) => (
              <li key={aberta.id}>
                <button
                  type="button"
                  onClick={() => setConta(aberta)}
                  className="borda-sistema hover-verde flex flex-col gap-0.5 rounded-[var(--radius)] bg-papel px-4 py-2 text-left font-sans transition-colors"
                >
                  <span className="text-marrom">
                    #{aberta.codigo}
                    {aberta.mesa ? ` · Mesa ${aberta.mesa}` : ''}
                  </span>
                  <span className="text-sm text-paragrafo">
                    {formatarCentavos(paraCentavos(aberta.total))} ·{' '}
                    {formatarDataHora(aberta.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={fecharConta} noValidate className="flex flex-col gap-10">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idBase}-mesa`} className="font-sans text-marrom">
            Mesa
          </label>
          <input
            id={`${idBase}-mesa`}
            type="text"
            inputMode="numeric"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
            className="borda-sistema w-32 rounded-[var(--radius)] bg-papel px-3 py-2 font-sans text-marrom"
          />
        </div>

        <SeletorItensCardapio
          secoes={secoes}
          selecionados={selecionados}
          onChange={setSelecionados}
          idPrefixo="caixa"
          tituloSelecao="Itens da mesa"
          instrucao="Toque nos itens consumidos para lançá-los na conta."
          tituloResumo="Conta"
          erro={erroItens}
        />

        {/* Ajustes -------------------------------------------------------- */}
        <section aria-labelledby={`${idBase}-ajustes`} className="flex flex-col gap-4">
          <h2
            id={`${idBase}-ajustes`}
            className="border-b-2 border-oliva pb-1 font-serif text-2xl text-marrom"
          >
            Ajustes
          </h2>
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
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idBase}-obs`} className="font-sans text-marrom">
              Observações
            </label>
            <textarea
              id={`${idBase}-obs`}
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="borda-sistema rounded-[var(--radius)] bg-papel px-3 py-2 font-sans text-marrom"
            />
          </div>
        </section>

        {/* Total ao vivo + fechar conta ---------------------------------------- */}
        <section
          aria-live="polite"
          aria-label="Total da conta"
          className="borda-sistema sticky bottom-0 flex flex-col gap-3 rounded-[var(--radius)] bg-papel p-4"
        >
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
          {pizzasPendentes.length > 0 ? (
            <p className="font-sans text-sm text-paragrafo">
              Pizzas sem tamanho ainda não entram no total.
            </p>
          ) : null}
          {erro ? (
            <p role="alert" className="font-sans text-sm text-marrom">
              {erro}
            </p>
          ) : null}
          <button type="submit" disabled={enviando} className="btn-primario w-fit disabled:opacity-60">
            {enviando ? 'Fechando…' : 'Fechar conta'}
          </button>
        </section>
      </form>
    </div>
  )
}

export default CaixaForm
