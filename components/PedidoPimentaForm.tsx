'use client'

// <PedidoPimentaForm> — formulário de pedido de pimenta em mel
// (docs/features/pimenta-em-mel.md, RN-P03..RN-P07). Modelo: PedidoForm.
//
// Estrutura:
//  - Produtos: cada apresentação tem um campo de quantidade (número, com
//    botões −/+) — pedidos em lote podem ter dezenas de unidades. O preço
//    unitário exibido muda para o de LOTE quando a quantidade atinge o
//    mínimo do produto (mesma regra do servidor: `precoAplicavel`).
//  - Seus dados: nome e telefone obrigatórios (pré-preenchidos da conta),
//    estabelecimento opcional (restaurantes), observações.
//  - Recebimento: rádio Entrega / Retirada. Na entrega, ponto no mapa
//    obrigatório + localidade — ambos pré-preenchidos com a localização
//    salva no perfil (RN-P07).
//  - Rodapé fixo com o subtotal ao vivo (`calcularSubtotalPimenta`) e aviso
//    de que o frete é combinado no WhatsApp.
//
// Submissão: POST /api/submeter-pedido-pimenta. 401 → link para entrar de
// novo; 400/429/rede → erros sem perder o formulário; 201 → confirmação com
// o código, botão do WhatsApp e atalho para "Meus pedidos".

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react'
import Link from 'next/link'

import { buscarUsuarioAtual } from '@/lib/auth-client'
import { renderPreco } from '@/lib/cardapio'
import { comRetorno, ROTA_CLIENTE, ROTA_LOGIN } from '@/lib/permissoes'
import {
  calcularSubtotalPimenta,
  precoAplicavel,
  temPrecoLote,
  type ProdutoPimentaMinimo,
} from '@/lib/pimenta'
import type { ModalidadeEntrega } from '@/lib/status-pedido'
import { normalizarTelefone } from '@/lib/telefone'
import { PedidoMapa, type PontoEntrega } from './PedidoMapa'

const ROTA_FORMULARIO = '/pimenta-em-mel/pedido'
const MAX_QUANTIDADE = 9999

/** Produto em forma serializável (vinda do Server Component). */
export interface ProdutoPimentaForm extends ProdutoPimentaMinimo {
  id: number
  nome: string
  descricao: string | null
}

export interface PedidoPimentaFormProps {
  produtos: ProdutoPimentaForm[]
  /** Dígitos do WhatsApp da pizzaria; null = omitir botão. */
  whatsappDigitos: string | null
}

interface ErrosCampos {
  nome?: string
  telefone?: string
  itens?: string
  localizacao?: string
}

const CLASSE_INPUT =
  'borda-sistema rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 font-sans text-[color:var(--color-marrom)]'
const CLASSE_BOTAO_STEPPER =
  'borda-sistema hover-verde inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] font-sans text-[color:var(--color-marrom)] transition-colors disabled:opacity-40'
const CLASSE_H2 =
  'border-b-2 border-[color:var(--color-oliva)] pb-1 font-serif text-2xl text-[color:var(--color-marrom)]'

/** Texto do campo de quantidade → inteiro ≥ 0 (vazio/inválido = 0). */
function lerQuantidade(texto: string | undefined): number {
  const valor = Number.parseInt(texto ?? '', 10)
  return Number.isFinite(valor) && valor > 0 ? Math.min(valor, MAX_QUANTIDADE) : 0
}

