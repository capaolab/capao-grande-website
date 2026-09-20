// <SiteFooter> — rodapé do site público (task 10.4, Req 13.2, 19.1, 20.2).
//
// Server Component assíncrono: lê o Global_Configuracoes via `getConfiguracoes()`
// (lib/queries.ts) e exibe contatos do estabelecimento. NUNCA fabrica dados —
// para cada campo ausente ou marcado como "a confirmar" (via `isAConfirmar`),
// renderiza <Placeholder> em cinza no lugar do valor (Req 13.2, 19.1).
//
// Design: fundo var(--color-papel), borda superior de 1px var(--color-borda),
// sem sombra (mandato global). Um grafismo em aquarela decorativo (`mark`,
// alt="" via Watercolor) acompanha os contatos. O rodapé usa <h2> como rótulo
// de seção, mantendo a hierarquia sequencial abaixo do <h1> de cada página
// (Req 20.2).

import type { ReactElement, ReactNode } from 'react'

import { Placeholder } from '@/components/Placeholder'
import { Watercolor } from '@/components/Watercolor'
import { isAConfirmar } from '@/lib/design/placeholder'
import { getConfiguracoes } from '@/lib/queries'

/**
 * Renderiza um valor de contato quando presente, ou o <Placeholder> cinza
 * quando ausente/"a confirmar" (Req 19.1). O `render` opcional permite
 * envolver o valor presente (ex.: em um link) sem duplicar a checagem.
 */
function CampoContato({
  valor,
  rotuloPendente,
  render,
}: {
  valor?: string | null
  rotuloPendente: string
  render?: (valor: string) => ReactNode
}): ReactElement {
  if (isAConfirmar(valor)) {
    return <Placeholder label={rotuloPendente} />
  }
  // `valor` é uma string não pendente aqui (isAConfirmar cobriu null/vazio).
  const texto = valor as string
  return <>{render ? render(texto) : texto}</>
}

export async function SiteFooter(): Promise<ReactElement> {
  const cfg = await getConfiguracoes()
  const anoAtual = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-borda bg-papel">
      <div className="mx-auto grid w-full max-w-conteudo gap-8 px-6 py-10 md:grid-cols-[auto_1fr]">
        {/* Grafismo decorativo (Req 18.8) — alt="" (decorativo, Req 20.1). */}
        <div className="shrink-0">
          <Watercolor name="mark" width={96} height={96} className="h-24 w-24" />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-serif text-xl text-verde">Capão Grande</h2>
          </div>

          <dl className="grid gap-x-8 gap-y-4 font-sans text-paragrafo sm:grid-cols-2">
            <div>
              <dt className="text-marrom font-medium">Endereço</dt>
              <dd>
                <CampoContato valor={cfg.endereco} rotuloPendente="endereço a confirmar" />
              </dd>
            </div>

            <div>
              <dt className="text-marrom font-medium">WhatsApp</dt>
              <dd>
                <CampoContato
                  valor={cfg.whatsapp}
                  rotuloPendente="WhatsApp a confirmar"
                  render={(v) => (
                    <a
                      className="hover-verde transition-colors"
                      href={`https://wa.me/${v.replace(/\D/g, '')}`}
                    >
                      {v}
                    </a>
                  )}
                />
              </dd>
            </div>

            <div>
              <dt className="text-marrom font-medium">Instagram</dt>
              <dd>
                <CampoContato
                  valor={cfg.instagram}
                  rotuloPendente="Instagram a confirmar"
                  render={(v) => {
                    const handle = v.replace(/^@/, '')
                    return (
                      <a
                        className="hover-verde transition-colors"
                        href={`https://instagram.com/${handle}`}
                      >
                        {v}
                      </a>
                    )
                  }}
                />
              </dd>
            </div>

            <div>
              <dt className="text-marrom font-medium">E-mail</dt>
              <dd>
                <CampoContato
                  valor={cfg.email}
                  rotuloPendente="e-mail a confirmar"
                  render={(v) => (
                    <a className="hover-verde transition-colors" href={`mailto:${v}`}>
                      {v}
                    </a>
                  )}
                />
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-marrom font-sans font-medium">Horários</h3>
            {cfg.horarios && cfg.horarios.length > 0 ? (
              <ul className="mt-1 font-sans text-paragrafo">
                {cfg.horarios.map((h, i) => (
                  <li key={h.id ?? i} className="flex flex-wrap gap-x-2">
                    <span>
                      <CampoContato valor={h.faixa} rotuloPendente="faixa a confirmar" />
                    </span>
                    <span aria-hidden="true">—</span>
                    <span>
                      <CampoContato valor={h.horario} rotuloPendente="horário a confirmar" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">
                <Placeholder label="horários a confirmar" />
              </p>
            )}
          </div>

          <p className="font-sans text-sm text-placeholder">
            © {anoAtual} Capão Grande
          </p>

          <p className="font-sans text-sm">
            <a className="text-placeholder hover-verde transition-colors" href="/admin">
              Acesso administrativo
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
