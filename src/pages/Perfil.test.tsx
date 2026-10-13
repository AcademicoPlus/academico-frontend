import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../services/apiClient';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Perfil from './Perfil';
import * as usuarioService from '../services/usuarioService';
import * as useMeuPerfilHook from '../hooks/useMeuPerfil';
import * as projetoService from '../services/projetoService';
import * as avaliacaoService from '../services/avaliacaoService';
import * as denunciaService from '../services/denunciaService';
import type { UsuarioPerfil } from '../services/usuarioService';
import type { UsuarioResumo } from '../services/authService';

vi.mock('../services/usuarioService');
vi.mock('../hooks/useMeuPerfil');
vi.mock('../services/projetoService');
vi.mock('../services/avaliacaoService');
vi.mock('../services/denunciaService', async (importOriginal) => {
  // CATEGORIAS_DENUNCIA é dado, não comportamento: o modal monta o select a
  // partir dela, então precisa vir do módulo real.
  const real = await importOriginal<typeof denunciaService>();
  return { ...real, denunciarAvaliacao: vi.fn(), denunciarPerfil: vi.fn() };
});

const AVALIADOR: UsuarioResumo = {
  id: 'user-9', nome: 'Carla Souza', curso: 'Design', fotoUrl: null,
  permission: 'ALUNO', periodo: 2, notaMedia: null, totalAvaliacoes: null,
};

