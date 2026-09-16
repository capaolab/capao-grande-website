import fc from 'fast-check'

// Default de PBT do projeto: mínimo de 100 iterações por propriedade.
// (Feature: payload-cms-integration — design "Testing Strategy")
fc.configureGlobal({ numRuns: 100 })
