'use client'

// <RedirecionarPedido> — as URLs públicas dos formulários (`/pedido` e
// `/pimenta-em-mel/pedido`, usadas pelos CTAs e pelos links enviados no
// WhatsApp) levam ao formulário no painel (docs/features/pedidos-painel.md):
//  - sem sessão → `/login?next=<url pública>`; o login devolve para a mesma
//    URL, que então segue para o painel;
//  - cliente → `/area-cliente/<tipo>/novo`;
//  - funcionário/admin → `/area-funcionario/<tipo>/novo`.
//
// Client Component pelo mesmo motivo do <AreaInternaGuard>: a sessão é
// checada no navegador (`/api/users/me`).

import { useRouter } from 'next/navigation'
import { useEffect, type ReactElement } from 'react'

import { buscarUsuarioAtual } from '@/lib/auth-client'
import {
  comRetorno,
  ROTA_LOGIN,
  ROTA_PUBLICA_PEDIDO,
  rotaFormularioPedido,
  rotaPorRole,
  type TipoPedido,
} from '@/lib/permissoes'

export function RedirecionarPedido({ tipo }: { tipo: TipoPedido }): ReactElement {
  const router = useRouter()

  useEffect(() => {
    let ativo = true
    buscarUsuarioAtual().then((usuario) => {
      if (!ativo) return
      if (!usuario) {
        router.replace(comRetorno(ROTA_LOGIN, ROTA_PUBLICA_PEDIDO[tipo]))
        return
      }
      router.replace(rotaFormularioPedido(tipo, usuario.role) ?? rotaPorRole(usuario.role))
    })
    return () => {
      ativo = false
    }
  }, [router, tipo])

  return (
    <p role="status" className="py-12 text-center font-sans text-paragrafo">
      Abrindo o formulário de pedido…
    </p>
  )
}

export default RedirecionarPedido
