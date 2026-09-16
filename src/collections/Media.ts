import path from 'path'
import { fileURLToPath } from 'url'

import type { CollectionConfig } from 'payload'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Colecao_Media (Requisito 4): coleção de uploads de arquivos.
//
// - Slug 'media': é o alvo dos campos de upload (`relationTo: 'media'`) das
//   demais coleções/global (capa de Informes, ilustracao de Cronologia, qrPix
//   de Configuracoes) e o nome referenciado pelo design (Colecao_Media).
// - Uploads no filesystem local (Requisito 4.2) via `upload.staticDir`. O
//   `staticDir` resolve para `../media` a partir de `src/collections/`, ou
//   seja, o diretório `media/` na raiz do projeto (ver estrutura de pastas em
//   design.md), onde os arquivos enviados são gravados.
// - Campo `alt` de texto para o texto alternativo de imagens (Requisitos 4.3,
//   20.1); a acessibilidade das páginas consome esse valor.
// - A `url` pública de cada arquivo é exposta por padrão pelo Payload em
//   coleções de upload (Requisito 4.4); leituras públicas ficam liberadas por
//   `access.read` para que o site possa servir as imagens.
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // Leitura pública das mídias para consumo pelas páginas do Site (Req 4.4).
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texto alternativo',
    },
  ],
  upload: {
    // Grava os arquivos em `media/` na raiz do projeto (Req 4.2). A `url`
    // pública é exposta automaticamente pelo Payload (Req 4.4).
    staticDir: path.resolve(dirname, '../../media'),
  },
}

export default Media
