// View de login do painel admin substituída por redirecionamento para a tela
// de login do site (`/login`) — entrada única de autenticação. Registrada em
// `admin.components.views.login` no payload.config.ts, cobre qualquer acesso
// direto a `/admin/login` (ex.: visitante sem sessão redirecionado pelo
// próprio Payload). Quem já tem sessão admin ativa é devolvido a `/admin`
// pelo próprio LoginForm da página /login.

import { redirect } from 'next/navigation'

export default function LoginRedirect(): never {
  redirect('/login')
}
