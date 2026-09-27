'use client'

// <BuscaCliente> — bloco "Cliente" dos formulários de pedido na visão do
// funcionário (docs/features/pedidos-painel.md). Fica ACIMA do pedido e
// serve ao atendimento só pelo WhatsApp, quando o cliente não usa o
// formulário:
//  - busca por nome, telefone ou e-mail (GET /api/buscar-clientes, restrito
//    à equipe) com autopreenchimento dos dados do cliente escolhido — os
//    campos ficam somente leitura até "Trocar cliente";
//  - sem cliente escolhido, os campos obrigatórios do cadastro (nome,
//    sobrenome, telefone; e-mail opcional): o envio do pedido cadastra o
//    cliente (ou reaproveita a conta com o mesmo telefone).
//
// Componente CONTROLADO: o formulário pai guarda `valor` e monta o campo
// `cliente` do corpo da submissão com `paraCorpoCliente`.

import { useEffect, useState, type ReactElement } from 'react'

import type { PontoEntrega } from './PedidoMapa'

/** Cliente encontrado na busca (forma devolvida por /api/buscar-clientes). */
export interface ClienteEncontrado {
  id: number
  nome: string
  sobrenome: string
  telefone: string
  email: string
  latitude: number | null
  longitude: number | null
  localidade: string | null
}

/** Estado do bloco: cliente escolhido (`id`) ou dados de um cadastro novo. */
export interface ClienteBalcao {
  id: number | null
  nome: string
  sobrenome: string
  telefone: string
  email: string
}

export const CLIENTE_BALCAO_VAZIO: ClienteBalcao = {
  id: null,
  nome: '',
  sobrenome: '',
  telefone: '',
  email: '',
}

/** Campo `cliente` do corpo de /api/submeter-pedido(-pimenta). */
export function paraCorpoCliente(cliente: ClienteBalcao) {
  if (cliente.id != null) return { id: cliente.id }
  return {
    nome: cliente.nome.trim(),
    sobrenome: cliente.sobrenome.trim(),
    telefone: cliente.telefone.trim(),
    ...(cliente.email.trim() !== '' ? { email: cliente.email.trim() } : {}),
  }
}

/** Localização salva do cliente, para o pin inicial do mapa. */
export function pontoDoCliente(cliente: ClienteEncontrado): PontoEntrega | null {
  return cliente.latitude != null && cliente.longitude != null
    ? { latitude: cliente.latitude, longitude: cliente.longitude }
    : null
}

const CLASSE_INPUT =
  'borda-sistema rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 font-sans text-[color:var(--color-marrom)] read-only:opacity-70'
const CLASSE_H2 =
  'border-b-2 border-[color:var(--color-oliva)] pb-1 font-serif text-2xl text-[color:var(--color-marrom)]'
const ESPERA_BUSCA_MS = 300

export interface BuscaClienteProps {
  valor: ClienteBalcao
  onChange: (valor: ClienteBalcao) => void
  /** Chamado ao escolher um cliente da busca (localização para o mapa). */
  onSelecionar?: (cliente: ClienteEncontrado) => void
  /** Erros de validação do cliente (exibidos no bloco). */
  erros?: string[]
  idPrefixo: string
}

