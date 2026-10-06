import { Link, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import logo from '../assets/logo.png'
import { login } from '../services/authService';
import { salvarToken } from '../utils/auth';
import { ApiError } from '../services/apiClient';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await login({ email, senha });

      // O backend responde 200 OK mesmo em credenciais inválidas ou conta
      // desativada (contrato consistente entre as duas falhas de login) — só
      // o campo "sucesso" indica se realmente autenticou. Sem essa checagem,
      // "token: null" seria salvo como a string "null" no localStorage e o
      // app trataria isso como sessão válida, levando pro dashboard sem
      // token de verdade (todas as chamadas subsequentes voltam 401).
      if (!resposta.sucesso || !resposta.token) {
        setErro(resposta.mensagem);
        return;
      }

      salvarToken(resposta.token);
      navigate('/dashboard');
    } catch (erroCapturado) {
      // ApiError vem do apiClient com a mensagem que o backend retornou
      // (ex.: "Email ou senha inválidos"); qualquer outro erro é de rede/CORS.
      const mensagem =
        erroCapturado instanceof ApiError
          ? erroCapturado.message
          : 'Não foi possível conectar ao servidor. Tente novamente.';
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F8F9FA] dark:bg-slate-950 font-sans">

      {/* Lado Esquerdo (Azul Marinho) */}
      <div className="hidden lg:flex w-1/2 bg-[#183E6C] relative flex-col justify-center px-16 xl:px-24 overflow-hidden">

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 border-30 border-white/5 rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-137.5 h-137.5 border-30 border-white/5 rounded-full pointer-events-none"></div>

        <div className="relative z-10 text-white max-w-lg">

          <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
            Conecte-se com projetos multidisciplinares
          </h1>

          <p className="text-[#B2C6E0] text-lg mb-16 leading-relaxed max-w-md">
            Crie projetos, recrute colaboradores por habilidades e faça parte de algo maior com colegas de outros cursos.
          </p>


          <div className="flex gap-10">

          </div>
        </div>
      </div>

      {/* Lado Direito (Formulário) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 px-2">
            <img src={logo} alt="Logo Acadêmico+" className="h-12 object-contain" />
          </div>

          <div className="flex justify-between items-start mb-6 px-2">
            <div>
              <h2 className="text-3xl font-bold text-[#183E6C] dark:text-blue-300">Bem-vindo de volta</h2>
              <p className="text-gray-500 dark:text-gray-300 mt-1">Entre na sua conta institucional</p>
            </div>

          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-8">

            {erro && (
              <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {erro}
              </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">E-mail institucional</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="········"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100 font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((valor) => !valor)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-[#F27405] transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 mb-2">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[#F27405] border-gray-300 focus:ring-[#F27405]" />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-300">Lembrar-me</span>
                </label>
                <Link to="/esqueci-senha" className="text-sm text-[#F27405] hover:underline font-medium">Esqueci a senha</Link>
              </div>

              {/* Botão Laranja */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-[#F27405] hover:bg-[#D96704] text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-[#F27405]/30 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {carregando ? 'Entrando...' : 'Entrar na plataforma'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-300 mt-6">
              Não tem conta? <a href="/cadastro" className="text-[#F27405] font-semibold hover:underline">Cadastre-se</a>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-10 font-medium tracking-wide">
            UNIFAPI
          </p>

        </div>
      </div>
    </div>
  )
}