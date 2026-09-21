import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AdminDenuncias from './admin-denuncias';
import * as denunciaService from '../services/denunciaService';
import type { Denuncia } from '../services/denunciaService';
import type { UsuarioResumo } from '../services/authService';

vi.mock('../services/denunciaService');

const DENUNCIANTE: UsuarioResumo = {
  id: 'user-1', nome: 'Ana Silva', curso: 'Ciência da Computação', fotoUrl: null,
  permission: 'ALUNO', periodo: 3, notaMedia: null, totalAvaliacoes: null,
};

const AVALIADOR: UsuarioResumo = {
  id: 'user-2', nome: 'Bruno Alves', curso: 'Engenharia', fotoUrl: null,
  permission: 'ALUNO', periodo: 5, notaMedia: 3.5, totalAvaliacoes: 4,
};

const DENUNCIA: Denuncia = {
  id: 'den-1',
  avaliacaoId: 'aval-1',
  avaliador: AVALIADOR,
  notaAvaliacao: 1,
  comentarioAvaliacao: 'Comentário ofensivo',
  denunciante: DENUNCIANTE,
  motivo: 'Linguagem abusiva',
  status: 'PENDENTE',
  criadoEm: '2026-01-01T00:00:00Z',
  analisadoEm: null,
};

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminDenuncias />
    </MemoryRouter>,
  );
}

describe('AdminDenuncias', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carrega e lista as denúncias pendentes', async () => {
    vi.spyOn(denunciaService, 'listarDenunciasPendentes').mockResolvedValue({
      content: [DENUNCIA], totalElements: 1, totalPages: 1, number: 0, size: 10, last: true,
    });

    renderPagina();

    expect(await screen.findByText(/Ana Silva denunciou uma avaliação de Bruno Alves/i)).toBeInTheDocument();
    expect(screen.getByText('Linguagem abusiva')).toBeInTheDocument();
  });

  it('resolve uma denúncia como improcedente', async () => {
    vi.spyOn(denunciaService, 'listarDenunciasPendentes').mockResolvedValue({
      content: [DENUNCIA], totalElements: 1, totalPages: 1, number: 0, size: 10, last: true,
    });
    vi.spyOn(denunciaService, 'resolverDenuncia').mockResolvedValue({ ...DENUNCIA, status: 'IMPROCEDENTE' });

    renderPagina();

    await screen.findByText(/Ana Silva denunciou/i);
    await userEvent.click(screen.getByRole('button', { name: /marcar improcedente/i }));

    await waitFor(() =>
      expect(denunciaService.resolverDenuncia).toHaveBeenCalledWith('den-1', false),
    );
    expect(await screen.findByText(/nenhuma denúncia pendente/i)).toBeInTheDocument();
  });

  it('resolve uma denúncia como procedente após confirmação', async () => {
    vi.spyOn(denunciaService, 'listarDenunciasPendentes').mockResolvedValue({
      content: [DENUNCIA], totalElements: 1, totalPages: 1, number: 0, size: 10, last: true,
    });
    vi.spyOn(denunciaService, 'resolverDenuncia').mockResolvedValue({ ...DENUNCIA, status: 'PROCEDENTE' });

    renderPagina();

    await screen.findByText(/Ana Silva denunciou/i);
    await userEvent.click(screen.getByRole('button', { name: /marcar procedente/i }));

    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() =>
      expect(denunciaService.resolverDenuncia).toHaveBeenCalledWith('den-1', true),
    );
  });
});
