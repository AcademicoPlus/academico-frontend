import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import CardProgressoPerfil from './CardProgressoPerfil';
import type { UsuarioPerfil } from '../services/usuarioService';
import type { UsuarioHabilidade } from '../services/usuarioHabilidadeService';

function perfil(overrides: Partial<UsuarioPerfil> = {}): UsuarioPerfil {
  return {
    id: 'user-1', email: 'ana@academico.edu.br', nome: 'Ana', nivelAcesso: null, curso: null,
    periodo: null, bio: null, fotoUrl: null, linkedinUrl: null, githubUrl: null, habilidades: [],
    notaMedia: null, totalAvaliacoes: null, termosAceitosEm: null, ativo: true,
    criadoEm: '2026-01-01T00:00:00Z', atualizadoEm: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const PERFIL_COMPLETO = perfil({
  habilidades: Array.from({ length: 3 }, (_, i) => ({ id: `uh-${i}` }) as unknown as UsuarioHabilidade),
  fotoUrl: 'https://pub.r2.dev/perfis/x.png',
  bio: 'Estudo computação.',
  periodo: 4,
  githubUrl: 'https://github.com/ana',
});

function renderCard(p: UsuarioPerfil, dispensavel = false) {
  return render(
    <MemoryRouter>
      <CardProgressoPerfil perfil={p} dispensavel={dispensavel} />
    </MemoryRouter>,
  );
}

describe('CardProgressoPerfil', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('mostra o progresso e leva cada pendência para a seção certa da edição', () => {
    renderCard(perfil({ bio: 'Estudo computação.' }));

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByRole('link', { name: /adicione pelo menos 3 habilidades/i }))
      .toHaveAttribute('href', '/usuarios/user-1/editar#secao-habilidades');
    expect(screen.getByRole('link', { name: /foto de perfil/i }))
      .toHaveAttribute('href', '/usuarios/user-1/editar#secao-foto');
    // A bio já está preenchida: não aparece como pendência.
    expect(screen.queryByRole('link', { name: /^bio/i })).not.toBeInTheDocument();
    // O botão principal leva para a pendência mais importante.
    expect(screen.getByRole('link', { name: 'Completar perfil' }))
      .toHaveAttribute('href', '/usuarios/user-1/editar#secao-habilidades');
  });

  it('não aparece quando o perfil está completo', () => {
    renderCard(PERFIL_COMPLETO);

    expect(screen.queryByText('Complete seu perfil')).not.toBeInTheDocument();
  });

  it('no dashboard, "Agora não" esconde o card até a próxima sessão', async () => {
    const { unmount } = renderCard(perfil(), true);

    await userEvent.click(screen.getByRole('button', { name: /agora não/i }));
    expect(screen.queryByText('Complete seu perfil')).not.toBeInTheDocument();

    unmount();
    renderCard(perfil(), true);
    expect(screen.queryByText('Complete seu perfil')).not.toBeInTheDocument();
  });

  it('na página do próprio perfil não dá para dispensar', () => {
    renderCard(perfil());

    expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /agora não/i })).not.toBeInTheDocument();
  });
});
