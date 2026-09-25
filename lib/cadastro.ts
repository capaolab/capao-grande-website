// Funções puras do cadastro público de clientes
// (docs/features/dashboard-pedidos.md): validação do formulário de
// `/cadastro` e do endpoint `POST /api/cadastro-cliente`
// (src/endpoints/cadastro-cliente.ts). Sem dependência de Payload/Next —
// mesmo padrão de lib/pedidos.ts.
//
// Cadastro exige nome + sobrenome (identificação do titular), e-mail e
// telefone WhatsApp (vínculo com os pedidos) e senha. O par (e-mail,
// telefone) é único na collection `users` — a unicidade em si é checada em
// hook da collection contra o banco; aqui validamos apenas o formato.
//
// Localização (docs/features/pimenta-em-mel.md, RN-P07): opcional — ponto no
// mapa + referência textual, usados para pré-preencher os formulários de
// delivery e de pimenta em mel.

import { validarLocalizacaoOpcional } from '@/lib/geolocalizacao'
import { normalizarTelefone, telefonePlausivel } from '@/lib/telefone'

/** Comprimento mínimo da senha da conta do cliente. */
export const MIN_SENHA = 8

/** Forma do corpo JSON aceito pelo endpoint público de cadastro. */
export interface CadastroInput {
  nome?: unknown
  sobrenome?: unknown
  email?: unknown
  telefone?: unknown
  senha?: unknown
  latitude?: unknown
  longitude?: unknown
  localidade?: unknown
}

// Regex simples de e-mail: algo@algo.algo, sem espaços. A validação definitiva
// de formato/unicidade continua sendo da camada de auth do Payload.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Valida os campos do cadastro de cliente. Retorna a lista de erros em pt-BR
 * (vazia = válido). Não verifica unicidade — isso exige banco e acontece no
 * hook da collection `users` (par e-mail+telefone) e na camada de auth
 * (e-mail).
 */
export function validarCadastro(input: CadastroInput): string[] {
  const erros: string[] = []

  if (typeof input.nome !== 'string' || input.nome.trim() === '') {
    erros.push('Nome é obrigatório.')
  }

  if (typeof input.sobrenome !== 'string' || input.sobrenome.trim() === '') {
    erros.push('Sobrenome é obrigatório.')
  }

  if (typeof input.email !== 'string' || !REGEX_EMAIL.test(input.email.trim())) {
    erros.push('Informe um e-mail válido.')
  }

  if (typeof input.telefone !== 'string' || !telefonePlausivel(input.telefone)) {
    erros.push('Informe um telefone (WhatsApp) válido, com DDD.')
  }

  if (typeof input.senha !== 'string' || input.senha.length < MIN_SENHA) {
    erros.push(`A senha precisa ter ao menos ${MIN_SENHA} caracteres.`)
  }

  erros.push(...validarLocalizacaoOpcional(input.latitude, input.longitude))

  if (input.localidade != null && typeof input.localidade !== 'string') {
    erros.push('Referência de localização inválida.')
  }

  return erros
}

export interface CadastroNormalizado {
  nome: string
  sobrenome: string
  email: string
  telefone: string
  senha: string
  latitude?: number
  longitude?: number
  localidade?: string
}

/**
 * Normaliza um cadastro válido para gravação: strings aparadas, e-mail em
 * minúsculas (a unicidade do auth é sobre o valor gravado) e telefone só com
 * dígitos (vínculo com `pedidos.telefone`).
 */
export function normalizarCadastro(input: {
  nome: string
  sobrenome: string
  email: string
  telefone: string
  senha: string
  latitude?: number | null
  longitude?: number | null
  localidade?: string | null
}): CadastroNormalizado {
  const localidade = input.localidade?.trim()
  return {
    nome: input.nome.trim(),
    sobrenome: input.sobrenome.trim(),
    email: input.email.trim().toLowerCase(),
    telefone: normalizarTelefone(input.telefone),
    senha: input.senha,
    ...(input.latitude != null && input.longitude != null
      ? { latitude: input.latitude, longitude: input.longitude }
      : {}),
    ...(localidade ? { localidade } : {}),
  }
}