export function PedidoPimentaForm({
  produtos,
  whatsappDigitos,
}: PedidoPimentaFormProps): ReactElement {
  // Quantidade digitada por produto (texto, para permitir edição livre).
  const [quantidades, setQuantidades] = useState<Record<number, string>>({})
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [estabelecimento, setEstabelecimento] = useState('')
  const [modalidade, setModalidade] = useState<ModalidadeEntrega>('entrega')
  const [ponto, setPonto] = useState<PontoEntrega | null>(null)
  const [pontoConta, setPontoConta] = useState<PontoEntrega | null>(null)
  const [localidade, setLocalidade] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [errosCampos, setErrosCampos] = useState<ErrosCampos>({})
  const [errosGerais, setErrosGerais] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [sessaoExpirada, setSessaoExpirada] = useState(false)
  const [telefoneConta, setTelefoneConta] = useState<string | null>(null)
  const [confirmacao, setConfirmacao] = useState<{ codigo: string; subtotal: number } | null>(
    null,
  )

  // Pré-preenchimento com os dados da conta, sem sobrescrever o digitado.
  useEffect(() => {
    let ativo = true
    buscarUsuarioAtual().then((usuario) => {
      if (!ativo || !usuario) return
      const nomeConta = [usuario.nome, usuario.sobrenome].filter(Boolean).join(' ')
      if (nomeConta) setNome((atual) => atual || nomeConta)
      if (usuario.telefone) {
        setTelefone((atual) => atual || (usuario.telefone as string))
        setTelefoneConta(normalizarTelefone(usuario.telefone))
      }
      if (usuario.localidade) setLocalidade((atual) => atual || (usuario.localidade as string))
      if (usuario.latitude != null && usuario.longitude != null) {
        setPontoConta({ latitude: usuario.latitude, longitude: usuario.longitude })
      }
    })
    return () => {
      ativo = false
    }
  }, [])

  const itens = useMemo(
    () =>
      produtos
        .map((produto) => ({
          produto: produto.id,
          quantidade: lerQuantidade(quantidades[produto.id]),
        }))
        .filter((item) => item.quantidade > 0),
    [produtos, quantidades],
  )

  const subtotal = useMemo(() => {
    const resultado = calcularSubtotalPimenta(itens, produtos)
    return resultado.ok ? resultado.subtotal : 0
  }, [itens, produtos])

  function alterarQuantidade(id: number, delta: number) {
    setQuantidades((atual) => {
      const nova = Math.max(0, Math.min(MAX_QUANTIDADE, lerQuantidade(atual[id]) + delta))
      return { ...atual, [id]: nova === 0 ? '' : String(nova) }
    })
  }

  function validar(): ErrosCampos {
    const erros: ErrosCampos = {}
    if (nome.trim() === '') erros.nome = 'Informe seu nome.'
    if (telefone.trim() === '') erros.telefone = 'Informe seu telefone (WhatsApp).'
    if (itens.length === 0) erros.itens = 'Informe a quantidade de ao menos um produto.'
    if (modalidade === 'entrega' && ponto == null) {
      erros.localizacao = 'Marque o ponto de entrega no mapa (ou escolha retirada).'
    }
    return erros
  }

  async function submeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrosGerais([])
    setSessaoExpirada(false)

    const erros = validar()
    setErrosCampos(erros)
    if (Object.keys(erros).length > 0) return

    setEnviando(true)
    try {
      const resposta = await fetch('/api/submeter-pedido-pimenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          ...(estabelecimento.trim() !== '' ? { estabelecimento: estabelecimento.trim() } : {}),
          itens,
          modalidade,
          ...(modalidade === 'entrega' && ponto
            ? {
                latitude: ponto.latitude,
                longitude: ponto.longitude,
                ...(localidade.trim() !== '' ? { localidade: localidade.trim() } : {}),
              }
            : {}),
          ...(observacoes.trim() !== '' ? { observacoes } : {}),
          website,
        }),
      })

      const dados = (await resposta.json()) as {
        codigo?: string
        subtotal?: number
        erros?: string[]
      }

      if (resposta.status === 201 && dados.codigo) {
        setConfirmacao({ codigo: dados.codigo, subtotal: dados.subtotal ?? subtotal })
      } else if (resposta.status === 401) {
        setSessaoExpirada(true)
        setErrosGerais(['Sua sessão expirou. Entre novamente para enviar o pedido.'])
      } else {
        setErrosGerais(
          dados.erros && dados.erros.length > 0
            ? dados.erros
            : ['Não foi possível registrar o pedido. Tente novamente.'],
        )
      }
    } catch {
      setErrosGerais([
        'Falha de conexão ao enviar o pedido. Verifique sua internet e tente novamente — seu pedido continua preenchido.',
      ])
    } finally {
      setEnviando(false)
    }
  }

  // ── Confirmação ───────────────────────────────────────────────────────────
  if (confirmacao) {
    return (
      <section
        aria-labelledby="pimenta-confirmacao-titulo"
        className="borda-sistema flex flex-col gap-4 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6"
      >
        <h2
          id="pimenta-confirmacao-titulo"
          className="font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Pedido registrado
        </h2>
        <p className="font-sans text-[color:var(--color-paragrafo)]">
          <strong className="text-[color:var(--color-marrom)]">
            Último passo: envie o código no WhatsApp.
          </strong>{' '}
          O pedido só é confirmado depois que você informa este código na conversa:
        </p>
        <p className="font-serif text-4xl tracking-wide text-[color:var(--color-verde)]">
          #{confirmacao.codigo}
        </p>
        <p className="font-sans text-[color:var(--color-paragrafo)]">
          Valor dos produtos:{' '}
          <strong className="text-[color:var(--color-marrom)]">
            {renderPreco(confirmacao.subtotal)}
          </strong>
          .{' '}
          {modalidade === 'entrega'
            ? 'O frete e o valor final serão informados pela conversa no WhatsApp.'
            : 'Combinamos o pagamento e o horário de retirada pela conversa no WhatsApp.'}
        </p>
        {whatsappDigitos ? (
          <a
            href={`https://wa.me/${whatsappDigitos}?text=${encodeURIComponent(
              `Olá! Meu pedido de pimenta em mel é o #${confirmacao.codigo}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Informar o pedido #${confirmacao.codigo} na conversa do WhatsApp`}
            className="btn-primario w-fit"
          >
            Informar pedido no WhatsApp
          </a>
        ) : null}
        <div className="mt-2 flex flex-col gap-2 border-t border-[color:var(--color-borda)] pt-4">
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            Acompanhe o status em &ldquo;Meus pedidos&rdquo;.
          </p>
          {telefoneConta && normalizarTelefone(telefone) !== telefoneConta ? (
            <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
              Este pedido usou um telefone diferente do cadastrado na sua conta, então não
              aparecerá em &ldquo;Meus pedidos&rdquo;.
            </p>
          ) : null}
          <Link
            href={`${ROTA_CLIENTE}/pimenta`}
            className="hover-verde w-fit font-sans text-[color:var(--color-marrom)] underline transition-colors"
          >
            Ver meus pedidos
          </Link>
        </div>
      </section>
    )
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={submeter} noValidate className="flex flex-col gap-10">
      {errosGerais.length > 0 ? (
        <div
          role="alert"
          className="borda-sistema flex flex-col gap-1 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-4"
        >
          {errosGerais.map((erro, indice) => (
            <p key={indice} className="font-sans text-[color:var(--color-marrom)]">
              {erro}
            </p>
          ))}
          {sessaoExpirada ? (
            <a
              href={comRetorno(ROTA_LOGIN, ROTA_FORMULARIO)}
              target="_blank"
              rel="noopener"
              className="hover-verde w-fit font-sans text-[color:var(--color-marrom)] underline transition-colors"
            >
              Entrar novamente (abre em nova aba)
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Produtos e quantidades ---------------------------------------------- */}
      <section aria-labelledby="pimenta-produtos-titulo" className="flex flex-col gap-4">
        <h2 id="pimenta-produtos-titulo" className={CLASSE_H2}>
          Produtos
        </h2>
        <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
          Informe a quantidade de cada apresentação. O preço de lote vale automaticamente a
          partir da quantidade mínima.
        </p>
        <ul className="flex flex-col gap-3">
          {produtos.map((produto) => {
            const idCampo = `pimenta-qtd-${produto.id}`
            const quantidade = lerQuantidade(quantidades[produto.id])
            const { precoUnitario, lote } = precoAplicavel(produto, Math.max(1, quantidade))
            const nomeCompleto = produto.volume ? `${produto.nome} (${produto.volume})` : produto.nome
            return (
              <li
                key={produto.id}
                className="borda-sistema flex flex-col gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={idCampo}
                    className="font-serif text-lg text-[color:var(--color-marrom)]"
                  >
                    {nomeCompleto}
                  </label>
                  <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
                    {renderPreco(precoUnitario)} / un.
                    {lote ? ' — preço de lote aplicado' : ''}
                  </p>
                  {temPrecoLote(produto) && !lote ? (
                    <p className="font-sans text-sm text-[color:var(--color-verde)]">
                      Lote: {renderPreco(produto.precoLote)} / un. a partir de{' '}
                      {produto.loteMinimo} unidades
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(produto.id, -1)}
                    disabled={quantidade === 0}
                    aria-label={`Diminuir quantidade de ${nomeCompleto}`}
                    className={CLASSE_BOTAO_STEPPER}
                  >
                    −
                  </button>
                  <input
                    id={idCampo}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_QUANTIDADE}
                    step={1}
                    placeholder="0"
                    value={quantidades[produto.id] ?? ''}
                    onChange={(e) =>
                      setQuantidades((atual) => ({ ...atual, [produto.id]: e.target.value }))
                    }
                    aria-invalid={errosCampos.itens ? true : undefined}
                    aria-describedby={errosCampos.itens ? 'pimenta-erro-itens' : undefined}
                    className={`${CLASSE_INPUT} w-20 text-center`}
                  />
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(produto.id, 1)}
                    aria-label={`Aumentar quantidade de ${nomeCompleto}`}
                    className={CLASSE_BOTAO_STEPPER}
                  >
                    +
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        {errosCampos.itens ? (
          <p
            id="pimenta-erro-itens"
            role="alert"
            className="font-sans text-sm text-[color:var(--color-marrom)]"
          >
            {errosCampos.itens}
          </p>
        ) : null}
      </section>

      {/* Dados do cliente ------------------------------------------------------ */}
      <section aria-labelledby="pimenta-dados-titulo" className="flex flex-col gap-4">
        <h2 id="pimenta-dados-titulo" className={CLASSE_H2}>
          Seus dados
        </h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="pimenta-nome" className="font-sans text-[color:var(--color-marrom)]">
            Nome (obrigatório)
          </label>
          <input
            id="pimenta-nome"
            name="nome"
            type="text"
            required
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-invalid={errosCampos.nome ? true : undefined}
            aria-describedby={errosCampos.nome ? 'pimenta-erro-nome' : undefined}
            className={CLASSE_INPUT}
          />
          {errosCampos.nome ? (
            <p id="pimenta-erro-nome" role="alert" className="font-sans text-sm text-[color:var(--color-marrom)]">
              {errosCampos.nome}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pimenta-telefone" className="font-sans text-[color:var(--color-marrom)]">
            Telefone (WhatsApp) (obrigatório)
          </label>
          <input
            id="pimenta-telefone"
            name="telefone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            aria-invalid={errosCampos.telefone ? true : undefined}
            aria-describedby={errosCampos.telefone ? 'pimenta-erro-telefone' : undefined}
            className={CLASSE_INPUT}
          />
          {errosCampos.telefone ? (
            <p id="pimenta-erro-telefone" role="alert" className="font-sans text-sm text-[color:var(--color-marrom)]">
              {errosCampos.telefone}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pimenta-estabelecimento" className="font-sans text-[color:var(--color-marrom)]">
            Estabelecimento
          </label>
          <input
            id="pimenta-estabelecimento"
            name="estabelecimento"
            type="text"
            autoComplete="organization"
            aria-describedby="pimenta-estabelecimento-desc"
            value={estabelecimento}
            onChange={(e) => setEstabelecimento(e.target.value)}
            className={CLASSE_INPUT}
          />
          <p id="pimenta-estabelecimento-desc" className="font-sans text-sm text-[color:var(--color-paragrafo)]">
            Opcional: nome do restaurante ou comércio, para pedidos em lote.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pimenta-observacoes" className="font-sans text-[color:var(--color-marrom)]">
            Observações
          </label>
          <textarea
            id="pimenta-observacoes"
            name="observacoes"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className={CLASSE_INPUT}
          />
        </div>

        {/* Honeypot anti-spam (P7): invisível, fora da tabulação. */}
        <div className="hidden">
          <label htmlFor="pimenta-website">Website</label>
          <input
            id="pimenta-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
      </section>

      {/* Recebimento ------------------------------------------------------------ */}
      <section aria-labelledby="pimenta-recebimento-titulo" className="flex flex-col gap-4">
        <h2 id="pimenta-recebimento-titulo" className={CLASSE_H2}>
          Recebimento
        </h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Como você quer receber o pedido</legend>
          {(
            [
              ['entrega', 'Entrega', 'Levamos até o ponto marcado no mapa (frete combinado no WhatsApp).'],
              ['retirada', 'Retirada na pizzaria', 'Você busca o pedido na pizzaria.'],
            ] as const
          ).map(([valor, rotulo, descricao]) => (
            <label
              key={valor}
              className="borda-sistema flex cursor-pointer items-start gap-3 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-3"
            >
              <input
                type="radio"
                name="modalidade"
                value={valor}
                checked={modalidade === valor}
                onChange={() => setModalidade(valor)}
                className="mt-1"
              />
              <span className="flex flex-col">
                <span className="font-sans text-[color:var(--color-marrom)]">{rotulo}</span>
                <span className="font-sans text-sm text-[color:var(--color-paragrafo)]">
                  {descricao}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {modalidade === 'entrega' ? (
          <div className="flex flex-col gap-3">
            <h3 className="font-serif text-xl text-[color:var(--color-marrom)]">
              Ponto de entrega
            </h3>
            <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
              {pontoConta
                ? 'Usamos a localização salva na sua conta — ajuste o pin se for entregar em outro lugar.'
                : 'Marque no mapa o local exato da entrega — no Vale do Capão não usamos endereço formal.'}
            </p>
            <PedidoMapa onMudancaPonto={setPonto} pontoInicial={ponto ?? pontoConta} />
            {errosCampos.localizacao ? (
              <p role="alert" className="font-sans text-sm text-[color:var(--color-marrom)]">
                {errosCampos.localizacao}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              <label htmlFor="pimenta-localidade" className="font-sans text-[color:var(--color-marrom)]">
                Localidade ou ponto de referência
              </label>
              <input
                id="pimenta-localidade"
                name="localidade"
                type="text"
                value={localidade}
                onChange={(e) => setLocalidade(e.target.value)}
                className={CLASSE_INPUT}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Rodapé fixo: subtotal + submit ----------------------------------------- */}
      <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t border-[color:var(--color-borda)] bg-[color:var(--color-fundo)] px-6 py-4">
        <div aria-live="polite" className="flex items-baseline justify-between gap-4">
          <span className="font-sans text-[color:var(--color-paragrafo)]">
            Subtotal dos produtos
          </span>
          <span className="font-serif text-2xl text-[color:var(--color-marrom)]">
            {renderPreco(subtotal)}
          </span>
        </div>
        <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
          {modalidade === 'entrega'
            ? 'Valor apenas dos produtos. O frete é combinado pela conversa no WhatsApp.'
            : 'Valor dos produtos. Pagamento e horário de retirada são combinados no WhatsApp.'}
        </p>
        <button type="submit" disabled={enviando} className="btn-primario w-full disabled:opacity-60">
          {enviando ? 'Enviando pedido…' : 'Enviar pedido'}
        </button>
      </div>
    </form>
  )
}

export default PedidoPimentaForm
