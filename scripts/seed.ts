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
// - Textos do cardápio preservados PALAVRA POR PALAVRA nos campos textuais
//   (Req 9.3): "dose", "jarra 1,5 l" e os detalhes verbatim do cardápio
//   impresso (fonte: docs/design). O `preco` é NÚMERO (Tarefa 6 de
//   docs/features/delivery-pedidos.md — o Req 6.3 de preço-texto foi
//   revogado); pizzas ficam com `preco: null` (preço por tamanho).
// - Dados reais desconhecidos (horários, endereço, linkMapa, WhatsApp,
//   Instagram, e-mail, chave Pix, QR Pix, anos incertos da cronologia) gravados
//   como o marcador literal "a confirmar" — NUNCA fabricados (Req 9.4, 19.2).
// - Idempotência (Req 9.1): antes de inserir, o seed APAGA todos os documentos
//   das três coleções e reinsere um conjunto fixo, produzindo sempre o mesmo
//   estado previsível (sem duplicatas). O global é sobrescrito com os mesmos
//   valores a cada execução.
// - Primeiro usuário admin: se SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD estiverem
//   definidos no ambiente, o seed cria esse usuário na coleção `users` APENAS
//   se ele ainda não existir (não recria nem sobrescreve a senha). Sem as
//   variáveis, a criação é pulada — o seed continua útil em ambientes sem
//   credenciais (CI, build estático).

import { getPayload } from 'payload'
import config from '@payload-config'

import {
  CARDAPIO,
  CONFIGURACOES,
  CRONOLOGIA,
  INFORMES,
  richText,
  SECOES_CARDAPIO,
} from '@/content/seed-data'

// ---------------------------------------------------------------------------
// Execução do seed.
// ---------------------------------------------------------------------------
async function seed() {
  const log = (msg: string) => console.log(msg)
  const payload = await getPayload({ config })

  // Primeiro usuário admin (acesso ao painel `/admin`). Cria apenas se o
  // e-mail ainda não existir; nunca sobrescreve a senha de um usuário já
  // cadastrado. A senha nunca é logada.
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    log('[seed] usuário admin não criado (SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD ausentes)')
  } else {
    const { totalDocs } = await payload.find({
      collection: 'users',
      where: { email: { equals: adminEmail } },
      limit: 0,
      depth: 0,
    })
    if (totalDocs > 0) {
      log(`[seed] usuário admin já existe: ${adminEmail} (senha não alterada)`)
    } else {
      await payload.create({
        collection: 'users',
        // `role` é required na coleção (e o default seria 'cliente') — o seed
        // precisa gravar 'admin' explicitamente para o usuário acessar /admin.
        // Nome/sobrenome identificam o titular na operação (não são
        // obrigatórios para admin, mas o cadastro de cliente os exige).
        data: {
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          nome: 'Administrador',
          sobrenome: 'Capão Grande',
        },
      })
      log(`[seed] usuário admin criado: ${adminEmail}`)
    }
  }

  // Idempotência (Req 9.1): apaga tudo antes de reinserir. `where` com um
  // predicado sempre-verdadeiro (`id exists`) casa todos os documentos.
  // `etiquetas` vem depois de `informes` e `secoes-cardapio` depois de
  // `cardapio`: etiqueta/seção em uso não pode ser removida
  // (etiquetas-informes.md, RN-E03; secoes-cardapio.md, RN-S05).
  const colecoes = [
    'informes',
    'etiquetas',
    'cardapio',
    'secoes-cardapio',
    'cronologia',
  ] as const
  for (const collection of colecoes) {
    const { docs } = await payload.find({ collection, limit: 0, depth: 0 })
    log(`[seed] limpando ${docs.length} doc(s) de "${collection}"`)
    await payload.delete({
      collection,
      where: { id: { exists: true } },
    })
  }

  // Etiquetas usadas pelos informes do seed (etiquetas-informes.md).
  const etiquetaIds = new Map<string, number>()
  for (const nome of new Set(INFORMES.map((inf) => inf.etiqueta))) {
    const etiqueta = await payload.create({ collection: 'etiquetas', data: { nome } })
    etiquetaIds.set(nome, etiqueta.id)
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
        etiquetas: [etiquetaIds.get(inf.etiqueta)!],
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

  // Seções do cardápio (secoes-cardapio.md).
  const secaoIds = new Map<string, number>()
  for (const secao of SECOES_CARDAPIO) {
    const criada = await payload.create({ collection: 'secoes-cardapio', data: secao })
    secaoIds.set(secao.nome, criada.id)
  }

  // Cardápio — textos verbatim (Req 9.3); `preco` numérico (Tarefa 6 de
  // docs/features/delivery-pedidos.md).
  for (const item of CARDAPIO) {
    await payload.create({
      collection: 'cardapio',
      locale: 'pt',
      data: {
        secao: secaoIds.get(item.secao)!,
        nome: item.nome,
        detalhe: item.detalhe,
        preco: item.preco, // number | null (null = pizzas, preço por tamanho)
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
