import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import DetalhesProjetoRota from './detalhes-projeto';
import * as projetoService from '../services/projetoService';
import * as projetoMembroService from '../services/projetoMembroService';
import * as candidaturaService from '../services/candidaturaService';
import * as avaliacaoService from '../services/avaliacaoService';
import * as recomendacaoService from '../services/recomendacaoService';
import * as useMeuPerfilHook from '../hooks/useMeuPerfil';
import * as chatService from '../services/chatService';
import type { ProjetoDetalhe } from '../services/projetoService';
import type { UsuarioResumo } from '../services/authService';

vi.mock('../services/projetoService');
vi.mock('../services/projetoMembroService');
vi.mock('../services/candidaturaService');
vi.mock('../services/avaliacaoService');
vi.mock('../services/recomendacaoService');
vi.mock('../hooks/useMeuPerfil');
// O chat abre uma conexão WebSocket real (SockJS) fora do escopo destes
// testes de fluxo de candidatura — mockado para não deixar o Client STOMP
// tentando conectar durante o render da página.
vi.mock('../services/chatService');

const CRIADOR: UsuarioResumo = {
  id: 'user-1', nome: 'Ana Criadora', curso: 'Ciência da Computação', fotoUrl: null,
  permission: 'ALUNO', periodo: 5, notaMedia: null, totalAvaliacoes: null,
};

const CANDIDATO: UsuarioResumo = {
  id: 'user-2', nome: 'Bruno Alves', curso: 'Engenharia', fotoUrl: null,
  permission: 'ALUNO', periodo: 3, notaMedia: null, totalAvaliacoes: null,
};

