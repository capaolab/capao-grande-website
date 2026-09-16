// Página pública /pizzaria (task 12.4, Requisitos 13.1, 13.2, 19.1, 19.2).
//
// Server Component assíncrono: lê o Global_Configuracoes via `getConfiguracoes()`
// (lib/queries.ts) e apresenta localização, horários e contatos da pizzaria.
//
// Regras de negócio (Req 13):
//  - Mapa: a partir de `linkMapa`. Quando ausente/"a confirmar" (via
//    `isAConfirmar`), exibe <Placeholder> cinza — NUNCA fabrica um mapa. Quando
//    presente, renderiza um link "Abrir no mapa" (não embutimos <iframe> com
//    URL não confiável — um link é seguro e mantém o nome acessível, Req 20.4).
//  - Horários: delega a <HoursTable horarios={cfg.horarios} />, que já trata
//    placeholder por célula e para o array inteiro ausente (Req 13.1, 13.2).
//  - Contatos: endereco, whatsapp, instagram, email do global. Para cada campo
//    ausente/"a confirmar" renderiza <Placeholder> cinza no lugar do valor
//    (Req 13.2, 19.1, 19.2); quando presente, vira um link acionável e
//    acessível (Req 20.4).
//
// NUNCA fabrica dados (Req 19). Design: sem sombra, tokens da paleta, borda 1px
// var(--color-borda) via `.borda-sistema`. Hierarquia de cabeçalhos sequencial:
// um único <h1> na página e <h2> por seção (Req 20.2).

import type { ReactElement, ReactNode } from 'react'

import { HoursTable } from '@/components/HoursTable'
import { Placeholder } from '@/components/Placeholder'
import { isAConfirmar } from '@/lib/design/placeholder'
import { getConfiguracoes } from '@/lib/queries'

export const metadata = {
  title: 'Visite a pizzaria | Capão Grande',
  description: 'Localização, horários e contato da pizzaria do Capão Grande.',
}

/**
 * Renderiza um valor de contato quando presente, ou o <Placeholder> cinza
 * quando ausente/"a confirmar" (Req 19.1). O `render` opcional envolve o valor
 * presente (ex.: em um link) sem duplicar a checagem de pendência.
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
  // `valor` é string não pendente aqui (isAConfirmar cobriu null/vazio).
  const texto = valor as string
  return <>{render ? render(texto) : texto}</>
}

export default async function PizzariaPage(): Promise<ReactElement> {
  const cfg = await getConfiguracoes()

  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl text-verde">Visite a pizzaria</h1>
        <p className="font-sans text-paragrafo">
          Onde estamos, os horários de funcionamento e como falar com a gente.
        </p>
      </header>

      {/* Localização / mapa (Req 13.1, 13.2) --------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="pizzaria-local">
        <h2 id="pizzaria-local" className="font-serif text-2xl text-marrom">
          Localização
        </h2>

        <div className="font-sans text-paragrafo">
          <CampoContato valor={cfg.endereco} rotuloPendente="endereço a confirmar" />
        </div>

        <div>
          {isAConfirmar(cfg.linkMapa) ? (
            <Placeholder label="mapa a confirmar" />
          ) : (
            <a
              className="borda-sistema hover-verde inline-flex items-center rounded-[var(--radius)] px-4 py-2 font-sans text-marrom transition-colors"
              href={cfg.linkMapa as string}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir no mapa
            </a>
          )}
        </div>
      </section>

      {/* Horários (Req 13.1, 13.2) ------------------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="pizzaria-horarios">
        <h2 id="pizzaria-horarios" className="font-serif text-2xl text-marrom">
          Horários
        </h2>
        <HoursTable horarios={cfg.horarios} />
      </section>

      {/* Contato (Req 13.1, 13.2, 19.1, 19.2) -------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="pizzaria-contato">
        <h2 id="pizzaria-contato" className="font-serif text-2xl text-marrom">
          Contato
        </h2>

        <dl className="grid gap-x-8 gap-y-4 font-sans text-paragrafo sm:grid-cols-2">
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
                    target="_blank"
                    rel="noopener noreferrer"
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
                      target="_blank"
                      rel="noopener noreferrer"
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

          <div>
            <dt className="text-marrom font-medium">Endereço</dt>
            <dd>
              <CampoContato valor={cfg.endereco} rotuloPendente="endereço a confirmar" />
            </dd>
          </div>
        </dl>
      </section>
    </article>
  )
}
