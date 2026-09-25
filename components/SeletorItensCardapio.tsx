'use client'

// <SeletorItensCardapio> — seleção de itens do cardápio compartilhada pelo
// formulário público de delivery (<PedidoForm>) e pela conta de mesa do caixa
// (<CaixaForm>).
//
// Componente CONTROLADO (o estado `selecionados` fica no formulário pai):
//  - Seletor tipo TAGS: itens agrupados por seção como chips selecionáveis
//    (aria-pressed); a seção Tamanhos NÃO aparece como seção selecionável —
//    seus itens são o seletor de tamanho das pizzas.
//  - Resumo: cada item selecionado vira uma linha com stepper de quantidade
//    (+/−), botão remover e, para PIZZAS (preco: null), seletor de tamanho
//    OBRIGATÓRIO (radios nativos; o preço da pizza vem do tamanho).
//
// `useSelecaoCardapio` concentra o que o pai precisa para calcular/validar:
// mapa id → item, subtotal PARCIAL (espelho de `calcularSubtotal` de
// lib/pedidos.ts — pizzas sem tamanho ficam fora) e pizzas pendentes.

import { useMemo, type ReactElement } from 'react'

import { renderPreco, type SecaoCardapio } from '@/lib/cardapio'
import { calcularSubtotal, type ItemCardapioMinimo, type ItemPedidoEntrada } from '@/lib/pedidos'

/** Item do cardápio no formato serializável recebido da página (Server → Client). */
export interface ItemCardapioPedido {
  id: number
  nome: string
  detalhe: string | null
  /** `null` = pizza (preço resolvido pelo tamanho escolhido). */
  preco: number | null
}

/** Seção do cardápio com os itens selecionáveis (forma serializável). */
export interface SecaoPedido {
  secao: SecaoCardapio
  itens: ItemCardapioPedido[]
}

/** Item selecionado. */
export interface ItemSelecionado {
  /** Id do item do cardápio. */
  id: number
  quantidade: number
  /** Id do tamanho escolhido — obrigatório para pizzas (preco: null). */
  tamanhoId: number | null
}

/** Itens selecionados no formato de entrada da API (`itens` de pedidos/caixa). */
export function paraEntradas(selecionados: ItemSelecionado[]): ItemPedidoEntrada[] {
  return selecionados.map((sel) => ({
    item: sel.id,
    quantidade: sel.quantidade,
    ...(sel.tamanhoId != null ? { tamanho: sel.tamanhoId } : {}),
  }))
}

export function useSelecaoCardapio(secoes: SecaoPedido[], selecionados: ItemSelecionado[]) {
  // Mapa id → item, para resolver nome/preço sem percorrer as seções.
  const itensPorId = useMemo(() => {
    const mapa = new Map<number, ItemCardapioPedido>()
    for (const secao of secoes) {
      for (const item of secao.itens) mapa.set(item.id, item)
    }
    return mapa
  }, [secoes])

  const cardapioMinimo: ItemCardapioMinimo[] = useMemo(
    () =>
      secoes.flatMap((secao) =>
        secao.itens.map((item) => ({
          id: item.id,
          secao: secao.secao,
          nome: item.nome,
          preco: item.preco,
        })),
      ),
    [secoes],
  )

  // Subtotal PARCIAL no cliente, espelhando `calcularSubtotal` do servidor:
  // só entram no cálculo os itens com preço resolvível (pizzas sem tamanho
  // escolhido ficam fora até o tamanho ser escolhido).
  const subtotal = useMemo(() => {
    const resolviveis = selecionados.filter((sel) => {
      const item = itensPorId.get(sel.id)
      return item && (item.preco != null || sel.tamanhoId != null)
    })
    const resultado = calcularSubtotal(paraEntradas(resolviveis), cardapioMinimo)
    return resultado.ok ? resultado.subtotal : 0
  }, [selecionados, itensPorId, cardapioMinimo])

  /** Pizzas selecionadas sem tamanho escolhido (bloqueiam a submissão). */
  const pizzasPendentes = selecionados.filter((sel) => {
    const item = itensPorId.get(sel.id)
    return item && item.preco == null && sel.tamanhoId == null
  })

  return { itensPorId, subtotal, pizzasPendentes }
}

