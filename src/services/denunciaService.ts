// Chamadas para o DenunciaController do backend — denúncia de avaliação,
// projeto e perfil, e a fila de moderação com a escada de sanções
// (rotas /denuncias, /avaliacoes|projetos|usuarios/{id}/denuncias).
// Listar pendentes e resolver são só ADMIN (@PreAuthorize no backend).
import { apiFetch, construirQuery, type PaginaResposta } from './apiClient';
import type { UsuarioResumo } from './authService';

// Espelham os enums do backend (domain/enums/).
export type StatusDenuncia = 'PENDENTE' | 'PROCEDENTE' | 'IMPROCEDENTE';
export type TipoAlvoDenuncia = 'AVALIACAO' | 'PROJETO' | 'PERFIL';
export type CategoriaDenuncia =
  | 'SPAM'
  | 'CONTEUDO_OFENSIVO'
  | 'INFORMACAO_FALSA'
  | 'GOLPE'
  | 'OUTRO';

// Escada de medidas, da mais branda à mais severa. Advertir e suspender também
// derrubam o conteúdo denunciado (regra do MedidaModeracao no backend).
export type MedidaModeracao =
  | 'ARQUIVAR'
  | 'REMOVER_CONTEUDO'
  | 'ADVERTENCIA'
  | 'SUSPENSAO';

export const CATEGORIAS_DENUNCIA: { valor: CategoriaDenuncia; label: string }[] = [
  { valor: 'SPAM', label: 'Spam ou divulgação indevida' },
  { valor: 'CONTEUDO_OFENSIVO', label: 'Conteúdo ofensivo ou discriminatório' },
  { valor: 'INFORMACAO_FALSA', label: 'Informação falsa ou enganosa' },
  { valor: 'GOLPE', label: 'Golpe ou tentativa de fraude' },
  { valor: 'OUTRO', label: 'Outro' },
];

export const MEDIDAS_MODERACAO: {
  valor: MedidaModeracao;
  label: string;
  descricao: string;
}[] = [
  {
    valor: 'ARQUIVAR',
    label: 'Arquivar',
    descricao: 'Denúncia improcedente — nada acontece com o alvo.',
  },
  {
    valor: 'REMOVER_CONTEUDO',
    label: 'Remover conteúdo',
    descricao: 'O conteúdo sai do ar, sem punir o autor.',
  },
  {
    valor: 'ADVERTENCIA',
    label: 'Advertir',
    descricao: 'Conteúdo fora do ar e advertência registrada ao responsável.',
  },
  {
    valor: 'SUSPENSAO',
    label: 'Suspender',
    descricao: 'Conteúdo fora do ar e acesso bloqueado pelo prazo definido.',
  },
];

// Espelha AlvoDenunciadoResponse — os três tipos de alvo achatados num
// formato só, para a fila do admin renderizar todos com o mesmo card.
export type AlvoDenunciado = {
  id: string;
  titulo: string;
  conteudo: string | null;
  nota: number | null;
  autor: UsuarioResumo | null;
};

// Espelha HistoricoModeracaoResponse — é o que torna a escada operável:
// sem ver as advertências anteriores, não há como escalonar com critério.
export type HistoricoModeracao = {
  advertencias: number;
  suspensoes: number;
  suspensoAgora: boolean;
  suspensoAte: string | null;
  medidaSugerida: MedidaModeracao;
  justificativaSugestao: string;
};

export type Denuncia = {
  id: string;
  tipoAlvo: TipoAlvoDenuncia;
  alvo: AlvoDenunciado;
  responsavel: UsuarioResumo | null;
  denunciante: UsuarioResumo;
  categoria: CategoriaDenuncia;
  motivo: string;
  status: StatusDenuncia;
  medida: MedidaModeracao | null;
  historicoResponsavel: HistoricoModeracao | null;
  criadoEm: string;
  analisadoEm: string | null;
};

// Espelha SancaoResponse — advertência/suspensão como o sancionado a vê.
export type Sancao = {
  id: string;
  medida: MedidaModeracao;
  justificativa: string;
  criadoEm: string;
  expiraEm: string | null;
};

export type DenunciarPayload = {
  categoria: CategoriaDenuncia;
  motivo: string;
};

// ============================================
// DENUNCIAR
// ============================================

// Só a pessoa avaliada pode denunciar a avaliação (validado no backend).
export function denunciarAvaliacao(avaliacaoId: string, dados: DenunciarPayload): Promise<Denuncia> {
  return apiFetch<Denuncia>(`/avaliacoes/${avaliacaoId}/denuncias`, {
    method: 'POST',
    body: dados,
  });
}

// Qualquer usuário autenticado, menos o criador do projeto.
export function denunciarProjeto(projetoId: string, dados: DenunciarPayload): Promise<Denuncia> {
  return apiFetch<Denuncia>(`/projetos/${projetoId}/denuncias`, {
    method: 'POST',
    body: dados,
  });
}

// Qualquer usuário autenticado, menos o dono do perfil.
export function denunciarPerfil(usuarioId: string, dados: DenunciarPayload): Promise<Denuncia> {
  return apiFetch<Denuncia>(`/usuarios/${usuarioId}/denuncias`, {
    method: 'POST',
    body: dados,
  });
}

// ============================================
// MODERAÇÃO (ADMIN)
// ============================================

export function listarDenunciasPendentes(
  tipoAlvo?: TipoAlvoDenuncia,
): Promise<PaginaResposta<Denuncia>> {
  return apiFetch<PaginaResposta<Denuncia>>(`/denuncias${construirQuery({ tipoAlvo })}`);
}

export type ResolverPayload = {
  medida: MedidaModeracao;
  // Obrigatório só em SUSPENSAO.
  diasSuspensao?: number;
  // Obrigatório quando a medida pune alguém (ADVERTENCIA/SUSPENSAO).
  justificativa?: string;
};

export function resolverDenuncia(id: string, dados: ResolverPayload): Promise<Denuncia> {
  return apiFetch<Denuncia>(`/denuncias/${id}/resolver`, {
    method: 'PATCH',
    body: dados,
  });
}
