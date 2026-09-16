// scripts/seed.ts — Dados iniciais (Requisito 9).
//
// Executado FORA do Next via `payload run scripts/seed.ts` (script `seed` no
// package.json), que configura o runtime e resolve o alias `@payload-config`.
// Popula `informes`, `cardapio`, `cronologia` e o global `configuracoes`
// usando a Local API do Payload (`getPayload({ config })`) — Req 9.1.
//
// Invariantes garantidas por este seed:
// - No máximo UM `Informe_Destaque` (Req 9.2). Apenas o informe "carnaval"
//   recebe `destaque: true`; o hook de unicidade da coleção reforça a
//   invariante mesmo que o seed erre.
// - Textos do cardápio preservados PALAVRA POR PALAVRA (Req 9.3, 6.3),
//   incluindo "ver tamanhos", "dose", "jarra 1,5 l" e os detalhes verbatim do
//   cardápio impresso (fonte: docs/design).
// - Dados reais desconhecidos (horários, endereço, linkMapa, WhatsApp,
//   Instagram, e-mail, chave Pix, QR Pix, anos incertos da cronologia) gravados
//   como o marcador literal "a confirmar" — NUNCA fabricados (Req 9.4, 19.2).
// - Idempotência (Req 9.1): antes de inserir, o seed APAGA todos os documentos
//   das três coleções e reinsere um conjunto fixo, produzindo sempre o mesmo
//   estado previsível (sem duplicatas). O global é sobrescrito com os mesmos
//   valores a cada execução.

import { getPayload } from 'payload'
import config from '@payload-config'

// Marcador único para dados reais desconhecidos (Req 9.4).
const A_CONFIRMAR = 'a confirmar'

// ---------------------------------------------------------------------------
// Rich text (lexical): o campo `corpo` de Informes é rich text (Req 5.7). A
// Local API espera o formato serializado do editor lexical. Construímos um
// documento mínimo com um parágrafo por string de texto, preservando o texto
// verbatim (sem reformatação).
// ---------------------------------------------------------------------------
function paragrafo(texto: string) {
  return {
    type: 'paragraph',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'text',
        version: 1,
        text: texto,
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
      },
    ],
  }
}

function richText(paragrafos: string[]) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      children: paragrafos.map(paragrafo),
    },
  }
}

// ---------------------------------------------------------------------------
// Conteúdo de seed. Textos derivados do repertório do projeto (docs/design):
// informes, cardápio impresso, marcos da cronologia e legendas. Nenhum dado
// real de contato/endereço/Pix é inventado.
// ---------------------------------------------------------------------------

// Informes (Req 5, 9.2). Exatamente UM com `destaque: true` ("carnaval").
// `publicado` variado; `data` em ISO derivada dos meses do repertório apenas
// para dar ordem cronológica inversa à listagem (Req 11.1) — `data` é campo
// `date`, não texto, e não está na lista de dados reais desconhecidos do
// Req 9.4. `resumo`/`corpo` em pt; alguns com `en` para exercitar a
// localização (Req 3.3); os demais ficam sem `en` (fallback para pt, Req 3.6).
type SeedInforme = {
  titulo: string
  etiqueta:
    | 'Funcionamento'
    | 'Reflorestamento'
    | 'Horta'
    | 'Compostagem'
    | 'Apiário'
    | 'Viveiro'
    | 'Cardápio'
  data: string
  destaque: boolean
  publicado: boolean
  resumoPt: string
  resumoEn?: string
  corpoPt: string[]
}

