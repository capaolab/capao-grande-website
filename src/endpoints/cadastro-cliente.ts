import type { PayloadHandler } from 'payload'
import { generatePayloadCookie } from 'payload/shared'

import { normalizarCadastro, validarCadastro, type CadastroInput } from '@/lib/cadastro'

import { criarRateLimit, ehHoneypot, ipDoCliente } from './protecao'

// Endpoint público de cadastro de clientes (docs/features/dashboard-pedidos.md)
// — POST /api/cadastro-cliente.
//
// É o "follow-up" pós-pedido: o cliente que acabou de submeter um pedido (ou
// qualquer visitante) cria a conta com nome + sobrenome + e-mail + telefone
// (WhatsApp) + senha — e, opcionalmente, a localização (ponto no mapa +
// referência) — e JÁ SAI LOGADO (cookie `payload-token` definido na
// resposta), caindo no dashboard `/area-cliente`.
//
// Fluxo:
//   a) Honeypot anti-spam (campo `website` preenchido → 201 FALSO, sem gravar).
//   b) Rate limit em memória por IP (src/endpoints/protecao.ts).
//   c) Validação server-side via `validarCadastro` (função pura, lib/cadastro).
//   d) Criação via Local API com `role: 'cliente'` — o hook da collection
//      `users` normaliza o telefone e garante a unicidade do par
//      (e-mail, telefone); e-mail já cadastrado → erro da camada de auth.
//   e) Login imediato via `payload.login` + cookie de sessão na resposta.

// Rate limit por IP: no máximo 5 cadastros por 10 minutos.
const dentroDoLimite = criarRateLimit(5)

// Mensagens de erro conhecidas → 409 (conflito de unicidade). O texto vem do
// hook da collection (par e-mail+telefone) ou da camada de auth (e-mail).
const PADRAO_DUPLICADO = /já existe|already|duplicate|unique/i

export const cadastroCliente: PayloadHandler = async (req) => {
  let corpo: CadastroInput & { website?: unknown }
  try {
    // PayloadRequest tipa Request como Partial<>; em runtime `json` sempre
    // existe (é um Request real do Next).
    corpo = (await req.json!()) as CadastroInput & { website?: unknown }
  } catch {
    return Response.json({ erros: ['Corpo da requisição inválido (JSON esperado).'] }, { status: 400 })
  }

  // (a) Honeypot: campo invisível preenchido ⇒ bot. Resposta 201 FALSA.
  if (ehHoneypot(corpo)) {
    return Response.json({ cadastrado: true }, { status: 201 })
  }

  // (b) Rate limit por IP.
  if (!dentroDoLimite(ipDoCliente(req), Date.now())) {
    return Response.json(
      { erros: ['Muitas tentativas em pouco tempo. Tente novamente em alguns minutos.'] },
      { status: 429 },
    )
  }

  // (c) Validação server-side (nome, sobrenome, e-mail, telefone, senha).
  const erros = validarCadastro(corpo)
  if (erros.length > 0) {
    return Response.json({ erros }, { status: 400 })
  }

  const dados = normalizarCadastro({
    nome: corpo.nome as string,
    sobrenome: corpo.sobrenome as string,
    email: corpo.email as string,
    telefone: corpo.telefone as string,
    senha: corpo.senha as string,
    // Localização opcional (pimenta-em-mel.md, RN-P07) — já validada.
    latitude: typeof corpo.latitude === 'number' ? corpo.latitude : null,
    longitude: typeof corpo.longitude === 'number' ? corpo.longitude : null,
    localidade: typeof corpo.localidade === 'string' ? corpo.localidade : null,
  })

  // (d) Criação do usuário com papel fixo de cliente.
  try {
    await req.payload.create({
      collection: 'users',
      data: {
        nome: dados.nome,
        sobrenome: dados.sobrenome,
        email: dados.email,
        password: dados.senha,
        telefone: dados.telefone,
        ...(dados.latitude != null ? { latitude: dados.latitude, longitude: dados.longitude } : {}),
        ...(dados.localidade ? { localidade: dados.localidade } : {}),
        role: 'cliente',
      },
      req,
    })
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : ''
    if (PADRAO_DUPLICADO.test(mensagem)) {
      return Response.json(
        { erros: ['Já existe uma conta com este e-mail e telefone. Tente entrar na sua conta.'] },
        { status: 409 },
      )
    }
    req.payload.logger.error(erro)
    return Response.json(
      { erros: ['Não foi possível concluir o cadastro. Tente novamente.'] },
      { status: 400 },
    )
  }

  // (e) Login imediato: o cadastro já deixa o cliente autenticado.
  try {
    const login = await req.payload.login({
      collection: 'users',
      data: { email: dados.email, password: dados.senha },
      req,
    })

    if (!login.token) {
      throw new Error('Login pós-cadastro não retornou token.')
    }

    const cookie = generatePayloadCookie({
      collectionAuthConfig: req.payload.collections.users.config.auth,
      cookiePrefix: req.payload.config.cookiePrefix,
      token: login.token,
    })

    return Response.json(
      { cadastrado: true, user: { email: dados.email, role: 'cliente' } },
      { status: 201, headers: { 'Set-Cookie': cookie } },
    )
  } catch (erro) {
    // Conta criada, mas o login automático falhou: o cliente ainda consegue
    // entrar pela tela de login — informamos para concluir por lá.
    req.payload.logger.error(erro)
    return Response.json(
      { cadastrado: true, user: { email: dados.email, role: 'cliente' }, loginPendente: true },
      { status: 201 },
    )
  }
}
