// Funções puras do caixa da pizzaria (docs/features/caixa-historico.md).
// Nenhuma dependência de Payload/Next/DB — mesmo padrão de lib/pedidos.ts —
// para permitir testes de propriedade (tests/caixa.property.test.ts).
//
// A collection `caixa` (src/collections/Caixa.ts) e a tela do caixa
// (components/CaixaForm.tsx) delegam a estas funções o cálculo do total da
// conta (taxa de serviço + desconto) e o rateio do pagamento entre pessoas.
//
// Todos os valores aqui são INTEIROS EM CENTAVOS: dividir R$ 100,00 por 3 em
// ponto flutuante gera resíduos (33,333…); em centavos a sobra é explícita e
// distribuída, e a soma das partes é SEMPRE igual ao total. A conversão
// reais ⇄ centavos acontece só na borda (UI e banco, que guardam reais).

import { renderPreco } from './cardapio'

// ---------------------------------------------------------------------------
// Formas de pagamento
// ---------------------------------------------------------------------------

export const FORMAS_PAGAMENTO = ['pix', 'dinheiro', 'cartao'] as const

export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
}

export function ehFormaPagamento(valor: unknown): valor is FormaPagamento {
  return typeof valor === 'string' && (FORMAS_PAGAMENTO as readonly string[]).includes(valor)
}

// ---------------------------------------------------------------------------
// Conversão reais ⇄ centavos
// ---------------------------------------------------------------------------

export function paraCentavos(reais: number): number {
  return Math.round(reais * 100)
}

export function paraReais(centavos: number): number {
  return centavos / 100
}

/**
 * Lê um valor digitado em reais ("12,50", "12.5", "R$ 1.234,56", "7") e
 * devolve centavos, ou null quando não é um valor válido (>= 0, até 2 casas).
 * Vírgula é o separador decimal pt-BR; pontos antes dela são milhar.
 */
export function lerValorReais(texto: string): number | null {
  let limpo = texto.replace(/R\$/i, '').replace(/\s/g, '')
  if (limpo === '') return null
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null
  return paraCentavos(Number(limpo))
}

/** Centavos -> texto editável pt-BR sem símbolo (ex.: 1250 -> "12,50"). */
export function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

// ---------------------------------------------------------------------------
// Total da conta
// ---------------------------------------------------------------------------

/** Taxa de serviço opcional (10%), ligada/desligada pelo funcionário. */
export const PERCENTUAL_SERVICO = 10

export interface EntradaTotalConta {
  /** Soma dos itens, em centavos. */
  subtotal: number
  /** Aplica a taxa de serviço de 10% sobre o subtotal. */
  servico: boolean
  /** Desconto manual, em centavos (>= 0). */
  desconto: number
}

export interface TotalConta {
  subtotal: number
  taxaServico: number
  desconto: number
  total: number
}

export type ResultadoTotalConta =
  | ({ ok: true } & TotalConta)
  | { ok: false; erro: string }

/**
 * total = subtotal + taxa de serviço (10% do subtotal, arredondado ao
 * centavo, se ligada) − desconto. O desconto precisa ser um inteiro >= 0 e
 * não pode passar de subtotal + taxa (o total nunca fica negativo).
 */
export function calcularTotalConta(entrada: EntradaTotalConta): ResultadoTotalConta {
  const { subtotal, servico, desconto } = entrada
  const taxaServico = servico ? Math.round((subtotal * PERCENTUAL_SERVICO) / 100) : 0
  const bruto = subtotal + taxaServico

  if (!Number.isInteger(desconto) || desconto < 0) {
    return { ok: false, erro: 'O desconto deve ser um valor maior ou igual a zero.' }
  }
  if (desconto > bruto) {
    return { ok: false, erro: 'O desconto não pode ser maior que o valor da conta.' }
  }

  return { ok: true, subtotal, taxaServico, desconto, total: bruto - desconto }
}

// ---------------------------------------------------------------------------
// Rateio entre pessoas
// ---------------------------------------------------------------------------

/** Parte de uma pessoa pagante. */
export interface ParteRateio {
  /** Valor devido, em centavos. */
  valor: number
  forma: FormaPagamento | null
  pago: boolean
  /** Valor ajustado manualmente: fica fixo quando o restante é redistribuído. */
  editado: boolean
}

export function parteVazia(valor: number): ParteRateio {
  return { valor, forma: null, pago: false, editado: false }
}

/**
 * Divide `total` em `n` partes iguais. A sobra de centavos (total % n) vai
 * para as primeiras partes: 100 / 3 → [34, 33, 33]. A soma é sempre `total`
 * e as partes diferem em no máximo 1 centavo.
 */
export function dividirIgual(total: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 1) return []
  const base = Math.floor(total / n)
  const sobra = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < sobra ? 1 : 0))
}

/** Parte que não se move na redistribuição: já paga ou ajustada à mão. */
function travada(parte: ParteRateio): boolean {
  return parte.pago || parte.editado
}

export type ResultadoRateio =
  | { ok: true; partes: ParteRateio[] }
  | { ok: false; erro: string }

