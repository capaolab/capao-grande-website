// <HoursTable> — tabela de horários da pizzaria (Requisitos 13.1, 13.2).
//
// Renderiza o array `horarios` do Global_Configuracoes ({ faixa, horario }[])
// como uma tabela semântica. Para valores ausentes/vazios ou marcados como
// "a confirmar", exibe <Placeholder> em cinza no lugar do valor (Req 13.2, 19),
// usando `<Placeholder as="td">` para manter a marcação de tabela válida.
//
// Quando o array inteiro está ausente ou vazio, exibe uma única linha com o
// placeholder (nunca fabrica horários). É um Server Component (sem estado).
//
// Design: sem sombra; borda 1px `var(--color-borda)` via `.borda-sistema`.

import type { ReactElement } from 'react'

import type { Configuracoe } from '@/src/payload-types'

import { isAConfirmar } from '@/lib/design/placeholder'
import { Placeholder } from './Placeholder'

/** Item de horário como aparece no tipo gerado do global. */
type ItemHorario = NonNullable<Configuracoe['horarios']>[number]

export interface HoursTableProps {
  /** Array `horarios` do Global_Configuracoes (pode ser null/vazio). */
  horarios: Configuracoe['horarios']
  /** Classes utilitárias adicionais para a tabela. */
  className?: string
}

export function HoursTable({ horarios, className }: HoursTableProps): ReactElement {
  const linhas: ItemHorario[] = horarios ?? []

  const tableClasses = [
    'borda-sistema w-full border-collapse rounded-[var(--radius)] overflow-hidden text-left',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <table className={tableClasses}>
      <caption className="sr-only">Horários de funcionamento</caption>
      <thead>
        <tr className="border-b border-[color:var(--color-borda)]">
          <th scope="col" className="p-3 font-sans text-[color:var(--color-marrom)]">
            Faixa
          </th>
          <th scope="col" className="p-3 font-sans text-[color:var(--color-marrom)]">
            Horário
          </th>
        </tr>
      </thead>
      <tbody>
        {linhas.length === 0 ? (
          <tr className="border-t border-[color:var(--color-borda-clara)]">
            <Placeholder as="td" label="faixa a confirmar" className="p-3" />
            <Placeholder as="td" label="horário a confirmar" className="p-3" />
          </tr>
        ) : (
          linhas.map((linha, index) => (
            <tr
              key={linha.id ?? index}
              className="border-t border-[color:var(--color-borda-clara)]"
            >
              {isAConfirmar(linha.faixa) ? (
                <Placeholder as="td" label="a confirmar" className="p-3" />
              ) : (
                <td className="p-3 text-[color:var(--color-marrom)]">{linha.faixa}</td>
              )}
              {isAConfirmar(linha.horario) ? (
                <Placeholder as="td" label="a confirmar" className="p-3" />
              ) : (
                <td className="p-3 text-[color:var(--color-paragrafo)]">
                  {linha.horario}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

export default HoursTable
