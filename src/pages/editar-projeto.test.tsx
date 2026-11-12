import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import EditarProjetoRota from './editar-projeto';
import * as projetoService from '../services/projetoService';
import * as habilidadeService from '../services/habilidadeService';
import * as projetoHabilidadeService from '../services/projetoHabilidadeService';
import * as useMeuPerfilHook from '../hooks/useMeuPerfil';
import type { ProjetoDetalhe } from '../services/projetoService';
import type { UsuarioResumo } from '../services/authService';
import { ApiError } from '../services/apiClient';

vi.mock('../services/projetoService');
vi.mock('../services/habilidadeService');
vi.mock('../services/projetoHabilidadeService');
vi.mock('../hooks/useMeuPerfil');

const CRIADOR: UsuarioResumo = {
  id: 'user-1', nome: 'Ana Criadora', curso: 'Ciência da Computação', fotoUrl: null,
  permission: 'ALUNO', periodo: 5, notaMedia: null, totalAvaliacoes: null,
};

function projetoBase(overrides: Partial<ProjetoDetalhe> = {}): ProjetoDetalhe {
  return {
    id: 'proj-1',
    criador: CRIADOR,
    titulo: 'Projeto Original',
    descricao: 'Descrição original do projeto de teste com bastante texto.',
    bannerUrl: null,
    status: 'ABERTO',
    vagas: 3,
    vagasPreenchidas: 1,
    vagasDisponiveis: 2,
    aceitandoCandidaturas: true,
    dataFim: null,
    ativo: true,
    criadoEm: '2026-01-01T00:00:00Z',
    atualizadoEm: '2026-01-01T00:00:00Z',
    habilidadesNecessarias: [],
    totalMembros: 0,
    totalCandidaturasPendentes: 0,
    ...overrides,
  };
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/editar/proj-1']}>
      <Routes>
        <Route path="/editar/:id" element={<EditarProjetoRota />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EditarProjeto', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(habilidadeService, 'listarHabilidades').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 100, last: true,
    });
  });

  it('carrega os dados existentes do projeto no formulário', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());

    renderPagina();

    expect(await screen.findByDisplayValue('Projeto Original')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Descrição original do projeto de teste com bastante texto.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('salva as alterações do formulário chamando atualizarProjeto', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(projetoService, 'atualizarProjeto').mockResolvedValue(
      projetoBase({ titulo: 'Projeto Atualizado' }),
    );

    renderPagina();

    const campoTitulo = await screen.findByDisplayValue('Projeto Original');
    await userEvent.clear(campoTitulo);
    await userEvent.type(campoTitulo, 'Projeto Atualizado');

    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(projetoService.atualizarProjeto).toHaveBeenCalledWith('proj-1', {
        titulo: 'Projeto Atualizado',
        descricao: 'Descrição original do projeto de teste com bastante texto.',
        vagas: 3,
        dataFim: undefined,
      }),
    );

    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
  });

  it('busca habilidades no backend (debounced) e adiciona ao projeto', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(habilidadeService, 'listarHabilidades').mockResolvedValue({
      content: [{ id: 'hab-react', nome: 'React', categoria: 'Frontend', descricao: null, usuariosCount: 1, projetosCount: 1, criadoEm: '2026-01-01T00:00:00Z' }],
      totalElements: 1, totalPages: 1, number: 0, size: 8, last: true,
    });

    vi.spyOn(projetoHabilidadeService, 'vincularHabilidadeAoProjeto').mockResolvedValue({
      id: 'vinculo-1',
      habilidade: { id: 'hab-react', nome: 'React', categoria: 'Frontend' },
      obrigatoria: false,
    });

    renderPagina();
    await screen.findByDisplayValue('Projeto Original');

    expect(habilidadeService.listarHabilidades).not.toHaveBeenCalled();

    await userEvent.type(screen.getByPlaceholderText(/buscar habilidade por nome ou categoria/i), 'rea');

    await waitFor(() =>
      expect(habilidadeService.listarHabilidades).toHaveBeenCalledWith({ busca: 'rea', tamanho: 8 }),
      { timeout: 1000 },
    );

    await userEvent.click(await screen.findByRole('button', { name: /react/i }));

    await waitFor(() => expect(projetoHabilidadeService.vincularHabilidadeAoProjeto).toHaveBeenCalledWith('proj-1', 'hab-react', false));
  });

  it('pede confirmação antes de concluir e só então altera o status', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase({ status: 'EM_ANDAMENTO' }));
    vi.spyOn(projetoService, 'alterarStatusProjeto').mockResolvedValue(projetoBase({ status: 'CONCLUIDO' }));

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /concluído/i }));
    // Um clique só abre a confirmação: concluir é irreversível e avisa a equipe.
    expect(projetoService.alterarStatusProjeto).not.toHaveBeenCalled();
    expect(screen.getByText(/recebem um aviso para avaliar a equipe/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirmar conclusão/i }));

    await waitFor(() => expect(projetoService.alterarStatusProjeto).toHaveBeenCalledWith('proj-1', 'CONCLUIDO', undefined));
  });

  it('exclui o projeto após confirmação e volta para a lista de projetos', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(projetoService, 'inativarProjeto').mockResolvedValue({ sucesso: true, mensagem: 'ok' });

    render(
      <MemoryRouter initialEntries={['/editar/proj-1']}>
        <Routes>
          <Route path="/editar/:id" element={<EditarProjetoRota />} />
          <Route path="/projetos" element={<p>Lista de projetos</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /^excluir projeto$/i }));
    expect(projetoService.inativarProjeto).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /sim, excluir projeto/i }));

    await waitFor(() => expect(projetoService.inativarProjeto).toHaveBeenCalledWith('proj-1'));
    expect(await screen.findByText('Lista de projetos')).toBeInTheDocument();
  });

  it('mostra o erro do backend e permanece na página quando a exclusão falha', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(projetoService, 'inativarProjeto').mockRejectedValue(
      new ApiError(400, 'Você não tem permissão para alterar este projeto.'),
    );

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /^excluir projeto$/i }));
    await userEvent.click(screen.getByRole('button', { name: /sim, excluir projeto/i }));

    expect(await screen.findByText('Você não tem permissão para alterar este projeto.')).toBeInTheDocument();
  });
});
