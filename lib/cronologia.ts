// Função pura de ordenação da cronologia (Requisitos 7.4, 17.2). Sem
// dependência de Payload/Next/DB para permitir teste de propriedade (task 7.7).

/** Forma mínima aceita por `ordenarCronologia` (compatível com `Cronologia`). */
export interface MarcoOrdenavel {
  ordem?: number | null
}

/**
 * Ordena os marcos da cronologia por `ordem` ascendente (Requisitos 7.4, 17.2).
 *
 * Invariantes:
 * - A lista devolvida é não decrescente por `ordem`.
 * - A ordenação é estável: marcos com o mesmo `ordem` (ou `ordem` ausente)
 *   mantêm a ordem de entrada. `ordem` ausente (null/undefined) vale 0.
 * - Não muta a lista de entrada (retorna uma nova).
 */
export function ordenarCronologia<T extends MarcoOrdenavel>(marcos: T[]): T[] {
  return [...marcos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
}
