// Página pública `/pimenta-em-mel` (docs/features/pimenta-em-mel.md, RN-P01)
// — Server Component assíncrono.
//
// Apresenta a pimenta em mel produzida pela pizzaria e leva ao formulário de
// pedido (`/pimenta-em-mel/pedido`, login obrigatório):
//  - O produto: texto de apresentação; detalhes factuais ainda não
//    fornecidos (ingredientes, conservação) aparecem como <Placeholder> —
//    nunca inventamos dados reais (Req 19).
//  - Apresentações e preços: produtos ATIVOS de `produtos-pimenta`
//    (getProdutosPimenta), com preço unitário e, quando houver, o preço de
//    lote e a quantidade mínima. Catálogo vazio ⇒ <Placeholder>.
//  - Para restaurantes: regra do preço de lote.
//  - Como pedir: passos + bloco de CTA para o formulário.
//
// Acessibilidade (Req 20.2): exatamente UM <h1>; seções com <h2>, passos com
// <h3> (StepList). Design: sem sombra; tokens de app/globals.css.

import type { ReactElement } from 'react'
import Link from 'next/link'

import { CmsImage } from '@/components/CmsImage'
import { SetaAcao } from '@/components/PedidoCta'
import { Placeholder } from '@/components/Placeholder'
import { StepList, type Step } from '@/components/StepList'
import { Watercolor } from '@/components/Watercolor'
import { renderPreco } from '@/lib/cardapio'
import { temPrecoLote } from '@/lib/pimenta'
import { getProdutosPimenta } from '@/lib/queries'

export const metadata = {
  title: 'Pimenta em mel | Capão Grande',
  description:
    'Pimenta em mel produzida na pizzaria Capão Grande: por unidade ou em lote para restaurantes. Faça seu pedido online.',
}

const ROTA_PEDIDO_PIMENTA = '/pimenta-em-mel/pedido'

const PASSOS: Step[] = [
  {
    titulo: 'Entre na sua conta',
    descricao:
      'O pedido é feito com login. Se ainda não tem conta, o cadastro leva um minuto — e você pode salvar sua localização para os próximos pedidos.',
  },
  {
    titulo: 'Escolha os produtos e as quantidades',
    descricao:
      'O preço de lote é aplicado automaticamente quando a quantidade atinge o mínimo do produto.',
  },
  {
    titulo: 'Entrega ou retirada',
    descricao:
      'Para entrega, marque o ponto no mapa (no Vale do Capão não usamos endereço formal). Ou retire na pizzaria.',
  },
  {
    titulo: 'Envie o código no WhatsApp',
    descricao:
      'Você recebe um código do pedido para informar na conversa, onde combinamos pagamento e frete. O status fica visível em "Meus pedidos".',
  },
]

export default async function PimentaEmMelPage(): Promise<ReactElement> {
  const produtos = await getProdutosPimenta()
  const algumLote = produtos.some(temPrecoLote)

  return (
    <article className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-[var(--spacing-leitura)] flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--color-verde)]">
            Produção da casa
          </p>
          <h1 className="font-serif text-4xl leading-tight text-[color:var(--color-marrom)]">
            Pimenta em mel
          </h1>
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            Feita aqui na pizzaria, a nossa pimenta em mel é vendida por unidade para levar
            para casa e em lote para restaurantes que querem servi-la à mesa.
          </p>
        </div>
        <Watercolor name="mel" width={159} height={187} className="h-auto w-28 shrink-0" />
      </header>

      <section aria-labelledby="pimenta-produto" className="flex flex-col gap-3">
        <h2
          id="pimenta-produto"
          className="font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          O produto
        </h2>
        <Placeholder label="descrição do produto e ingredientes a confirmar" as="p" />
        <Placeholder label="conservação e validade a confirmar" as="p" />
      </section>

      <section aria-labelledby="pimenta-produtos" className="flex flex-col gap-4">
        <h2
          id="pimenta-produtos"
          className="font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Apresentações e preços
        </h2>
        {produtos.length === 0 ? (
          <Placeholder label="apresentações e preços a confirmar" as="p" />
        ) : (
          <ul className="grade-reflow">
            {produtos.map((produto) => (
              <li
                key={produto.id}
                className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-4"
              >
                {produto.imagem ? (
                  <CmsImage media={produto.imagem} square width={320} className="w-full" />
                ) : null}
                <h3 className="font-serif text-xl text-[color:var(--color-marrom)]">
                  {produto.nome}
                  {produto.volume ? (
                    <span className="font-sans text-base text-[color:var(--color-paragrafo)]">
                      {' '}
                      · {produto.volume}
                    </span>
                  ) : null}
                </h3>
                {produto.descricao ? (
                  <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
                    {produto.descricao}
                  </p>
                ) : null}
                <dl className="mt-auto flex flex-col gap-1 font-sans">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[color:var(--color-paragrafo)]">Unidade</dt>
                    <dd className="text-[color:var(--color-marrom)]">
                      {renderPreco(produto.preco)}
                    </dd>
                  </div>
                  {temPrecoLote(produto) ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[color:var(--color-paragrafo)]">
                        Lote (a partir de {produto.loteMinimo} un.)
                      </dt>
                      <dd className="text-[color:var(--color-verde)]">
                        {renderPreco(produto.precoLote)} / un.
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pimenta-restaurantes" className="flex flex-col gap-3">
        <h2
          id="pimenta-restaurantes"
          className="font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Para restaurantes
        </h2>
        <p className="max-w-[var(--spacing-leitura)] font-sans text-[color:var(--color-paragrafo)]">
          {algumLote
            ? 'Pedidos maiores têm preço de lote: ao atingir a quantidade mínima do produto, cada unidade sai pelo valor de lote — o formulário mostra o desconto na hora.'
            : 'Atendemos pedidos em quantidade para restaurantes e comércios.'}{' '}
          Informe o nome do estabelecimento no pedido para facilitar a entrega e o
          acompanhamento.
        </p>
      </section>

      <section aria-labelledby="pimenta-como-pedir" className="flex flex-col gap-4">
        <h2
          id="pimenta-como-pedir"
          className="font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Como pedir
        </h2>
        <StepList steps={PASSOS} />
        <div className="flex w-full flex-col gap-3 rounded-[var(--radius)] border-l-4 border-[color:var(--color-oliva)] bg-[color:var(--color-fundo)] p-4">
          <p className="font-serif text-lg text-[color:var(--color-marrom)]">
            Pronto para pedir?
          </p>
          <Link href={ROTA_PEDIDO_PIMENTA} className="btn-primario group w-fit gap-2">
            Fazer pedido de pimenta em mel
            <SetaAcao />
          </Link>
        </div>
      </section>
    </article>
  )
}
