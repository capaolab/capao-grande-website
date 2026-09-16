// <Timeline> — linha do tempo da cronologia (Requisitos 17.1, 17.2, 17.3).
//
// Recebe os marcos da Colecao_Cronologia e os ordena por `ordem` ascendente
// via `ordenarCronologia` (lib/cronologia.ts) (Req 17.2). Renderiza uma lista
// semântica (`<ol>`), um item por marco: ano, título, texto e ilustração
// opcional via <CmsImage>.
//
// Placeholder do ano (Req 17.3): quando `ano` é ausente/"a confirmar"
// (via `isAConfirmar`) OU a frase literal "ano a confirmar" da cronologia,
// exibe <Placeholder> em cinza. Valores legítimos como "hoje" e "1992" são
// exibidos como estão. Texto ausente também vira <Placeholder> (Req 19).
//
// Design: aquarela por marco sem sombra/borda; divisores 1px.

import type { ReactElement } from 'react'

import type { Cronologia } from '@/src/payload-types'

import { ordenarCronologia } from '@/lib/cronologia'
import { isAConfirmar } from '@/lib/design/placeholder'
import { CmsImage } from './CmsImage'
import { Placeholder } from './Placeholder'

export interface TimelineProps {
  /** Marcos da cronologia (serão ordenados por `ordem` internamente). */
  marcos: Cronologia[]
  /** Classes utilitárias adicionais para a lista. */
  className?: string
}

/**
 * `true` quando o `ano` deve ser exibido como placeholder: valor ausente/vazio,
 * o marcador canônico "a confirmar" (via `isAConfirmar`), ou a frase própria da
 * cronologia "ano a confirmar" (Req 7.2, 17.3).
 */
function anoPendente(ano: string | null | undefined): boolean {
  if (isAConfirmar(ano)) return true
  const normalizado = (ano ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return normalizado === 'ano a confirmar'
}

export function Timeline({ marcos, className }: TimelineProps): ReactElement {
  const ordenados = ordenarCronologia(marcos)

  const listClasses = ['flex list-none flex-col gap-8', className]
    .filter(Boolean)
    .join(' ')

  return (
    <ol className={listClasses}>
      {ordenados.map((marco) => (
        <li
          key={marco.id}
          className="flex flex-col gap-3 border-b border-[color:var(--color-borda-clara)] pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <div className="flex flex-1 flex-col gap-2">
            {/* Ano em destaque (EB Garamond); placeholder cinza se pendente. */}
            {anoPendente(marco.ano) ? (
              <Placeholder label="ano a confirmar" />
            ) : (
              <span className="font-serif text-2xl text-[color:var(--color-verde)]">
                {marco.ano}
              </span>
            )}

            <h3 className="font-serif text-xl text-[color:var(--color-marrom)]">
              {marco.titulo}
            </h3>

            {marco.texto != null && marco.texto.trim() !== '' ? (
              <p className="text-[color:var(--color-paragrafo)]">{marco.texto}</p>
            ) : (
              <Placeholder label="texto a confirmar" as="p" />
            )}
          </div>

          {/* Uma aquarela/ilustração por marco, alinhada à direita em telas
              largas; desce abaixo do texto em telas estreitas (Req 17.1). */}
          {marco.ilustracao != null ? (
            <div className="w-full sm:w-40 sm:shrink-0">
              <CmsImage
                media={marco.ilustracao}
                sizes="(max-width: 640px) 100vw, 160px"
                placeholderLabel="ilustração a confirmar"
              />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export default Timeline
