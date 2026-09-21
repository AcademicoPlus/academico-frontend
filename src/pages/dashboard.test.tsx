import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Dashboard from './dashboard';
import * as recomendacaoService from '../services/recomendacaoService';
import * as projetoService from '../services/projetoService';
import * as candidaturaService from '../services/candidaturaService';
import * as useMeuPerfilHook from '../hooks/useMeuPerfil';
import * as toastContext from '../hooks/useToast';
import type { UsuarioPerfil } from '../services/usuarioService';
import type { PaginaResposta } from '../services/apiClient';
import type { Projeto } from '../services/projetoService';

vi.mock('../services/recomendacaoService');
vi.mock('../services/projetoService');
vi.mock('../services/candidaturaService');
vi.mock('../hooks/useMeuPerfil');
vi.mock('../hooks/useToast');

const PERFIL = { id: 'user-1', nome: 'Ana Silva' } as UsuarioPerfil;

function paginaVazia(tamanho = 1): PaginaResposta<never> {
  return { content: [], totalElements: 0, totalPages: 1, number: 0, size: tamanho, last: true };
}

function paginaProjetos(content: Projeto[]): PaginaResposta<Projeto> {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 3, last: true };
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  const mostrarToast = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mostrarToast.mockClear();
    vi.spyOn(useMeuPerfilHook, 'useMeuPerfil').mockReturnValue({ data: PERFIL } as never);
    vi.spyOn(toastContext, 'useToast').mockReturnValue({ mostrarToast });
  });

  it('carrega e mostra os projetos próprios e as recomendações', async () => {
    vi.spyOn(projetoService, 'listarMeusProjetos').mockImplementation((filtro) => {
      if (filtro?.status === 'ABERTO') {
        return Promise.resolve(paginaVazia());
      }
      return Promise.resolve(
        paginaProjetos([
          {
            id: 'proj-1',
            criador: null,
            titulo: 'Projeto Alfa',
            descricao: 'Descrição alfa',
            bannerUrl: null,
            status: 'ABERTO',
            habilidadesNecessarias: [],
            vagas: 4,
            vagasPreenchidas: 1,
            dataFim: null,
          },
        ]),
      );
    });
    vi.spyOn(recomendacaoService, 'recomendarProjetos').mockResolvedValue([
      {
        projeto: {
          id: 'proj-2',
          criador: {
            id: 'user-2', nome: 'Bruno Alves', curso: null, fotoUrl: null,
            permission: 'ALUNO', periodo: null, notaMedia: null, totalAvaliacoes: null,
          },
          titulo: 'Projeto Beta',
          descricao: 'Descrição beta',
          bannerUrl: null,
          status: 'ABERTO',
          habilidadesNecessarias: [],
          vagas: 2,
          vagasPreenchidas: 0,
          dataFim: null,
        },
        compatibilidade: 0.5,
        habilidadesEmComum: [],
      },
    ]);
    vi.spyOn(candidaturaService, 'listarMinhasCandidaturas').mockResolvedValue(paginaVazia());

    renderPagina();

    expect(screen.getByText('Meus Projetos')).toBeInTheDocument();
    expect(screen.getByText('Recomendado para você')).toBeInTheDocument();

    expect(await screen.findByText('Projeto Alfa')).toBeInTheDocument();
    expect(await screen.findByText('Projeto Beta')).toBeInTheDocument();
    expect(screen.getByText('Bruno Alves')).toBeInTheDocument();
  });

  it('mostra um toast de erro quando não consegue carregar os projetos próprios', async () => {
    vi.spyOn(projetoService, 'listarMeusProjetos').mockRejectedValue(new Error('falhou'));
    vi.spyOn(recomendacaoService, 'recomendarProjetos').mockResolvedValue([]);
    vi.spyOn(candidaturaService, 'listarMinhasCandidaturas').mockResolvedValue(paginaVazia());

    renderPagina();

    await waitFor(() =>
      expect(mostrarToast).toHaveBeenCalledWith('Não foi possível carregar os dados do dashboard.', 'erro'),
    );
  });
});
