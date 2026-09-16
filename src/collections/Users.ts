import type { CollectionConfig } from 'payload'

// Coleção de usuários do admin (autenticação). É a coleção de auth usada para
// login no Admin_Payload em `/admin` (Requisito 1.2). Os campos `email` e
// `password` são fornecidos automaticamente pela camada de autenticação do
// Payload quando `auth` está habilitado; por isso mantemos os campos próprios
// mínimos e usamos o `email` como título nas telas do admin.
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [],
}

export default Users
