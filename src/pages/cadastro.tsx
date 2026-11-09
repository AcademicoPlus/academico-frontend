import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, type FormEvent } from 'react';
import logo from '../assets/logo.png'
import { cadastrar } from '../services/authService';
import { listarCursos, type Curso } from '../services/cursoService';
import { ApiError } from '../services/apiClient';

export default function Cadastro() {
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [idCurso, setIdCurso] = useState('');
  // Campo livre, opcional no CadastroRequest do backend (sem @NotNull) — por
  // isso fica como string aqui e só vira número (ou undefined) no submit.
  const [periodo, setPeriodo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [carregandoCursos, setCarregandoCursos] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Controle do Tema (Claro/Escuro)
  const [tema, setTema] = useState<'claro' | 'escuro'>(() => {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo) return temaSalvo as 'claro' | 'escuro';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  });

  // Aplica a classe 'dark' no elemento raiz (HTML) quando o tema mudar
  useEffect(() => {
    const root = window.document.documentElement;
    if (tema === 'escuro') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('tema', tema);
  }, [tema]);

  const alternarTema = () => {
    setTema((prev) => (prev === 'claro' ? 'escuro' : 'claro'));
  };

  useEffect(() => {
    listarCursos()
      .then(setCursos)
      .catch(() => setErro('Não foi possível carregar a lista de cursos.'))
      .finally(() => setCarregandoCursos(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setCarregando(true);
    try {
      await cadastrar({
        nome,
        email,
        idCurso,
        periodo: periodo ? Number(periodo) : undefined,
        senha,
        aceitouTermos,
      });
      navigate('/login');
    } catch (erroCapturado) {
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
    <div className="flex min-h-screen w-full bg-[#F8F9FA] dark:bg-slate-950 font-sans relative">

      {/* Botão de Alternar Tema (Canto Superior Direito) */}
      <button
        onClick={alternarTema}
        className="absolute top-6 right-6 z-20 p-2.5 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:text-[#F27405] dark:hover:text-[#F27405] shadow-sm transition-all"
        aria-label="Alternar tema"
        title={tema === 'claro' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
      >
        {tema === 'claro' ? (
          // Ícone de Lua
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        ) : (
          // Ícone de Sol
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
        )}
      </button>

      {/* Lado Esquerdo (Azul Marinho) */}
      <div className="hidden lg:flex w-1/2 bg-[#183E6C] relative flex-col justify-center px-16 xl:px-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 border-30 border-white/5 rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-137.5 h-137.5 border-30 border-white/5 rounded-full pointer-events-none"></div>

        <div className="relative z-10 text-white max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
            Junte-se à nossa comunidade acadêmica
          </h1>
          <p className="text-[#B2C6E0] text-lg mb-16 leading-relaxed max-w-md">
            Crie seu perfil, descubra projetos inovadores e colabore com estudantes e professores de toda a instituição.
          </p>
        </div>
      </div>

      {/* Lado Direito (Formulário) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 my-8">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 px-2">
            <img src={logo} alt="Logo Acadêmico+" className="h-12 object-contain" />
          </div>

          <div className="flex justify-between items-start mb-6 px-2">
            <div>
              <h2 className="text-3xl font-bold text-[#183E6C] dark:text-blue-300">Crie sua conta</h2>
              <p className="text-gray-500 dark:text-gray-300 mt-1">Preencha seus dados institucionais</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-8 transition-colors">

            {erro && (
              <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {erro}
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>

              <div>
                <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

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
                    placeholder="E-mail institucional"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Curso</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                    </svg>
                  </div>

                  <select
                    value={idCurso}
                    onChange={(e) => setIdCurso(e.target.value)}
                    disabled={carregandoCursos}
                    required
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100 appearance-none cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="" disabled hidden>
                      {carregandoCursos ? 'Carregando cursos...' : 'Selecione o seu curso'}
                    </option>
                    {cursos.map((curso) => (
                      <option key={curso.id} value={curso.id}>{curso.nome}</option>
                    ))}
                  </select>

                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Período (opcional)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Ex.: 3"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Senha</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      minLength={8}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Confirmar Senha</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      minLength={8}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Aceite dos Termos de Uso e Política de Privacidade */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="aceitouTermos"
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                  required
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1472dd] focus:ring-[#1472dd]/20"
                />
                <label htmlFor="aceitouTermos" className="text-sm text-gray-600 dark:text-gray-300">
                  Li e aceito os{' '}
                  <Link to="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-[#1472dd] hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link to="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="text-[#1472dd] hover:underline">
                    Política de Privacidade
                  </Link>
                  .
                </label>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-[#F27405] hover:bg-[#D96704] text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-[#F27405]/30 mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {carregando ? 'Criando conta...' : 'Criar Conta'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-300 mt-6">
              Já tem uma conta? <a href="/login" className="text-[#F27405] font-semibold hover:underline">Fazer login</a>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8 font-medium tracking-wide">
            UNIFAPI 
          </p>

        </div>
      </div>
    </div>
  )
}