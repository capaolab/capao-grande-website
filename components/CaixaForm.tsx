'use client'

// <CaixaForm> — caixa da pizzaria (docs/features/caixa-historico.md e
// docs/features/caixa-contas-fechadas.md).
//
// Duas abas:
//  1. "Lançar conta": mesa (opcional), itens do cardápio
//     (<SeletorItensCardapio>, o mesmo do delivery) e observações, com o
//     subtotal ao vivo. "Fechar conta" grava a conta como `fechada`
//     (POST /api/caixa) — o servidor recalcula tudo a partir do cardápio — e
//     leva à aba "Contas". Uma conta reaberta volta a esta aba com os itens
//     dela, e salvar a mantém fechada (PATCH).
//  2. "Contas" (<CaixaContas>): contas fechadas para reabrir ou seguir para o
//     pagamento, e contas em pagamento para retomar.
//
// O pagamento é o fluxo existente: <CaixaPagamento> — rateio por pessoa,
// forma de pagamento e check de pago.

import { useId, useState, type ReactElement } from 'react'

import { formatarCentavos, paraCentavos } from '@/lib/caixa'
import { atualizarConta, criarConta, type ContaCaixa } from '@/lib/caixa-api'

import { CaixaContas } from './CaixaContas'
import { CaixaPagamento } from './CaixaPagamento'
import {
  paraEntradas,
  SeletorItensCardapio,
  useSelecaoCardapio,
  type ItemSelecionado,
  type SecaoPedido,
} from './SeletorItensCardapio'

export interface CaixaFormProps {
  /** Seções do cardápio (apenas itens ativos), na ordem de exibição. */
  secoes: SecaoPedido[]
}

type Aba = 'lancar' | 'contas'

export function CaixaForm({ secoes }: CaixaFormProps): ReactElement {
  const idBase = useId()
  const [aba, setAba] = useState<Aba>('lancar')
  // Conta aberta no rateio (fluxo de pagamento).
  const [pagando, setPagando] = useState<ContaCaixa | null>(null)
  // Conta fechada reaberta no lançamento.
  const [editando, setEditando] = useState<ContaCaixa | null>(null)

  const [mesa, setMesa] = useState('')
  const [selecionados, setSelecionados] = useState<ItemSelecionado[]>([])
  const [observacoes, setObservacoes] = useState('')
  const [erroItens, setErroItens] = useState<string | undefined>()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const { subtotal, pizzasPendentes } = useSelecaoCardapio(secoes, selecionados)

  function limpar() {
    setEditando(null)
    setMesa('')
    setSelecionados([])
    setObservacoes('')
    setErroItens(undefined)
    setErro(null)
  }

  function reabrir(conta: ContaCaixa) {
    limpar()
    setEditando(conta)
    setMesa(conta.mesa ?? '')
    setObservacoes(conta.observacoes ?? '')
    setSelecionados(
      conta.itens.map((linha) => ({
        id: linha.item,
        quantidade: linha.quantidade,
        tamanhoId: linha.tamanho ?? null,
      })),
    )
    setAba('lancar')
  }

  function voltarAoCaixa() {
    setPagando(null)
    limpar()
    setAba('contas')
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

    const dados = {
      mesa: mesa.trim() || undefined,
      itens: paraEntradas(selecionados),
      observacoes: observacoes.trim() || undefined,
    }
    setEnviando(true)
    try {
      if (editando) await atualizarConta(editando.id, dados)
      else await criarConta(dados)
      limpar()
      setAba('contas')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível fechar a conta.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Pagamento ─────────────────────────────────────────────────────────────
  if (pagando) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={voltarAoCaixa}
          className="hover-verde w-fit font-sans text-sm text-paragrafo underline transition-colors"
        >
          ← Voltar às contas
        </button>
        <CaixaPagamento
          key={pagando.id}
          conta={pagando}
          onAtualizada={setPagando}
          onNovaConta={() => {
            setPagando(null)
            limpar()
            setAba('lancar')
          }}
        />
      </div>
    )
  }

  const classeAba = (ativa: boolean) =>
    `border-b-2 px-4 py-2 font-sans transition-colors ${
      ativa ? 'border-verde text-marrom' : 'border-transparent text-paragrafo hover-verde'
    }`

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="Caixa" className="flex gap-2 border-b border-borda">
        <button
          type="button"
          role="tab"
          id={`${idBase}-aba-lancar`}
          aria-selected={aba === 'lancar'}
          aria-controls={`${idBase}-painel`}
          onClick={() => setAba('lancar')}
          className={classeAba(aba === 'lancar')}
        >
          Lançar conta
        </button>
        <button
          type="button"
          role="tab"
          id={`${idBase}-aba-contas`}
          aria-selected={aba === 'contas'}
          aria-controls={`${idBase}-painel`}
          onClick={() => setAba('contas')}
          className={classeAba(aba === 'contas')}
        >
          Contas
        </button>
      </div>

      <div
        role="tabpanel"
        id={`${idBase}-painel`}
        aria-labelledby={`${idBase}-aba-${aba}`}
      >
        {aba === 'contas' ? (
          <CaixaContas onReabrir={reabrir} onPagar={setPagando} />
        ) : (
          <form onSubmit={fecharConta} noValidate className="flex flex-col gap-10">
            {editando ? (
              <div className="borda-sistema flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] bg-papel p-4">
                <p className="font-sans text-marrom">
                  Editando a conta #{editando.codigo}
                  {editando.mesa ? ` · Mesa ${editando.mesa}` : ''}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    limpar()
                    setAba('contas')
                  }}
                  className="hover-verde font-sans text-sm text-paragrafo underline transition-colors"
                >
                  Cancelar edição
                </button>
              </div>
            ) : null}

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

            {/* Subtotal ao vivo + fechar conta ------------------------------ */}
            <section
              aria-live="polite"
              aria-label="Subtotal da conta"
              className="borda-sistema sticky bottom-0 flex flex-col gap-3 rounded-[var(--radius)] bg-papel p-4"
            >
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-sans text-sm">
                <dt className="font-serif text-xl text-marrom">Subtotal</dt>
                <dd className="text-right font-serif text-xl text-marrom">
                  {formatarCentavos(paraCentavos(subtotal))}
                </dd>
              </dl>
              <p className="font-sans text-sm text-paragrafo">
                Taxa de serviço e desconto são definidos no caixa, ao seguir para o pagamento.
              </p>
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
              <button
                type="submit"
                disabled={enviando}
                className="btn-primario w-fit disabled:opacity-60"
              >
                {enviando ? 'Salvando…' : editando ? 'Salvar conta' : 'Fechar conta'}
              </button>
            </section>
          </form>
        )}
      </div>
    </div>
  )
}

export default CaixaForm
