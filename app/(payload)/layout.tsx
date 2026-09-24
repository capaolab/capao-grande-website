/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { ServerFunctionClient } from 'payload'

import config from '@payload-config'
import '@payloadcms/next/css'
import {
  handleServerFunctions,
  RootLayout,
} from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'
// Tema com a identidade visual do site (cores, fontes, sem sombras). Importado
// DEPOIS do custom.scss para vencer a camada padrão do Payload.
import './tema-capao.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {/* Fontes do site no painel: React 19 iça este <link> para o <head>.
        Feito aqui porque `@import url(...)` no SCSS é descartado pelo
        minificador (inválido no meio do bundle final). */}
    {/* eslint-disable-next-line @next/next/no-page-custom-font -- route group do admin do Payload; a regra mira o Pages Router. */}
    <link
      rel="stylesheet"
      precedence="default"
      href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Karla:wght@400;500;700&display=swap"
    />
    {children}
  </RootLayout>
)

export default Layout
