import { EB_Garamond, Karla } from 'next/font/google'

/**
 * Sistema de tipografia do Capão Grande (Requisito 18.1).
 *
 * Fontes carregadas via `next/font/google` (Next.js 16), self-hosted e expostas
 * como CSS variables para consumo pelos tokens do Tailwind v4 em `app/globals.css`
 * (task 9.2) e aplicação no layout `(frontend)` (task 10.4).
 *
 * - EB Garamond -> `--font-serif`: títulos, números (cronologia/processo),
 *   itálicos em inglês e frases de destaque.
 * - Karla       -> `--font-sans`: corpo de texto, navegação, botões,
 *   etiquetas e tabelas.
 */

export const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})
