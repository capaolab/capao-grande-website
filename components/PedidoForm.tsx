'use client'

// <PedidoForm> — formulário público de pedido de delivery
// (docs/features/delivery-pedidos.md, Tarefas 2 e 4; RN03, RN06, RN07, RN08).
//
// Estrutura:
//  - Seletor de produtos (<SeletorItensCardapio>, compartilhado com o caixa)
//    tipo TAGS (RN03): itens agrupados por seção como
//    chips selecionáveis (aria-pressed); a seção Tamanhos NÃO aparece como
//    seção selecionável — seus itens são o seletor de tamanho das pizzas.
//  - Resumo do pedido em montagem: cada item selecionado vira uma tag com
//    stepper de quantidade (+/−), botão remover e, para PIZZAS (preco: null),
//    seletor de tamanho OBRIGATÓRIO (o preço da pizza vem do tamanho).
//  - Dados do cliente: nome e telefone (WhatsApp) obrigatórios (RN06);
//    localidade/referência e observações opcionais. Honeypot `website`
//    oculto, enviado sempre vazio (P7).
//  - Geolocalização obrigatória via <PedidoMapa> (RN07).
//  - Rodapé fixo com o preço PARCIAL (RN08) calculado no cliente espelhando
//    `calcularSubtotal` de lib/pedidos.ts + aviso de que o frete/valor final
//    será informado pelo atendente na conversa.
//
// Login obrigatório (RN12): a página envolve o formulário no AreaInternaGuard;
// aqui nome, telefone e — quando salvos no perfil (pimenta-em-mel.md,
// RN-P07) — ponto no mapa e localidade são pré-preenchidos com os dados da
// conta (`/api/users/me`) e continuam editáveis. 401 (sessão expirada) vira
// mensagem com link para entrar de novo.
//
// Submissão: POST /api/submeter-pedido. Erros 400/429 e falhas de rede são
// exibidos SEM perder o conteúdo do formulário. Sucesso substitui o
// formulário pela tela de confirmação com o código público do pedido e o
// botão de retorno à conversa no WhatsApp (P2), mais o atalho para
// "Meus pedidos" (/area-cliente) — que lista os pedidos pelo telefone da
// conta, então avisamos quando o pedido usou outro telefone.
//
// Acessibilidade: nenhum <h1> aqui (fica na página); labels associados por
// htmlFor/id; erros inline com role/aria-describedby; regiões aria-live no
// resumo e no subtotal; chips são <button> com aria-pressed e os tamanhos
// são radios nativos (navegáveis por teclado).

import { useEffect, useState, type ReactElement } from 'react'
import Link from 'next/link'

import { buscarUsuarioAtual } from '@/lib/auth-client'
import { renderPreco } from '@/lib/cardapio'
import { comRetorno, ROTA_CLIENTE, ROTA_LOGIN } from '@/lib/permissoes'
import { normalizarTelefone } from '@/lib/telefone'
import { PedidoMapa, type PontoEntrega } from './PedidoMapa'
import {
  paraEntradas,
  SeletorItensCardapio,
  useSelecaoCardapio,
  type ItemSelecionado,
  type SecaoPedido,
} from './SeletorItensCardapio'

export type { ItemCardapioPedido, SecaoPedido } from './SeletorItensCardapio'

export interface PedidoFormProps {
  /** Seções do cardápio (apenas itens ativos), na ordem canônica. */
  secoes: SecaoPedido[]
  /** Dígitos do WhatsApp da pizzaria (para o link wa.me da confirmação); null = omitir botão. */
  whatsappDigitos: string | null
}

/** Erros de validação do cliente, por campo (mensagens pt-BR inline). */
interface ErrosCampos {
  nome?: string
  telefone?: string
  itens?: string
  localizacao?: string
}

