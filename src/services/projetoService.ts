// Chamadas para o ProjetoController do backend (rotas /projetos/*).
// Diferente de /cursos, essa rota exige login (não está no permitAll do
// SecurityConfig), então usamos o apiFetch com o padrão autenticado: true
// (não precisa passar a opção, o token salvo no localStorage já vai sozinho).
import { apiFetch, construirQuery, type PaginaResposta } from './apiClient';
import type { UsuarioResumo } from './authService';
import type { ProjetoHabilidade } from './projetoHabilidadeService';

// Espelha o enum StatusProjeto do backend (domain/enums/StatusProjeto.java).
// O JSON traz o nome da constante (ex.: "ABERTO"), não o label em português.
export type StatusProjeto = 'ABERTO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

// Espelha ProjetoRefResponse (dto/projeto) — referência mínima a um projeto,
// usada quando ele aparece aninhado em outro recurso (candidatura, membro,
// avaliação) e o payload completo seria desnecessário.
export type ProjetoRef = {
  id: string;
  titulo: string;
  status: StatusProjeto;
};

// Espelha ProjetoResumoResponse (dto/projeto) — payload usado na listagem
// (o feed), moldado pra caber no card. Detalhes completos do projeto (com
// membros e candidaturas) usam ProjetoDetalhe.
export type Projeto = {
  id: string;
  criador: UsuarioResumo | null;
  titulo: string;
  descricao: string;
  bannerUrl: string | null;
  status: StatusProjeto;
  habilidadesNecessarias: ProjetoHabilidade[];
  vagas: number;
  vagasPreenchidas: number;
  dataFim: string | null;
};

// Filtros aceitos por GET /projetos (todos opcionais — ver
// ProjetoController.listar). "pagina"/"tamanho" viram os query params
// page/size que o Pageable do Spring já entende por padrão.
export type FiltroProjetos = {
  status?: StatusProjeto;
  busca?: string;
  pagina?: number;
  tamanho?: number;
};

function paraQuery(filtro: FiltroProjetos = {}): string {
  return construirQuery({
    status: filtro.status,
    busca: filtro.busca,
    page: filtro.pagina,
    size: filtro.tamanho,
  });
}

export function listarProjetos(filtro: FiltroProjetos = {}): Promise<PaginaResposta<Projeto>> {
  // Sem filtro: usa o padrão do backend (10 por página, mais recentes primeiro).
  return apiFetch<PaginaResposta<Projeto>>(`/projetos${paraQuery(filtro)}`);
}

export function listarMeusProjetos(filtro: FiltroProjetos = {}): Promise<PaginaResposta<Projeto>> {
  return apiFetch<PaginaResposta<Projeto>>(`/projetos/meus-projetos${paraQuery(filtro)}`);
}

// Criados por mim + aqueles em que sou membro — é o que aparece como "Meus
// Projetos" no dashboard e no menu lateral. Aceita filtro de status.
export function listarProjetosVinculados(filtro: FiltroProjetos = {}): Promise<PaginaResposta<Projeto>> {
  return apiFetch<PaginaResposta<Projeto>>(`/projetos/vinculados${paraQuery(filtro)}`);
}

export function listarProjetosParticipando(filtro: FiltroProjetos = {}): Promise<PaginaResposta<Projeto>> {
  return apiFetch<PaginaResposta<Projeto>>(`/projetos/participando${paraQuery(filtro)}`);
}

// Espelha ProjetoResponse (dto/projeto) — payload completo (usado na tela de
// detalhes), com os campos extras que não vêm no resumo do feed.
export type ProjetoDetalhe = {
  id: string;
  criador: UsuarioResumo | null;
  titulo: string;
  descricao: string;
  bannerUrl: string | null;
  status: StatusProjeto;
  vagas: number;
  vagasPreenchidas: number;
  vagasDisponiveis: number;
  aceitandoCandidaturas: boolean;
  dataFim: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  habilidadesNecessarias: ProjetoHabilidade[];
  totalMembros: number;
  totalCandidaturasPendentes: number;
};

export function buscarProjetoPorId(id: string): Promise<ProjetoDetalhe> {
  return apiFetch<ProjetoDetalhe>(`/projetos/${id}`);
}

// Multipart: manda um FormData com o campo "banner" (esperado pelo
// @RequestParam("banner") do backend). Só o criador do projeto pode chamar
// essa rota (validado no backend) — mesmo padrão de enviarFotoDePerfil.
export function enviarBannerDoProjeto(id: string, arquivo: File): Promise<ProjetoDetalhe> {
  const formData = new FormData();
  formData.append('banner', arquivo);
  return apiFetch<ProjetoDetalhe>(`/projetos/${id}/banner`, { method: 'POST', body: formData });
}

export function removerBannerDoProjeto(id: string): Promise<ProjetoDetalhe> {
  return apiFetch<ProjetoDetalhe>(`/projetos/${id}/banner`, { method: 'DELETE' });
}

// Espelha CriarProjetoRequest (dto/projeto). "habilidades" é opcional: já
// cria o projeto com os vínculos de VincularHabilidadeRequest.
export type CriarProjetoRequest = {
  titulo: string;
  descricao: string;
  vagas: number;
  dataFim?: string;
  habilidades?: { habilidadeId: string; obrigatoria?: boolean }[];
};

export function criarProjeto(dados: CriarProjetoRequest): Promise<ProjetoDetalhe> {
  return apiFetch<ProjetoDetalhe>('/projetos', { method: 'POST', body: dados });
}

// Espelha AtualizarProjetoRequest (dto/projeto). Só o criador do projeto
// pode chamar essa rota (validado no backend).
export type AtualizarProjetoRequest = {
  titulo: string;
  descricao: string;
  vagas: number;
  dataFim?: string;
};

export function atualizarProjeto(id: string, dados: AtualizarProjetoRequest): Promise<ProjetoDetalhe> {
  return apiFetch<ProjetoDetalhe>(`/projetos/${id}`, { method: 'PUT', body: dados });
}

// Espelha AlterarStatusProjetoRequest (dto/projeto). "motivo" é opcional,
// mas relevante ao cancelar: vai no aviso enviado aos membros.
export function alterarStatusProjeto(
  id: string,
  status: StatusProjeto,
  motivo?: string,
): Promise<ProjetoDetalhe> {
  return apiFetch<ProjetoDetalhe>(`/projetos/${id}/status`, {
    method: 'PATCH',
    body: { status, motivo },
  });
}

// Exclusão lógica (o projeto some das listagens, mas o histórico de
// candidaturas/membros é preservado no banco).
export function inativarProjeto(id: string): Promise<{ sucesso: boolean; mensagem: string }> {
  return apiFetch(`/projetos/${id}`, { method: 'DELETE' });
}
