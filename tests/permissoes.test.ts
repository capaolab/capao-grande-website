import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  comRetorno,
  podeAcessarArea,
  rotaDeRetorno,
  podeAcessarPainel,
  rotaPorRole,
  ROTA_ADMIN,
  ROTA_CLIENTE,
  ROTA_FUNCIONARIO,
  ROTA_LOGIN,
} from '../lib/permissoes'

// Permissões por papel (admin | funcionario | cliente): redirecionamento
// pós-login, acesso ao painel do Payload e acesso às áreas internas.
// Validates: funcionalidade de login por papel (src/collections/Users.ts).

/** Papel arbitrário válido. */
const arbPapel = fc.constantFrom('admin', 'funcionario', 'cliente')

/** Valor arbitrário de role: válido, string desconhecida, null ou undefined. */
const arbRoleQualquer: fc.Arbitrary<string | null | undefined> = fc.oneof(
  arbPapel,
  fc.string(),
  fc.constant(null),
  fc.constant(undefined),
)

describe('rotaPorRole', () => {
  it('mapeia cada papel para a sua rota', () => {
    expect(rotaPorRole('admin')).toBe(ROTA_ADMIN)
    expect(rotaPorRole('funcionario')).toBe(ROTA_FUNCIONARIO)
    expect(rotaPorRole('cliente')).toBe(ROTA_CLIENTE)
  })

  it('papéis válidos nunca caem no fallback /login', () => {
    fc.assert(
      fc.property(arbPapel, (papel) => {
        expect(rotaPorRole(papel)).not.toBe(ROTA_LOGIN)
      }),
    )
  })

  it('valores desconhecidos/ausentes caem no fallback seguro /login', () => {
    expect(rotaPorRole(null)).toBe(ROTA_LOGIN)
    expect(rotaPorRole(undefined)).toBe(ROTA_LOGIN)
    expect(rotaPorRole('superadmin')).toBe(ROTA_LOGIN)
    expect(rotaPorRole('')).toBe(ROTA_LOGIN)
  })
})

describe('podeAcessarPainel', () => {
  it('somente admin acessa o painel do Payload', () => {
    fc.assert(
      fc.property(arbRoleQualquer, (role) => {
        expect(podeAcessarPainel(role)).toBe(role === 'admin')
      }),
    )
  })
})

describe('podeAcessarArea', () => {
  it('admin acessa qualquer área (suporte)', () => {
    expect(podeAcessarArea('admin', 'funcionario')).toBe(true)
    expect(podeAcessarArea('admin', 'cliente')).toBe(true)
  })

  it('cada papel só acessa a própria área', () => {
    expect(podeAcessarArea('funcionario', 'funcionario')).toBe(true)
    expect(podeAcessarArea('funcionario', 'cliente')).toBe(false)
    expect(podeAcessarArea('cliente', 'cliente')).toBe(true)
    expect(podeAcessarArea('cliente', 'funcionario')).toBe(false)
  })

  it('sem papel válido, nenhuma área é acessível', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
        (role) => {
          if (role === 'admin' || role === 'funcionario' || role === 'cliente') return
          expect(podeAcessarArea(role, 'funcionario')).toBe(false)
          expect(podeAcessarArea(role, 'cliente')).toBe(false)
        },
      ),
    )
  })
})

describe('rotaDeRetorno / comRetorno (retorno pós-login)', () => {
  it('aceita caminhos internos', () => {
    expect(rotaDeRetorno('/pedido')).toBe('/pedido')
    expect(rotaDeRetorno('/informes/abc?x=1')).toBe('/informes/abc?x=1')
  })

  it('rejeita URLs externas e valores ausentes (sem open redirect)', () => {
    for (const valor of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'pedido',
      '',
      null,
      undefined,
    ]) {
      expect(rotaDeRetorno(valor)).toBeNull()
    }
  })

  it('nunca devolve algo que não comece com uma única barra', () => {
    fc.assert(
      fc.property(fc.string(), (valor) => {
        const rota = rotaDeRetorno(valor)
        if (rota === null) return
        expect(rota.startsWith('/')).toBe(true)
        expect(rota.startsWith('//')).toBe(false)
        expect(rota.includes('\\')).toBe(false)
      }),
    )
  })

  it('anexa o retorno codificado só quando é seguro', () => {
    expect(comRetorno('/login', '/pedido')).toBe('/login?next=%2Fpedido')
    expect(comRetorno('/login?x=1', '/pedido')).toBe('/login?x=1&next=%2Fpedido')
    expect(comRetorno('/login', '//evil.com')).toBe('/login')
    expect(comRetorno('/login', null)).toBe('/login')
  })
})
