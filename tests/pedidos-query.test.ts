import { describe, expect, it } from 'vitest'

import {
  dataParaInput,
  inputParaData,
  intervaloDoDia,
  montarQueryPedidos,
} from '../lib/pedidos-api'

// Testes das funções puras da camada de busca de pedidos
// (components/use-pedidos-filtrados.ts consome montarQueryPedidos): a query
// string precisa seguir o formato da REST do Payload e o intervalo do dia
// precisa cobrir exatamente o dia LOCAL convertido para ISO.

describe('intervaloDoDia', () => {
  it('cobre o dia local inteiro (00:00:00.000 → 23:59:59.999) em ISO', () => {
    // 15/03/2026 ao meio-dia local — o fuso do ambiente de teste é o local.
    const referencia = new Date(2026, 2, 15, 12, 30, 0)
    const { inicio, fim } = intervaloDoDia(referencia)

    expect(new Date(inicio).getTime()).toBe(
      new Date(2026, 2, 15, 0, 0, 0, 0).getTime(),
    )
    expect(new Date(fim).getTime()).toBe(
      new Date(2026, 2, 15, 23, 59, 59, 999).getTime(),
    )
  })

  it('qualquer horário do mesmo dia produz o mesmo intervalo', () => {
    const manha = intervaloDoDia(new Date(2026, 5, 10, 6, 0, 0))
    const noite = intervaloDoDia(new Date(2026, 5, 10, 22, 45, 30))
    expect(manha).toEqual(noite)
  })

  it('devolve ISO válido (parseável de volta)', () => {
    const { inicio, fim } = intervaloDoDia(new Date())
    expect(Number.isNaN(new Date(inicio).getTime())).toBe(false)
    expect(Number.isNaN(new Date(fim).getTime())).toBe(false)
  })
})

describe('montarQueryPedidos', () => {
  it('sempre ordena do mais recente e inclui paginação e depth', () => {
    const query = montarQueryPedidos({ pagina: 2, limite: 20 })
    const params = new URLSearchParams(query)

    expect(params.get('sort')).toBe('-createdAt')
    expect(params.get('page')).toBe('2')
    expect(params.get('limit')).toBe('20')
    expect(params.get('depth')).toBe('0')
    expect(params.get('where[createdAt][greater_than_equal]')).toBeNull()
    expect(params.get('where[status][equals]')).toBeNull()
  })

  it('inclui o intervalo do dia quando informado', () => {
    const dia = { inicio: '2026-03-15T03:00:00.000Z', fim: '2026-03-16T02:59:59.999Z' }
    const params = new URLSearchParams(montarQueryPedidos({ pagina: 1, limite: 100, dia }))

    expect(params.get('where[createdAt][greater_than_equal]')).toBe(dia.inicio)
    expect(params.get('where[createdAt][less_than]')).toBe(dia.fim)
  })

  it('inclui o filtro de status quando informado', () => {
    const params = new URLSearchParams(
      montarQueryPedidos({ pagina: 1, limite: 20, status: 'pendente' }),
    )
    expect(params.get('where[status][equals]')).toBe('pendente')
  })

  it('combina dia + status + paginação na mesma query', () => {
    const dia = { inicio: '2026-01-01T00:00:00.000Z', fim: '2026-01-01T23:59:59.999Z' }
    const params = new URLSearchParams(
      montarQueryPedidos({ pagina: 3, limite: 20, dia, status: 'pago' }),
    )

    expect(params.get('page')).toBe('3')
    expect(params.get('where[createdAt][less_than]')).toBe(dia.fim)
    expect(params.get('where[status][equals]')).toBe('pago')
  })
})

describe('dataParaInput / inputParaData', () => {
  it('formata a data local como yyyy-mm-dd', () => {
    expect(dataParaInput(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(dataParaInput(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('interpreta yyyy-mm-dd como data LOCAL (não UTC)', () => {
    const data = inputParaData('2026-03-15')
    expect(data).not.toBeNull()
    expect(data?.getFullYear()).toBe(2026)
    expect(data?.getMonth()).toBe(2)
    expect(data?.getDate()).toBe(15)
  })

  it('rejeita valores malformados', () => {
    expect(inputParaData('')).toBeNull()
    expect(inputParaData('15/03/2026')).toBeNull()
    expect(inputParaData('2026-13-01')).toBeNull()
    expect(inputParaData('2026-02-32')).toBeNull()
    expect(inputParaData('abc')).toBeNull()
  })

  it('ida e volta preservam o dia', () => {
    const original = new Date(2026, 8, 25)
    expect(inputParaData(dataParaInput(original))?.getTime()).toBe(
      new Date(2026, 8, 25, 0, 0, 0, 0).getTime(),
    )
  })
})
