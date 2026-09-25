'use client'

// usePedidosFiltrados — estado e fetch compartilhados dos dashboards de
// pedidos (<PedidosCliente> e <PedidosFuncionario>).
//
// Visão inicial: sempre os pedidos do DIA (local). O filtro permite escolher
// outro dia ou ver TODOS os pedidos — nesse modo a lista é paginada no
// servidor (REST do Payload, `page`/`limit`).
//
// `status` (opcional, usado pelo funcionário) só é enviado ao servidor no
// modo 'todos': no modo 'dia' o conjunto completo do dia já está em memória
// e o filtro por status é feito no cliente (mantendo as contagens dos chips
// corretas). Mudar modo/dia/status volta para a página 1.
//
// `colecao` escolhe a collection (delivery ou pimenta em mel — mesmo formato).

import { useCallback, useEffect, useState } from 'react'

import {
  buscarPedidosPaginado,
  intervaloDoDia,
  type ColecaoPedidos,
  type PedidoResumo,
} from '@/lib/pedidos-api'

/** Limite alto para o modo 'dia' (o dia inteiro cabe numa única resposta). */
export const LIMITE_PEDIDOS_DIA = 100
/** Tamanho da página no modo 'todos'. */
export const LIMITE_PEDIDOS_PAGINA = 20

export type ModoPedidos = 'dia' | 'todos'

export type EstadoPedidos =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | {
      tipo: 'pronto'
      pedidos: PedidoResumo[]
      totalDocs: number
      totalPaginas: number
    }

export function usePedidosFiltrados(status?: string, colecao: ColecaoPedidos = 'pedidos') {
  const [modo, setModo] = useState<ModoPedidos>('dia')
  const [dia, setDiaState] = useState<Date>(() => new Date())
  const [pagina, setPagina] = useState(1)
  const [estado, setEstado] = useState<EstadoPedidos>({ tipo: 'carregando' })
  const [recarregamento, setRecarregamento] = useState(0)

  // Mudança de status volta para a página 1 (padrão "ajustar estado durante
  // a renderização", como no SiteHeader).
  const [ultimoStatus, setUltimoStatus] = useState(status)
  if (ultimoStatus !== status) {
    setUltimoStatus(status)
    setPagina(1)
  }

  // Identifica a consulta atual; quando muda (modo/dia/página/status ou
  // recarregar()), volta ao estado 'carregando' ainda na renderização —
  // setState síncrono dentro do effect dispararia cascading renders.
  const consulta = `${colecao}|${modo}|${dia.getTime()}|${pagina}|${status ?? ''}|${recarregamento}`
  const [ultimaConsulta, setUltimaConsulta] = useState(consulta)
  if (ultimaConsulta !== consulta) {
    setUltimaConsulta(consulta)
    setEstado({ tipo: 'carregando' })
  }

  useEffect(() => {
    let ativo = true

    const filtro =
      modo === 'dia'
        ? { pagina: 1, limite: LIMITE_PEDIDOS_DIA, dia: intervaloDoDia(dia) }
        : {
            pagina,
            limite: LIMITE_PEDIDOS_PAGINA,
            ...(status ? { status } : {}),
          }

    buscarPedidosPaginado(filtro, colecao)
      .then((res) => {
        if (!ativo) return
        setEstado({
          tipo: 'pronto',
          pedidos: res.docs,
          totalDocs: res.totalDocs,
          totalPaginas: res.totalPaginas,
        })
      })
      .catch(() => {
        if (ativo) setEstado({ tipo: 'erro' })
      })

    return () => {
      ativo = false
    }
  }, [colecao, modo, dia, pagina, status, recarregamento])

  /** Seleciona um dia específico (ativa o modo 'dia'). */
  const escolherDia = useCallback((data: Date) => {
    setDiaState(data)
    setModo('dia')
    setPagina(1)
  }, [])

  /** Ativa o modo 'todos' (sem filtro de data, com paginação). */
  const mostrarTodos = useCallback(() => {
    setModo('todos')
    setPagina(1)
  }, [])

  const recarregar = useCallback(() => {
    setRecarregamento((n) => n + 1)
  }, [])

  /** Atualização local otimista de um pedido já carregado (ex.: mudança de
      status pelo funcionário) — sem refetch. */
  const atualizarLocal = useCallback(
    (id: number, atualizacao: Partial<PedidoResumo>) => {
      setEstado((atual) =>
        atual.tipo === 'pronto'
          ? {
              ...atual,
              pedidos: atual.pedidos.map((p) =>
                p.id === id ? { ...p, ...atualizacao } : p,
              ),
            }
          : atual,
      )
    },
    [],
  )

  return {
    estado,
    modo,
    dia,
    pagina,
    escolherDia,
    mostrarTodos,
    setPagina,
    recarregar,
    atualizarLocal,
  }
}
