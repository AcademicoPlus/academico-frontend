// Avisos de projeto para os membros da equipe (AvisoController: /avisos).
// O backend grava um aviso por membro quando o criador conclui ou cancela o
// projeto; a tela busca os pendentes e marca cada um como visto ao fechar.
import { apiFetch } from './apiClient';

export type TipoAvisoProjeto = 'conclusao' | 'cancelamento';

// Espelha AvisoProjetoResponse (dto/projeto).
export type AvisoProjeto = {
  id: string;
  projetoId: string;
  projetoNome: string;
  tipo: TipoAvisoProjeto;
  // Só no cancelamento, quando o criador informou.
  motivo: string | null;
  criadoEm: string;
};

export function listarAvisosPendentes(): Promise<AvisoProjeto[]> {
  return apiFetch<AvisoProjeto[]>('/avisos');
}

export function marcarAvisoComoVisto(id: string): Promise<void> {
  return apiFetch<void>(`/avisos/${id}/visualizado`, { method: 'PATCH' });
}

// Mesmo padrão dos convites: o sino do cabeçalho escuta este evento para
// recontar as notificações depois que um aviso é dispensado.
export const EVENTO_AVISOS_ATUALIZADOS = 'avisos-atualizados';

export function notificarAvisosAtualizados() {
  window.dispatchEvent(new Event(EVENTO_AVISOS_ATUALIZADOS));
}
