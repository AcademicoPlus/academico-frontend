// Chamadas para o AuthController do backend (rotas /auth/*).
// Os tipos abaixo espelham os records Java em academico-api
// (dto/auth/LoginRequest, LoginResponse, CadastroRequest, CadastroResponse).
import { apiFetch } from './apiClient';
import type { Sancao } from './denunciaService';

export type LoginRequest = {
  email: string;
  senha: string;
};

export type UsuarioResumo = {
  id: string;
  nome: string;
  curso: string | null;
  fotoUrl: string | null;
  permission: string | null;
  periodo: number | null;
  notaMedia: number | null;
  totalAvaliacoes: number | null;
};

export type LoginResponse = {
  sucesso: boolean;
  mensagem: string;
  token: string;
  usuario: UsuarioResumo;
  // Avisos de projetos cancelados exibidos ao usuário após o login;
  // não é usado pelo formulário de login em si, então fica tipado de forma solta.
  avisosCancelamento: unknown[];
  // Advertências da moderação ainda não vistas. O backend as entrega uma
  // única vez, no primeiro login após a decisão do admin (e as marca como
  // vistas no mesmo gesto), então a tela de login precisa exibi-las agora —
  // não há segunda chance de mostrar.
  avisosModeracao: Sancao[];
};

export type CadastroRequest = {
  email: string;
  nome: string;
  periodo?: number;
  idCurso: string;
  senha: string;
  aceitouTermos: boolean;
};

export type CadastroResponse = {
  sucesso: boolean;
  mensagem: string;
};

// Espelha MensagemResponse (dto/auth) — retorno genérico usado por várias
// rotas de escrita que não precisam devolver um recurso (logout, exclusão,
// desvincular, etc.), aqui e em outros services.
export type MensagemResponse = {
  sucesso: boolean;
  mensagem: string;
};

export function login(dados: LoginRequest): Promise<LoginResponse> {
  // autenticado: false porque essa rota é pública (permitAll no SecurityConfig)
  // e ainda não existe token nesse momento.
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: dados,
    autenticado: false,
  });
}

export function cadastrar(dados: CadastroRequest): Promise<CadastroResponse> {
  return apiFetch<CadastroResponse>('/auth/cadastro', {
    method: 'POST',
    body: dados,
    autenticado: false,
  });
}

// ============================================
// REDEFINIÇÃO DE SENHA (fluxo em 3 passos, todos públicos)
// ============================================

// Passo 1: dispara o e-mail com o código OTP para o endereço informado.
// Sempre responde sucesso (mesmo se o e-mail não existir), pra não revelar
// quais e-mails estão cadastrados na base.
export function solicitarResetSenha(email: string): Promise<MensagemResponse> {
  return apiFetch<MensagemResponse>('/auth/reset-senha/solicitar', {
    method: 'POST',
    body: { email },
    autenticado: false,
  });
}

export type ResetPreviewResponse = {
  sucesso: boolean;
  mensagem: string;
  // Versão mascarada do e-mail (ex.: "a***@academico.edu.br"), pra
  // confirmar pro usuário que o código foi pro endereço certo sem expor o
  // e-mail completo.
  emailPreview: string;
};

export function previewResetSenha(email: string): Promise<ResetPreviewResponse> {
  return apiFetch<ResetPreviewResponse>('/auth/reset-senha/preview', {
    method: 'POST',
    body: { email },
    autenticado: false,
  });
}

export type ResetValidarResponse = {
  sucesso: boolean;
  // Token de curta duração, usado só no passo 3 (redefinir) — evita que o
  // código OTP em si precise ser reenviado.
  tokenRedefinicao: string;
};

// Passo 2: valida o código OTP recebido por e-mail e troca ele por um
// token de redefinição.
export function validarCodigoReset(email: string, codigo: string): Promise<ResetValidarResponse> {
  return apiFetch<ResetValidarResponse>('/auth/reset-senha/validar', {
    method: 'POST',
    body: { email, codigo },
    autenticado: false,
  });
}

// Passo 3: troca a senha usando o tokenRedefinicao obtido no passo 2.
export function redefinirSenha(
  tokenRedefinicao: string,
  novaSenha: string,
): Promise<MensagemResponse> {
  return apiFetch<MensagemResponse>('/auth/reset-senha/redefinir', {
    method: 'POST',
    body: { tokenRedefinicao, novaSenha },
    autenticado: false,
  });
}