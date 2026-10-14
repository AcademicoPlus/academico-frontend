// Funções utilitárias para guardar/ler o token JWT emitido pelo backend
// (AuthController -> LoginResponse.token) e decidir se o usuário está logado.
// Centralizar isso aqui evita espalhar "localStorage.getItem('token')" pelo app.

const TOKEN_KEY = 'academico:token';

export function salvarToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function obterToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removerToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Lê o "exp" do payload do JWT (segundos desde a época, por especificação).
// Decodificação só para saber a validade — quem valida a assinatura é o
// backend; aqui o objetivo é não mandar o usuário para um app que vai falhar
// em toda chamada. Devolve null quando não dá para ler o "exp" (token
// malformado, sem payload, sem a claim) — ver tokenExpirado.
function expiracaoDoToken(token: string): number | null {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      return null;
    }
    // JWT usa base64url ("-" e "_"); atob só entende base64 padrão.
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const preenchido = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(preenchido)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function tokenExpirado(token: string): boolean {
  const exp = expiracaoDoToken(token);
  // Sem "exp" legível não dá para afirmar que expirou: deixa o backend
  // decidir (a resposta 401 do apiClient encerra a sessão de todo modo).
  if (exp === null) {
    return false;
  }
  return exp * 1000 <= Date.now();
}

/**
 * Antes isso checava só a presença do token. Como o access token dura 24h e
 * não há refresh token, depois desse prazo o usuário entrava no app, via o
 * dashboard e toda chamada à API falhava com erro genérico, sem nunca ser
 * levado de volta ao login. Agora o token vencido é descartado aqui.
 */
export function estaAutenticado(): boolean {
  const token = obterToken();
  if (token === null) {
    return false;
  }
  if (tokenExpirado(token)) {
    removerToken();
    return false;
  }
  return true;
}
