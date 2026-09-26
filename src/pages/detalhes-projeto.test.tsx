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
import * as conviteService from '../services/conviteService';
import type { ProjetoDetalhe } from '../services/projetoService';
import type { UsuarioResumo } from '../services/authService';

vi.mock('../services/projetoService');
vi.mock('../services/projetoMembroService');
vi.mock('../services/candidaturaService');
vi.mock('../services/avaliacaoService');
vi.mock('../services/recomendacaoService');
vi.mock('../hooks/useMeuPerfil');
vi.mock('../services/conviteService');

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

const CARLA: UsuarioResumo = {
  id: 'user-3', nome: 'Carla Mendes', curso: 'Design', fotoUrl: null,
  permission: 'ALUNO', periodo: 2, notaMedia: null, totalAvaliacoes: null,
};

function paginaVazia() {
  return { content: [], totalElements: 0, totalPages: 1, number: 0, size: 50, last: true };
}

function convitePendente(overrides: Partial<conviteService.Convite> = {}): conviteService.Convite {
  return {
    id: 'conv-1',
    projeto: { id: 'proj-1', titulo: 'Projeto Teste', status: 'ABERTO' },
    convidado: CARLA,
    convidante: CRIADOR,
    funcao: null,
    mensagem: null,
    status: 'PENDENTE',
    criadoEm: '2026-01-02T00:00:00Z',
    respondidoEm: null,
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
    vi.spyOn(conviteService, 'listarConvitesDoProjeto').mockResolvedValue(paginaVazia());
    vi.spyOn(conviteService, 'listarConvitesRecebidos').mockResolvedValue(paginaVazia());
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
      { usuario: CARLA, compatibilidade: 0.8, habilidadesEmComum: [{ id: 'hab-1', nome: 'React', categoria: 'Tecnologia' }] },
    ]);
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

    // Projeto concluído: equipe congelada — sem convidar nem remover
    expect(screen.queryByRole('button', { name: /convidar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remover bruno alves/i })).not.toBeInTheDocument();

    // Avaliar membro da equipe
    const cardMembro = screen.getByText('Bruno Alves').closest('div.bg-gray-50') as HTMLElement;
    await userEvent.click(within(cardMembro).getByRole('button', { name: /avaliar/i }));

    const cardMembroAtualizado = screen.getByText('Bruno Alves').closest('div.bg-gray-50') as HTMLElement;
    await userEvent.click(within(cardMembroAtualizado).getByRole('button', { name: /enviar avaliação/i }));

    await waitFor(() => expect(avaliacaoService.avaliarParticipante).toHaveBeenCalledWith('proj-1', 'user-2', 5, undefined));
    expect(await screen.findByText(/avaliado/i)).toBeInTheDocument();
  });

  it('permite que o criador convide um candidato recomendado', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(candidaturaService, 'listarCandidaturasDoProjeto').mockResolvedValue(paginaVazia());
    vi.spyOn(recomendacaoService, 'recomendarCandidatos').mockResolvedValue([
      { usuario: CARLA, compatibilidade: 0.8, habilidadesEmComum: [] },
    ]);
    vi.spyOn(conviteService, 'listarConvitesDoProjeto')
      .mockResolvedValueOnce(paginaVazia())
      .mockResolvedValueOnce({ ...paginaVazia(), content: [convitePendente({ funcao: 'Design' })], totalElements: 1 });
    vi.spyOn(conviteService, 'convidarParaProjeto').mockResolvedValue(convitePendente({ funcao: 'Design' }));

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /^✉ convidar$/i }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText('Carla Mendes')).toBeInTheDocument();

    await userEvent.type(within(modal).getByLabelText(/função no projeto/i), 'Design');
    await userEvent.click(within(modal).getByRole('button', { name: /enviar convite/i }));

    await waitFor(() =>
      expect(conviteService.convidarParaProjeto).toHaveBeenCalledWith('proj-1', 'user-3', { funcao: 'Design', mensagem: undefined }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/convite enviado/i)).toBeInTheDocument();
    expect(screen.getByText(/aguardando resposta/i)).toBeInTheDocument();
  });

  it('permite que o convidado aceite o convite recebido', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-3' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase());
    vi.spyOn(candidaturaService, 'listarMinhasCandidaturas').mockResolvedValue(paginaVazia());
    vi.spyOn(conviteService, 'listarConvitesRecebidos')
      .mockResolvedValueOnce({ ...paginaVazia(), content: [convitePendente({ mensagem: 'Vem com a gente!' })], totalElements: 1 })
      .mockResolvedValue(paginaVazia());
    vi.spyOn(projetoMembroService, 'listarMembrosDoProjeto')
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 'membro-3', projeto: null, usuario: CARLA, funcao: null, dataAdesao: '2026-01-03T00:00:00Z' }]);
    vi.spyOn(conviteService, 'aceitarConvite').mockResolvedValue(convitePendente({ status: 'ACEITO' }));

    renderPagina();

    expect(await screen.findByText(/você foi convidado/i)).toBeInTheDocument();
    expect(screen.getByText(/vem com a gente/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^aceitar$/i }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => expect(conviteService.aceitarConvite).toHaveBeenCalledWith('conv-1'));
    await waitFor(() => expect(screen.queryByText(/você foi convidado/i)).not.toBeInTheDocument());
    expect(conviteService.notificarConvitesAtualizados).toHaveBeenCalled();
  });

  it('permite que o criador remova um membro da equipe', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase({ totalMembros: 1 }));
    vi.spyOn(candidaturaService, 'listarCandidaturasDoProjeto').mockResolvedValue(paginaVazia());
    vi.spyOn(projetoMembroService, 'listarMembrosDoProjeto')
      .mockResolvedValueOnce([{ id: 'membro-1', projeto: null, usuario: CANDIDATO, funcao: 'Dev', dataAdesao: '2026-01-01T00:00:00Z' }])
      .mockResolvedValue([]);
    vi.spyOn(projetoMembroService, 'removerMembroDoProjeto').mockResolvedValue({ sucesso: true, mensagem: 'ok' });

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /remover bruno alves do projeto/i }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/remover bruno alves da equipe/i)).toBeInTheDocument();
    await userEvent.click(within(modal).getByRole('button', { name: /^remover$/i }));

    await waitFor(() => expect(projetoMembroService.removerMembroDoProjeto).toHaveBeenCalledWith('proj-1', 'membro-1'));
    expect(await screen.findByText(/nenhum membro no momento/i)).toBeInTheDocument();
  });

  it('permite que o próprio membro saia do projeto', async () => {
    vi.spyOn(useMeuPerfilHook, 'obterMeuPerfilCache').mockResolvedValue({ id: 'user-2' } as never);
    vi.spyOn(projetoService, 'buscarProjetoPorId').mockResolvedValue(projetoBase({ totalMembros: 1 }));
    vi.spyOn(candidaturaService, 'listarMinhasCandidaturas').mockResolvedValue(paginaVazia());
    vi.spyOn(projetoMembroService, 'listarMembrosDoProjeto')
      .mockResolvedValueOnce([{ id: 'membro-1', projeto: null, usuario: CANDIDATO, funcao: 'Dev', dataAdesao: '2026-01-01T00:00:00Z' }])
      .mockResolvedValue([]);
    vi.spyOn(projetoMembroService, 'removerMembroDoProjeto').mockResolvedValue({ sucesso: true, mensagem: 'ok' });

    renderPagina();

    expect(await screen.findByText(/você faz parte da equipe/i)).toBeInTheDocument();
    // O chat mora em Mensagens; aqui fica só o atalho
    expect(screen.getByRole('link', { name: /conversa da equipe/i })).toHaveAttribute('href', '/mensagens/proj-1');
    // Membro comum não vê o botão de expulsar colegas
    expect(screen.queryByRole('button', { name: /remover bruno alves do projeto/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^sair do projeto$/i }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^sair do projeto$/i }));

    await waitFor(() => expect(projetoMembroService.removerMembroDoProjeto).toHaveBeenCalledWith('proj-1', 'membro-1'));
    expect(await screen.findByRole('button', { name: /quero me candidatar/i })).toBeInTheDocument();
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
