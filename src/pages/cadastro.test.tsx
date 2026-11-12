import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Cadastro from './cadastro';
import * as authService from '../services/authService';
import * as cursoService from '../services/cursoService';

vi.mock('../services/authService');
vi.mock('../services/cursoService');

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/cadastro']}>
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/login" element={<div>Tela de Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Cadastro', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cursoService, 'listarCursos').mockResolvedValue([
      { id: 'curso-1', nome: 'Ciência da Computação', criadoEm: '2026-01-01T00:00:00Z' },
    ]);
  });

  it('cadastra com sucesso e navega para a tela de login', async () => {
    vi.spyOn(authService, 'cadastrar').mockResolvedValue({ sucesso: true, mensagem: '' });

    renderPagina();

    await userEvent.type(screen.getByPlaceholderText('Nome completo'), 'Luana Pereira');
    await userEvent.type(screen.getByPlaceholderText('E-mail institucional'), 'luana@academico.edu.br');

    const selectCurso = await screen.findByRole('combobox');
    await userEvent.selectOptions(selectCurso, 'curso-1');

    const [senhaInput, confirmarSenhaInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(senhaInput, 'senha123');
    await userEvent.type(confirmarSenhaInput, 'senha123');

    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(authService.cadastrar).toHaveBeenCalledWith({
        nome: 'Luana Pereira',
        email: 'luana@academico.edu.br',
        idCurso: 'curso-1',
        periodo: undefined,
        senha: 'senha123',
        aceitouTermos: true,
      }),
    );
    expect(await screen.findByText('Tela de Login')).toBeInTheDocument();
  });

  it('mostra erro quando as senhas não coincidem e não chama o serviço de cadastro', async () => {
    vi.spyOn(authService, 'cadastrar').mockResolvedValue({ sucesso: true, mensagem: '' });

    renderPagina();

    await userEvent.type(screen.getByPlaceholderText('Nome completo'), 'Luana Pereira');
    await userEvent.type(screen.getByPlaceholderText('E-mail institucional'), 'luana@academico.edu.br');

    const selectCurso = await screen.findByRole('combobox');
    await userEvent.selectOptions(selectCurso, 'curso-1');

    const [senhaInput, confirmarSenhaInput] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(senhaInput, 'senha123');
    await userEvent.type(confirmarSenhaInput, 'senhaDiferente');

    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(authService.cadastrar).not.toHaveBeenCalled();
  });
});
