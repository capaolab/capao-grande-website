import type { PayloadHandler, Where } from 'payload'

import { normalizarTelefone } from '@/lib/telefone'

import { ehOperacao } from './cliente-do-pedido'

// Busca de clientes para o formulário de pedido do funcionário
// (docs/features/pedidos-painel.md) — GET /api/buscar-clientes?q=.
//
// Só funcionário/admin (403 para os demais): o access de `users` não deixa o
// funcionário ler outras contas, então a busca passa por aqui (Local API) e
// devolve apenas os campos que o formulário preenche.

const LIMITE = 10

export const buscarClientes: PayloadHandler = async (req) => {
  if (!ehOperacao(req)) {
    return Response.json({ erros: ['Acesso restrito à equipe.'] }, { status: 403 })
  }

  const q = typeof req.query?.q === 'string' ? req.query.q.trim() : ''
  if (q.length < 2) return Response.json({ clientes: [] })

  const digitos = normalizarTelefone(q)
  const condicoes: Where[] = [{ nome: { like: q } }, { sobrenome: { like: q } }, { email: { like: q } }]
  if (digitos.length >= 3) condicoes.push({ telefone: { contains: digitos } })

  const { docs } = await req.payload.find({
    collection: 'users',
    where: { and: [{ role: { equals: 'cliente' } }, { or: condicoes }] },
    sort: 'nome',
    limit: LIMITE,
    depth: 0,
    req,
  })

  return Response.json({
    clientes: docs.map((usuario) => ({
      id: usuario.id,
      nome: usuario.nome ?? '',
      sobrenome: usuario.sobrenome ?? '',
      telefone: usuario.telefone ?? '',
      email: usuario.email,
      latitude: usuario.latitude ?? null,
      longitude: usuario.longitude ?? null,
      localidade: usuario.localidade ?? null,
    })),
  })
}
