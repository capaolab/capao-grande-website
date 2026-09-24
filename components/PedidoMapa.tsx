'use client'

// <PedidoMapa> — captura da geolocalização de entrega com Leaflet +
// OpenStreetMap (docs/features/delivery-pedidos.md, Tarefa 3; RN07, P4, P5).
//
// Comportamento:
//  - Vista inicial centrada no Vale do Capão (constante CENTRO_CAPAO abaixo).
//  - Botão "Usar minha localização": Geolocation API do navegador; um clique
//    centraliza o mapa e posiciona o pin. Permissão negada/GPS indisponível
//    NÃO bloqueia: mensagem orienta a posicionar o pin manualmente.
//  - O pin é SEMPRE arrastável (draggable: true) e também pode ser posicionado
//    com um clique/toque no mapa — é o caminho de quem não tem GPS.
//  - O ponto confirmado é comunicado ao formulário pai via `onMudancaPonto`
//    (lat/lng); sem pin, o formulário não submete (RN07).
//
// Integração técnica:
//  - Leaflet PURO (sem react-leaflet), carregado com `import()` dinâmico
//    DENTRO do useEffect: o módulo do Leaflet toca `window` na importação, o
//    que quebraria o pré-render SSR deste Client Component.
//  - O CSS do Leaflet (`leaflet/dist/leaflet.css`) é importado aqui mesmo —
//    o App Router aceita CSS de node_modules em componentes.
//  - Ícone via `L.divIcon` com HTML inline: não depende dos assets de imagem
//    do Leaflet (marker-icon.png), que quebram com bundlers.
//  - Tiles OSM com attribution obrigatório (P5: sem chave de API, sem custo).
//
// Acessibilidade: o mapa é um complemento visual; o estado do ponto é
// anunciado numa região aria-live e o botão de geolocalização é um <button>
// comum, focável por teclado. A inicialização é protegida por try/catch para
// degradar com mensagem clara (também cobre ambientes sem layout real).

import { useEffect, useRef, useState, type ReactElement } from 'react'

import 'leaflet/dist/leaflet.css'

// Centro aproximado do Vale do Capão (Chapada Diamantina, BA): vista inicial
// do mapa antes de qualquer interação. Coordenadas de referência da vila.
const CENTRO_CAPAO = { latitude: -12.6167, longitude: -41.5 } as const
const ZOOM_INICIAL = 14
const ZOOM_LOCALIZACAO = 16

/** Ponto de entrega confirmado no mapa. */
export interface PontoEntrega {
  latitude: number
  longitude: number
}

export interface PedidoMapaProps {
  /** Chamado quando o pin é posicionado/movido (ou removido, com null). */
  onMudancaPonto: (ponto: PontoEntrega | null) => void
}

/** Formata lat/lng para exibição de confirmação (5 casas ≈ precisão de ~1 m). */
function formatarCoordenada(valor: number): string {
  return valor.toFixed(5).replace('.', ',')
}

