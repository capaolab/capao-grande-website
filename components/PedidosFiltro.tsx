'use client'

// <PedidosFiltro> — filtro de data + paginação dos dashboards de pedidos.
//
// Visão inicial: pedidos do dia (botão "Hoje" ativo). O `<input type="date">`
// permite escolher outro dia; "Todos os pedidos" remove o filtro de data e
// exibe a paginação (Anterior/Próxima + posição), que só aparece nesse modo.
//
// No fim da linha: horário da última atualização da lista (automática, ver
// usePedidosFiltrados) e o botão "Atualizar" para rebuscar na hora.

import { useState, type ReactElement } from 'react'

import { dataParaInput, inputParaData } from '@/lib/pedidos-api'
import type { ModoPedidos } from '@/components/use-pedidos-filtrados'

export interface PedidosFiltroProps {
  modo: ModoPedidos
  dia: Date
  pagina: number
  totalPaginas: number
  totalDocs: number
  onEscolherDia: (data: Date) => void
  onMostrarTodos: () => void
  onPagina: (pagina: number) => void
  /** Horário da última busca bem-sucedida da lista. */
  atualizadoEm: Date | null
  onAtualizar: () => Promise<void>
}

function ehMesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function classesDoChip(ativo: boolean): string {
  return `borda-sistema rounded-full px-3 py-1 font-sans text-sm transition-colors ${
    ativo
      ? 'border-[color:var(--color-marrom)] bg-[color:var(--color-marrom)] text-[color:var(--color-papel)]'
      : 'text-[color:var(--color-paragrafo)] hover-verde'
  }`
}

export function PedidosFiltro({
  modo,
  dia,
  pagina,
  totalPaginas,
  totalDocs,
  onEscolherDia,
  onMostrarTodos,
  onPagina,
  atualizadoEm,
  onAtualizar,
}: PedidosFiltroProps): ReactElement {
  const hojeAtivo = modo === 'dia' && ehMesmoDia(dia, new Date())
  const [atualizando, setAtualizando] = useState(false)

  async function atualizar() {
    setAtualizando(true)
    await onAtualizar()
    setAtualizando(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filtrar por data"
      >
        <button
          type="button"
          aria-pressed={hojeAtivo}
          onClick={() => onEscolherDia(new Date())}
          className={classesDoChip(hojeAtivo)}
        >
          Hoje
        </button>
        <input
          type="date"
          aria-label="Filtrar por data"
          value={dataParaInput(dia)}
          max={dataParaInput(new Date())}
          onChange={(evento) => {
            const data = inputParaData(evento.target.value)
            if (data) onEscolherDia(data)
          }}
          className="border-borda bg-fundo rounded-sm border px-3 py-1 font-sans text-sm text-marrom"
        />
        <button
          type="button"
          aria-pressed={modo === 'todos'}
          onClick={onMostrarTodos}
          className={classesDoChip(modo === 'todos')}
        >
          Todos os pedidos
        </button>
        <span className="ml-auto flex items-center gap-2 font-sans text-sm text-paragrafo">
          {atualizadoEm ? (
            <span>
              Atualizado às{' '}
              {atualizadoEm.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={atualizar}
            disabled={atualizando}
            className={`${classesDoChip(false)} disabled:opacity-50`}
          >
            {atualizando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </span>
      </div>

      {modo === 'todos' && totalPaginas > 1 ? (
        <nav
          aria-label="Paginação de pedidos"
          className="flex flex-wrap items-center gap-3 font-sans text-sm"
        >
          <button
            type="button"
            aria-label="Página anterior"
            disabled={pagina <= 1}
            onClick={() => onPagina(pagina - 1)}
            className="borda-sistema rounded-full px-3 py-1 text-[color:var(--color-paragrafo)] hover-verde transition-colors disabled:opacity-50"
          >
            Anterior
          </button>
          <p role="status" className="text-paragrafo">
            Página {pagina} de {totalPaginas} ({totalDocs}{' '}
            {totalDocs === 1 ? 'pedido' : 'pedidos'})
          </p>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={pagina >= totalPaginas}
            onClick={() => onPagina(pagina + 1)}
            className="borda-sistema rounded-full px-3 py-1 text-[color:var(--color-paragrafo)] hover-verde transition-colors disabled:opacity-50"
          >
            Próxima
          </button>
        </nav>
      ) : null}
    </div>
  )
}

export default PedidosFiltro
