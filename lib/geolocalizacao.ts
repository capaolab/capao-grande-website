// Geolocalização do cliente (docs/features/pimenta-em-mel.md, RN-P07) —
// funções PURAS compartilhadas pelo cadastro (lib/cadastro.ts), pelo hook da
// collection `users` e pelo pedido de pimenta em mel (lib/pimenta.ts).
//
// No Vale do Capão não há endereço formal (delivery-pedidos.md, P4): a
// localização é um ponto no mapa (latitude/longitude) mais uma referência
// textual opcional (`localidade`).

/** Um ponto válido: número finito dentro da faixa geográfica. */
export function coordenadaValida(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/**
 * Valida uma localização OPCIONAL: ausente (ambos null/undefined) é válido;
 * se um dos lados vier, os dois precisam formar um ponto válido. Retorna a
 * lista de erros em pt-BR (vazia = válido).
 */
export function validarLocalizacaoOpcional(latitude: unknown, longitude: unknown): string[] {
  if (latitude == null && longitude == null) return []
  return coordenadaValida(latitude, longitude)
    ? []
    : ['Localização inválida: marque o ponto novamente no mapa.']
}