function projetoBase(overrides: Partial<ProjetoDetalhe> = {}): ProjetoDetalhe {
  return {
    id: 'proj-1',
    criador: CRIADOR,
    titulo: 'Projeto Teste',
    descricao: 'Descrição do projeto de teste.',
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
    <MemoryRouter initialEntries={['/detalhes/proj-1']}>
      <Routes>
        <Route path="/detalhes/:id" element={<DetalhesProjetoRota />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DetalhesProjeto', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(projetoMembroService, 'listarMembrosDoProjeto').mockResolvedValue([]);
    vi.spyOn(recomendacaoService, 'recomendarCandidatos').mockResolvedValue([]);
    vi.spyOn(chatService, 'listarHistoricoDoChat').mockResolvedValue([]);
    vi.spyOn(chatService, 'criarClienteChat').mockReturnValue({
      ativar: () => {},
      desativar: () => {},
      enviar: () => {},
    });
  });

  it('permite que um candidato envie uma candidatura', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-2' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(candidaturaService, 'listarMinhasCandidaturas').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 100, last: true,
    });
    vi.spyOn(candidaturaService, 'candidatar').mockResolvedValue({
      id: 'cand-1',
      projeto: { id: 'proj-1', titulo: 'Projeto Teste', status: 'ABERTO' },
      usuario: CANDIDATO,
      status: 'PENDENTE',
      mensagem: 'Quero participar',
      motivoRejeicao: null,
      dataCandidatura: '2026-01-02T00:00:00Z',
      dataResposta: null,
    });

    renderPagina();

    const botaoCandidatar = await screen.findByRole('button', { name: /quero me candidatar/i });
    await userEvent.click(botaoCandidatar);

    const textarea = await screen.findByPlaceholderText(/gostaria de contribuir/i);
    await userEvent.type(textarea, 'Quero participar');
    await userEvent.click(screen.getByRole('button', { name: /confirmar envio/i }));

    await waitFor(() => expect(candidaturaService.candidatar).toHaveBeenCalledWith('proj-1', 'Quero participar'));
    expect(await screen.findByText(/aguardando resposta/i)).toBeInTheDocument();
  });

  it('permite que o criador aceite uma candidatura pendente', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());

    const candidaturaPendente = {
      id: 'cand-1',
      projeto: { id: 'proj-1', titulo: 'Projeto Teste', status: 'ABERTO' as const },
      usuario: CANDIDATO,
      status: 'PENDENTE' as const,
      mensagem: null,
      motivoRejeicao: null,
      dataCandidatura: '2026-01-02T00:00:00Z',
      dataResposta: null,
    };

    const listarCandidaturas = vi
      .spyOn(candidaturaService, 'listarCandidaturasDoProjeto')
      .mockResolvedValueOnce({ content: [candidaturaPendente], totalElements: 1, totalPages: 1, number: 0, size: 50, last: true })
      .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true });

    vi.spyOn(candidaturaService, 'aceitarCandidatura').mockResolvedValue({ ...candidaturaPendente, status: 'ACEITO' });

    renderPagina();

    expect(await screen.findByText('Bruno Alves')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^aceitar$/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => expect(candidaturaService.aceitarCandidatura).toHaveBeenCalledWith('cand-1'));
    await waitFor(() => expect(listarCandidaturas).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/nenhuma candidatura pendente/i)).toBeInTheDocument();
  });

  it('mostra candidatos recomendados e permite avaliar um membro em projeto concluído', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase({ status: 'CONCLUIDO', totalMembros: 1 }));
    vi.spyOn(projetoMembroService, 'listarMembrosDoProjeto').mockResolvedValue([
      { id: 'membro-1', projeto: null, usuario: CANDIDATO, funcao: null, dataAdesao: '2026-01-01T00:00:00Z' },
    ]);
    vi.spyOn(candidaturaService, 'listarCandidaturasDoProjeto').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(recomendacaoService, 'recomendarCandidatos').mockResolvedValue([
      {
        usuario: { id: 'user-3', nome: 'Carla Mendes', curso: 'Design', fotoUrl: null, permission: 'ALUNO', periodo: 2, notaMedia: null, totalAvaliacoes: null },
        compatibilidade: 0.8,
        habilidadesEmComum: [{ id: 'hab-1', nome: 'React', categoria: 'Tecnologia' }],
      },
    ]);
    vi.spyOn(projetoMembroService, 'adicionarMembroAoProjeto').mockResolvedValue({
      id: 'membro-2', projeto: null, usuario: { id: 'user-3', nome: 'Carla Mendes', curso: 'Design', fotoUrl: null, permission: 'ALUNO', periodo: 2, notaMedia: null, totalAvaliacoes: null }, funcao: null, dataAdesao: '2026-01-03T00:00:00Z',
    });
    vi.spyOn(avaliacaoService, 'avaliarParticipante').mockResolvedValue({
      id: 'aval-1',
      projeto: { id: 'proj-1', titulo: 'Projeto Teste', status: 'CONCLUIDO' },
      avaliador: CRIADOR,
      nota: 4,
      comentario: null,
      criadoEm: '2026-01-04T00:00:00Z',
    });

    renderPagina();

    // Candidatos recomendados
    expect(await screen.findByText('Candidatos Recomendados')).toBeInTheDocument();
    expect(screen.getByText('Carla Mendes')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /adicionar à equipe/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => expect(projetoMembroService.adicionarMembroAoProjeto).toHaveBeenCalledWith('proj-1', 'user-3'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Avaliar membro da equipe
    const cardMembro = screen.getByText('Bruno Alves').closest('div.bg-gray-50') as HTMLElement;
    await userEvent.click(within(cardMembro).getByRole('button', { name: /avaliar/i }));

    const cardMembroAtualizado = screen.getByText('Bruno Alves').closest('div.bg-gray-50') as HTMLElement;
    await userEvent.click(within(cardMembroAtualizado).getByRole('button', { name: /enviar avaliação/i }));

    await waitFor(() => expect(avaliacaoService.avaliarParticipante).toHaveBeenCalledWith('proj-1', 'user-2', 5, undefined));
    expect(await screen.findByText(/avaliado/i)).toBeInTheDocument();
  });

  it('permite que o criador rejeite uma candidatura, exigindo um motivo com no mínimo 5 caracteres', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());

    const candidaturaPendente = {
      id: 'cand-1',
      projeto: { id: 'proj-1', titulo: 'Projeto Teste', status: 'ABERTO' as const },
      usuario: CANDIDATO,
      status: 'PENDENTE' as const,
      mensagem: null,
      motivoRejeicao: null,
      dataCandidatura: '2026-01-02T00:00:00Z',
      dataResposta: null,
    };

    vi.spyOn(candidaturaService, 'listarCandidaturasDoProjeto').mockResolvedValue({
      content: [candidaturaPendente], totalElements: 1, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(candidaturaService, 'rejeitarCandidatura').mockResolvedValue({ ...candidaturaPendente, status: 'REJEITADO' });

    renderPagina();

    expect(await screen.findByText('Bruno Alves')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^rejeitar$/i }));

    const botaoConfirmarRejeicao = await screen.findByRole('button', { name: /confirmar rejeição/i });
    expect(botaoConfirmarRejeicao).toBeDisabled();

    const textareaMotivo = screen.getByPlaceholderText(/motivo da rejeição/i);
    await userEvent.type(textareaMotivo, 'Perfil não compatível');

    expect(botaoConfirmarRejeicao).toBeEnabled();
    await userEvent.click(botaoConfirmarRejeicao);

    await waitFor(() =>
      expect(candidaturaService.rejeitarCandidatura).toHaveBeenCalledWith('cand-1', 'Perfil não compatível'),
    );
  });

  it('permite que o criador envie uma nova capa para o projeto', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(candidaturaService, 'listarCandidaturasDoProjeto').mockResolvedValue({
      content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true,
    });
    vi.spyOn(projetoService, 'enviarBannerDoProjeto').mockResolvedValue(
      projetoBase({ bannerUrl: 'https://cdn.exemplo/projetos/nova-capa.png' }),
    );

    renderPagina();

    const inputBanner = await screen.findByLabelText(/alterar capa/i);
    const arquivo = new File(['conteudo'], 'capa.png', { type: 'image/png' });
    await userEvent.upload(inputBanner, arquivo);

    await waitFor(() => expect(projetoService.enviarBannerDoProjeto).toHaveBeenCalledWith('proj-1', arquivo));
    expect(await screen.findByAltText('Capa')).toHaveAttribute('src', 'https://cdn.exemplo/projetos/nova-capa.png');
  });
});