export function BuscaCliente({
  valor,
  onChange,
  onSelecionar,
  erros = [],
  idPrefixo,
}: BuscaClienteProps): ReactElement {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ClienteEncontrado[] | null>(null)
  const [falhaBusca, setFalhaBusca] = useState(false)
  const selecionado = valor.id != null

  // Busca com espera: só depois que o funcionário para de digitar.
  useEffect(() => {
    const q = termo.trim()
    if (q.length < 2) return
    let ativo = true
    const espera = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar-clientes?q=${encodeURIComponent(q)}`, {
          credentials: 'same-origin',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const dados = (await res.json()) as { clientes: ClienteEncontrado[] }
        if (ativo) {
          setResultados(dados.clientes)
          setFalhaBusca(false)
        }
      } catch {
        if (ativo) setFalhaBusca(true)
      }
    }, ESPERA_BUSCA_MS)
    return () => {
      ativo = false
      clearTimeout(espera)
    }
  }, [termo])

  function escolher(cliente: ClienteEncontrado) {
    onChange({
      id: cliente.id,
      nome: cliente.nome,
      sobrenome: cliente.sobrenome,
      telefone: cliente.telefone,
      email: cliente.email,
    })
    onSelecionar?.(cliente)
    setTermo('')
    setResultados(null)
  }

  const campo = (
    chave: 'nome' | 'sobrenome' | 'telefone' | 'email',
    rotulo: string,
    tipo: 'text' | 'tel' | 'email' = 'text',
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${idPrefixo}-cliente-${chave}`} className="font-sans text-[color:var(--color-marrom)]">
        {rotulo}
      </label>
      <input
        id={`${idPrefixo}-cliente-${chave}`}
        type={tipo}
        readOnly={selecionado}
        value={valor[chave]}
        onChange={(e) => onChange({ ...valor, [chave]: e.target.value })}
        className={CLASSE_INPUT}
      />
    </div>
  )

  const buscando = termo.trim().length >= 2

  return (
    <section aria-labelledby={`${idPrefixo}-cliente-titulo`} className="flex flex-col gap-4">
      <h2 id={`${idPrefixo}-cliente-titulo`} className={CLASSE_H2}>
        Cliente
      </h2>

      {selecionado ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            Cliente cadastrado selecionado.
          </p>
          <button
            type="button"
            onClick={() => onChange(CLIENTE_BALCAO_VAZIO)}
            className="hover-verde font-sans text-[color:var(--color-marrom)] underline transition-colors"
          >
            Trocar cliente
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${idPrefixo}-cliente-busca`} className="font-sans text-[color:var(--color-marrom)]">
            Buscar cliente cadastrado
          </label>
          <input
            id={`${idPrefixo}-cliente-busca`}
            type="search"
            autoComplete="off"
            placeholder="Nome, telefone ou e-mail"
            aria-describedby={`${idPrefixo}-cliente-busca-desc`}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            className={CLASSE_INPUT}
          />
          <p id={`${idPrefixo}-cliente-busca-desc`} className="font-sans text-sm text-[color:var(--color-paragrafo)]">
            Escolha um cliente para preencher os dados. Sem cadastro, preencha abaixo: o
            cliente é cadastrado junto com o pedido.
          </p>

          <div aria-live="polite">
            {buscando && falhaBusca ? (
              <p className="font-sans text-sm text-[color:var(--color-marrom)]">
                Não foi possível buscar agora. Preencha os dados abaixo.
              </p>
            ) : buscando && resultados?.length === 0 ? (
              <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
                Nenhum cliente encontrado.
              </p>
            ) : buscando && resultados && resultados.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {resultados.map((cliente) => (
                  <li key={cliente.id}>
                    <button
                      type="button"
                      onClick={() => escolher(cliente)}
                      className="borda-sistema hover-verde flex w-full flex-col items-start rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 text-left font-sans transition-colors"
                    >
                      <span className="text-[color:var(--color-marrom)]">
                        {cliente.nome} {cliente.sobrenome}
                      </span>
                      <span className="text-sm text-[color:var(--color-paragrafo)]">
                        {cliente.telefone}
                        {cliente.localidade ? ` · ${cliente.localidade}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {campo('nome', 'Nome (obrigatório)')}
        {campo('sobrenome', 'Sobrenome (obrigatório)')}
        {campo('telefone', 'Telefone (WhatsApp) (obrigatório)', 'tel')}
        {campo('email', 'E-mail (opcional)', 'email')}
      </div>

      {erros.length > 0 ? (
        <div role="alert" className="flex flex-col gap-1">
          {erros.map((erro) => (
            <p key={erro} className="font-sans text-sm text-[color:var(--color-marrom)]">
              {erro}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default BuscaCliente
