import type { CollectionConfig } from 'payload'

// Colecao_Cronologia (Requisito 7): marcos históricos da linha do tempo do
// Capão Grande (história e reflorestamento desde 1992).
//
// Campos (Req 7.1): ano, titulo, texto, ilustracao, ordem.
// - `ano` é TEXTO, nunca número/data (Req 7.2), para aceitar valores como
//   "ano a confirmar" e "hoje" verbatim; a renderização pública trata "a
//   confirmar" como Placeholder_AConfirmar (Req 17.3, 19).
// - `titulo` e `texto` são texto simples. Não são localizados: o Requisito 3
//   declara como localizados apenas titulo/resumo/corpo de Informes (Req 3.3)
//   e detalhe do Cardápio (Req 3.4); a cronologia não é citada, e o Data Model
//   do design (MarcoCronologia) não marca `texto` como localized.
// - `ilustracao` é um upload de imagem opcional (Req 7.3), apontando para a
//   Colecao_Media (`relationTo: 'media'`).
// - `ordem` (number) ordena os marcos; a leitura pública ordena por `ordem`
//   em ordem crescente na camada de queries (Req 7.4, 17.2).
export const Cronologia: CollectionConfig = {
  slug: 'cronologia',
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['ano', 'titulo', 'ordem'],
  },
  access: {
    // Leitura liberada para consumo pelas páginas públicas (a ordenação por
    // `ordem` é aplicada na camada de queries — Req 7.4).
    read: () => true,
  },
  fields: [
    {
      name: 'ano',
      // Req 7.2: `ano` é SEMPRE texto, nunca número/data, para preservar
      // valores como "ano a confirmar" e "hoje" verbatim.
      type: 'text',
      label: 'Ano',
      admin: {
        description:
          'Texto livre (ex.: "1992", "hoje", "ano a confirmar"). Nunca reformatado como número.',
      },
    },
    {
      name: 'titulo',
      type: 'text',
      required: true,
      label: 'Título',
    },
    {
      name: 'texto',
      type: 'textarea',
      label: 'Texto',
    },
    {
      name: 'ilustracao',
      type: 'upload', // Req 7.3: upload de imagem
      relationTo: 'media',
      label: 'Ilustração',
    },
    {
      name: 'ordem',
      type: 'number', // Req 7.4: ordenação crescente na leitura pública
      label: 'Ordem',
    },
  ],
}

export default Cronologia