export function PedidoForm({ secoes, whatsappDigitos }: PedidoFormProps): ReactElement {
  const [selecionados, setSelecionados] = useState<ItemSelecionado[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [localidade, setLocalidade] = useState('')
  const [observacoes, setObservacoes] = useState('')
  // Honeypot anti-spam (P7): campo invisível que bots preenchem; humanos
  // nunca veem. Sempre enviado vazio por humanos.
  const [website, setWebsite] = useState('')
  const [ponto, setPonto] = useState<PontoEntrega | null>(null)
  // Localização salva no perfil: vira o pin inicial do mapa.
  const [pontoConta, setPontoConta] = useState<PontoEntrega | null>(null)
  const [errosCampos, setErrosCampos] = useState<ErrosCampos>({})
  const [errosGerais, setErrosGerais] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [confirmacao, setConfirmacao] = useState<{ codigo: string; subtotal: number } | null>(
    null,
  )
  // Sessão expirada no envio (401): mostra o link para entrar de novo.
  const [sessaoExpirada, setSessaoExpirada] = useState(false)
  // Telefone da conta (normalizado): "Meus pedidos" lista por ele.
  const [telefoneConta, setTelefoneConta] = useState<string | null>(null)

  // Pré-preenche nome e telefone com os dados da conta (login obrigatório,
  // RN12) sem sobrescrever o que o usuário já tiver digitado.
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

  // Subtotal PARCIAL (RN08) e pizzas sem tamanho, espelhando o servidor.
  const { subtotal, pizzasPendentes } = useSelecaoCardapio(secoes, selecionados)

  function validar(): ErrosCampos {
    const erros: ErrosCampos = {}
    if (nome.trim() === '') erros.nome = 'Informe seu nome.'
    if (telefone.trim() === '') erros.telefone = 'Informe seu telefone (WhatsApp).'
    if (selecionados.length === 0) {
      erros.itens = 'Selecione ao menos um item do cardápio.'
    } else if (pizzasPendentes.length > 0) {
      erros.itens = 'Escolha o tamanho de todas as pizzas do pedido.'
    }
    if (ponto == null) erros.localizacao = 'Marque o ponto de entrega no mapa.'
    return erros
  }

  async function submeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrosGerais([])
    setSessaoExpirada(false)

    const erros = validar()
    setErrosCampos(erros)
    if (Object.keys(erros).length > 0) return

    setEnviando(true)
    try {
      const resposta = await fetch('/api/submeter-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          itens: paraEntradas(selecionados),
          latitude: ponto!.latitude,
          longitude: ponto!.longitude,
          ...(localidade.trim() !== '' ? { localidade: localidade.trim() } : {}),
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
        // Sessão expirou enquanto montava o pedido: mantém o formulário.
        setSessaoExpirada(true)
        setErrosGerais(['Sua sessão expirou. Entre novamente para enviar o pedido.'])
      } else {
        // 400/429: exibe os erros do servidor SEM perder o formulário.
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

  // ── Tela de confirmação (substitui o formulário) ──────────────────────────
  if (confirmacao) {
    return (
      <section
        aria-labelledby="pedido-confirmacao-titulo"
        className="borda-sistema flex flex-col gap-4 rounded-[var(--radius)] bg-[color:var(--color-papel)] p-6"
      >
        <h2
          id="pedido-confirmacao-titulo"
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
          . O frete é calculado pelo atendente e o valor final será informado pela conversa
          no WhatsApp.
        </p>
        {whatsappDigitos ? (
          <a
            href={`https://wa.me/${whatsappDigitos}?text=${encodeURIComponent(
              `Olá! Meu pedido é o #${confirmacao.codigo}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Voltar à conversa no WhatsApp informando o pedido #${confirmacao.codigo}`}
            className="btn-primario w-fit"
          >
            Informar pedido no WhatsApp
          </a>
        ) : null}

        {/* Follow-up (dashboard-pedidos.md): com login obrigatório (RN12) o
            usuário já tem conta — atalho para acompanhar o status. "Meus
            pedidos" lista pelo telefone da conta; avisa se este pedido usou
            outro telefone. */}
        <div className="mt-2 flex flex-col gap-2 border-t border-[color:var(--color-borda)] pt-4">
          <p className="font-sans text-[color:var(--color-paragrafo)]">
            Acompanhe o status deste e dos seus outros pedidos em &ldquo;Meus pedidos&rdquo;.
          </p>
          {telefoneConta && normalizarTelefone(telefone) !== telefoneConta ? (
            <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
              Este pedido usou um telefone diferente do cadastrado na sua conta, então
              não aparecerá em &ldquo;Meus pedidos&rdquo;.
            </p>
          ) : null}
          <Link
            href={ROTA_CLIENTE}
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
      {/* Erros gerais da submissão (400/429/rede): o formulário permanece
          preenchido. */}
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
            // Nova aba: entrar de novo sem perder o pedido montado aqui;
            // depois é só voltar e enviar.
            <a
              href={comRetorno(ROTA_LOGIN, '/pedido')}
              target="_blank"
              rel="noopener"
              className="hover-verde w-fit font-sans text-[color:var(--color-marrom)] underline transition-colors"
            >
              Entrar novamente (abre em nova aba)
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Seletor de produtos (chips) + resumo do pedido em montagem -------- */}
      <SeletorItensCardapio
        secoes={secoes}
        selecionados={selecionados}
        onChange={setSelecionados}
        idPrefixo="pedido"
        tituloSelecao="Escolha os itens"
        instrucao="Toque nos itens para adicioná-los ao pedido."
        tituloResumo="Seu pedido"
        erro={errosCampos.itens}
      />

      {/* Dados do cliente ------------------------------------------------------ */}
      <section aria-labelledby="pedido-dados-titulo" className="flex flex-col gap-4">
        <h2
          id="pedido-dados-titulo"
          className="border-b-2 border-[color:var(--color-oliva)] pb-1 font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Seus dados
        </h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="pedido-nome" className="font-sans text-[color:var(--color-marrom)]">
            Nome (obrigatório)
          </label>
          <input
            id="pedido-nome"
            name="nome"
            type="text"
            required
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-invalid={errosCampos.nome ? true : undefined}
            aria-describedby={errosCampos.nome ? 'pedido-erro-nome' : undefined}
            className="borda-sistema rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 font-sans text-[color:var(--color-marrom)]"
          />
          {errosCampos.nome ? (
            <p id="pedido-erro-nome" role="alert" className="font-sans text-sm text-[color:var(--color-marrom)]">
              {errosCampos.nome}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pedido-telefone" className="font-sans text-[color:var(--color-marrom)]">
            Telefone (WhatsApp) (obrigatório)
          </label>
          <input
            id="pedido-telefone"
            name="telefone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            aria-invalid={errosCampos.telefone ? true : undefined}
            aria-describedby={errosCampos.telefone ? 'pedido-erro-telefone' : undefined}
            className="borda-sistema rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 font-sans text-[color:var(--color-marrom)]"
          />
          {errosCampos.telefone ? (
            <p id="pedido-erro-telefone" role="alert" className="font-sans text-sm text-[color:var(--color-marrom)]">
              {errosCampos.telefone}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pedido-localidade" className="font-sans text-[color:var(--color-marrom)]">
            Localidade ou ponto de referência
          </label>
          <input
            id="pedido-localidade"
            name="localidade"
            type="text"
            aria-describedby="pedido-localidade-desc"
            value={localidade}
            onChange={(e) => setLocalidade(e.target.value)}
            className="borda-sistema rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 font-sans text-[color:var(--color-marrom)]"
          />
          <p id="pedido-localidade-desc" className="font-sans text-sm text-[color:var(--color-paragrafo)]">
            Indicação de localidade ou ponto de referência (opcional).
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pedido-observacoes" className="font-sans text-[color:var(--color-marrom)]">
            Observações
          </label>
          <textarea
            id="pedido-observacoes"
            name="observacoes"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="borda-sistema rounded-[var(--radius)] bg-[color:var(--color-papel)] px-3 py-2 font-sans text-[color:var(--color-marrom)]"
          />
        </div>

        {/* Honeypot anti-spam (P7): invisível para humanos (display:none já o
            remove da árvore de acessibilidade), fora da ordem de tabulação;
            bots que o preenchem são descartados no servidor. Enviado sempre
            vazio por humanos. */}
        <div className="hidden">
          <label htmlFor="pedido-website">Website</label>
          <input
            id="pedido-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
      </section>

      {/* Geolocalização de entrega (RN07) ------------------------------------- */}
      <section aria-labelledby="pedido-entrega-titulo" className="flex flex-col gap-3">
        <h2
          id="pedido-entrega-titulo"
          className="border-b-2 border-[color:var(--color-oliva)] pb-1 font-serif text-2xl text-[color:var(--color-marrom)]"
        >
          Ponto de entrega
        </h2>
        <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
          Marque no mapa o local exato da entrega — no Vale do Capão não usamos endereço
          formal.
        </p>
        <PedidoMapa onMudancaPonto={setPonto} pontoInicial={pontoConta} />
        {errosCampos.localizacao ? (
          <p role="alert" className="font-sans text-sm text-[color:var(--color-marrom)]">
            {errosCampos.localizacao}
          </p>
        ) : null}
      </section>

      {/* Rodapé fixo: preço PARCIAL (RN08) + aviso de frete + submit ---------- */}
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
          Valor apenas dos produtos. O frete é calculado pelo atendente e o valor final será
          informado pela conversa no WhatsApp.
        </p>
        <button type="submit" disabled={enviando} className="btn-primario w-full disabled:opacity-60">
          {enviando ? 'Enviando pedido…' : 'Enviar pedido'}
        </button>
      </div>
    </form>
  )
}

export default PedidoForm