export function PedidoMapa({ onMudancaPonto }: PedidoMapaProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ponto, setPonto] = useState<PontoEntrega | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false)
  const [mapaPronto, setMapaPronto] = useState(false)

  // Referências mutáveis para o mapa/pin (instâncias do Leaflet, fora do
  // ciclo de render do React) e para o callback mais recente do pai.
  const mapaRef = useRef<import('leaflet').Map | null>(null)
  const pinRef = useRef<import('leaflet').Marker | null>(null)
  const onMudancaPontoRef = useRef(onMudancaPonto)

  // Mantém o callback do pai atualizado sem acessar a ref durante a
  // renderização (regra react-hooks/refs).
  useEffect(() => {
    onMudancaPontoRef.current = onMudancaPonto
  }, [onMudancaPonto])

  // Inicialização do mapa — uma vez, no cliente. O import do Leaflet é
  // dinâmico porque o módulo exige `window` (não roda no SSR).
  useEffect(() => {
    if (!containerRef.current || mapaRef.current) return

    let cancelado = false

    async function inicializar() {
      try {
        const L = await import('leaflet')
        if (cancelado || !containerRef.current || mapaRef.current) return

        const mapa = L.map(containerRef.current, {
          center: [CENTRO_CAPAO.latitude, CENTRO_CAPAO.longitude],
          zoom: ZOOM_INICIAL,
        })

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapa)

        // Pin com divIcon (HTML inline): dispensa os PNGs de marcador do
        // Leaflet, que não resolvem com bundlers.
        const icone = L.divIcon({
          className: 'pedido-pin',
          html:
            '<span style="display:block;width:22px;height:22px;border-radius:50%;' +
            'background:#86a544;border:3px solid #fffdf8;box-sizing:border-box;"></span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })

        const posicionarPin = (latlng: import('leaflet').LatLng) => {
          const novoPonto = { latitude: latlng.lat, longitude: latlng.lng }

          if (pinRef.current) {
            pinRef.current.setLatLng(latlng)
          } else {
            const pin = L.marker(latlng, { draggable: true, icon: icone }).addTo(mapa)
            // O pin é SEMPRE arrastável: o arrasto é a forma de ajuste fino
            // (GPS do navegador pode ser impreciso — P4).
            pin.on('dragend', () => {
              const posicao = pin.getLatLng()
              const arrastado = { latitude: posicao.lat, longitude: posicao.lng }
              setPonto(arrastado)
              onMudancaPontoRef.current(arrastado)
            })
            pinRef.current = pin
          }

          setPonto(novoPonto)
          onMudancaPontoRef.current(novoPonto)
        }

        // Clique/toque no mapa posiciona (ou move) o pin — caminho manual
        // para quem não tem GPS ou negou a permissão (RN07).
        mapa.on('click', (evento: import('leaflet').LeafletMouseEvent) => {
          posicionarPin(evento.latlng)
        })

        mapaRef.current = mapa
        setMapaPronto(true)
      } catch {
        if (!cancelado) {
          setMensagem(
            'Não foi possível carregar o mapa. Verifique sua conexão e recarregue a página.',
          )
        }
      }
    }

    inicializar()

    return () => {
      cancelado = true
      mapaRef.current?.remove()
      mapaRef.current = null
      pinRef.current = null
    }
  }, [])

  function usarMinhaLocalizacao() {
    if (!('geolocation' in navigator)) {
      setMensagem(
        'Seu navegador não oferece geolocalização. Toque no mapa para posicionar o pin no local de entrega.',
      )
      return
    }

    setBuscandoLocalizacao(true)
    setMensagem(null)

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setBuscandoLocalizacao(false)
        const mapa = mapaRef.current
        if (!mapa) return
        const latlng = { lat: posicao.coords.latitude, lng: posicao.coords.longitude }
        mapa.setView(latlng, ZOOM_LOCALIZACAO)
        // Dispara o mesmo fluxo do clique: posiciona/move o pin.
        mapa.fire('click', { latlng })
      },
      () => {
        setBuscandoLocalizacao(false)
        // Permissão negada ou GPS indisponível: NÃO bloqueia o pedido —
        // orienta o posicionamento manual do pin (Tarefa 3).
        setMensagem(
          'Não foi possível obter sua localização. Toque no mapa para posicionar o pin no local de entrega.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={usarMinhaLocalizacao}
        disabled={!mapaPronto || buscandoLocalizacao}
        className="borda-sistema hover-verde inline-flex w-fit items-center rounded-[var(--radius)] px-4 py-2 font-sans text-[color:var(--color-marrom)] transition-colors disabled:opacity-60"
      >
        {buscandoLocalizacao ? 'Buscando sua localização…' : 'Usar minha localização'}
      </button>

      {/* Container do mapa: altura fixa (o Leaflet exige dimensão explícita).
          Os controles do Leaflet (zoom, attribution) são navegáveis; o estado
          do ponto é anunciado abaixo em texto. */}
      <div
        ref={containerRef}
        className="borda-sistema h-72 w-full overflow-hidden rounded-[var(--radius)]"
      />

      {/* Estado do ponto: região viva para anunciar mudanças (confirmação
          visual exigida em P4 e feedback para tecnologia assistiva). */}
      <div aria-live="polite" className="flex flex-col gap-1">
        {ponto ? (
          <p className="font-sans text-sm text-[color:var(--color-marrom)]">
            Ponto de entrega marcado ({formatarCoordenada(ponto.latitude)},{' '}
            {formatarCoordenada(ponto.longitude)}). Arraste o pin ou toque no mapa para
            ajustar.
          </p>
        ) : (
          <p className="font-sans text-sm text-[color:var(--color-paragrafo)]">
            Toque no mapa ou use o botão acima para marcar o ponto de entrega.
          </p>
        )}
        {mensagem ? (
          <p role="alert" className="font-sans text-sm text-[color:var(--color-paragrafo)]">
            {mensagem}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default PedidoMapa
