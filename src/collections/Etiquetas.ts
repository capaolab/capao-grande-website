import { APIError, type Access, type CollectionConfig } from 'payload'

// Etiquetas dos informes (docs/features/etiquetas-informes.md): cadastradas
// no painel em vez de fixas no código. Um informe tem uma ou mais etiquetas
// (`informes.etiquetas`, relationship hasMany).
//
// Access: leitura liberada (o site exibe o nome da etiqueta); escrita só de
// admin (RN-E01). Etiqueta em uso não pode ser removida (RN-E03).
const ehAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const Etiquetas: CollectionConfig = {
  slug: 'etiquetas',
  labels: { singular: 'Etiqueta', plural: 'Etiquetas' },
  defaultSort: 'nome',
  admin: {
    useAsTitle: 'nome',
  },
  access: {
    read: () => true,
    create: ehAdmin,
    update: ehAdmin,
    delete: ehAdmin,
  },
  fields: [
    {
      name: 'nome',
      type: 'text',
      required: true,
      unique: true,
      label: 'Nome',
    },
  ],
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        const { totalDocs } = await req.payload.count({
          collection: 'informes',
          where: { etiquetas: { in: [id] } },
          req,
        })
        if (totalDocs > 0) {
          throw new APIError(
            `Esta etiqueta está em uso por ${totalDocs} informe(s). Remova-a dos informes antes de excluí-la.`,
            400,
            null,
            true,
          )
        }
      },
    ],
  },
}

export default Etiquetas
