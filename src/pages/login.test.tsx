import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './login';
import * as authService from '../services/authService';
import { obterToken } from '../utils/auth';

vi.mock('../services/authService');

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('salva o token e não mostra erro quando o login é bem-sucedido', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({
      sucesso: true,
      token: 'jwt-valido',
      mensagem: '',
      usuario: {
        id: '1',
        nome: 'Ana Silva',
        curso: null,
        fotoUrl: null,
        permission: null,
        periodo: null,
        notaMedia: null,
        totalAvaliacoes: null,
      },
      avisosCancelamento: [],
      avisosModeracao: [],
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByPlaceholderText('E-mail'), 'ana@academico.edu.br');
    await userEvent.type(screen.getByPlaceholderText('········'), 'senha123');
    await userEvent.click(screen.getByRole('button', { name: /entrar na plataforma/i }));

    await waitFor(() => expect(obterToken()).toBe('jwt-valido'));
    expect(screen.queryByText(/inválid/i)).not.toBeInTheDocument();
  });

  it('mostra a mensagem de erro quando o backend responde 200 com sucesso:false', async () => {
    // Contrato específico do backend: credenciais inválidas voltam como 200 OK
    // com sucesso:false, não como uma exceção — ver comentário em login.tsx.
    vi.spyOn(authService, 'login').mockResolvedValue({
      sucesso: false,
      token: '',
      mensagem: 'Email ou senha inválidos',
      usuario: {
        id: '',
        nome: '',
        curso: null,
        fotoUrl: null,
        permission: null,
        periodo: null,
        notaMedia: null,
        totalAvaliacoes: null,
      },
      avisosCancelamento: [],
      avisosModeracao: [],
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByPlaceholderText('E-mail'), 'ana@academico.edu.br');
    await userEvent.type(screen.getByPlaceholderText('········'), 'senhaerrada');
    await userEvent.click(screen.getByRole('button', { name: /entrar na plataforma/i }));

    expect(await screen.findByText('Email ou senha inválidos')).toBeInTheDocument();
    expect(obterToken()).toBeNull();
  });
});
