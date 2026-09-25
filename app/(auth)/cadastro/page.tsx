// Página /cadastro — cadastro público de clientes
// (docs/features/dashboard-pedidos.md). É o destino do "follow-up" pós-pedido:
// a confirmação do formulário de delivery convida o cliente a criar a conta
// para acompanhar o status do pedido.
//
// Vive no route group `(auth)`: renderiza SEM a navbar e o footer da landing
// page (ver app/(auth)/layout.tsx). Server Component (exportável
// estaticamente no build de preview): apenas a moldura visual; toda a
// interação fica no client component <CadastroForm>, que chama
// `POST /api/cadastro-cliente` e sai autenticado, indo para /area-cliente.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense, type ReactElement } from 'react'

import { LinkComRetorno } from '@/components/LinkComRetorno'
import { Watercolor } from '@/components/Watercolor'

import { CadastroForm } from './CadastroForm'

export const metadata: Metadata = {
  title: 'Criar conta | Capão Grande',
  description: 'Crie sua conta do Capão Grande para acompanhar seus pedidos.',
}

export default function CadastroPage(): ReactElement {
  return (
    <article className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-12">
      {/* Retorno à landing page — esta página não tem a navbar do site. */}
      <Link href="/" className="hover-verde self-start font-sans text-marrom transition-colors">
        &larr; Voltar para o site
      </Link>

      <Watercolor
        name="logo"
        width={1066}
        height={727}
        alt="Capão Grande"
        priority
        className="my-12 h-52 w-auto"
      />

      <div className="flex w-full flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl text-verde">Criar conta</h1>
        <p className="font-sans text-paragrafo">
          Cadastre-se com o mesmo telefone (WhatsApp) usado nos seus pedidos para
          acompanhar o status de cada um.
        </p>
      </div>

      {/* useSearchParams (pré-preenchimento do telefone) exige Suspense. */}
      <Suspense>
        <CadastroForm />
      </Suspense>

      <p className="font-sans text-sm text-paragrafo">
        Já tem conta?{' '}
        <Suspense
          fallback={
            <Link href="/login" className="hover-verde text-marrom underline transition-colors">
              Entrar
            </Link>
          }
        >
          <LinkComRetorno
            href="/login"
            className="hover-verde text-marrom underline transition-colors"
          >
            Entrar
          </LinkComRetorno>
        </Suspense>
      </p>
    </article>
  )
}
