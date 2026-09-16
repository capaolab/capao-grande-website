// <Placeholder> — Placeholder_AConfirmar (Requisitos 19.1, 19.2).
//
// Componente puramente apresentacional: renderiza o rótulo fornecido em cinza
// (`--color-placeholder` = #a89c8a) para representar dados ausentes ou marcados
// como "a confirmar". Ele NUNCA fabrica dados — só exibe o `label` recebido pela
// página/componente pai (design "Estratégia de placeholder 'a confirmar'").
//
// É um Server Component (sem 'use client'): não tem estado nem interatividade.
// A decisão de renderizar o placeholder (via `isAConfirmar`) fica na camada de
// UI que consome o dado; este componente apenas apresenta o rótulo.

import type { ReactElement } from 'react'

export interface PlaceholderProps {
  /**
   * Texto exibido no lugar do dado pendente, ex.: "a confirmar",
   * "WhatsApp a confirmar". Deve ser um rótulo descritivo, nunca um dado real
   * fabricado.
   */
  label: string
  /**
   * Elemento HTML usado para envolver o rótulo. Padrão: `span` (inline).
   * Permite que a página escolha um elemento coerente com o contexto
   * (ex.: `td` numa tabela) sem quebrar a hierarquia de cabeçalhos (Req 20.2).
   */
  as?: 'span' | 'p' | 'div' | 'td' | 'dd' | 'li'
  /** Classes utilitárias adicionais para posicionamento no layout. */
  className?: string
}

/**
 * Renderiza o `Placeholder_AConfirmar` em cinza (#a89c8a via
 * `text-placeholder`), em itálico para diferenciar visualmente de conteúdo
 * real, sem sombra nem borda (Req 18.3). O texto é acessível como conteúdo
 * normal de leitura de tela (não usa `aria-hidden`), pois comunica que o dado
 * está pendente.
 */
export function Placeholder({
  label,
  as: Tag = 'span',
  className,
}: PlaceholderProps): ReactElement {
  const classes = ['text-placeholder', 'italic', className]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} data-placeholder="a-confirmar">
      {label}
    </Tag>
  )
}

export default Placeholder
