// Funções puras de telefone/WhatsApp (docs/features/dashboard-pedidos.md).
// Sem dependência de Payload/Next — testável por propriedade.
//
// O telefone é o VÍNCULO entre o pedido de delivery (collection `pedidos`) e a
// conta do cliente (collection `users`): o cliente vê os pedidos cujo telefone
// bate com o da conta. Para a comparação funcionar, ambas as collections
// gravam o telefone NORMALIZADO (apenas dígitos) via hook de escrita.

/**
 * Normaliza um telefone para apenas dígitos: "(75) 99999-0000" →
 * "75999990000". Idempotente: normalizar duas vezes dá o mesmo resultado.
 */
export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '')
}

/** Mínimo de dígitos de um telefone brasileiro com DDD (ex.: 75 99999-0000). */
export const MIN_DIGITOS_TELEFONE = 10

/**
 * Telefone plausível para vínculo: após normalização, precisa ter ao menos
 * `MIN_DIGITOS_TELEFONE` dígitos (DDD + número). Não valida DDD real nem
 * operadora — apenas o formato mínimo para não gravar vínculos impossíveis.
 */
export function telefonePlausivel(telefone: string): boolean {
  return normalizarTelefone(telefone).length >= MIN_DIGITOS_TELEFONE
}
