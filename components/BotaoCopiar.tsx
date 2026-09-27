'use client'

// <BotaoCopiar> — copia um texto para a área de transferência, para a equipe
// colar na conversa do WhatsApp (docs/features/pedidos-painel.md): link do
// formulário de pedido e chave Pix.
//
// `valor` começando com "/" é um caminho do site: vira URL absoluta com a
// origem atual no clique. A Clipboard API só existe em contexto seguro
// (HTTPS/localhost); fora dele (ex.: celular na rede local por http) cai no
// `execCommand('copy')` de um <textarea> temporário. O resultado é anunciado
// numa região aria-live.

import { useEffect, useState, type ReactElement } from 'react'

async function copiar(texto: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto)
      return true
    } catch {
      // Sem permissão: tenta o método antigo abaixo.
    }
  }
  const area = document.createElement('textarea')
  area.value = texto
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  return ok
}

export function BotaoCopiar({ valor, rotulo }: { valor: string; rotulo: string }): ReactElement {
  const [estado, setEstado] = useState<'ocioso' | 'copiado' | 'falhou'>('ocioso')

  // O aviso some depois de alguns segundos.
  useEffect(() => {
    if (estado === 'ocioso') return
    const espera = setTimeout(() => setEstado('ocioso'), 2500)
    return () => clearTimeout(espera)
  }, [estado])

  async function aoClicar() {
    const texto = valor.startsWith('/') ? `${window.location.origin}${valor}` : valor
    setEstado((await copiar(texto)) ? 'copiado' : 'falhou')
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={aoClicar}
        className="borda-sistema hover-verde rounded-[var(--radius)] bg-papel px-3 py-2 font-sans text-sm text-marrom transition-colors"
      >
        {rotulo}
      </button>
      <span aria-live="polite" className="font-sans text-sm text-paragrafo">
        {estado === 'copiado' ? 'Copiado!' : estado === 'falhou' ? 'Não foi possível copiar.' : ''}
      </span>
    </span>
  )
}

export default BotaoCopiar
