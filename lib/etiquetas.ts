// Nomes das etiquetas de um informe (docs/features/etiquetas-informes.md).
// A relação pode vir populada (documento) ou só com ids, conforme o `depth`
// da leitura; ids soltos são ignorados em vez de exibidos.

import type { Etiqueta, Informe } from '@/src/payload-types'

export function nomesEtiquetas(etiquetas: Informe['etiquetas'] | undefined): string[] {
  return (etiquetas ?? [])
    .filter((etiqueta): etiqueta is Etiqueta => typeof etiqueta === 'object' && etiqueta !== null)
    .map((etiqueta) => etiqueta.nome)
}
