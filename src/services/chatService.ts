// Chat de projeto em tempo real (WebSocket/STOMP), espelhando o
// ChatProjetoController do backend: histórico via REST e mensagens novas
// via /topic/projetos/{id} (SimpleBroker), publicadas em /app/projetos/{id}/mensagens.
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { apiFetch } from './apiClient';
import { obterToken } from '../utils/auth';
import type { UsuarioResumo } from './authService';

// VITE_API_URL já inclui o context-path "/api" do backend (ex.:
// http://localhost:8080/api) — o endpoint STOMP fica sob esse mesmo
// context-path (/api/ws), registrado por WebSocketConfig no backend.
const BASE_URL = import.meta.env.VITE_API_URL as string;

export type MensagemProjeto = {
  id: string;
  projetoId: string;
  autor: UsuarioResumo | null;
  conteudo: string;
  criadoEm: string;
};

export function listarHistoricoDoChat(projetoId: string): Promise<MensagemProjeto[]> {
  return apiFetch<MensagemProjeto[]>(`/projetos/${projetoId}/mensagens`);
}

type ClienteChatProjeto = {
  ativar: () => void;
  desativar: () => void;
  enviar: (conteudo: string) => void;
};

// Encapsula o ciclo de vida do Client STOMP: um cliente por projeto, inscrito
// em /topic/projetos/{id}, autenticado no CONNECT via header Authorization
// (validado pelo StompAuthChannelInterceptor no backend).
export function criarClienteChat(
  projetoId: string,
  onMensagem: (mensagem: MensagemProjeto) => void,
): ClienteChatProjeto {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
    connectHeaders: {
      Authorization: `Bearer ${obterToken() ?? ''}`,
    },
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(`/topic/projetos/${projetoId}`, (frame: IMessage) => {
        onMensagem(JSON.parse(frame.body) as MensagemProjeto);
      });
    },
  });

  return {
    ativar: () => client.activate(),
    desativar: () => {
      void client.deactivate();
    },
    enviar: (conteudo: string) => {
      client.publish({
        destination: `/app/projetos/${projetoId}/mensagens`,
        body: JSON.stringify({ conteudo }),
      });
    },
  };
}
