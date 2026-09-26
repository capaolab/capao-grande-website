// Home pública `/` (task 12.1) — Server Component assíncrono.
//
// Estrutura (Requisitos 10.1–10.4, 20.2):
//  - Hero com o Informe_Destaque (getInformeDestaque). Quando existe, exibe
//    título, resumo, capa 1:1 (via <CmsImage>) e link para /informes/[slug].
//    Quando NÃO existe, renderiza <Placeholder> — sem fabricar conteúdo
//    (Req 10.1, 10.4).
//  - 3 informes publicados mais recentes que NÃO são o destaque (Req 10.2):
//    getInformesRecentes(3, destaque?.id) exclui o destaque pelo id. Se houver
//    menos que 3, renderiza apenas os que existem (sem fabricar).
//  - <PedidoCta> logo após o hero: atalho direto para o formulário /pedido
//    (sem passar por /delivery); em seguida <PedidoPimentaCta>, no mesmo
//    modelo, para o formulário /pimenta-em-mel/pedido.
//  - <NavCard>s para /processo, /delivery, /pimenta-em-mel e /pizzaria (Req 10.3).
//
// Acessibilidade (Req 20.2): exatamente UM <h1> na página (o título do hero, ou
// um título institucional quando não há destaque). Os rótulos de seção ("olho")
// são <p> estilizados, não headings; os títulos de seção são <h2> e os títulos
// de cartão são <h3> (hierarquia sequencial h1 -> h2 -> h3).
//
// Dados via Payload Local API (lib/queries.ts). Sem sombra; tokens do sistema
// de design (app/globals.css). Next 16 App Router: página é async.

import Link from 'next/link'
import type { ReactElement } from 'react'

import { CmsImage } from '@/components/CmsImage'
import { InformeCard } from '@/components/InformeCard'
import { NavCard } from '@/components/NavCard'
import { PedidoCta } from '@/components/PedidoCta'
import { PedidoPimentaCta } from '@/components/PedidoPimentaCta'
import { Placeholder } from '@/components/Placeholder'
import { nomesEtiquetas } from '@/lib/etiquetas'
import { getInformeDestaque, getInformesRecentes } from '@/lib/queries'
import { capaDoInforme } from '@/lib/unsplash'

/** Rótulo de seção ("olho"): 15px caixa alta em verde. Não é um heading. */
function OlhoSecao({ children }: { children: string }): ReactElement {
  return (
    <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
      {children}
    </p>
  )
}

export default async function Home(): Promise<ReactElement> {
  const destaque = await getInformeDestaque()
  // Exclui o destaque da lista de recentes pelo id (Req 10.2). Sem destaque,
  // `excludeId` fica indefinido e simplesmente traz os 3 mais recentes.
  const recentes = await getInformesRecentes(3, destaque?.id)

  const destaqueHref =
    destaque?.slug != null && destaque.slug.trim() !== ''
      ? `/informes/${destaque.slug}`
      : null

  const temResumoDestaque =
    destaque?.resumo != null && destaque.resumo.trim() !== ''

  return (
    <div className="flex flex-col gap-16 py-10">
      {/* ---- Hero: Informe_Destaque (Req 10.1, 10.4) ----------------------- */}
      <section aria-labelledby="hero-heading">
        <OlhoSecao>Em destaque</OlhoSecao>

        {destaque ? (
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <CmsImage
              media={capaDoInforme(destaque)}
              square
              sizes="(max-width: 768px) 100vw, 540px"
              placeholderLabel="capa do destaque a confirmar"
            />

            <div className="flex flex-col gap-4">
              <p className="text-sm uppercase tracking-wide text-[color:var(--color-verde)]">
                {nomesEtiquetas(destaque.etiquetas).join(' · ')}
              </p>

              {/* Único <h1> da página quando há destaque (Req 20.2). */}
              <h1
                id="hero-heading"
                className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]"
              >
                {destaqueHref ? (
                  <Link
                    href={destaqueHref}
                    className="hover:text-[color:var(--color-verde)]"
                  >
                    {destaque.titulo}
                  </Link>
                ) : (
                  destaque.titulo
                )}
              </h1>

              {temResumoDestaque ? (
                <p className="text-lg text-[color:var(--color-paragrafo)]">
                  {destaque.resumo}
                </p>
              ) : (
                <Placeholder label="resumo a confirmar" as="p" />
              )}

              {destaqueHref ? (
                <Link
                  href={destaqueHref}
                  className="btn-primario self-start"
                  aria-label={`Ler o informe: ${destaque.titulo}`}
                >
                  Ler o informe
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          // Sem Informe_Destaque: hero sem conteúdo fabricado (Req 10.4). Mantém
          // o único <h1> da página com o nome institucional e sinaliza pendência.
          <div className="flex flex-col gap-4">
            <h1
              id="hero-heading"
              className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]"
            >
              Capão Grande
            </h1>
            <Placeholder label="Sem informe em destaque no momento" as="p" />
          </div>
        )}
      </section>

      {/* ---- CTAs de pedidos: atalhos para /pedido e para a pimenta ------- */}
      <PedidoCta />
      <PedidoPimentaCta />

      {/* ---- Informes recentes (Req 10.2) --------------------------------- */}
      {recentes.length > 0 ? (
        <section aria-labelledby="recentes-heading">
          <OlhoSecao>Informes recentes</OlhoSecao>
          <h2
            id="recentes-heading"
            className="mt-1 mb-6 font-serif text-2xl text-[color:var(--color-marrom)]"
          >
            Novidades do Capão
          </h2>

          <div className="grade-reflow">
            {recentes.map((informe) => (
              <InformeCard key={informe.id} informe={informe} />
            ))}
          </div>

          <p className="mt-6">
            <Link
              href="/informes"
              className="text-[color:var(--color-verde)] hover:underline"
            >
              Ver todos os informes
            </Link>
          </p>
        </section>
      ) : null}

      {/* ---- Navegação: NavCards (Req 10.3 + pimenta-em-mel.md) ----------- */}
      <section aria-labelledby="nav-heading">
        <OlhoSecao>Conheça o Capão</OlhoSecao>
        <h2
          id="nav-heading"
          className="mt-1 mb-6 font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Explore
        </h2>

        <div className="grade-reflow">
          <NavCard
            href="/processo"
            title="Processo"
            description="Da agrofloresta ao forno: como nascem nossos ingredientes e a massa."
            watercolor="arvore-1"
          />
          <NavCard
            href="/delivery"
            title="Delivery"
            description="Peça pelo WhatsApp e pague no Pix. Entrega com taxa por distância."
            watercolor="molho"
          />
          <NavCard
            href="/pimenta-em-mel"
            title="Pimenta em mel"
            description="Produção da casa, por unidade ou em lote para restaurantes."
            watercolor="mel"
          />
          <NavCard
            href="/pizzaria"
            title="Pizzaria"
            description="Onde estamos, horários e contato para visitar a pizzaria."
            watercolor="palmeira"
          />
        </div>
      </section>
    </div>
  )
}