export interface SeletorItensCardapioProps {
  secoes: SecaoPedido[]
  selecionados: ItemSelecionado[]
  onChange: (selecionados: ItemSelecionado[]) => void
  /** Prefixo dos ids (títulos/erros) — evita colisão entre formulários. */
  idPrefixo: string
  tituloSelecao: string
  instrucao: string
  tituloResumo: string
  /** Mensagem de erro de validação dos itens (inline, role="alert"). */
  erro?: string
}

export function SeletorItensCardapio({
  secoes,
  selecionados,
  onChange,
  idPrefixo,
  tituloSelecao,
  instrucao,
  tituloResumo,
  erro,
}: SeletorItensCardapioProps): ReactElement {
  const { itensPorId } = useSelecaoCardapio(secoes, selecionados)

  const secoesSelecionaveis = secoes.filter((s) => s.secao !== 'Tamanhos')
  const tamanhos = secoes.find((s) => s.secao === 'Tamanhos')?.itens ?? []

  function estaSelecionado(id: number): boolean {
    return selecionados.some((sel) => sel.id === id)
  }

  function alternarItem(item: ItemCardapioPedido) {
    onChange(
      estaSelecionado(item.id)
        ? selecionados.filter((sel) => sel.id !== item.id)
        : [...selecionados, { id: item.id, quantidade: 1, tamanhoId: null }],
    )
  }

  function alterarQuantidade(id: number, delta: number) {
    onChange(
      selecionados.map((sel) =>
        sel.id === id ? { ...sel, quantidade: Math.max(1, sel.quantidade + delta) } : sel,
      ),
    )
  }

  function alterarTamanho(id: number, tamanhoId: number) {
    onChange(selecionados.map((sel) => (sel.id === id ? { ...sel, tamanhoId } : sel)))
  }

  function removerItem(id: number) {
    onChange(selecionados.filter((sel) => sel.id !== id))
  }

  function precoExibido(sel: ItemSelecionado): number | null {
    const item = itensPorId.get(sel.id)
    if (!item) return null
    if (item.preco != null) return item.preco
    if (sel.tamanhoId != null) return itensPorId.get(sel.tamanhoId)?.preco ?? null
    return null
  }

  return (
    <>
      {/* Seletor de produtos (chips) ---------------------------------------- */}
      <section aria-labelledby={`${idPrefixo}-itens-titulo`} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2
            id={`${idPrefixo}-itens-titulo`}
            className="border-b-2 border-[color:var(--color-oliva)] pb-1 font-serif text-2xl text-[color:var(--color-marrom)]"
          >
            {tituloSelecao}
          </h2>
          <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">{instrucao}</p>
          {erro ? (
            <p
              id={`${idPrefixo}-erro-itens`}
              role="alert"
              className="font-sans text-sm text-[color:var(--color-marrom)]"
            >
              {erro}
            </p>
          ) : null}
        </div>

        {secoesSelecionaveis.map((grupo) => (
          <div key={grupo.secao} className="flex flex-col gap-3">
            <h3 className="font-serif text-xl text-[color:var(--color-marrom)]">
              {grupo.secao}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {grupo.itens.map((item) => {
                const ativo = estaSelecionado(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => alternarItem(item)}
                      className={`borda-sistema flex flex-col gap-0.5 rounded-[var(--radius)] px-4 py-2 text-left font-sans transition-colors ${
                        ativo
                          ? 'border-[color:var(--color-marrom)] bg-[color:var(--color-marrom)] text-[color:var(--color-papel)] hover:bg-[color:var(--color-marrom-escuro)]'
                          : 'text-[color:var(--color-paragrafo)] hover-verde'
                      }`}
                    >
                      <span
                        className={
                          ativo
                            ? 'text-[color:var(--color-papel)]'
                            : 'text-[color:var(--color-marrom)]'
                        }
                      >
                        {item.nome}
                      </span>
                      <span className="text-sm">
                        {item.detalhe ? `${item.detalhe} · ` : ''}
                        {item.preco != null ? renderPreco(item.preco) : 'escolha o tamanho'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>

      {/* Resumo dos itens selecionados (tags) --------------------------------- */}
      <section aria-labelledby={`${idPrefixo}-resumo-titulo`} className="flex flex-col gap-3">
        <h2
          id={`${idPrefixo}-resumo-titulo`}
          className="border-b-2 border-[color:var(--color-oliva)] pb-1 font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          {tituloResumo}
        </h2>

        <div aria-live="polite">
          {selecionados.length === 0 ? (
            <p className="font-sans text-[color:var(--color-paragrafo)]">
              Nenhum item selecionado ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {selecionados.map((sel) => {
                const item = itensPorId.get(sel.id)
                if (!item) return null
                const ehPizza = item.preco == null
                const pendente = ehPizza && sel.tamanhoId == null
                const preco = precoExibido(sel)

                return (
                  <li
                    key={sel.id}
                    className={`borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-4 ${
                      pendente ? 'border-[color:var(--color-verde)]' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-sans text-[color:var(--color-marrom)]">
                          {item.nome}
                        </span>
                        {preco != null ? (
                          <span className="font-sans text-sm text-[color:var(--color-paragrafo)]">
                            {renderPreco(preco)} cada
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stepper de quantidade */}
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(sel.id, -1)}
                          disabled={sel.quantidade <= 1}
                          aria-label={`Diminuir quantidade de ${item.nome}`}
                          className="borda-sistema hover-verde inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] font-sans text-[color:var(--color-marrom)] transition-colors disabled:opacity-40"
                        >
                          −
                        </button>
                        <span
                          aria-label={`Quantidade de ${item.nome}: ${sel.quantidade}`}
                          className="min-w-6 text-center font-sans text-[color:var(--color-marrom)]"
                        >
                          {sel.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(sel.id, 1)}
                          aria-label={`Aumentar quantidade de ${item.nome}`}
                          className="borda-sistema hover-verde inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] font-sans text-[color:var(--color-marrom)] transition-colors"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removerItem(sel.id)}
                          aria-label={`Remover ${item.nome}`}
                          className="hover-verde ml-1 font-sans text-sm text-[color:var(--color-paragrafo)] underline transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    {/* Seletor de tamanho DENTRO da linha da pizza (obrigatório
                        para pizzas; o preço exibido é o do tamanho). */}
                    {ehPizza ? (
                      <fieldset
                        className={`flex flex-col gap-2 rounded-[var(--radius)] ${
                          pendente ? 'border border-[color:var(--color-verde)] p-3' : ''
                        }`}
                      >
                        <legend className="px-1 font-sans text-sm text-[color:var(--color-marrom)]">
                          {pendente ? 'Escolha o tamanho (obrigatório):' : 'Tamanho escolhido:'}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {tamanhos.map((tamanho) => (
                            <label
                              key={tamanho.id}
                              className={`borda-sistema cursor-pointer rounded-[var(--radius)] px-3 py-1.5 font-sans text-sm transition-colors ${
                                sel.tamanhoId === tamanho.id
                                  ? 'border-[color:var(--color-marrom)] bg-[color:var(--color-marrom)] text-[color:var(--color-papel)] hover:bg-[color:var(--color-marrom-escuro)]'
                                  : 'text-[color:var(--color-paragrafo)] hover-verde'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`${idPrefixo}-tamanho-${sel.id}`}
                                value={tamanho.id}
                                checked={sel.tamanhoId === tamanho.id}
                                onChange={() => alterarTamanho(sel.id, tamanho.id)}
                                className="sr-only"
                              />
                              {tamanho.nome}
                              {tamanho.preco != null ? ` — ${renderPreco(tamanho.preco)}` : ''}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}

export default SeletorItensCardapio
