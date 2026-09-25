'use client'

// <ConfiguracoesUsuario> — dados da conta do usuário autenticado
// (página /configuracoes, área interna).
//
// Client Component (compatível com o build estático de preview): ao montar,
// carrega `/api/users/me` via lib/auth-client.ts. E-mail e papel são exibidos
// como somente leitura; nome, sobrenome e telefone (WhatsApp) são editáveis e
// enviados via `PATCH /api/users/:id` — o access da collection `users` já
// restringe a atualização ao próprio documento. O telefone é validado no
// cliente com `telefonePlausivel` e normalizado no servidor (hook da
// collection) — é o vínculo com os pedidos de delivery.
//
// Localização opcional (docs/features/pimenta-em-mel.md, RN-P07): ponto no
// mapa + referência, salvos no mesmo PATCH (null limpa) e usados para
// pré-preencher os pedidos de delivery e de pimenta em mel.

import { useEffect, useState, type FormEvent, type ReactElement } from 'react'

import { PedidoMapa, type PontoEntrega } from '@/components/PedidoMapa'
import { buscarUsuarioAtual, type UsuarioAtual } from '@/lib/auth-client'
import { telefonePlausivel } from '@/lib/telefone'

const ROTULO_ROLE: Record<string, string> = {
  admin: 'Administrador',
  funcionario: 'Funcionário',
  cliente: 'Cliente',
}

const CLASSE_INPUT =
  'border-borda bg-fundo rounded-sm border px-3 py-2 font-sans text-marrom'
const CLASSE_LABEL = 'font-sans font-medium text-marrom'

export function ConfiguracoesUsuario(): ReactElement {
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [ponto, setPonto] = useState<PontoEntrega | null>(null)
  const [pontoInicial, setPontoInicial] = useState<PontoEntrega | null>(null)
  const [localidade, setLocalidade] = useState('')
  const [erros, setErros] = useState<string[]>([])
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    buscarUsuarioAtual().then((atual) => {
      if (!ativo) return
      setUsuario(atual)
      setNome(atual?.nome ?? '')
      setSobrenome(atual?.sobrenome ?? '')
      setTelefone(atual?.telefone ?? '')
      setLocalidade(atual?.localidade ?? '')
      if (atual?.latitude != null && atual.longitude != null) {
        const salvo = { latitude: atual.latitude, longitude: atual.longitude }
        setPontoInicial(salvo)
        setPonto(salvo)
      }
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function aoSubmeter(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (!usuario) return
    setErros([])
    setSucesso(false)

    const novosErros: string[] = []
    if (nome.trim() === '') novosErros.push('Nome é obrigatório.')
    if (sobrenome.trim() === '') novosErros.push('Sobrenome é obrigatório.')
    if (!telefonePlausivel(telefone)) {
      novosErros.push('Telefone (WhatsApp) válido, com DDD, é obrigatório.')
    }
    if (novosErros.length > 0) {
      setErros(novosErros)
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`/api/users/${usuario.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          sobrenome: sobrenome.trim(),
          telefone,
          latitude: ponto?.latitude ?? null,
          longitude: ponto?.longitude ?? null,
          localidade: localidade.trim() || null,
        }),
      })

      if (res.ok) {
        setSucesso(true)
        return
      }

      const dados = (await res.json().catch(() => null)) as {
        errors?: Array<{ message?: string }>
      } | null
      const mensagens = dados?.errors
        ?.map((erro) => erro.message)
        .filter((m): m is string => typeof m === 'string' && m !== '')
      setErros(
        mensagens && mensagens.length > 0
          ? mensagens
          : ['Não foi possível salvar as alterações. Tente novamente mais tarde.'],
      )
    } catch {
      setErros(['Não foi possível salvar as alterações. Tente novamente mais tarde.'])
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <p role="status" className="py-6 font-sans text-paragrafo">
        Carregando seus dados…
      </p>
    )
  }

  if (!usuario) {
    return (
      <p role="alert" className="py-6 font-sans text-paragrafo">
        Não foi possível carregar os dados da conta no momento.
      </p>
    )
  }

  return (
    <div className="borda-sistema bg-papel flex w-full flex-col gap-4 rounded-lg p-6">
      {/* Somente leitura: e-mail (identificador de login) e papel. */}
      <dl className="flex flex-col gap-2 font-sans text-marrom">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium">E-mail:</dt>
          <dd>{usuario.email}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium">Perfil:</dt>
          <dd>{ROTULO_ROLE[usuario.role ?? ''] ?? usuario.role}</dd>
        </div>
      </dl>

      <form onSubmit={aoSubmeter} className="flex w-full flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="config-nome" className={CLASSE_LABEL}>
            Nome
          </label>
          <input
            id="config-nome"
            name="nome"
            type="text"
            autoComplete="given-name"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={CLASSE_INPUT}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="config-sobrenome" className={CLASSE_LABEL}>
            Sobrenome
          </label>
          <input
            id="config-sobrenome"
            name="sobrenome"
            type="text"
            autoComplete="family-name"
            required
            value={sobrenome}
            onChange={(e) => setSobrenome(e.target.value)}
            className={CLASSE_INPUT}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="config-telefone" className={CLASSE_LABEL}>
            Telefone (WhatsApp)
          </label>
          <input
            id="config-telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="(75) 99999-0000"
            aria-describedby="config-telefone-desc"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className={CLASSE_INPUT}
          />
          <p id="config-telefone-desc" className="font-sans text-sm text-paragrafo">
            É o número que vincula a conta aos seus pedidos de delivery.
          </p>
        </div>

        <fieldset className="flex flex-col gap-3 border-t border-borda pt-4">
          <legend className={CLASSE_LABEL}>Localização (opcional)</legend>
          <p className="font-sans text-sm text-paragrafo">
            O ponto salvo já vem marcado nos pedidos de delivery e de pimenta em mel.
          </p>
          <PedidoMapa
            onMudancaPonto={setPonto}
            pontoInicial={pontoInicial}
            permitirRemover
            rotuloPonto="seu ponto de referência"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="config-localidade" className={CLASSE_LABEL}>
              Localidade ou ponto de referência
            </label>
            <input
              id="config-localidade"
              name="localidade"
              type="text"
              value={localidade}
              onChange={(e) => setLocalidade(e.target.value)}
              className={CLASSE_INPUT}
            />
          </div>
        </fieldset>

        {erros.length > 0 ? (
          <div role="alert" className="flex flex-col gap-1">
            {erros.map((erro, indice) => (
              <p key={indice} className="font-sans text-sm text-marrom-escuro">
                {erro}
              </p>
            ))}
          </div>
        ) : null}

        {sucesso ? (
          <p role="status" className="font-sans text-sm text-verde">
            Dados atualizados com sucesso.
          </p>
        ) : null}

        <button type="submit" disabled={enviando} className="btn-primario self-start">
          {enviando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}

export default ConfiguracoesUsuario
