// Página pública /processo (task 12.7, Requisitos 16.1, 16.2, 19.1, 19.2).
//
// Server Component (síncrono): o conteúdo desta página é essencialmente
// estrutural — descreve os 5 passos do processo de produção "da agrofloresta ao
// forno". NÃO há, no design.md nem no requirements.md, texto verbatim para os
// detalhes de cada passo (massa/fermentação/fotos quadradas ainda não estão
// finalizados). Portanto, seguindo o Req 16.2 e a estratégia de placeholder do
// design, esta página:
//
//  - Renderiza os 5 passos via <StepList> (Req 16.1). Cada passo tem apenas um
//    TÍTULO estrutural (o arco plantio → forno) e NÃO recebe `descricao`, de
//    modo que o próprio <StepList> exibe <Placeholder label="detalhes a
//    confirmar" /> no lugar do texto ausente — sem fabricar fatos (Req 16.2,
//    19.1, 19.2).
//  - Para as "fotos quadradas" ausentes de cada passo, usa <CmsImage> sem
//    mídia (media={undefined}), que rende um placeholder listrado 1:1 com
//    legenda do que entraria ali — nunca fabrica imagem (Req 16.2, 19.2).
//  - Usa aquarelas decorativas do repertório permitido (Req 18.8) apenas como
//    ilustração, com `alt=""` (Req 20.1).
//
// Acessibilidade (Req 20.2): um único <h1> na página; <StepList> usa <h3> por
// passo dentro de uma seção com <h2> (hierarquia sequencial h1 → h2 → h3).
//
// Design: sem sombra, tokens da paleta (app/globals.css), borda 1px via
// `.borda-sistema`. NUNCA fabrica dados (Req 19).

import type { ReactElement } from 'react'

import { CmsImage } from '@/components/CmsImage'
import { StepList, type Step } from '@/components/StepList'
import type { WatercolorName } from '@/components/Watercolor'

export const metadata = {
  title: 'O processo | Capão Grande',
  description:
    'Do plantio ao forno: os cinco passos do processo de produção do Capão Grande.',
}

/**
 * Os 5 passos do processo (Req 16.1). Apenas TÍTULOS estruturais do arco
 * "da agrofloresta ao forno" (mesma moldura da home). Nenhum passo recebe
 * `descricao`: os detalhes de massa/produção ainda não estão no spec, então o
 * <StepList> exibe o Placeholder "detalhes a confirmar" (Req 16.2, 19). A
 * aquarela é decorativa (Req 18.8) e a foto quadrada ausente vira um
 * placeholder 1:1 via <CmsImage>.
 */
const PASSOS: Array<{
  titulo: string
  watercolor: WatercolorName
  fotoLabel: string
}> = [
  {
    titulo: 'Na agrofloresta',
    watercolor: 'arvore-1',
    fotoLabel: 'foto do passo a confirmar',
  },
  {
    titulo: 'Colheita dos ingredientes',
    watercolor: 'legumes',
    fotoLabel: 'foto do passo a confirmar',
  },
  {
    titulo: 'Preparo da massa',
    watercolor: 'erva',
    fotoLabel: 'foto do passo a confirmar',
  },
  {
    titulo: 'Montagem da pizza',
    watercolor: 'molho',
    fotoLabel: 'foto do passo a confirmar',
  },
  {
    titulo: 'No forno',
    watercolor: 'palmeira',
    fotoLabel: 'foto do passo a confirmar',
  },
]

export default function ProcessoPage(): ReactElement {
  // Monta os passos para o <StepList>. Sem `descricao` ⇒ o componente exibe
  // <Placeholder> automaticamente (Req 16.2). A foto quadrada de cada passo é
  // um <CmsImage> sem mídia ⇒ placeholder listrado 1:1 com legenda (Req 19.2).
  const steps: Step[] = PASSOS.map((passo) => ({
    titulo: passo.titulo,
    // descricao intencionalmente ausente ⇒ Placeholder "detalhes a confirmar".
    watercolor: passo.watercolor,
    children: (
      <div className="mt-2 w-full max-w-[240px]">
        <CmsImage
          media={undefined}
          square
          sizes="240px"
          placeholderLabel={passo.fotoLabel}
        />
      </div>
    ),
  }))

  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        {/* Único <h1> da página (Req 20.2). */}
        <h1 className="font-serif text-4xl text-verde">O processo</h1>
        <p className="font-sans text-paragrafo">
          Do plantio ao forno: os cinco passos do jeito Capão Grande de produzir.
        </p>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="processo-passos">
        <h2 id="processo-passos" className="font-serif text-2xl text-marrom">
          Da agrofloresta ao forno
        </h2>
        <StepList steps={steps} />
      </section>
    </article>
  )
}
