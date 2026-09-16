// Lógica pura da unicidade de destaque da Colecao_Informes (Requisito 5.5).
//
// Esta função concentra a REGRA de decisão do hook de destaque único, livre de
// qualquer dependência do Payload ou do banco, para que possa ser exercitada
// por testes de propriedade (task 4.2 testa uma "implementação em memória do
// hook"). O hook do Payload (ver `Informes.ts`) delega a decisão a esta função
// e apenas executa os `payload.update` resultantes.
//
// Invariante garantida (Property 1 do design): após salvar um informe com
// `destaque: true`, no máximo um informe fica em destaque — exatamente aquele
// que acabou de ser salvo.

/** Forma mínima de um informe relevante para a decisão de destaque. */
export interface InformeDestaqueState {
  id: string | number
  destaque: boolean
}

/**
 * Dado o conjunto atual de informes e o id daquele que acabou de ser salvo com
 * `destaque: true`, retorna os ids dos DEMAIS informes que ainda estão com
 * `destaque: true` e, portanto, precisam ser atualizados para `destaque: false`.
 *
 * Propriedades:
 * - Nunca inclui o `savedId` (o documento que dispara o hook permanece em
 *   destaque). Isso também evita recursão do hook sobre o próprio documento.
 * - Idempotente: se nenhum outro informe está em destaque, retorna `[]` e nada
 *   é atualizado.
 * - Após aplicar as atualizações, o único informe em destaque é `savedId`,
 *   garantindo no máximo um destaque.
 *
 * A função é pura: não lê/escreve no banco, não depende do Payload.
 *
 * @param informes  Estado atual conhecido de todos os informes.
 * @param savedId   Id do informe salvo com `destaque: true`.
 * @returns Ids dos demais informes que devem ter `destaque` desmarcado.
 */
export function idsParaDesmarcarDestaque(
  informes: readonly InformeDestaqueState[],
  savedId: InformeDestaqueState['id'],
): Array<InformeDestaqueState['id']> {
  return informes
    .filter((informe) => informe.destaque && informe.id !== savedId)
    .map((informe) => informe.id)
}
