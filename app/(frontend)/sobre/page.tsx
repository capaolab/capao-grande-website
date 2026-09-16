// Página pública /sobre (task 12.8, Requisitos 17.1, 17.2, 17.3, 19.1).
//
// Server Component assíncrono: lê a Colecao_Cronologia via `getCronologia()`
// (lib/queries.ts) — já ordenada por `ordem` ascendente (via `ordenarCronologia`)
// — e apresenta a história do Capão Grande desde 1992 e a linha do tempo de
// reflorestamento.
//
// Regras de negócio (Req 17):
//  - Intro (Req 17.1): texto curto ancorado no único fato estabelecido — a
//    trajetória do Capão Grande desde 1992. NÃO fabrica marcos, datas ou
//    detalhes históricos específicos; a narrativa detalhada vem dos marcos da
//    cronologia (CMS).
//  - Linha do tempo (Req 17.1, 17.2): delega a <Timeline marcos={cronologia} />,
//    que reordena por `ordem` ascendente e renderiza cada marco.
//  - Ano "a confirmar" (Req 17.3): o próprio <Timeline> exibe <Placeholder>
//    cinza quando o `ano` do marco está ausente/"a confirmar".
//  - Cronologia vazia (Req 19.1): quando não há marcos, exibe <Placeholder>
//    cinza — nunca fabrica uma linha do tempo.
//
// Design: sem sombra, tokens da paleta. Hierarquia de cabeçalhos sequencial:
// um único <h1> na página, <h2> por seção e <h3> por marco (via <Timeline>).

import type { ReactElement } from 'react'

import { Placeholder } from '@/components/Placeholder'
import { Timeline } from '@/components/Timeline'
import { getCronologia } from '@/lib/queries'

export const metadata = {
  title: 'Nossa história | Capão Grande',
  description:
    'A trajetória do Capão Grande desde 1992 e a linha do tempo de reflorestamento.',
}

export default async function SobrePage(): Promise<ReactElement> {
  const cronologia = await getCronologia()

  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-4xl text-verde">Nossa história</h1>
        <p className="max-w-[var(--spacing-leitura)] font-sans text-paragrafo">
          O Capão Grande existe desde 1992. Desta seção em diante, a linha do
          tempo abaixo reúne os marcos da nossa trajetória e do reflorestamento.
        </p>
      </header>

      {/* Linha do tempo (Req 17.1, 17.2, 17.3) ------------------------------- */}
      <section className="flex flex-col gap-4" aria-labelledby="sobre-cronologia">
        <h2 id="sobre-cronologia" className="font-serif text-2xl text-marrom">
          Linha do tempo
        </h2>

        {cronologia.length > 0 ? (
          <Timeline marcos={cronologia} />
        ) : (
          <Placeholder label="linha do tempo a confirmar" as="p" />
        )}
      </section>
    </article>
  )
}
