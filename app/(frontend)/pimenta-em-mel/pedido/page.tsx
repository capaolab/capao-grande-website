// Página `/pimenta-em-mel/pedido` — formulário de pedido de pimenta em mel
// (docs/features/pimenta-em-mel.md, RN-P03) — Server Component assíncrono.
//
// Mesmo desenho de `/pedido` (delivery):
//  - LOGIN OBRIGATÓRIO: o formulário fica dentro do
//    <AreaInternaGuard area="qualquer" retorno="/pimenta-em-mel/pedido">; o
//    endpoint /api/submeter-pedido-pimenta também exige sessão (401).
//  - Staging estático (CONTENT_SOURCE=static): sem backend, sem formulário —
//    aviso de indisponibilidade com o WhatsApp.
//  - Catálogo vazio ⇒ <Placeholder>, nunca produtos fictícios (Req 19).
//
// Acessibilidade: exatamente UM <h1>; o formulário usa <h2>/<h3>.

import type { ReactElement } from 'react'

import { AreaInternaGuard } from '@/components/AreaInternaGuard'
import { PedidoPimentaForm, type ProdutoPimentaForm } from '@/components/PedidoPimentaForm'
import { Placeholder } from '@/components/Placeholder'
import { isAConfirmar } from '@/lib/design/placeholder'
import { getConfiguracoes, getProdutosPimenta } from '@/lib/queries'

export const metadata = {
  title: 'Pedido de pimenta em mel | Capão Grande',
  description:
    'Peça pimenta em mel por unidade ou em lote: escolha as quantidades, entrega ou retirada, e receba o código do pedido para a conversa no WhatsApp.',
}

const CONTEUDO_ESTATICO = process.env.CONTENT_SOURCE === 'static'

export default async function PedidoPimentaPage(): Promise<ReactElement> {
  const [docs, cfg] = await Promise.all([getProdutosPimenta(), getConfiguracoes()])

  const whatsappDigitos = isAConfirmar(cfg.whatsapp)
    ? null
    : (cfg.whatsapp as string).replace(/\D/g, '')

  // Forma serializável mínima para o Client Component.
  const produtos: ProdutoPimentaForm[] = docs.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    volume: produto.volume ?? null,
    descricao: produto.descricao ?? null,
    preco: produto.preco,
    precoLote: produto.precoLote ?? null,
    loteMinimo: produto.loteMinimo ?? null,
  }))

  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
          Pimenta em mel
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
          Faça seu pedido
        </h1>
        <p className="font-sans text-[color:var(--color-paragrafo)]">
          Escolha as quantidades, diga se prefere entrega ou retirada e envie. Você recebe
          um código para confirmar o pedido pela conversa no WhatsApp.
        </p>
      </header>

      {CONTEUDO_ESTATICO ? (
        <section
          aria-labelledby="pimenta-indisponivel"
          className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6"
        >
          <h2
            id="pimenta-indisponivel"
            className="font-serif text-2xl text-[color:var(--color-marrom)]"
          >
            Pedidos online indisponíveis neste ambiente
          </h2>
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            O formulário não está disponível nesta versão do site. Faça seu pedido pela
            conversa no WhatsApp.
          </p>
          {whatsappDigitos ? (
            <a
              href={`https://wa.me/${whatsappDigitos}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Pedir pelo WhatsApp: ${cfg.whatsapp as string}`}
              className="borda-sistema hover-verde inline-flex w-fit items-center rounded-[var(--radius)] px-4 py-2 font-sans text-[color:var(--color-marrom)] transition-colors"
            >
              {cfg.whatsapp as string}
            </a>
          ) : (
            <Placeholder label="WhatsApp a confirmar" as="p" />
          )}
        </section>
      ) : (
        <AreaInternaGuard area="qualquer" retorno="/pimenta-em-mel/pedido">
          {produtos.length === 0 ? (
            <section aria-labelledby="pimenta-sem-produtos" className="flex flex-col gap-3">
              <h2
                id="pimenta-sem-produtos"
                className="font-serif text-2xl text-[color:var(--color-marrom)]"
              >
                Produtos indisponíveis
              </h2>
              <Placeholder label="apresentações e preços a confirmar" as="p" />
              <p className="font-sans text-[color:var(--color-paragrafo)]">
                Ainda não há produtos disponíveis para pedido online. Fale com a gente pelo
                WhatsApp.
              </p>
            </section>
          ) : (
            <PedidoPimentaForm produtos={produtos} whatsappDigitos={whatsappDigitos} />
          )}
        </AreaInternaGuard>
      )}
    </article>
  )
}
