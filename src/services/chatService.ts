// Chat dos projetos em tempo real (WebSocket/STOMP), espelhando o
// ChatProjetoController/ConversaController do backend: histórico e caixa de
// conversas via REST, mensagens novas via /topic/projetos/{id} (SimpleBroker),
// publicadas em /app/projetos/{id}/mensagens.
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { apiFetch } from './apiClient';
import { obterToken } from '../utils/auth';
import type { UsuarioResumo } from './authService';
import type { ProjetoRef } from './projetoService';

// VITE_API_URL já inclui o context-path "/api" do backend (ex.:
// http://localhost:8080/api) — o endpoint STOMP fica sob esse mesmo
// context-path (/api/ws), registrado por WebSocketConfig no backend.
const BASE_URL = import.meta.env.VITE_API_URL as string;
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export type MensagemProjeto = {
  id: string;
  projetoId: string;
  autor: UsuarioResumo | null;
  conteudo: string;
  criadoEm: string;
};

// Espelha ConversaResponse (dto/mensagem).
export type Conversa = {
  projeto: ProjetoRef;
  bannerUrl: string | null;
  ultimaMensagem: MensagemProjeto | null;
  naoLidas: number;
};

export function listarHistoricoDoChat(projetoId: string): Promise<MensagemProjeto[]> {
  return apiFetch<MensagemProjeto[]>(`/projetos/${projetoId}/mensagens`);
}

export function listarConversas(): Promise<Conversa[]> {
  return apiFetch<Conversa[]>('/conversas');
}

export function contarMensagensNaoLidas(): Promise<{ total: number }> {
  return apiFetch<{ total: number }>('/conversas/nao-lidas');
}

export function marcarConversaComoLida(projetoId: string): Promise<void> {
  return apiFetch<void>(`/conversas/${projetoId}/lida`, { method: 'PUT' });
}

// Disparado ao ler uma conversa ou receber mensagem nova, para o badge do
// menu lateral se atualizar sem esperar o próximo polling.
export const EVENTO_MENSAGENS_ATUALIZADAS = 'mensagens-atualizadas';

export function notificarMensagensAtualizadas() {
  window.dispatchEvent(new Event(EVENTO_MENSAGENS_ATUALIZADAS));
}

export type ClienteMensagens = {
  ativar: () => void;
  desativar: () => void;
  // Lança erro se ainda não houver conexão — quem chama mantém o rascunho.
  enviar: (projetoId: string, conteudo: string) => void;
};

// Uma única conexão STOMP para todas as conversas do usuário: inscreve em
// /topic/projetos/{id} de cada projeto (o backend recusa o SUBSCRIBE de quem
// não é criador nem membro — ver StompAuthChannelInterceptor).
export function criarClienteMensagens(
  projetoIds: string[],
  onMensagem: (mensagem: MensagemProjeto) => void,
  onConexao?: (conectado: boolean) => void,
): ClienteMensagens {
  if (USE_MOCKS) {
    return criarClienteMock(onMensagem, onConexao);
  }

  let inscricoes: StompSubscription[] = [];
  const client = new Client({
    webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
    connectHeaders: {
      Authorization: `Bearer ${obterToken() ?? ''}`,
    },
    reconnectDelay: 5000,
    onConnect: () => {
      inscricoes = projetoIds.map((id) =>
        client.subscribe(`/topic/projetos/${id}`, (frame: IMessage) => {
          onMensagem(JSON.parse(frame.body) as MensagemProjeto);
        }),
      );
      onConexao?.(true);
    },
    onWebSocketClose: () => onConexao?.(false),
  });

  return {
    ativar: () => client.activate(),
    desativar: () => {
      inscricoes.forEach((s) => s.unsubscribe());
      inscricoes = [];
      void client.deactivate();
    },
    enviar: (projetoId: string, conteudo: string) => {
      if (!client.connected) {
        throw new Error('Sem conexão com o chat.');
      }
      client.publish({
        destination: `/app/projetos/${projetoId}/mensagens`,
        body: JSON.stringify({ conteudo }),
      });
    },
  };
}

// VITE_USE_MOCKS: sem backend não há WebSocket — ecoa a mensagem localmente
// como se o broker tivesse retransmitido.
function criarClienteMock(
  onMensagem: (mensagem: MensagemProjeto) => void,
  onConexao?: (conectado: boolean) => void,
): ClienteMensagens {
  return {
    ativar: () => onConexao?.(true),
    desativar: () => {},
    enviar: (projetoId, conteudo) => {
      void apiFetch<MensagemProjeto>(`/projetos/${projetoId}/mensagens`, {
        method: 'POST',
        body: { conteudo },
      }).then(onMensagem);
    },
  };
}
