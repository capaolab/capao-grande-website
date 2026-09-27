import { APIError } from 'payload'

import { exigeFrete, type ModalidadeEntrega } from '@/lib/status-pedido'

// Regra do frete (docs/features/pedidos-painel.md), compartilhada pelos hooks
// de `pedidos` e `pedidos-pimenta`: um pedido só sai de `pendente` (é
// validado) com o frete informado. Na retirada o frete é 0.
//
// Vale só na TRANSIÇÃO a partir de `pendente` — pedidos antigos, que já
// avançaram no funil sem frete, continuam editáveis.
export function exigirFreteParaValidar(
  data: { status?: unknown; frete?: unknown },
  originalDoc: { status?: unknown; frete?: unknown } | undefined,
  modalidade: ModalidadeEntrega,
): void {
  if (!originalDoc || originalDoc.status !== 'pendente') return
  if (data.status == null || data.status === 'pendente') return

  if (!exigeFrete(modalidade)) {
    data.frete = 0
    return
  }
  const frete = data.frete ?? originalDoc.frete
  if (typeof frete !== 'number' || !Number.isFinite(frete) || frete < 0) {
    // 400 com a mensagem visível (isPublic) — erro de uso, não do servidor.
    throw new APIError('Informe o valor do frete antes de validar o pedido.', 400, null, true)
  }
}
