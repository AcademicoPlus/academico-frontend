import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Mensagens from './mensagens';
import * as chatService from '../services/chatService';
import * as useMeuPerfilHook from '../hooks/useMeuPerfil';
import type { Conversa, MensagemProjeto } from '../services/chatService';
import type { UsuarioResumo } from '../services/authService';

vi.mock('../services/chatService', async (importOriginal) => {
  const original = await importOriginal<typeof chatService>();
  return {
    ...original,
    listarConversas: vi.fn(),
    listarHistoricoDoChat: vi.fn(),
    marcarConversaComoLida: vi.fn(),
    criarClienteMensagens: vi.fn(),
  };
});
vi.mock('../hooks/useMeuPerfil');

const EU: UsuarioResumo = {
  id: 'eu', nome: 'Ana Silva', curso: null, fotoUrl: null,
  permission: 'ALUNO', periodo: null, notaMedia: null, totalAvaliacoes: null,
};
const LUCAS: UsuarioResumo = { ...EU, id: 'lucas', nome: 'Lucas Mendes' };

function mensagem(id: string, projetoId: string, autor: UsuarioResumo, conteudo: string): MensagemProjeto {
  return { id, projetoId, autor, conteudo, criadoEm: new Date().toISOString() };
}

function conversa(id: string, titulo: string, extra: Partial<Conversa> = {}): Conversa {
  return { projeto: { id, titulo, status: 'ABERTO' }, bannerUrl: null, ultimaMensagem: null, naoLidas: 0, ...extra };
}

let onMensagem: (m: MensagemProjeto) => void = () => {};
const enviar = vi.fn();

function renderPagina(rota = '/mensagens') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/mensagens" element={<Mensagens />} />
        <Route path="/mensagens/:projetoId" element={<Mensagens />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Mensagens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useMeuPerfilHook, 'useMeuPerfil').mockReturnValue({ data: { id: 'eu', nome: 'Ana Silva' } } as never);
    vi.mocked(chatService.listarConversas).mockResolvedValue([
      conversa('p1', 'App de Saúde', { ultimaMensagem: mensagem('m1', 'p1', LUCAS, 'Apresentamos sexta?'), naoLidas: 2 }),
      conversa('p2', 'Sistema Web'),
    ]);
    vi.mocked(chatService.listarHistoricoDoChat).mockResolvedValue([mensagem('m1', 'p1', LUCAS, 'Apresentamos sexta?')]);
    vi.mocked(chatService.marcarConversaComoLida).mockResolvedValue(undefined);
    vi.mocked(chatService.criarClienteMensagens).mockImplementation((_ids, callback, onConexao) => {
      onMensagem = callback;
      return { ativar: () => onConexao?.(true), desativar: () => {}, enviar };
    });
  });

  it('lista as conversas com prévia e não lidas', async () => {
    renderPagina();

    const item = (await screen.findByText('App de Saúde')).closest('a') as HTMLElement;
    expect(within(item).getByText('Lucas: Apresentamos sexta?')).toBeInTheDocument();
    expect(within(item).getByLabelText('2 não lidas')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma mensagem ainda')).toBeInTheDocument();
    expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument();
    expect(chatService.criarClienteMensagens).toHaveBeenCalledWith(['p1', 'p2'], expect.any(Function), expect.any(Function));
  });

  it('abre a conversa, marca como lida e envia mensagem', async () => {
    renderPagina('/mensagens/p1');

    expect(await screen.findByText('Lucas Mendes')).toBeInTheDocument();
    await waitFor(() => expect(chatService.marcarConversaComoLida).toHaveBeenCalledWith('p1'));
    expect(screen.queryByLabelText('2 não lidas')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Mensagem'), 'Eu faço os slides{Enter}');

    expect(enviar).toHaveBeenCalledWith('p1', 'Eu faço os slides');
    expect(screen.getByLabelText('Mensagem')).toHaveValue('');
  });

  it('atualiza em tempo real: anexa na conversa aberta e soma não lidas nas outras', async () => {
    renderPagina('/mensagens/p1');
    await screen.findByText('Lucas Mendes');

    act(() => onMensagem(mensagem('m2', 'p1', LUCAS, 'Combinado!')));
    expect(await screen.findByText('Combinado!')).toBeInTheDocument();

    act(() => onMensagem(mensagem('m3', 'p2', LUCAS, 'Alguém revisa o PR?')));
    const item = screen.getByText('Sistema Web').closest('a') as HTMLElement;
    expect(within(item).getByText('Lucas: Alguém revisa o PR?')).toBeInTheDocument();
    expect(within(item).getByLabelText('1 não lidas')).toBeInTheDocument();
    // Conversa com atividade mais recente sobe para o topo
    const itens = screen.getAllByRole('link').filter((a) => /^\/mensagens\/p\d$/.test(a.getAttribute('href') ?? ''));
    expect(itens.map((a) => a.getAttribute('href'))).toEqual(['/mensagens/p2', '/mensagens/p1']);
  });

  it('mantém o rascunho e avisa quando não há conexão', async () => {
    enviar.mockImplementation(() => { throw new Error('Sem conexão com o chat.'); });
    renderPagina('/mensagens/p1');
    await screen.findByText('Lucas Mendes');

    await userEvent.type(screen.getByLabelText('Mensagem'), 'Oi{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(/sem conexão/i);
    expect(screen.getByLabelText('Mensagem')).toHaveValue('Oi');
  });
});
