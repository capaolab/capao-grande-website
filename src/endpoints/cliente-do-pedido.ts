import { randomBytes } from 'crypto'

import type { PayloadRequest } from 'payload'

import { emailInternoCliente, validarClienteBalcao, type ClienteBalcaoInput } from '@/lib/cadastro'
import { normalizarTelefone } from '@/lib/telefone'

// Cliente de um pedido registrado pelo funcionário (docs/features/
// pedidos-painel.md) — usado pelos endpoints de submissão de delivery e de
// pimenta em mel quando quem envia é funcionário/admin.
//
// O corpo traz `cliente`:
//  - `{ id }`: cliente escolhido na busca — o pedido usa nome e telefone da
//    conta;
//  - `{ nome, sobrenome, telefone, email? }`: cliente novo. Se o telefone já
//    tem conta de cliente, ela é reutilizada (sem duplicar); senão a conta é
//    criada com senha aleatória e, sem e-mail, um e-mail interno.
//
// O vínculo pedido ↔ cliente continua sendo o telefone (access de `pedidos`),
// então o pedido aparece no painel do cliente.

export function ehOperacao(req: PayloadRequest): boolean {
  return req.user?.role === 'funcionario' || req.user?.role === 'admin'
}

export type ClienteResolvido =
  | { ok: true; nome: string; telefone: string }
  | { ok: false; erros: string[] }

function nomeCompleto(usuario: { nome?: string | null; sobrenome?: string | null }): string {
  return [usuario.nome, usuario.sobrenome].filter(Boolean).join(' ')
}

export async function resolverClienteDoPedido(
  req: PayloadRequest,
  bruto: unknown,
): Promise<ClienteResolvido> {
  if (bruto == null || typeof bruto !== 'object') {
    return { ok: false, erros: ['Informe o cliente do pedido.'] }
  }
  const entrada = bruto as ClienteBalcaoInput & { id?: unknown }

  // Cliente existente, escolhido na busca.
  if (entrada.id != null) {
    const usuario = await req.payload
      .findByID({ collection: 'users', id: Number(entrada.id), depth: 0, disableErrors: true, req })
      .catch(() => null)
    if (!usuario || usuario.role !== 'cliente' || !usuario.telefone) {
      return { ok: false, erros: ['Cliente não encontrado. Busque de novo ou cadastre.'] }
    }
    return { ok: true, nome: nomeCompleto(usuario), telefone: usuario.telefone }
  }

  // Cliente novo.
  const erros = validarClienteBalcao(entrada)
  if (erros.length > 0) return { ok: false, erros }

  const nome = (entrada.nome as string).trim()
  const sobrenome = (entrada.sobrenome as string).trim()
  const telefone = normalizarTelefone(entrada.telefone as string)
  const email =
    typeof entrada.email === 'string' && entrada.email.trim() !== ''
      ? entrada.email.trim().toLowerCase()
      : emailInternoCliente(telefone)

  // Telefone já cadastrado: reutiliza a conta.
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { and: [{ telefone: { equals: telefone } }, { role: { equals: 'cliente' } }] },
    limit: 1,
    depth: 0,
    req,
  })
  if (docs[0]) {
    return { ok: true, nome: nomeCompleto(docs[0]), telefone }
  }

  try {
    await req.payload.create({
      collection: 'users',
      data: {
        nome,
        sobrenome,
        email,
        telefone,
        password: randomBytes(24).toString('base64url'),
        role: 'cliente',
      },
      req,
    })
  } catch (erro) {
    req.payload.logger.error(erro)
    const mensagem = erro instanceof Error ? erro.message : ''
    return {
      ok: false,
      erros: [
        /email/i.test(mensagem)
          ? 'Já existe uma conta com este e-mail. Busque o cliente ou use outro e-mail.'
          : 'Não foi possível cadastrar o cliente.',
      ],
    }
  }

  return { ok: true, nome: `${nome} ${sobrenome}`, telefone }
}
