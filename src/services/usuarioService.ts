// Chamadas para o UsuarioController do backend (rotas /usuarios/*):
// perfil do usuário logado (/me) e consultas/administração de usuários.
import { apiFetch, construirQuery, type PaginaResposta } from './apiClient';
import type { MensagemResponse, UsuarioResumo } from './authService';
import type { Curso } from './cursoService';
import type { NivelAcesso } from './nivelAcessoService';
import type { UsuarioHabilidade } from './usuarioHabilidadeService';

// Espelha UsuarioPerfilResponse (dto/usuario) — perfil completo (usado em
// "meu perfil" e em "ver perfil de outro usuário").
export type UsuarioPerfil = {
  id: string;
  email: string;
  nome: string;
  nivelAcesso: NivelAcesso | null;
  curso: Curso | null;
  periodo: number | null;
  bio: string | null;
  fotoUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  habilidades: UsuarioHabilidade[];
  notaMedia: number | null;
  totalAvaliacoes: number | null;
  termosAceitosEm: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

// ============================================
// PERFIL DO USUÁRIO LOGADO (/me)
// ============================================

export function obterMeuPerfil(): Promise<UsuarioPerfil> {
  return apiFetch<UsuarioPerfil>('/usuarios/me');
}

// Revoga o token JWT no backend. O apiFetch já manda o Authorization
// automaticamente (autenticado: true é o padrão); depois de chamar isso,
// quem usa a função deve limpar o token local com removerToken().
export function logout(): Promise<MensagemResponse> {
  return apiFetch<MensagemResponse>('/usuarios/logout', { method: 'POST' });
}

// Espelha UsuarioUpdatePerfilRequest (dto/usuario).
export type AtualizarPerfilRequest = {
  nome: string;
  idCurso?: string;
  periodo?: number;
  bio?: string;
  fotoUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
};

export function atualizarMeuPerfil(dados: AtualizarPerfilRequest): Promise<UsuarioPerfil> {
  return apiFetch<UsuarioPerfil>('/usuarios/me', { method: 'PUT', body: dados });
}

export type AlterarSenhaResponse = {
  mensagem: string;
  dataAtualizacao: string;
};

// Espelha UsuarioUpdateSenhaRequest (dto/usuario).
export function alterarMinhaSenha(senhaAtual: string, novaSenha: string): Promise<AlterarSenhaResponse> {
  return apiFetch<AlterarSenhaResponse>('/usuarios/me/senha', {
    method: 'PATCH',
    body: { senhaAtual, novaSenha },
  });
}

// Multipart: manda um FormData com o campo "foto" (é o nome esperado pelo
// @RequestParam("foto") do backend). O apiClient detecta o FormData e não
// define Content-Type manualmente — o navegador cuida do boundary.
export function enviarFotoDePerfil(arquivo: File): Promise<UsuarioPerfil> {
  const formData = new FormData();
  formData.append('foto', arquivo);
  return apiFetch<UsuarioPerfil>('/usuarios/me/foto', { method: 'POST', body: formData });
}

export function removerFotoDePerfil(): Promise<UsuarioPerfil> {
  return apiFetch<UsuarioPerfil>('/usuarios/me/foto', { method: 'DELETE' });
}

// Exclusão lógica da própria conta (LGPD) — exige a senha atual pra confirmar.
export function excluirMinhaConta(senha: string): Promise<MensagemResponse> {
  return apiFetch<MensagemResponse>('/usuarios/me', { method: 'DELETE', body: { senha } });
}

// ============================================
// CONSULTAS E ADMINISTRAÇÃO
// ============================================

// Só ADMIN (@PreAuthorize no backend) — promove um usuário a PROFESSOR ou ADMIN.
export function alterarNivelDeAcesso(usuarioId: string, idNivel: string): Promise<UsuarioPerfil> {
  return apiFetch<UsuarioPerfil>(`/usuarios/${usuarioId}/nivel-acesso?idNivel=${idNivel}`, {
    method: 'PATCH',
  });
}

// Só ADMIN (@PreAuthorize no backend).
export function listarTodosOsUsuarios(): Promise<UsuarioResumo[]> {
  return apiFetch<UsuarioResumo[]>('/usuarios');
}

export type FiltroExplorarPerfis = {
  busca?: string;
  idCurso?: string;
  idHabilidade?: string;
  pagina?: number;
  tamanho?: number;
};

// Perfis de alunos e professores (ignora administradores) — usado pra uma
// tela de busca/exploração de pessoas.
export function explorarPerfis(
  filtro: FiltroExplorarPerfis = {},
): Promise<PaginaResposta<UsuarioResumo>> {
  const query = construirQuery({
    busca: filtro.busca,
    idCurso: filtro.idCurso,
    idHabilidade: filtro.idHabilidade,
    page: filtro.pagina,
    size: filtro.tamanho,
  });
  return apiFetch<PaginaResposta<UsuarioResumo>>(`/usuarios/explorar${query}`);
}

export function buscarUsuarioPorId(id: string): Promise<UsuarioPerfil> {
  return apiFetch<UsuarioPerfil>(`/usuarios/${id}`);
}
