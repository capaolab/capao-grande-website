import type { CollectionConfig } from 'payload'

import { validarLocalizacaoOpcional } from '@/lib/geolocalizacao'
import { normalizarTelefone, telefonePlausivel } from '@/lib/telefone'

// Coleção de usuários (autenticação). É a coleção de auth usada para login no
// Admin_Payload em `/admin` (Requisito 1.2) e também pela página `/login` do
// site público, que autentica via `POST /api/users/login` e redireciona por
// papel. Os campos `email` e `password` são fornecidos automaticamente pela
// camada de autenticação do Payload quando `auth` está habilitado.
//
// Identificação do titular (docs/features/dashboard-pedidos.md):
// - `nome`/`sobrenome`/`telefone` (WhatsApp): obrigatórios para
//   `role: 'cliente'` — enforced no hook beforeValidate, não no campo, para
//   não quebrar a tela nativa de criação do primeiro usuário do Payload (que
//   envia apenas e-mail/senha). O telefone é o vínculo com os pedidos de
//   delivery: o cliente vê os pedidos cujo telefone bate com o da conta.
//   Gravado NORMALIZADO (só dígitos) pelo hook, como em `pedidos.telefone`,
//   e vai no JWT (`saveToJWT`) porque o access de `pedidos` consulta
//   `req.user.telefone` sem query extra.
// - Unicidade do PAR (e-mail, telefone): o e-mail já é único pela camada de
//   auth; o hook beforeValidate garante que não exista outra conta com o
//   mesmo par (dois e-mails distintos com o mesmo telefone são permitidos,
//   mas a mesma combinação não).
// - `latitude`/`longitude`/`localidade` (docs/features/pimenta-em-mel.md,
//   RN-P07): localização OPCIONAL do cliente (ponto no mapa + referência),
//   informada no cadastro ou em /configuracoes e usada para pré-preencher os
//   formulários de delivery e de pimenta em mel. O hook exige que, se um lado
//   da coordenada vier, o par forme um ponto válido (null nos dois limpa).
//
// Papéis (campo `role`):
// - admin       -> acesso ao painel `/admin` (access.admin) e gestão de usuários.
// - funcionario -> sem painel; área interna `/area-funcionario` (dashboard de pedidos).
// - cliente     -> sem painel; área interna `/area-cliente` (próprios pedidos).
// O papel vai no JWT (`saveToJWT`) para que `/api/users/me` o devolva sem
// consulta extra. A edição do papel é restrita a admins (access de campo),
// impedindo auto-promoção.
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    // Painel `/admin` exclusivo de admins; funcionário/cliente que tentarem
    // logar direto em `/admin` recebem o "unauthorized" do próprio Payload.
    admin: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
    // Admin lê/atualiza todos; demais papéis, apenas o próprio documento.
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data

        // Telefone normalizado (só dígitos) sempre que informado — o vínculo
        // com `pedidos.telefone` depende do mesmo formato dos dois lados.
        if (typeof data.telefone === 'string' && data.telefone.trim() !== '') {
          data.telefone = normalizarTelefone(data.telefone)
        }

        // Cliente precisa de nome, sobrenome e telefone plausível: sem eles a
        // conta não identifica o titular nem se vincula a nenhum pedido.
        // (Sem role explícito na criação, o default 'cliente' se aplica.)
        if (data.role === 'cliente' || (!data.role && operation === 'create')) {
          if (typeof data.nome !== 'string' || data.nome.trim() === '') {
            throw new Error('Nome é obrigatório para clientes.')
          }
          if (typeof data.sobrenome !== 'string' || data.sobrenome.trim() === '') {
            throw new Error('Sobrenome é obrigatório para clientes.')
          }
          if (typeof data.telefone !== 'string' || !telefonePlausivel(data.telefone)) {
            throw new Error('Telefone (WhatsApp) válido, com DDD, é obrigatório para clientes.')
          }
        }

        // Localização opcional: coerente quando informada. Numa atualização
        // parcial, o lado ausente vem do documento original.
        if ('latitude' in data || 'longitude' in data) {
          const latitude = 'latitude' in data ? data.latitude : originalDoc?.latitude
          const longitude = 'longitude' in data ? data.longitude : originalDoc?.longitude
          const [erroLocalizacao] = validarLocalizacaoOpcional(latitude, longitude)
          if (erroLocalizacao) throw new Error(erroLocalizacao)
        }

        // Unicidade do par (e-mail, telefone): rejeita se JÁ EXISTE outra
        // conta com a mesma combinação (o e-mail sozinho já é único pela
        // camada de auth; aqui cobrimos o par completo).
        if (
          typeof data.email === 'string' &&
          typeof data.telefone === 'string' &&
          data.telefone !== ''
        ) {
          const { totalDocs } = await req.payload.find({
            collection: 'users',
            where: {
              and: [
                { email: { equals: data.email.trim().toLowerCase() } },
                { telefone: { equals: data.telefone } },
                ...(operation === 'update' && originalDoc?.id != null
                  ? [{ id: { not_equals: originalDoc.id } }]
                  : []),
              ],
            },
            limit: 1,
            depth: 0,
            req,
          })
          if (totalDocs > 0) {
            throw new Error('Já existe uma conta com este e-mail e telefone.')
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'nome',
      type: 'text',
      label: 'Nome',
      admin: {
        description: 'Obrigatório para clientes (validado em hook).',
      },
    },
    {
      name: 'sobrenome',
      type: 'text',
      label: 'Sobrenome',
      admin: {
        description: 'Obrigatório para clientes (validado em hook).',
      },
    },
    {
      name: 'telefone',
      type: 'text',
      saveToJWT: true,
      label: 'Telefone (WhatsApp)',
      admin: {
        description:
          'Obrigatório para clientes: é o vínculo com os pedidos de delivery (gravado só com dígitos).',
      },
    },
    {
      name: 'latitude',
      type: 'number',
      label: 'Latitude',
      admin: {
        description: 'Localização opcional do cliente (ponto no mapa), usada nos pedidos.',
      },
    },
    {
      name: 'longitude',
      type: 'number',
      label: 'Longitude',
    },
    {
      name: 'localidade',
      type: 'text',
      label: 'Localidade / referência',
      admin: {
        description:
          'Referência textual opcional (no Vale do Capão não há endereço formal).',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'cliente',
      saveToJWT: true,
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Funcionário', value: 'funcionario' },
        { label: 'Cliente', value: 'cliente' },
      ],
      access: {
        // Só admin altera papéis — impede que funcionário/cliente se
        // auto-promovam via API.
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
  ],
}

export default Users