const INFORMES: SeedInforme[] = [
  {
    titulo: 'Neste carnaval vamos funcionar de segunda a quinta',
    etiqueta: 'Funcionamento',
    data: '2025-02-12',
    destaque: true, // ÚNICO destaque (Req 9.2)
    publicado: true,
    resumoPt:
      'Aproveite a folia e recolha seu lixo. A pizzaria está apoiando o grupo ambiental do Capão, acesse o link e saiba mais.',
    resumoEn:
      'Carnival week: open Monday to Thursday. Enjoy the festivities and take your rubbish with you — we support the Capão environmental group.',
    corpoPt: [
      'Na semana de carnaval o forno acende de segunda a quinta. Nos outros dias a equipe descansa e a horta também.',
      'A pizzaria está apoiando o grupo ambiental do Capão na coleta de resíduos durante a folia. Se você quiser participar, o ponto de encontro e os horários estão no link do grupo.',
      'Aproveite a folia e recolha seu lixo. O que sai da vila fica na vila.',
    ],
  },
  {
    titulo: 'Mutirão de plantio no viveiro',
    etiqueta: 'Reflorestamento',
    data: '2025-01-18',
    destaque: false,
    publicado: true,
    resumoPt:
      'Levamos 200 mudas nativas para a área de reflorestamento que abastece o forno.',
    resumoEn:
      'Planting day: 200 native seedlings went into the reforestation area that feeds our oven.',
    corpoPt: [
      'As mudas saíram do nosso viveiro e foram plantadas na área que fornece a lenha do forno. A conta é simples: nada de mata nativa entra na fornalha.',
      'Quem quiser ajudar no próximo mutirão pode avisar na pizzaria. Levamos ferramenta, água e pizza no fim do dia.',
    ],
  },
  {
    titulo: 'Horta nova atrás do forno',
    etiqueta: 'Horta',
    data: '2024-12-05',
    destaque: false,
    publicado: true,
    resumoPt:
      'Tomate, cenoura e manjericão passam a sair de cinco metros da cozinha.',
    resumoEn:
      'New kitchen garden: tomato, carrot and basil now grow five metres from the kitchen.',
    corpoPt: [
      'Os canteiros novos ficaram atrás do forno, onde o sol bate a manhã inteira. A cenoura do molho e o manjericão do molho verde vêm de lá.',
      'O composto usado nos canteiros é feito com as cascas da própria cozinha.',
    ],
  },
  {
    titulo: 'Compostagem aberta a visitas',
    etiqueta: 'Compostagem',
    data: '2024-11-09',
    destaque: false,
    publicado: true,
    resumoPt:
      'Quem quiser conhecer o processo pode chegar antes das pizzas, às 16h.',
    resumoEn: 'Come see the composting: visits before service, at 4pm.',
    corpoPt: [
      'A pilha de composto fica ao lado do viveiro. Explicamos as camadas, o tempo de virada e o que pode ou não entrar.',
      'A visita leva uns vinte minutos e é gratuita. Avise antes pelo WhatsApp para a gente reservar alguém para receber você.',
    ],
  },
  {
    titulo: 'Colheita do mel que adoça os sucos',
    etiqueta: 'Apiário',
    data: '2024-10-14',
    destaque: false,
    publicado: true,
    resumoPt:
      'O mel das nossas caixas voltou para a cozinha e já está nas jarras.',
    resumoEn: 'Honey harvest: our own hives now sweeten every juice on the menu.',
    corpoPt: [
      'O mel é colhido no apiário da casa e vai direto para as jarras de suco. Nenhum suco nosso leva açúcar refinado.',
      'A colheita deste ano rendeu bem e deve durar até o fim da temporada de chuvas.',
    ],
  },
  {
    titulo: 'Muda de nativa para quem vem jantar',
    etiqueta: 'Viveiro',
    data: '2024-09-20',
    destaque: false,
    // Não publicado: exercita o filtro de leitura pública (Req 5.8).
    publicado: false,
    resumoPt:
      'Durante setembro, quem vier jantar leva uma muda do viveiro para plantar.',
    // Sem `en`: leitura em en cai para pt (fallback, Req 3.6).
    corpoPt: [
      'São mudas de espécies da Chapada, próprias para o clima daqui. Cada mesa leva uma.',
      'Se você plantar, manda foto. A gente publica nos informes.',
    ],
  },
  {
    titulo: 'Opção vegana nas duas pizzas',
    etiqueta: 'Cardápio',
    data: '2024-08-16',
    destaque: false,
    publicado: true,
    resumoPt:
      'As duas receitas da casa podem sair sem queijo, com ajuste no molho.',
    resumoEn: 'Both house pizzas can be made vegan — just ask when ordering.',
    corpoPt: [
      'A pizza do Capão sai com molho da casa, cenoura ralada e molho verde, sem mozzarella. A de banana troca o queijo pela mistura de castanha, linhaça, gergelim e girassol.',
      'Basta avisar no pedido. Temos opção vegana. Consulte-nos.',
    ],
  },
]