/**
 * Reparte o que falta (total − partes travadas) igualmente entre as partes
 * livres. Falha se as travadas passam do total, ou se sobra valor sem
 * nenhuma parte livre para absorvê-lo.
 */
function reequilibrar(total: number, partes: ParteRateio[]): ResultadoRateio {
  const fixo = partes.filter(travada).reduce((acc, p) => acc + p.valor, 0)
  const restante = total - fixo
  const livres = partes.filter((p) => !travada(p)).length

  if (restante < 0) {
    return { ok: false, erro: 'Os valores informados passam do total da conta.' }
  }
  if (livres === 0) {
    if (restante !== 0) {
      return {
        ok: false,
        erro: 'A soma das partes não fecha o total: deixe ao menos uma pessoa sem valor ajustado.',
      }
    }
    return { ok: true, partes }
  }

  const valores = dividirIgual(restante, livres)
  let i = 0
  return {
    ok: true,
    partes: partes.map((p) => (travada(p) ? p : { ...p, valor: valores[i++] })),
  }
}

/**
 * (Re)divide a conta por `n` pessoas. Partes já PAGAS são preservadas (no
 * início da lista); as demais são refeitas em partes iguais do que falta,
 * mantendo a forma de pagamento já escolhida por posição. `n` não pode ser
 * menor que o número de partes pagas.
 */
export function dividirConta(total: number, atuais: ParteRateio[], n: number): ResultadoRateio {
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, erro: 'Informe um número inteiro de pessoas (1 ou mais).' }
  }
  const pagas = atuais.filter((p) => p.pago)
  if (n < pagas.length) {
    return {
      ok: false,
      erro: `Já há ${pagas.length} pagamento(s) confirmado(s): divida por ${pagas.length} ou mais pessoas.`,
    }
  }
  const abertas = atuais.filter((p) => !p.pago)
  const novas = Array.from({ length: n - pagas.length }, (_, i) => ({
    ...parteVazia(0),
    forma: abertas[i]?.forma ?? null,
  }))
  return reequilibrar(total, [...pagas, ...novas])
}

/**
 * Ajusta manualmente o valor da parte `indice` (fica travada) e recalcula o
 * restante entre as partes livres. Parte já paga não pode ser alterada.
 */
export function redistribuir(
  total: number,
  partes: ParteRateio[],
  indice: number,
  novoValor: number,
): ResultadoRateio {
  const alvo = partes[indice]
  if (!alvo) return { ok: false, erro: 'Parte inexistente.' }
  if (alvo.pago) {
    return { ok: false, erro: 'Essa parte já foi paga: desmarque o pagamento para alterar o valor.' }
  }
  if (!Number.isInteger(novoValor) || novoValor < 0) {
    return { ok: false, erro: 'O valor deve ser maior ou igual a zero.' }
  }
  const ajustadas = partes.map((p, i) =>
    i === indice ? { ...p, valor: novoValor, editado: true } : p,
  )
  return reequilibrar(total, ajustadas)
}

/** Volta todas as partes não pagas para a divisão igual do que falta. */
export function desfazerAjustes(total: number, partes: ParteRateio[]): ResultadoRateio {
  return reequilibrar(
    total,
    partes.map((p) => (p.pago ? p : { ...p, editado: false })),
  )
}

// ---------------------------------------------------------------------------
// Resumo e validação
// ---------------------------------------------------------------------------

export interface ResumoPagamento {
  /** Soma das partes pagas. */
  pago: number
  /** total − pago. */
  emDebito: number
  /** Soma paga por forma de pagamento. */
  porForma: Record<FormaPagamento, number>
  quitada: boolean
}

export function resumoPagamento(total: number, partes: ParteRateio[]): ResumoPagamento {
  const porForma: Record<FormaPagamento, number> = { pix: 0, dinheiro: 0, cartao: 0 }
  let pago = 0
  for (const parte of partes) {
    if (!parte.pago) continue
    pago += parte.valor
    if (parte.forma) porForma[parte.forma] += parte.valor
  }
  const emDebito = total - pago
  return { pago, emDebito, porForma, quitada: partes.length > 0 && emDebito === 0 }
}

/**
 * Validação server-side do rateio gravado: a soma das partes fecha o total,
 * valores são inteiros >= 0 e toda parte paga tem forma de pagamento.
 * Retorna mensagens pt-BR (vazia = válido). Lista vazia é válida (conta
 * ainda não dividida).
 */
export function validarRateio(total: number, partes: ParteRateio[]): string[] {
  if (partes.length === 0) return []
  const erros: string[] = []
  partes.forEach((p, i) => {
    if (!Number.isInteger(p.valor) || p.valor < 0) {
      erros.push(`Pessoa ${i + 1}: valor inválido.`)
    }
    if (p.pago && !p.forma) {
      erros.push(`Pessoa ${i + 1}: informe a forma de pagamento antes de confirmar.`)
    }
  })
  const soma = partes.reduce((acc, p) => acc + p.valor, 0)
  if (soma !== total) {
    erros.push('A soma das partes não confere com o total da conta.')
  }
  return erros
}

/** Valor em reais formatado pt-BR a partir de centavos (ex.: "R$ 12,50"). */
export function formatarCentavos(centavos: number): string {
  return renderPreco(paraReais(centavos))
}