function usuarioBase(overrides: Partial<UsuarioPerfil> = {}): UsuarioPerfil {
  return {
    id: 'user-1',
    email: 'ana@academico.edu.br',
    nome: 'Ana Silva',
    nivelAcesso: null,
    curso: null,
    periodo: 3,
    bio: 'Bio de teste.',
    fotoUrl: null,
    linkedinUrl: null,
    githubUrl: null,
    habilidades: [
      { id: 'hab-1', habilidade: { id: 'h1', nome: 'React' }, nivel: 'AVANCADO' } as never,
    ],
    notaMedia: 4.5,
    totalAvaliacoes: 2,
    termosAceitosEm: null,
    ativo: true,
    criadoEm: '2026-01-01T00:00:00Z',
    atualizadoEm: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/usuarios/user-1']}>
      <Routes>
        <Route path="/usuarios/:id" element={<Perfil />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Perfil', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carrega o perfil de outro usuário e mostra nome, habilidades e avaliações recebidas', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-2' } as never);
    vi.spyOn(usuarioService, 'buscarUsuarioPorId').mockResolvedValue(usuarioBase());
    vi.spyOn(projetoService, 'listarProjetos').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(avaliacaoService, 'listarAvaliacoesRecebidas').mockResolvedValue({
      content: [
        {
          id: 'aval-1',
          projeto: { id: 'proj-1', titulo: 'Projeto Teste', status: 'CONCLUIDO' },
          avaliador: AVALIADOR,
          nota: 5,
          comentario: 'Ótimo colega de equipe.',
          criadoEm: '2026-01-02T00:00:00Z',
        },
      ],
      totalElements: 1, totalPages: 1, number: 0, size: 50, last: true,
    });

    renderPagina();

    expect(await screen.findByRole('heading', { name: 'Ana Silva' })).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Carla Souza')).toBeInTheDocument();
    expect(screen.getByText('Ótimo colega de equipe.')).toBeInTheDocument();

    // Não é o dono: pode denunciar o perfil alheio, mas não as avaliações
    // recebidas por ele — essas só o próprio avaliado pode denunciar.
    expect(screen.getByRole('button', { name: /denunciar perfil/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /denunciar avaliação/i })).not.toBeInTheDocument();
  });

  it('permite que o dono do perfil denuncie uma avaliação recebida', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue(usuarioBase() as never);
    vi.spyOn(usuarioService, 'buscarUsuarioPorId').mockResolvedValue(usuarioBase());
    vi.spyOn(projetoService, 'listarMeusProjetos').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(projetoService, 'listarProjetosParticipando').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(avaliacaoService, 'listarAvaliacoesRecebidas').mockResolvedValue({
      content: [
        {
          id: 'aval-1',
          projeto: { id: 'proj-1', titulo: 'Projeto Teste', status: 'CONCLUIDO' },
          avaliador: AVALIADOR,
          nota: 5,
          comentario: 'Ótimo colega de equipe.',
          criadoEm: '2026-01-02T00:00:00Z',
        },
      ],
      totalElements: 1, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(denunciaService, 'denunciarAvaliacao').mockResolvedValue({
      id: 'den-1',
      tipoAlvo: 'AVALIACAO',
      alvo: {
        id: 'aval-1',
        titulo: 'Avaliação de Carla Souza',
        conteudo: 'Ótimo colega de equipe.',
        nota: 5,
        autor: AVALIADOR,
      },
      responsavel: AVALIADOR,
      denunciante: AVALIADOR,
      categoria: 'CONTEUDO_OFENSIVO',
      motivo: 'Comentário ofensivo e fora de contexto',
      status: 'PENDENTE',
      medida: null,
      historicoResponsavel: null,
      criadoEm: '2026-01-03T00:00:00Z',
      analisadoEm: null,
    });

    renderPagina();

    const botaoDenunciar = await screen.findByRole('button', { name: /denunciar avaliação/i });
    await userEvent.click(botaoDenunciar);

    await screen.findByRole('dialog');
    await userEvent.type(screen.getByRole('textbox'), 'Comentário ofensivo e fora de contexto');
    await userEvent.click(screen.getByRole('button', { name: /enviar denúncia/i }));

    await waitFor(() =>
      expect(denunciaService.denunciarAvaliacao).toHaveBeenCalledWith('aval-1', {
        categoria: 'CONTEUDO_OFENSIVO',
        motivo: 'Comentário ofensivo e fora de contexto',
      }),
    );
    expect(await screen.findByText(/em análise/i)).toBeInTheDocument();
  });

  it('permite denunciar o perfil de outra pessoa', async () => {
    const outro = { ...usuarioBase(), id: 'outro-usuario' };
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue(
      { ...usuarioBase(), id: 'eu-mesmo' } as never,
    );
    vi.spyOn(usuarioService, 'buscarUsuarioPorId').mockResolvedValue(outro);
    vi.spyOn(projetoService, 'listarProjetos').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(avaliacaoService, 'listarAvaliacoesRecebidas').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /denunciar perfil/i }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByRole('textbox'), 'Perfil usado para aplicar golpe');
    await userEvent.click(screen.getByRole('button', { name: /enviar denúncia/i }));

    await waitFor(() =>
      expect(denunciaService.denunciarPerfil).toHaveBeenCalledWith('user-1', {
        categoria: 'CONTEUDO_OFENSIVO',
        motivo: 'Perfil usado para aplicar golpe',
      }),
    );
  });

  it('mostra o erro do backend ao denunciar o mesmo perfil de novo', async () => {
    const outro = { ...usuarioBase(), id: 'outro-usuario' };
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue(
      { ...usuarioBase(), id: 'eu-mesmo' } as never,
    );
    vi.spyOn(usuarioService, 'buscarUsuarioPorId').mockResolvedValue(outro);
    vi.spyOn(projetoService, 'listarProjetos').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(avaliacaoService, 'listarAvaliacoesRecebidas').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    // É o 409 que o backend devolve na segunda denúncia ao mesmo alvo.
    vi.mocked(denunciaService.denunciarPerfil).mockRejectedValue(
      new ApiError(400, 'Você já denunciou este perfil.'),
    );

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /denunciar perfil/i }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByRole('textbox'), 'Perfil usado para aplicar golpe');
    await userEvent.click(screen.getByRole('button', { name: /enviar denúncia/i }));

    // A mensagem precisa aparecer DENTRO do modal, que continua aberto —
    // era exatamente isso que faltava: o erro era guardado e nunca exibido.
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Você já denunciou este perfil.');
    expect(screen.getByRole('dialog')).toContainElement(alerta);
  });
});
