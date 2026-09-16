// Utilitário puro de placeholder "a confirmar" (Requisitos 19.1, 19.2).
//
// Este módulo NÃO importa Payload, Next ou React de propósito: `isAConfirmar`
// é uma função pura sobre um valor arbitrário, o que permite exercitá-la com
// testes de propriedade (fast-check) sem infraestrutura (design "Testing
// Strategy", Property 10). O componente visual `<Placeholder>` é construído em
// outra tarefa (10.1) e pode importar este helper.

/**
 * Determina se um valor de campo textual deve ser tratado como pendente
 * ("a confirmar"), fazendo com que o Site renderize `Placeholder_AConfirmar`
 * em vez de um valor fabricado (Req 19.1, 19.2).
 *
 * Regra de correspondência (documentada intencionalmente):
 * É considerado pendente quando o valor é:
 *  - `null` ou `undefined`;
 *  - uma string vazia ou composta apenas por espaços em branco; ou
 *  - a frase "a confirmar", comparada de forma insensível a caixa e a acentos.
 *
 * A normalização usada na comparação é: `trim` + `toLowerCase` +
 * remoção de acentos via decomposição Unicode NFD (removendo os
 * caracteres combinantes `U+0300–U+036F`). Assim, "A Confirmar",
 * "a confirmar" e quaisquer variantes acentuadas equivalem à mesma frase.
 *
 * A correspondência é sobre a frase EXATA (após normalização), não uma
 * verificação de substring. Isso segue a intenção do design ("string igual a
 * 'a confirmar'") e evita marcar como pendente conteúdo legítimo que apenas
 * contenha essas palavras. Em particular, valores legítimos da cronologia como
 * "hoje" NÃO são pendentes (Req 7.2, 17.3). Note que o campo `ano` também
 * aceita a frase literal "ano a confirmar"; esse é um valor textual próprio da
 * cronologia (não a frase "a confirmar") e sua exibição como placeholder é
 * tratada na camada de UI da cronologia (Req 17.3), não por este helper — que
 * cobre o marcador canônico "a confirmar" e a ausência de valor.
 *
 * Aceita `unknown` para ser robusto a dados vindos do CMS: qualquer valor que
 * não seja `string` (e não seja `null`/`undefined`) é considerado presente e,
 * portanto, NÃO pendente.
 */
export function isAConfirmar(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'string') return false

  const normalizado = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return normalizado === '' || normalizado === 'a confirmar'
}
