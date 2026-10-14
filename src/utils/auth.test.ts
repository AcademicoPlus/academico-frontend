import { describe, it, expect, beforeEach } from 'vitest';
import { salvarToken, obterToken, removerToken, estaAutenticado, tokenExpirado } from './auth';

// Monta um JWT de mentira: só o payload importa aqui (a assinatura quem valida
// é o backend; o frontend só lê o "exp" para não entrar num app que vai falhar).
function tokenComExpiracao(segundosAPartirDeAgora: number): string {
  const exp = Math.floor(Date.now() / 1000) + segundosAPartirDeAgora;
  const payload = btoa(JSON.stringify({ sub: 'alguem', exp }));
  return `cabecalho.${payload}.assinatura`;
}

describe('utils/auth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('não está autenticado quando não há token salvo', () => {
    expect(estaAutenticado()).toBe(false);
    expect(obterToken()).toBeNull();
  });

  it('salva e recupera o token', () => {
    salvarToken('meu-jwt');
    expect(obterToken()).toBe('meu-jwt');
    expect(estaAutenticado()).toBe(true);
  });

  it('remove o token', () => {
    salvarToken('meu-jwt');
    removerToken();
    expect(obterToken()).toBeNull();
    expect(estaAutenticado()).toBe(false);
  });

  it('considera autenticado um token ainda dentro da validade', () => {
    salvarToken(tokenComExpiracao(60 * 60));
    expect(estaAutenticado()).toBe(true);
  });

  it('não está autenticado com token vencido, e o descarta', () => {
    salvarToken(tokenComExpiracao(-10));
    expect(estaAutenticado()).toBe(false);
    expect(obterToken()).toBeNull();
  });

  it('tokenExpirado reconhece validade e vencimento', () => {
    expect(tokenExpirado(tokenComExpiracao(60))).toBe(false);
    expect(tokenExpirado(tokenComExpiracao(-60))).toBe(true);
  });

  it('não derruba a sessão quando o token não tem exp legível', () => {
    // Deixa o backend decidir: o 401 do apiClient encerra a sessão de todo modo.
    salvarToken('nao-e-um-jwt');
    expect(tokenExpirado('nao-e-um-jwt')).toBe(false);
    expect(estaAutenticado()).toBe(true);
  });
});
