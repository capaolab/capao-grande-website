import type { ReactElement } from 'react'

// Logo exibido nas telas de autenticação internas do painel admin (ex.:
// criação do primeiro usuário — a tela de login do painel foi substituída por
// redirecionamento para /login do site). Usa o mesmo logo em aquarela do
// site público.
export default function Logo(): ReactElement {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="Capão Grande"
      src="/assets/watercolor/logo.png"
      style={{ height: 'auto', maxWidth: '220px', width: '100%' }}
    />
  )
}
