import type { GlobalConfig } from 'payload'

// Global_Configuracoes (Requisito 8): painel único de configurações do
// estabelecimento — contato, horários, entrega e Pix centralizados.
//
// Campos (Req 8.1): endereco, linkMapa, horarios, whatsapp, instagram, email,
// chavePix, qrPix, taxasEntrega, avisoRetirada.
// - `horarios` é um array de itens com `faixa` e `horario` (Req 8.2).
// - `taxasEntrega` é um array de itens com `distancia` e `valor` (Req 8.3).
// - `qrPix` é um upload de imagem apontando para a Colecao_Media (Req 8.4).
// - `valor` (taxa de entrega) é TEXTO, nunca número, para preservar o formato
//   monetário verbatim ("R$ 5,00", "a confirmar"). Diferente de `preco` em
//   Cardapio (que virou número na Tarefa 6 de delivery-pedidos.md para permitir
//   o cálculo de subtotal), a taxa de entrega não participa de cálculos e
//   precisa aceitar o marcador "a confirmar" (Req 9.4).
// - Todos os campos textuais aceitam o marcador "a confirmar"; a renderização
//   pública aplica Placeholder_AConfirmar quando o valor é pendente (Req 19).
// - Leitura liberada para consumo pelas páginas públicas (rodapé, /pizzaria,
//   /delivery).
export const Configuracoes: GlobalConfig = {
  slug: 'configuracoes',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'endereco',
      type: 'textarea',
      label: 'Endereço',
    },
    {
      name: 'linkMapa',
      type: 'text',
      label: 'Link do mapa',
      admin: {
        description: 'URL do Google Maps ou similar.',
      },
    },
    {
      name: 'horarios',
      type: 'array', // Req 8.2: array de faixa/horario
      label: 'Horários',
      fields: [
        {
          name: 'faixa',
          type: 'text',
          label: 'Faixa',
        },
        {
          name: 'horario',
          type: 'text',
          label: 'Horário',
        },
      ],
    },
    {
      name: 'whatsapp',
      type: 'text',
      label: 'WhatsApp',
    },
    {
      name: 'instagram',
      type: 'text',
      label: 'Instagram',
    },
    {
      name: 'email',
      type: 'email',
      label: 'E-mail',
    },
    {
      name: 'chavePix',
      type: 'text',
      label: 'Chave Pix',
    },
    {
      name: 'qrPix',
      type: 'upload', // Req 8.4: upload de imagem
      relationTo: 'media',
      label: 'QR Code Pix',
    },
    {
      name: 'taxasEntrega',
      type: 'array', // Req 8.3: array de distancia/valor
      label: 'Taxas de entrega',
      fields: [
        {
          name: 'distancia',
          type: 'text',
          label: 'Distância',
        },
        {
          name: 'valor',
          // TEXTO, nunca número: preserva o formato monetário verbatim
          // ("R$ 5,00") e aceita o marcador "a confirmar" (Req 9.4) — a taxa
          // não participa de cálculos (ao contrário de `preco` em Cardapio,
          // que virou número na Tarefa 6 de delivery-pedidos.md).
          type: 'text',
          label: 'Valor',
        },
      ],
    },
    {
      name: 'avisoRetirada',
      type: 'textarea',
      label: 'Aviso de retirada',
    },
  ],
}

export default Configuracoes
