import type { CollectionConfig } from 'payload'

// Coleção de usuários (autenticação). É a coleção de auth usada para login no
// Admin_Payload em `/admin` (Requisito 1.2) e também pela página `/login` do
// site público, que autentica via `POST /api/users/login` e redireciona por
// papel. Os campos `email` e `password` são fornecidos automaticamente pela
// camada de autenticação do Payload quando `auth` está habilitado.
//
// Papéis (campo `role`):
// - admin       -> acesso ao painel `/admin` (access.admin) e gestão de usuários.
// - funcionario -> sem painel; área interna `/area-funcionario`.
// - cliente     -> sem painel; área interna `/area-cliente`.
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
  fields: [
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
