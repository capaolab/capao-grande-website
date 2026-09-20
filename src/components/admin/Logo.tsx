import type { ReactElement } from 'react'

// Logo exibido na tela de login do painel admin (substitui o logo do Payload).
// Usa o mesmo logo em aquarela do site público.
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
