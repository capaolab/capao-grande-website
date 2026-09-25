// Página /login — entrada única de autenticação do site.
//
// Vive no route group `(auth)`: renderiza SEM a navbar e o footer da landing
// page (ver app/(auth)/layout.tsx). Server Component (exportável
// estaticamente no build de preview): apenas a moldura visual com o logo em
// aquarela, o link de retorno ao site e o título; toda a interação fica no
// client component <LoginForm>, que autentica contra a API do Payload
// (`POST /api/users/login`) e redireciona conforme o papel do usuário
// (admin -> /admin, funcionário -> /area-funcionario, cliente -> /area-cliente)
// — ou para a rota de retorno `?next=` (ex.: /pedido) quando presente.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense, type ReactElement } from 'react'

import { LinkComRetorno } from '@/components/LinkComRetorno'
import { Watercolor } from '@/components/Watercolor'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Entrar | Capão Grande',
  description: 'Acesse sua conta do Capão Grande.',
}

export default function LoginPage(): ReactElement {
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

      {/* useSearchParams (rota de retorno `?next=`) exige Suspense. */}
      <Suspense>
        <LoginForm />
      </Suspense>

      <p className="font-sans text-sm text-paragrafo">
        Ainda não tem conta?{' '}
        <Suspense
          fallback={
            <Link href="/cadastro" className="hover-verde text-marrom underline transition-colors">
              Cadastre-se
            </Link>
          }
        >
          <LinkComRetorno
            href="/cadastro"
            className="hover-verde text-marrom underline transition-colors"
          >
            Cadastre-se
          </LinkComRetorno>
        </Suspense>{' '}
        para acompanhar seus pedidos.
      </p>
    </article>
  )
}
