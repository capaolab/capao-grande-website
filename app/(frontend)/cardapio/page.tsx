// Página pública `/cardapio` (task 12.5) — Server Component assíncrono.
//
// Estrutura (Requisitos 14.1–14.4, 20.2):
//  - Busca os itens ATIVOS já agrupados por `secao` e ordenados por `ordem`
//    via getCardapioAgrupado() (lib/queries.ts → agruparCardapio). O
//    agrupamento/ordenação é lógica pura testada por propriedade; a página
//    apenas orquestra a leitura e a renderização.
//  - Para cada grupo `{ secao, itens }`, renderiza <MenuSection>, que exibe o
//    nome à esquerda e o PREÇO À DIREITA formatado como moeda pt-BR via
//    renderPreco (Req 14.3; Tarefa 6 de delivery-pedidos.md). A página NÃO
//    reformata preço em lugar nenhum.
//  - Quando não há itens ativos (lista vazia), exibe <Placeholder> em vez de
//    fabricar conteúdo (design "Estratégia de placeholder 'a confirmar'").
//
// Acessibilidade (Req 20.2): exatamente UM <h1> ("Cardápio"). Cada
// <MenuSection> usa <h2> por seção, mantendo a hierarquia sequencial h1 -> h2.
//
// Design: sem sombra; tokens do sistema de design (app/globals.css).
// Next 16 App Router: página é async (Server Component).

import type { ReactElement } from 'react'

import { MenuSection } from '@/components/MenuSection'
import { Placeholder } from '@/components/Placeholder'
import { getCardapioAgrupado } from '@/lib/queries'

export default async function CardapioPage(): Promise<ReactElement> {
  const grupos = await getCardapioAgrupado()

  return (
    <div className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Cardápio
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          Cardápio
        </h1>
      </header>

      {grupos.length > 0 ? (
        <div className="flex flex-col gap-12">
          {grupos.map((grupo) => (
            <MenuSection key={grupo.secao} secao={grupo.secao} itens={grupo.itens} />
          ))}
        </div>
      ) : (
        // Sem itens ativos: nenhum conteúdo fabricado (Req 19.1).
        <Placeholder label="Cardápio a confirmar" as="p" />
      )}
    </div>
  )
}
