import { describe, expect, it } from 'vitest'

import { MIN_SENHA, normalizarCadastro, validarCadastro } from '../lib/cadastro'

// Testes das funções puras de validação do cadastro público de clientes
// (docs/features/dashboard-pedidos.md): mesmas regras aplicadas no endpoint
// POST /api/cadastro-cliente.

const VALIDO = {
  nome: 'Maria',
  sobrenome: 'Silva',
  email: 'maria@example.com',
  telefone: '(75) 99999-0000',
  senha: 'senha-segura-123',
}

describe('validarCadastro', () => {
  it('aceita um cadastro completo e válido', () => {
    expect(validarCadastro(VALIDO)).toEqual([])
  })

  it('exige nome e sobrenome', () => {
    expect(validarCadastro({ ...VALIDO, nome: '' })).toContain('Nome é obrigatório.')
    expect(validarCadastro({ ...VALIDO, sobrenome: '  ' })).toContain('Sobrenome é obrigatório.')
    expect(validarCadastro({ ...VALIDO, nome: undefined })).toContain('Nome é obrigatório.')
  })

  it('exige e-mail com formato válido', () => {
    expect(validarCadastro({ ...VALIDO, email: 'nao-eh-email' })).toContain(
      'Informe um e-mail válido.',
    )
    expect(validarCadastro({ ...VALIDO, email: '' })).toContain('Informe um e-mail válido.')
  })

  it('exige telefone plausível (com DDD)', () => {
    expect(validarCadastro({ ...VALIDO, telefone: '123' })).toContain(
      'Informe um telefone (WhatsApp) válido, com DDD.',
    )
  })

  it(`exige senha com ao menos ${MIN_SENHA} caracteres`, () => {
    expect(validarCadastro({ ...VALIDO, senha: 'curta' }).length).toBeGreaterThan(0)
    expect(validarCadastro({ ...VALIDO, senha: 'x'.repeat(MIN_SENHA) })).toEqual([])
  })

  it('localização é opcional, mas precisa formar um ponto válido quando informada', () => {
    expect(validarCadastro({ ...VALIDO, latitude: -12.6, longitude: -41.5 })).toEqual([])
    expect(validarCadastro({ ...VALIDO, latitude: -12.6 })).toHaveLength(1)
    expect(validarCadastro({ ...VALIDO, latitude: 200, longitude: 0 })).toHaveLength(1)
    expect(validarCadastro({ ...VALIDO, localidade: 42 })).toContain(
      'Referência de localização inválida.',
    )
  })

  it('acumula todos os erros de uma vez', () => {
    expect(validarCadastro({}).length).toBe(5)
  })
})

describe('normalizarCadastro', () => {
  it('apara textos, põe e-mail em minúsculas e telefone só com dígitos', () => {
    expect(
      normalizarCadastro({
        nome: '  Maria ',
        sobrenome: ' Silva  ',
        email: ' Maria@Example.COM ',
        telefone: '(75) 99999-0000',
        senha: 'senha-segura-123',
      }),
    ).toEqual({
      nome: 'Maria',
      sobrenome: 'Silva',
      email: 'maria@example.com',
      telefone: '75999990000',
      senha: 'senha-segura-123',
    })
  })

  it('repassa a localização quando completa e descarta referência vazia', () => {
    expect(
      normalizarCadastro({ ...VALIDO, latitude: -12.6, longitude: -41.5, localidade: '  Rua da Igreja ' }),
    ).toMatchObject({ latitude: -12.6, longitude: -41.5, localidade: 'Rua da Igreja' })
    const semLocal = normalizarCadastro({ ...VALIDO, latitude: null, longitude: null, localidade: '  ' })
    expect(semLocal).not.toHaveProperty('latitude')
    expect(semLocal).not.toHaveProperty('localidade')
  })

  it('não altera a senha (nem apara espaços)', () => {
    expect(normalizarCadastro({ ...VALIDO, senha: ' senha com espacos ' }).senha).toBe(
      ' senha com espacos ',
    )
  })
})
