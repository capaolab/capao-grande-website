// Tipos e fetch dos dashboards de pedidos (docs/features/dashboard-pedidos.md)
// — delivery (`pedidos`) e pimenta em mel (`pedidos-pimenta`,
// docs/features/pimenta-em-mel.md), que compartilham o mesmo formato-resumo
// — consumidos pelos client components `PedidosCliente` e
// `PedidosFuncionario` (via components/use-pedidos-filtrados.ts). A filtragem
// por papel NÃO acontece aqui: a API REST do Payload aplica o access da
// collection `pedidos` (cliente recebe só os pedidos do próprio telefone;
// funcionário/admin recebem todos).
//
// `montarQueryPedidos`, `intervaloDoDia`, `dataParaInput` e `inputParaData`
// são funções PURAS (sem fetch) — testáveis em tests/pedidos-query.test.ts.

/** Item de um pedido no formato devolvido pela REST API (snapshots). */
export interface ItemPedidoResumo {
  id?: string
  nomeSnapshot?: string | null
  quantidade: number
  precoUnitario?: number | null
}

/** Collections de pedidos com o mesmo funil de status. */
export type ColecaoPedidos = 'pedidos' | 'pedidos-pimenta'

/** Pedido no formato devolvido pela REST API. */
export interface PedidoResumo {
  id: number
  codigo: string
  nome: string
  telefone: string
  status: string
  subtotal?: number | null
  localidade?: string | null
  createdAt: string
  itens: ItemPedidoResumo[]
  /** Só em `pedidos-pimenta`: entrega ou retirada (delivery = entrega). */
  modalidade?: 'entrega' | 'retirada' | null
  /** Só em `pedidos-pimenta`: restaurante/comércio (opcional). */
  estabelecimento?: string | null
}

/** Filtro de busca de pedidos (data em ISO, no formato da REST do Payload). */
export interface FiltroBuscaPedidos {
  pagina: number
  limite: number
  /** Intervalo [início, fim) do dia em ISO; ausente = sem filtro de data. */
  dia?: { inicio: string; fim: string }
  /** Status canônico (lib/status-pedido.ts); ausente = todos os status. */
  status?: string
}

/** Página de resultados no formato paginado da REST do Payload. */
export interface PaginaPedidos {
  docs: PedidoResumo[]
  totalDocs: number
  totalPaginas: number
  pagina: number
}

/**
 * Intervalo do dia LOCAL do navegador que contém `data`
 * (00:00:00.000 → 23:59:59.999) convertido para ISO — o `createdAt` dos
 * pedidos é UTC, então a comparação no servidor precisa do ISO exato.
 */
export function intervaloDoDia(data: Date): { inicio: string; fim: string } {
  const inicio = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    0, 0, 0, 0,
  )
  const fim = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    23, 59, 59, 999,
  )
  return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

/** Date -> valor de `<input type="date">` (yyyy-mm-dd) no fuso LOCAL. */
export function dataParaInput(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/**
 * Valor de `<input type="date">` (yyyy-mm-dd) -> Date LOCAL (meia-noite).
 * `new Date('yyyy-mm-dd')` seria interpretado como UTC; aqui montamos a data
 * local explícita. Devolve null para valores malformados.
 */
export function inputParaData(valor: string): Date | null {
  const partes = valor.split('-')
  if (partes.length !== 3) return null
  const [ano, mes, dia] = partes.map(Number)
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || !Number.isFinite(dia)) {
    return null
  }
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  return new Date(ano, mes - 1, dia)
}

/**
 * Monta a query string da REST do Payload para o filtro dado:
 * `sort=-createdAt&page=N&limit=M&depth=0`, com
 * `where[createdAt][...]` quando há dia e `where[status][equals]` quando há
 * status. URLSearchParams codifica colchetes e ISO — o parser (qs) da API
 * decodifica de volta.
 */
export function montarQueryPedidos(filtro: FiltroBuscaPedidos): string {
  const params = new URLSearchParams()
  params.set('sort', '-createdAt')
  params.set('page', String(filtro.pagina))
  params.set('limit', String(filtro.limite))
  params.set('depth', '0')
  if (filtro.dia) {
    params.set('where[createdAt][greater_than_equal]', filtro.dia.inicio)
    params.set('where[createdAt][less_than]', filtro.dia.fim)
  }
  if (filtro.status) {
    params.set('where[status][equals]', filtro.status)
  }
  return params.toString()
}

/**
 * Busca uma página de pedidos visíveis ao usuário autenticado (cookie
 * `payload-token`), mais recentes primeiro. Lança Error quando a API não
 * responde OK (offline, preview estático, sessão expirada) — o componente
 * decide como exibir.
 */
export async function buscarPedidosPaginado(
  filtro: FiltroBuscaPedidos,
  colecao: ColecaoPedidos = 'pedidos',
): Promise<PaginaPedidos> {
  const res = await fetch(`/api/${colecao}?${montarQueryPedidos(filtro)}`, {
    credentials: 'same-origin',
  })
  if (!res.ok) {
    throw new Error(`Falha ao buscar pedidos (HTTP ${res.status}).`)
  }
  const dados = (await res.json()) as {
    docs?: PedidoResumo[]
    totalDocs?: number
    totalPages?: number
    page?: number
  }
  return {
    docs: dados.docs ?? [],
    totalDocs: dados.totalDocs ?? 0,
    totalPaginas: dados.totalPages ?? 1,
    pagina: dados.page ?? filtro.pagina,
  }
}

/** Data/hora legível pt-BR (ex.: "24/09/2026 18:32"). */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}
