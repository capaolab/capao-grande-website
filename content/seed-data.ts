// content/seed-data.ts — fonte única dos dados de demonstração do site.
//
// Extraído de scripts/seed.ts (Requisito 9) para ser consumido por DOIS
// caminhos diferentes:
//   1. scripts/seed.ts: insere estes dados num Postgres real via Payload
//      Local API (fluxo de desenvolvimento/Docker).
//   2. content/static-content.ts: resolve estes mesmos dados em memória para
//      o build estático de staging (`CONTENT_SOURCE=static`), sem Payload nem
//      banco — ver AGENTS.md/README sobre o ambiente de staging na Vercel.
//
// Nenhum dado real de contato/endereço/Pix é inventado (Req 9.4): tudo que é
// desconhecido usa o marcador literal "a confirmar" (A_CONFIRMAR).

// Marcador único para dados reais desconhecidos (Req 9.4).
export const A_CONFIRMAR = 'a confirmar'

// ---------------------------------------------------------------------------
// Rich text (lexical): o campo `corpo` de Informes é rich text (Req 5.7). A
// Local API espera o formato serializado do editor lexical. Construímos um
// documento mínimo com um parágrafo por string de texto, preservando o texto
// verbatim (sem reformatação).
// ---------------------------------------------------------------------------
export function paragrafo(texto: string) {
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

export function richText(paragrafos: string[]) {
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
export type SeedInforme = {
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

export const INFORMES: SeedInforme[] = [
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

// Cardápio (Req 6, 9.3). `detalhe` PRESERVADO PALAVRA POR PALAVRA a partir do
// cardápio impresso (fonte: docs/design) — inclui "jarra 1,5 l" e "dose".
// `preco` é NÚMERO (reais) desde a Tarefa 6 de docs/features/delivery-pedidos.md
// (P1): o valor canônico é numérico e a formatação "R$ 30,00" acontece na
// renderização (renderPreco, lib/cardapio.ts). Pizzas têm `preco: null` porque
// o valor depende do tamanho — os preços das pizzas vivem nos itens da seção
// Tamanhos (Pequena 30, Média 45, Grande 60, Família 75).
export type SeedCardapio = {
  secao: 'Pizzas' | 'Tamanhos' | 'Bebidas' | 'Vinhos'
  nome: string
  detalhe: string
  preco: number | null
  ordem: number
}

export const CARDAPIO: SeedCardapio[] = [
  // Pizzas — preço variável por tamanho (null = sem preço próprio)
  { secao: 'Pizzas', nome: 'Pizza Integral do Capão', detalhe: 'molho da casa, cenoura ralada, mozzarella, molho verde', preco: null, ordem: 1 },
  { secao: 'Pizzas', nome: 'Pizza Integral de Banana', detalhe: 'mel, canela, mozzarella, castanha, linhaça, gergelim, girassol', preco: null, ordem: 2 },
  // Tamanhos — carregam os preços das pizzas
  { secao: 'Tamanhos', nome: 'Pequena', detalhe: '1 pessoa', preco: 30, ordem: 1 },
  { secao: 'Tamanhos', nome: 'Média', detalhe: '2 pessoas', preco: 45, ordem: 2 },
  { secao: 'Tamanhos', nome: 'Grande', detalhe: '3 pessoas', preco: 60, ordem: 3 },
  { secao: 'Tamanhos', nome: 'Família', detalhe: '4 pessoas', preco: 75, ordem: 4 },
  // Bebidas — detalhes "jarra 1,5 l" e "dose" preservados verbatim
  { secao: 'Bebidas', nome: 'Suco pequeno', detalhe: 'jarra 0,5 l', preco: 8, ordem: 1 },
  { secao: 'Bebidas', nome: 'Suco médio', detalhe: 'jarra 1,0 l', preco: 15, ordem: 2 },
  { secao: 'Bebidas', nome: 'Suco grande', detalhe: 'jarra 1,5 l', preco: 20, ordem: 3 },
  { secao: 'Bebidas', nome: 'Cerveja Bohemia', detalhe: '600 ml', preco: 10, ordem: 4 },
  { secao: 'Bebidas', nome: 'Cerveja Serramalte', detalhe: '600 ml', preco: 10, ordem: 5 },
  { secao: 'Bebidas', nome: 'Cerveja Heineken', detalhe: '600 ml', preco: 12, ordem: 6 },
  { secao: 'Bebidas', nome: 'Cachaça da casa', detalhe: 'dose', preco: 5, ordem: 7 },
  // Vinhos
  { secao: 'Vinhos', nome: 'Adega do Vale', detalhe: 'Cabernet Sauvignon - suave', preco: 25, ordem: 1 },
  { secao: 'Vinhos', nome: 'Vinha Maria Nature', detalhe: 'Cabernet Sauvignon - suave', preco: 30, ordem: 2 },
  { secao: 'Vinhos', nome: 'Rendeiras', detalhe: 'Syrah - meio seco', preco: 30, ordem: 3 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Cabernet Sauvignon', preco: 40, ordem: 4 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Cabernet Sauvignon - Syrah', preco: 40, ordem: 5 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Syrah', preco: 40, ordem: 6 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Tempranillo', preco: 40, ordem: 7 },
  { secao: 'Vinhos', nome: 'Rio Sol', detalhe: 'Reserva Seleção', preco: 50, ordem: 8 },
  { secao: 'Vinhos', nome: "Rio Sol Winemarker's", detalhe: 'Touriga Nacional', preco: 70, ordem: 9 },
  { secao: 'Vinhos', nome: "Rio Sol Winemarker's", detalhe: 'Alicante Bouchet', preco: 70, ordem: 10 },
  { secao: 'Vinhos', nome: 'Vinha Maria', detalhe: 'Reserva Selecionada', preco: 90, ordem: 11 },
  { secao: 'Vinhos', nome: 'Paralelo 8', detalhe: '', preco: 100, ordem: 12 },
  { secao: 'Vinhos', nome: 'Rio Sol Brut', detalhe: 'espumante', preco: 36, ordem: 13 },
  { secao: 'Vinhos', nome: 'Rio Sol Moscatel', detalhe: 'espumante', preco: 36, ordem: 14 },
  { secao: 'Vinhos', nome: 'Rio Sol Rosé', detalhe: 'espumante', preco: 36, ordem: 15 },
  { secao: 'Vinhos', nome: 'Rio Sol Demi-sec', detalhe: 'espumante', preco: 36, ordem: 16 },
  { secao: 'Vinhos', nome: 'Tinto em taça', detalhe: 'suave', preco: 10, ordem: 17 },
  { secao: 'Vinhos', nome: 'Tinto em taça', detalhe: 'seco', preco: 15, ordem: 18 },
]

// Cronologia (Req 7). O `ano` é texto (Req 7.2). O repertório do projeto marca
// explicitamente "1992" como conhecido e os demais anos como incertos — estes
// recebem o marcador "a confirmar" (Req 9.4), nunca uma data inventada. O
// marco atual usa "hoje" (valor legítimo, não é placeholder).
export type SeedCronologia = {
  ano: string
  titulo: string
  texto: string
  ordem: number
}

export const CRONOLOGIA: SeedCronologia[] = [
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
export const CONFIGURACOES = {
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
