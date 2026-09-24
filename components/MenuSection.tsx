// <MenuSection> — seção do cardápio agrupada por `secao` (Req 14.1, 14.3, 14.4).
//
// Renderiza um grupo do cardápio: nome do item à ESQUERDA e PREÇO À DIREITA
// (Req 14.3), separados por um filete fino. O preço é um NÚMERO formatado como
// moeda pt-BR via `renderPreco(item.preco)` (Tarefa 6 de
// docs/features/delivery-pedidos.md — o Req 6.3/14.4 de preço-texto foi
// revogado): a saída ("R$ 30,00") é visualmente idêntica ao cardápio impresso.
//
// Itens com `preco: null`: quando a seção é 'Pizzas', exibe o texto "ver
// tamanhos" (fidelidade ao cardápio impresso — o preço da pizza depende do
// tamanho, seção Tamanhos); nas demais seções, cai no <Placeholder>.
// Placeholders (Req 19): quando `nome`, `detalhe` ou `preco` estão ausentes,
// exibe <Placeholder> em vez de fabricar dados. O agrupamento/ordenação por
// `ordem` é feito por `agruparCardapio` (lib/cardapio.ts) na camada de página;
// este componente recebe um grupo já ordenado.
//
// Design: filete oliva `var(--color-oliva)` no título; sem sombra; divisores
// 1px `var(--color-borda-clara)`.

import type { ReactElement } from 'react'

import type { Cardapio } from '@/src/payload-types'

import { renderPreco, type SecaoCardapio } from '@/lib/cardapio'
import { Placeholder } from './Placeholder'

export interface MenuSectionProps {
  /** Nome da seção (Pizzas, Tamanhos, Bebidas, Vinhos). */
  secao: SecaoCardapio
  /** Itens da seção, já ordenados por `ordem` (ver `agruparCardapio`). */
  itens: Cardapio[]
  /** Classes utilitárias adicionais para a seção. */
  className?: string
}

export function MenuSection({ secao, itens, className }: MenuSectionProps): ReactElement {
  const sectionClasses = ['flex flex-col gap-4', className].filter(Boolean).join(' ')

  return (
    <section className={sectionClasses}>
      {/* Título da seção com filete oliva (Req 14.1). */}
      <h2 className="border-b-2 border-[color:var(--color-oliva)] pb-1 font-serif text-2xl text-[color:var(--color-marrom)]">
        {secao}
      </h2>

      <ul className="flex flex-col">
        {itens.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-4 border-b border-[color:var(--color-borda-clara)] py-3"
          >
            <div className="flex flex-col gap-1">
              {item.nome != null && item.nome.trim() !== '' ? (
                <span className="text-[color:var(--color-marrom)]">{item.nome}</span>
              ) : (
                <Placeholder label="nome a confirmar" />
              )}
              {item.detalhe != null && item.detalhe.trim() !== '' ? (
                <span className="text-sm text-[color:var(--color-paragrafo)]">
                  {item.detalhe}
                </span>
              ) : null}
            </div>

            {/* PREÇO À DIREITA, formatado via renderPreco (Req 14.3; Tarefa 6
                de delivery-pedidos.md). `preco: null` na seção Pizzas exibe
                "ver tamanhos" (o preço da pizza depende do tamanho); nas demais
                seções, preço ausente cai no placeholder (Req 19). */}
            {item.preco != null ? (
              <span className="whitespace-nowrap text-right font-serif text-[color:var(--color-marrom)]">
                {renderPreco(item.preco)}
              </span>
            ) : secao === 'Pizzas' ? (
              <span className="whitespace-nowrap text-right font-serif text-[color:var(--color-marrom)]">
                ver tamanhos
              </span>
            ) : (
              <Placeholder label="preço a confirmar" className="whitespace-nowrap text-right" />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default MenuSection
