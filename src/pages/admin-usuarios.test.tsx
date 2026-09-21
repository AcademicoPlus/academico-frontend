import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AdminUsuarios from './admin-usuarios';
import * as usuarioService from '../services/usuarioService';
import * as nivelAcessoService from '../services/nivelAcessoService';
import * as useMeuPerfilHook from '../hooks/useMeuPerfil';
import type { UsuarioResumo } from '../services/authService';
import type { UsuarioPerfil } from '../services/usuarioService';

vi.mock('../services/usuarioService');
vi.mock('../services/nivelAcessoService');
vi.mock('../hooks/useMeuPerfil');

const USUARIO_1: UsuarioResumo = {
  id: 'user-1',
  nome: 'Ana Silva',
  curso: 'Ciência da Computação',
  fotoUrl: null,
  permission: 'ALUNO',
  periodo: 3,
  notaMedia: 4.5,
  totalAvaliacoes: 2,
};

const USUARIO_2: UsuarioResumo = {
  id: 'user-2',
  nome: 'Bruno Alves',
  curso: 'Engenharia',
  fotoUrl: null,
  permission: 'PROFESSOR',
  periodo: null,
  notaMedia: null,
  totalAvaliacoes: null,
};

const NIVEIS = [
  { id: 'nivel-1', nome: 'ALUNO', descricao: null },
  { id: 'nivel-2', nome: 'PROFESSOR', descricao: null },
  { id: 'nivel-3', nome: 'ADMIN', descricao: null },
];

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminUsuarios />
    </MemoryRouter>,
  );
}

describe('AdminUsuarios', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(useMeuPerfilHook, 'useMeuPerfil').mockReturnValue({ data: { id: 'algum-id' } } as never);
  });

  it('carrega e lista os usuários numa tabela', async () => {
    vi.spyOn(usuarioService, 'listarTodosOsUsuarios').mockResolvedValue([USUARIO_1, USUARIO_2]);
    vi.spyOn(nivelAcessoService, 'listarNiveisDeAcesso').mockResolvedValue(NIVEIS);

    renderPagina();

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Alves')).toBeInTheDocument();
    expect(screen.getByText('2 usuários cadastrados')).toBeInTheDocument();
  });

  it('altera o nível de acesso de um usuário e salva', async () => {
    vi.spyOn(usuarioService, 'listarTodosOsUsuarios').mockResolvedValue([USUARIO_1]);
    vi.spyOn(nivelAcessoService, 'listarNiveisDeAcesso').mockResolvedValue(NIVEIS);
    vi.spyOn(usuarioService, 'alterarNivelDeAcesso').mockResolvedValue({} as UsuarioPerfil);

    renderPagina();

    await screen.findByText('Ana Silva');

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'nivel-3');

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(usuarioService.alterarNivelDeAcesso).toHaveBeenCalledWith('user-1', 'nivel-3'),
    );
  });
});
