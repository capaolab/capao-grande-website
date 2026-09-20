import type { ReactElement } from 'react'

// Ícone exibido no canto superior do painel admin (substitui o ícone do Payload).
// Usa o "mark" em aquarela do site público, em versão compacta.
export default function Icon(): ReactElement {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="Capão Grande"
      src="/assets/watercolor/mark.png"
      style={{ height: '28px', width: '28px' }}
    />
  )
}
