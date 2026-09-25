'use client'

// <CadastroForm> — formulário público de cadastro de clientes
// (docs/features/dashboard-pedidos.md).
//
// Client Component: envia `POST /api/cadastro-cliente`, que cria a conta com
// papel `cliente` e já define o cookie de sessão — o cliente sai logado e vai
// direto para /area-cliente (ou para a rota de retorno `?next=`, ex.: /pedido,
// quando veio do login exigido pelo formulário de pedido). Se a conta foi
// criada mas o login automático falhou (loginPendente), cai na tela de login
// preservando o retorno.
//
// O telefone é o vínculo com os pedidos: aceita pré-preenchimento via query
// string `?telefone=` (a confirmação do formulário de pedido já linka com o
// telefone digitado lá).
//
// Localização OPCIONAL (docs/features/pimenta-em-mel.md, RN-P07): ponto no
// mapa + referência, usados para pré-preencher os pedidos de delivery e de
// pimenta em mel. O mapa só é montado se o cliente escolher adicioná-la.
//
// Ao montar, checa `/api/users/me`: quem já tem sessão válida é redirecionado
// direto para a sua área, sem ver o formulário. No build estático de preview
// a API não existe — o fetch falha e o formulário exibe a mensagem de
// indisponibilidade apenas ao tentar enviar, sem quebrar a página.

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, type FormEvent, type ReactElement } from 'react'

import { PedidoMapa, type PontoEntrega } from '@/components/PedidoMapa'
import { MIN_SENHA } from '@/lib/cadastro'
import {
  comRetorno,
  PARAM_RETORNO,
  rotaDeRetorno,
  rotaPorRole,
  ROTA_CLIENTE,
  ROTA_LOGIN,
} from '@/lib/permissoes'

const ERRO_INDISPONIVEL =
  'Não foi possível concluir o cadastro no momento. Tente novamente mais tarde.'

export function CadastroForm(): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Rota de retorno pós-cadastro (ex.: /pedido), validada contra open redirect.
  const retorno = rotaDeRetorno(searchParams.get(PARAM_RETORNO))
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [email, setEmail] = useState('')
  // Pré-preenchimento do follow-up pós-pedido (/cadastro?telefone=...).
  const [telefone, setTelefone] = useState(searchParams.get('telefone') ?? '')
  const [senha, setSenha] = useState('')
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('')
  // Localização opcional (mapa montado sob demanda).
  const [comLocalizacao, setComLocalizacao] = useState(false)
  const [ponto, setPonto] = useState<PontoEntrega | null>(null)
  const [localidade, setLocalidade] = useState('')
  // Honeypot anti-spam: invisível para humanos, enviado sempre vazio.
  const [website, setWebsite] = useState('')
  const [erros, setErros] = useState<string[]>([])
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
    setErros([])

    if (senha !== confirmacaoSenha) {
      setErros(['A confirmação de senha não confere.'])
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/cadastro-cliente', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          sobrenome,
          email,
          telefone,
          senha,
          website,
          ...(comLocalizacao && ponto
            ? { latitude: ponto.latitude, longitude: ponto.longitude }
            : {}),
          ...(comLocalizacao && localidade.trim() !== ''
            ? { localidade: localidade.trim() }
            : {}),
        }),
      })

      const dados = (await res.json()) as {
        cadastrado?: boolean
        loginPendente?: boolean
        erros?: string[]
      }

      if (res.status === 201 && dados.cadastrado) {
        router.push(
          dados.loginPendente
            ? comRetorno(ROTA_LOGIN, retorno)
            : (retorno ?? ROTA_CLIENTE),
        )
        return
      }

      setErros(
        dados.erros && dados.erros.length > 0 ? dados.erros : [ERRO_INDISPONIVEL],
      )
    } catch {
      setErros([ERRO_INDISPONIVEL])
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
      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-nome" className="font-sans font-medium text-marrom">
          Nome
        </label>
        <input
          id="cadastro-nome"
          name="nome"
          type="text"
          autoComplete="given-name"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-sobrenome" className="font-sans font-medium text-marrom">
          Sobrenome
        </label>
        <input
          id="cadastro-sobrenome"
          name="sobrenome"
          type="text"
          autoComplete="family-name"
          required
          value={sobrenome}
          onChange={(e) => setSobrenome(e.target.value)}
          className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-email" className="font-sans font-medium text-marrom">
          E-mail
        </label>
        <input
          id="cadastro-email"
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
        <label htmlFor="cadastro-telefone" className="font-sans font-medium text-marrom">
          Telefone (WhatsApp)
        </label>
        <input
          id="cadastro-telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="(75) 99999-0000"
          aria-describedby="cadastro-telefone-desc"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
        />
        <p id="cadastro-telefone-desc" className="font-sans text-sm text-paragrafo">
          Use o mesmo número informado nos seus pedidos — é ele que vincula a
          conta aos pedidos.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-senha" className="font-sans font-medium text-marrom">
          Senha
        </label>
        <input
          id="cadastro-senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_SENHA}
          aria-describedby="cadastro-senha-desc"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
        />
        <p id="cadastro-senha-desc" className="font-sans text-sm text-paragrafo">
          Mínimo de {MIN_SENHA} caracteres.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-confirmacao" className="font-sans font-medium text-marrom">
          Confirmar senha
        </label>
        <input
          id="cadastro-confirmacao"
          name="confirmacaoSenha"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacaoSenha}
          onChange={(e) => setConfirmacaoSenha(e.target.value)}
          className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
        />
      </div>

      <fieldset className="flex flex-col gap-3 border-t border-borda pt-4">
        <legend className="font-sans font-medium text-marrom">
          Sua localização (opcional)
        </legend>
        <p id="cadastro-localizacao-desc" className="font-sans text-sm text-paragrafo">
          Salve o ponto onde costuma receber pedidos: ele já vem marcado nos
          formulários de delivery e de pimenta em mel. Dá para mudar depois em
          Configurações.
        </p>
        {comLocalizacao ? (
          <>
            <PedidoMapa
              onMudancaPonto={setPonto}
              permitirRemover
              rotuloPonto="seu ponto de referência"
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="cadastro-localidade" className="font-sans font-medium text-marrom">
                Localidade ou ponto de referência
              </label>
              <input
                id="cadastro-localidade"
                name="localidade"
                type="text"
                value={localidade}
                onChange={(e) => setLocalidade(e.target.value)}
                className="border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setComLocalizacao(false)
                setPonto(null)
                setLocalidade('')
              }}
              className="hover-verde w-fit font-sans text-sm text-marrom underline transition-colors"
            >
              Não informar localização
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setComLocalizacao(true)}
            aria-describedby="cadastro-localizacao-desc"
            className="borda-sistema hover-verde w-fit rounded-sm px-4 py-2 font-sans text-marrom transition-colors"
          >
            Adicionar minha localização
          </button>
        )}
      </fieldset>

      {/* Honeypot anti-spam: invisível (fora da árvore de acessibilidade),
          fora da ordem de tabulação; bots que o preenchem são descartados no
          servidor. */}
      <div className="hidden">
        <label htmlFor="cadastro-website">Website</label>
        <input
          id="cadastro-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {erros.length > 0 ? (
        <div role="alert" className="flex flex-col gap-1">
          {erros.map((erro, indice) => (
            <p key={indice} className="font-sans text-sm text-marrom-escuro">
              {erro}
            </p>
          ))}
        </div>
      ) : null}

      <button type="submit" disabled={enviando} className="btn-primario">
        {enviando ? 'Criando conta…' : 'Criar conta'}
      </button>
    </form>
  )
}

export default CadastroForm
