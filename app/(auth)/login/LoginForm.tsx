'use client'

// <LoginForm> — formulário de login do site (task de autenticação por papel).
//
// Client Component: autentica contra a API REST do Payload no mesmo domínio
// (`POST /api/users/login`), que define o cookie httpOnly `payload-token` na
// resposta. Em seguida redireciona conforme o papel do usuário
// (lib/permissoes.ts): admin -> /admin, funcionario -> /area-funcionario,
// cliente -> /area-cliente. Com `?next=<rota interna>` (ex.: /pedido, vindo
// do AreaInternaGuard), volta para essa rota em vez da área do papel — a rota
// é validada por `rotaDeRetorno` (sem open redirect).
//
// Ao montar, checa `/api/users/me`: quem já tem sessão válida é redirecionado
// direto para a sua área, sem ver o formulário.
//
// Build estático de preview: lá a API não existe — o fetch falha ou responde
// 404; ambos os casos caem na mensagem de indisponibilidade, sem quebrar a
// página.

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, type FormEvent, type ReactElement } from 'react'

import { PARAM_RETORNO, rotaDeRetorno, rotaPorRole } from '@/lib/permissoes'

const ERRO_CREDENCIAIS = 'E-mail ou senha incorretos.'
const ERRO_INDISPONIVEL =
  'Não foi possível entrar no momento. Tente novamente mais tarde.'

export function LoginForm(): ReactElement {
  const router = useRouter()
  const retorno = rotaDeRetorno(useSearchParams().get(PARAM_RETORNO))
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Sessão já ativa? Vai direto para a área do papel.
  useEffect(() => {
    let ativo = true
    fetch('/api/users/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!ativo || !res.ok) return
        const dados = (await res.json()) as { user?: { role?: string } | null }
        if (dados.user) router.replace(retorno ?? rotaPorRole(dados.user.role))
      })
      .catch(() => {
        // Sem API (preview estático) ou offline: permanece no formulário.
      })
    return () => {
      ativo = false
    }
  }, [retorno, router])

  async function aoSubmeter(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      })

      if (!res.ok) {
        setErro(res.status === 401 ? ERRO_CREDENCIAIS : ERRO_INDISPONIVEL)
        return
      }

      const dados = (await res.json()) as { user?: { role?: string } | null }
      router.push(retorno ?? rotaPorRole(dados.user?.role))
    } catch {
      setErro(ERRO_INDISPONIVEL)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={aoSubmeter}
      className="borda-sistema bg-papel flex w-full flex-col gap-4 rounded-lg p-6"
      noValidate
    >
      {retorno === '/pedido' ? (
        <p className="font-sans text-sm text-paragrafo">
          Entre na sua conta para fazer seu pedido. Ainda não tem conta? Cadastre-se
          abaixo — leva um minuto.
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="font-sans font-medium text-marrom">
          E-mail
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-senha" className="font-sans font-medium text-marrom">
          Senha
        </label>
        <input
          id="login-senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
        />
      </div>

      {erro ? (
        <p role="alert" className="font-sans text-sm text-marrom-escuro">
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className="btn-primario">
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

export default LoginForm
