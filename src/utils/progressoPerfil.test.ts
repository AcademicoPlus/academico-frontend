import { describe, it, expect } from 'vitest';
import { calcularProgressoPerfil, MINIMO_HABILIDADES } from './progressoPerfil';
import type { UsuarioPerfil } from '../services/usuarioService';
import type { UsuarioHabilidade } from '../services/usuarioHabilidadeService';

function perfil(overrides: Partial<UsuarioPerfil> = {}): UsuarioPerfil {
  return {
    id: 'user-1',
    email: 'ana@academico.edu.br',
    nome: 'Ana',
    nivelAcesso: null,
    curso: null,
    periodo: null,
    bio: null,
    fotoUrl: null,
    linkedinUrl: null,
    githubUrl: null,
    habilidades: [],
    notaMedia: null,
    totalAvaliacoes: null,
    termosAceitosEm: null,
    ativo: true,
    criadoEm: '2026-01-01T00:00:00Z',
    atualizadoEm: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function habilidades(quantidade: number): UsuarioHabilidade[] {
  return Array.from({ length: quantidade }, (_, i) => ({ id: `uh-${i}` }) as unknown as UsuarioHabilidade);
}

describe('calcularProgressoPerfil', () => {
  it('perfil recém-cadastrado começa em 0% com habilidades como primeira pendência', () => {
    const progresso = calcularProgressoPerfil(perfil());

    expect(progresso.percentual).toBe(0);
    expect(progresso.completo).toBe(false);
    expect(progresso.pendentes[0].chave).toBe('habilidades');
    expect(progresso.pendentes[0].secao).toBe('secao-habilidades');
  });

  it('habilidades só contam a partir do mínimo, mostrando quantas faltam', () => {
    const progresso = calcularProgressoPerfil(perfil({ habilidades: habilidades(1) }));

    expect(progresso.percentual).toBe(0);
    expect(progresso.pendentes[0].rotulo).toContain(`(1 de ${MINIMO_HABILIDADES})`);

    const comMinimo = calcularProgressoPerfil(perfil({ habilidades: habilidades(MINIMO_HABILIDADES) }));
    expect(comMinimo.percentual).toBe(40);
    expect(comMinimo.pendentes.map((p) => p.chave)).not.toContain('habilidades');
  });

  it('LinkedIn ou GitHub, qualquer um dos dois basta', () => {
    expect(calcularProgressoPerfil(perfil({ githubUrl: 'https://github.com/ana' })).pendentes.map((p) => p.chave))
      .not.toContain('links');
    expect(calcularProgressoPerfil(perfil({ linkedinUrl: 'https://linkedin.com/in/ana' })).pendentes.map((p) => p.chave))
      .not.toContain('links');
  });

  it('texto só com espaços não conta como preenchido', () => {
    expect(calcularProgressoPerfil(perfil({ bio: '   ' })).pendentes.map((p) => p.chave)).toContain('bio');
  });

  it('perfil com tudo preenchido fica completo em 100%', () => {
    const progresso = calcularProgressoPerfil(perfil({
      habilidades: habilidades(MINIMO_HABILIDADES),
      fotoUrl: 'https://pub.r2.dev/perfis/x.png',
      bio: 'Estudo computação.',
      periodo: 4,
      githubUrl: 'https://github.com/ana',
    }));

    expect(progresso.percentual).toBe(100);
    expect(progresso.completo).toBe(true);
    expect(progresso.pendentes).toHaveLength(0);
  });
});
