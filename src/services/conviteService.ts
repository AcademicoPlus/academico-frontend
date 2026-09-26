// Chamadas para o ConviteProjetoController do backend (rotas /convites/*).
// Caminho inverso da candidatura: o criador convida, o convidado aceita
// ou recusa. O convite não reserva vaga — o backend revalida no aceite.
import { apiFetch, construirQuery, type PaginaResposta } from './apiClient';
import type { UsuarioResumo } from './authService';
import type { ProjetoRef } from './projetoService';

// Espelha o enum StatusConvite do backend (domain/enums/StatusConvite.java).
export type StatusConvite = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'CANCELADO';

// Espelha ConviteResponse (dto/convite).
export type Convite = {
  id: string;
  projeto: ProjetoRef;
  convidado: UsuarioResumo | null;
  convidante: UsuarioResumo | null;
  funcao: string | null;
  mensagem: string | null;
  status: StatusConvite;
  criadoEm: string;
  respondidoEm: string | null;
};

export type FiltroConvites = {
  status?: StatusConvite;
  pagina?: number;
  tamanho?: number;
};

// ============================================
// VISÃO DO CRIADOR DO PROJETO
// ============================================

// Espelha CriarConviteRequest (dto/convite).
export function convidarParaProjeto(
  projetoId: string,
  usuarioId: string,
  opcoes: { funcao?: string; mensagem?: string } = {},
): Promise<Convite> {
  return apiFetch<Convite>('/convites', {
    method: 'POST',
    body: { projetoId, usuarioId, funcao: opcoes.funcao, mensagem: opcoes.mensagem },
  });
}

export function listarConvitesDoProjeto(
  projetoId: string,
  filtro: FiltroConvites = {},
): Promise<PaginaResposta<Convite>> {
  const query = construirQuery({ status: filtro.status, page: filtro.pagina, size: filtro.tamanho });
  return apiFetch<PaginaResposta<Convite>>(`/convites/projeto/${projetoId}${query}`);
}

// Só funciona enquanto PENDENTE (backend valida). O convite fica como histórico.
export function cancelarConvite(id: string): Promise<Convite> {
  return apiFetch<Convite>(`/convites/${id}/cancelar`, { method: 'PATCH' });
}

// ============================================
// VISÃO DO CONVIDADO
// ============================================

export function listarConvitesRecebidos(filtro: FiltroConvites = {}): Promise<PaginaResposta<Convite>> {
  const query = construirQuery({ status: filtro.status, page: filtro.pagina, size: filtro.tamanho });
  return apiFetch<PaginaResposta<Convite>>(`/convites/recebidos${query}`);
}

export function contarConvitesPendentes(): Promise<{ pendentes: number }> {
  return apiFetch<{ pendentes: number }>('/convites/recebidos/contagem');
}

export function aceitarConvite(id: string): Promise<Convite> {
  return apiFetch<Convite>(`/convites/${id}/aceitar`, { method: 'PATCH' });
}

export function recusarConvite(id: string): Promise<Convite> {
  return apiFetch<Convite>(`/convites/${id}/recusar`, { method: 'PATCH' });
}

// Disparado depois de aceitar/recusar/enviar um convite, para o badge do
// header e a página aberta se atualizarem sem prop drilling.
export const EVENTO_CONVITES_ATUALIZADOS = 'convites-atualizados';

export function notificarConvitesAtualizados() {
  window.dispatchEvent(new Event(EVENTO_CONVITES_ATUALIZADOS));
}