// Cardápio (Req 6, 9.3). `preco` e `detalhe` PRESERVADOS PALAVRA POR PALAVRA a
// partir do cardápio impresso (fonte: docs/design). Inclui os formatos não
// numéricos exigidos pelo Req 6.3: "ver tamanhos", "dose", "jarra 1,5 l".
type SeedCardapio = {
  secao: 'Pizzas' | 'Tamanhos' | 'Bebidas' | 'Vinhos'
  nome: string
  detalhe: string
  preco: string
  ordem: number
}

const CARDAPIO: SeedCardapio[] = [
  // Pizzas
  { secao: 'Pizzas', nome: 'Pizza Integral do Capão', detalhe: 'molho da casa, cenoura ralada, mozzarella, molho verde', preco: 'ver tamanhos', ordem: 1 },
  { secao: 'Pizzas', nome: 'Pizza Integral de Banana', detalhe: 'mel, canela, mozzarella, castanha, linhaça, gergelim, girassol', preco: 'ver tamanhos', ordem: 2 },
  // Tamanhos
  { secao: 'Tamanhos', nome: 'Pequena', detalhe: '1 pessoa', preco: 'R$ 30,00', ordem: 1 },
  { secao: 'Tamanhos', nome: 'Média', detalhe: '2 pessoas', preco: 'R$ 45,00', ordem: 2 },
  { secao: 'Tamanhos', nome: 'Grande', detalhe: '3 pessoas', preco: 'R$ 60,00', ordem: 3 },
  { secao: 'Tamanhos', nome: 'Família', detalhe: '4 pessoas', preco: 'R$ 75,00', ordem: 4 },
  // Bebidas — inclui "jarra 1,5 l" e "dose" verbatim (Req 6.3)
  { secao: 'Bebidas', nome: 'Suco pequeno', detalhe: 'jarra 0,5 l', preco: 'R$ 8,00', ordem: 1 },
  { secao: 'Bebidas', nome: 'Suco médio', detalhe: 'jarra 1,0 l', preco: 'R$ 15,00', ordem: 2 },
  { secao: 'Bebidas', nome: 'Suco grande', detalhe: 'jarra 1,5 l', preco: 'R$ 20,00', ordem: 3 },
  { secao: 'Bebidas', nome: 'Cerveja Bohemia', detalhe: '600 ml', preco: 'R$ 10,00', ordem: 4 },
  { secao: 'Bebidas', nome: 'Cerveja Serramalte', detalhe: '600 ml', preco: 'R$ 10,00', ordem: 5 },
  { secao: 'Bebidas', nome: 'Cerveja Heineken', detalhe: '600 ml', preco: 'R$ 12,00', ordem: 6 },
  { secao: 'Bebidas', nome: 'Cachaça da casa', detalhe: 'dose', preco: 'R$ 5,00', ordem: 7 },
  // Vinhos
  { secao: 'Vinhos', nome: 'Adega do Vale', detalhe: 'Cabernet Sauvignon - suave', preco: 'R$ 25,00', ordem: 1 },
  { secao: 'Vinhos', nome: 'Vinha Maria Nature', detalhe: 'Cabernet Sauvignon - suave', preco: 'R$ 30,00', ordem: 2 },
  { secao: 'Vinhos', nome: 'Rendeiras', detalhe: 'Syrah - meio seco', preco: 'R$ 30,00', ordem: 3 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Cabernet Sauvignon', preco: 'R$ 40,00', ordem: 4 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Cabernet Sauvignon - Syrah', preco: 'R$ 40,00', ordem: 5 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Syrah', preco: 'R$ 40,00', ordem: 6 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Tempranillo', preco: 'R$ 40,00', ordem: 7 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Reserva Seleção', preco: 'R$ 50,00', ordem: 8 },
  { secao: 'Vinhos', nome: "Rio Sol Winemarker's", detalhe: 'Touriga Nacional', preco: 'R$ 70,00', ordem: 9 },
  { secao: 'Vinhos', nome: "Rio Sol Winemarker's", detalhe: 'Alicante Bouchet', preco: 'R$ 70,00', ordem: 10 },
  { secao: 'Vinhos', nome: 'Vinha Maria', detalhe: 'Reserva Selecionada', preco: 'R$ 90,00', ordem: 11 },
  { secao: 'Vinhos', nome: 'Paralelo 8', detalhe: '', preco: 'R$ 100,00', ordem: 12 },
  { secao: 'Vinhos', nome: 'Rio Sol Brut', detalhe: 'espumante', preco: 'R$ 36,00', ordem: 13 },
  { secao: 'Vinhos', nome: 'Rio Sol Moscatel', detalhe: 'espumante', preco: 'R$ 36,00', ordem: 14 },
  { secao: 'Vinhos', nome: 'Rio Sol Rosé', detalhe: 'espumante', preco: 'R$ 36,00', ordem: 15 },
  { secao: 'Vinhos', nome: 'Rio Sol Demi-sec', detalhe: 'espumante', preco: 'R$ 36,00', ordem: 16 },
  { secao: 'Vinhos', nome: 'Tinto em taça', detalhe: 'suave', preco: 'R$ 10,00', ordem: 17 },
  { secao: 'Vinhos', nome: 'Tinto em taça', detalhe: 'seco', preco: 'R$ 15,00', ordem: 18 },
]

// Cronologia (Req 7). O `ano` é texto (Req 7.2). O repertório do projeto marca
// explicitamente "1992" como conhecido e os demais anos como incertos — estes
// recebem o marcador "a confirmar" (Req 9.4), nunca uma data inventada. O
// marco atual usa "hoje" (valor legítimo, não é placeholder).
type SeedCronologia = {
  ano: string
  titulo: string
  texto: string
  ordem: number
}

const CRONOLOGIA: SeedCronologia[] = [
  {
    ano: '1992',
    titulo: 'As primeiras pizzas no quintal',
    texto:
      'A mesa da família recebe os primeiros amigos. A receita da massa integral se forma ali, no forno a lenha de casa.',
    ordem: 1,
  },
  {
    ano: A_CONFIRMAR, // ano incerto (Req 9.4)
    titulo: 'Viveiro de mudas nativas',
    texto:
      'Para que o forno nunca consuma mata nativa, a casa passa a produzir as próprias mudas e a usar só lenha de reflorestamento.',
    ordem: 2,
  },
  {
    ano: A_CONFIRMAR, // ano incerto (Req 9.4)
    titulo: 'Apiário próprio',
    texto: 'O mel colhido aqui passa a adoçar todos os sucos da casa.',
    ordem: 3,
  },
  {
    ano: 'hoje', // valor legítimo (não é placeholder)
    titulo: 'Pizzaria e reflorestamento crescendo juntos',
    texto:
      'A pizzaria integral segue de portas abertas no Vale do Capão, com horta, apiário e viveiro em funcionamento.',
    ordem: 4,
  },
]

// Global de configurações (Req 8). TODOS os dados reais de contato/endereço/
// entrega/Pix são desconhecidos → marcador "a confirmar" (Req 9.4). Os arrays
// `horarios`/`taxasEntrega` recebem uma linha com valores "a confirmar" para
// que a estrutura exista sem fabricar dados; `qrPix` fica sem upload.
const CONFIGURACOES = {
  endereco: A_CONFIRMAR,
  linkMapa: A_CONFIRMAR,
  horarios: [{ faixa: A_CONFIRMAR, horario: A_CONFIRMAR }],
  whatsapp: A_CONFIRMAR,
  instagram: A_CONFIRMAR,
  // `email` é `type: 'email'` na coleção e valida o formato — o literal
  // "a confirmar" não é um e-mail válido. Em vez de FABRICAR um endereço
  // (proibido pelo Req 9.4), deixamos o campo VAZIO; o frontend trata valor
  // ausente como pendente (`isAConfirmar`) e renderiza o Placeholder_AConfirmar
  // (Req 19.1), preservando a intenção do Req 9.4.
  email: '',
  chavePix: A_CONFIRMAR,
  // qrPix: upload deixado sem valor (Req 9.4).
  taxasEntrega: [{ distancia: A_CONFIRMAR, valor: A_CONFIRMAR }],
  avisoRetirada: A_CONFIRMAR,
}

// ---------------------------------------------------------------------------
// Execução do seed.
// ---------------------------------------------------------------------------
async function seed() {
  const log = (msg: string) => console.log(msg)
  const payload = await getPayload({ config })

  // Idempotência (Req 9.1): apaga tudo antes de reinserir. `where` com um
  // predicado sempre-verdadeiro (`id exists`) casa todos os documentos.
  const colecoes = ['informes', 'cardapio', 'cronologia'] as const
  for (const collection of colecoes) {
    const { docs } = await payload.find({ collection, limit: 0, depth: 0 })
    log(`[seed] limpando ${docs.length} doc(s) de "${collection}"`)
    await payload.delete({
      collection,
      where: { id: { exists: true } },
    })
  }

  // Informes — cria com `data`/`en` e apenas UM `destaque` (Req 9.2). O `slug`
  // é gerado pelo hook a partir do `titulo` (títulos distintos ⇒ slugs únicos).
  for (const inf of INFORMES) {
    // Cria em pt (locale padrão).
    const criado = await payload.create({
      collection: 'informes',
      locale: 'pt',
      data: {
        titulo: inf.titulo,
        etiqueta: inf.etiqueta,
        data: inf.data,
        destaque: inf.destaque,
        publicado: inf.publicado,
        resumo: inf.resumoPt,
        corpo: richText(inf.corpoPt),
      },
    })

    // Grava o resumo em `en` quando disponível (Req 3.3); ausência ⇒ fallback
    // para pt na leitura (Req 3.6). `titulo` é localizado e `required`, então a
    // escrita no locale `en` precisa fornecer um `titulo` para passar na
    // validação — reutilizamos o título em pt (mesmo nome de marca, sem
    // fabricar conteúdo novo).
    if (inf.resumoEn) {
      await payload.update({
        collection: 'informes',
        id: criado.id,
        locale: 'en',
        data: { titulo: inf.titulo, resumo: inf.resumoEn },
      })
    }
  }

  // Cardápio — textos verbatim (Req 9.3).
  for (const item of CARDAPIO) {
    await payload.create({
      collection: 'cardapio',
      locale: 'pt',
      data: {
        secao: item.secao,
        nome: item.nome,
        detalhe: item.detalhe,
        preco: item.preco, // preservado palavra por palavra
        ordem: item.ordem,
        ativo: true,
      },
    })
  }

  // Cronologia — `ano` texto, "a confirmar" para anos incertos (Req 9.4).
  for (const marco of CRONOLOGIA) {
    await payload.create({
      collection: 'cronologia',
      data: {
        ano: marco.ano,
        titulo: marco.titulo,
        texto: marco.texto,
        ordem: marco.ordem,
      },
    })
  }

  // Global configuracoes — "a confirmar" para todos os dados reais (Req 9.4).
  await payload.updateGlobal({
    slug: 'configuracoes',
    data: CONFIGURACOES,
  })

  // Relatório final e verificação da invariante de destaque único (Req 9.2).
  const informes = await payload.find({ collection: 'informes', limit: 0, depth: 0 })
  const cardapio = await payload.find({ collection: 'cardapio', limit: 0, depth: 0 })
  const cronologia = await payload.find({ collection: 'cronologia', limit: 0, depth: 0 })
  const destaques = await payload.find({
    collection: 'informes',
    where: { destaque: { equals: true } },
    limit: 0,
    depth: 0,
  })

  log(
    `[seed] concluído: informes=${informes.totalDocs}, cardapio=${cardapio.totalDocs}, cronologia=${cronologia.totalDocs}, destaques=${destaques.totalDocs}`,
  )

  if (destaques.totalDocs > 1) {
    throw new Error(
      `[seed] invariante violada: ${destaques.totalDocs} informes em destaque (esperado no máximo 1).`,
    )
  }

  log(`[seed] destaque único: "${destaques.docs[0]?.titulo ?? '(nenhum)'}"`)
}

// `payload run` faz `await import(scriptPath)` e só aguarda a AVALIAÇÃO do
// módulo — não uma promise flutuante. Usamos TOP-LEVEL AWAIT para que o import
// só resolva depois que o seed inteiro termine; caso contrário o processo sai
// antes das escritas persistirem.
try {
  await seed()
  // Encerra explicitamente: a Local API mantém o pool do Postgres aberto e,
  // sem isto, o processo não retorna.
  process.exit(0)
} catch (err) {
  console.error('[seed] falhou:', err)
  process.exit(1)
}
