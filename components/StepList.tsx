// <StepList> — lista ordenada de passos (Requisitos 15.1, 16.1).
//
// Usada em /delivery (3 passos: WhatsApp, Pix com QR, taxa por distância) e em
// /processo (5 passos de produção). Renderiza um `<ol>` para semântica de
// ordem correta; a numeração é estilizada em oliva (`var(--color-oliva)`).
//
// Cada passo pode ter uma ilustração/aquarela (via <CmsImage> ou <Watercolor>)
// e conteúdo extra passado como `children` do passo. Quando a descrição de um
// passo está ausente, exibe <Placeholder> em vez de fabricar (Req 16.2, 19).
//
// É apresentacional (Server Component): recebe os passos prontos.

import type { ReactElement, ReactNode } from 'react'

import { Watercolor, type WatercolorName } from './Watercolor'
import { Placeholder } from './Placeholder'

export interface Step {
  /** Título/rótulo do passo (ex.: "Peça pelo WhatsApp"). */
  titulo: string
  /** Descrição do passo; ausente ⇒ <Placeholder> (Req 16.2). */
  descricao?: string | null
  /** Aquarela decorativa opcional do passo (Req 18.8). */
  watercolor?: WatercolorName
  /** Conteúdo adicional do passo (ex.: QR do Pix, taxas, links). */
  children?: ReactNode
}

export interface StepListProps {
  /** Passos exibidos em ordem (a numeração segue o índice). */
  steps: Step[]
  /** Classes utilitárias adicionais para a lista. */
  className?: string
}

export function StepList({ steps, className }: StepListProps): ReactElement {
  const listClasses = ['flex list-none flex-col gap-6', className]
    .filter(Boolean)
    .join(' ')

  return (
    <ol className={listClasses}>
      {steps.map((step, index) => (
        <li
          key={step.titulo + index}
          className="borda-sistema flex gap-4 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-5"
        >
          {/* Numeração estilizada em oliva (Req 16.1). Decorativa: o número é
              parte da lista ordenada; usamos aria-hidden para não duplicar a
              contagem que o <ol> já comunica. */}
          <span
            aria-hidden="true"
            className="font-serif text-3xl leading-none text-[color:var(--color-oliva)]"
          >
            {index + 1}
          </span>

          <div className="flex flex-1 flex-col gap-2">
            <h3 className="font-serif text-xl text-[color:var(--color-marrom)]">
              {step.titulo}
            </h3>

            {step.descricao != null && step.descricao.trim() !== '' ? (
              <p className="text-[color:var(--color-paragrafo)]">{step.descricao}</p>
            ) : (
              <Placeholder label="detalhes a confirmar" as="p" />
            )}

            {step.watercolor ? (
              <Watercolor
                name={step.watercolor}
                width={80}
                height={80}
                className="h-auto w-20"
              />
            ) : null}

            {step.children}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default StepList
