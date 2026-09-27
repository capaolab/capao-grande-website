import { APIError } from 'payload'

import { ehStatusPedido, proximoStatus, type ModalidadeEntrega } from '@/lib/status-pedido'

// Trava de concorrência do funil (docs/features/dashboard-pedidos.md),
// compartilhada pelos hooks de `pedidos` e `pedidos-pimenta`. O painel do
// funcionário grava o status que a TELA mostrou; se ela estiver desatualizada
// (outra aba/pessoa já avançou o pedido), o PATCH poderia fazer o pedido
// VOLTAR no funil ou sobrescrever o frete de um pedido já validado.
//
// Para o funcionário, a mudança de status só é aceita se for a PRÓXIMA etapa
// a partir do status gravado no banco, e o frete só muda enquanto o pedido
// sai de (ou continua em) `pendente`. Caso contrário: 409, e a tela recarrega.
//
// Admin fica livre (correções manuais no /admin), assim como chamadas
// internas sem usuário (Local API).
export function exigirTransicaoValida(
  data: { status?: unknown; frete?: unknown },
  originalDoc: { status?: unknown; frete?: unknown } | undefined,
  modalidade: ModalidadeEntrega,
  role: unknown,
): void {
  if (!originalDoc || role !== 'funcionario') return

  const atual = originalDoc.status
  const mudouStatus = data.status != null && data.status !== atual
  const proximo = ehStatusPedido(atual) ? proximoStatus(atual, modalidade) : null
  const statusInvalido = mudouStatus && data.status !== proximo?.status

  const mudouFrete = data.frete !== undefined && (data.frete ?? null) !== (originalDoc.frete ?? null)
  const freteInvalido = mudouFrete && atual !== 'pendente'

  if (statusInvalido || freteInvalido) {
    throw new APIError(
      'Este pedido já foi atualizado por outra pessoa. Recarregue a lista.',
      409,
      null,
      true,
    )
  }
}
