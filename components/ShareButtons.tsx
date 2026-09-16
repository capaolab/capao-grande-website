// <ShareButtons> — botões de compartilhamento com NOMES ACESSÍVEIS (Req 20.4).
//
// Renderiza links de compartilhamento (WhatsApp, X, Facebook) construídos a
// partir de `url` e `title` usando os "share intents" de cada rede. Por serem
// URLs de intenção, funcionam como `<a>` simples — SEM JavaScript de cliente
// (nenhum `window`), então o componente permanece um Server Component.
//
// Acessibilidade (Req 20.4): cada link tem um NOME ACESSÍVEL via `aria-label`
// (ex.: "Compartilhar no WhatsApp"), já que o conteúdo visível é apenas um
// ícone. `target="_blank"` + `rel="noopener noreferrer"` para abrir a rede em
// nova aba com segurança. Foco visível é global (`:focus-visible`, Req 20.3).
//
// Design: sem sombra; borda 1px `var(--color-borda)`; hover verde (Req 18.4).

import type { ReactElement } from 'react'

export interface ShareButtonsProps {
  /** URL absoluta do conteúdo a compartilhar (ex.: link do informe). */
  url: string
  /** Título do conteúdo, incluído no texto do compartilhamento. */
  title: string
  /** Classes utilitárias adicionais para o contêiner. */
  className?: string
}

interface ShareTarget {
  /** Rótulo da rede, usado no nome acessível. */
  rede: string
  /** Constrói a URL de compartilhamento a partir de url/título codificados. */
  href: (encodedUrl: string, encodedTitle: string) => string
  /** Glifo/ícone textual exibido (decorativo; o nome vem do aria-label). */
  glifo: string
}

const REDES: readonly ShareTarget[] = [
  {
    rede: 'WhatsApp',
    href: (u, t) => `https://wa.me/?text=${t}%20${u}`,
    glifo: 'WA',
  },
  {
    rede: 'X',
    href: (u, t) => `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    glifo: 'X',
  },
  {
    rede: 'Facebook',
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    glifo: 'f',
  },
] as const

export function ShareButtons({ url, title, className }: ShareButtonsProps): ReactElement {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const containerClasses = ['flex items-center gap-3', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      <span className="text-sm text-[color:var(--color-paragrafo)]">Compartilhar:</span>
      <ul className="flex list-none items-center gap-2">
        {REDES.map((r) => (
          <li key={r.rede}>
            <a
              href={r.href(encodedUrl, encodedTitle)}
              target="_blank"
              rel="noopener noreferrer"
              // Nome acessível do link (Req 20.4): o conteúdo visível é só um
              // glifo, então o aria-label descreve a ação por extenso.
              aria-label={`Compartilhar no ${r.rede}`}
              className="borda-sistema hover-verde flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-[color:var(--color-papel)] text-[color:var(--color-marrom)] transition-colors"
            >
              <span aria-hidden="true">{r.glifo}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ShareButtons
