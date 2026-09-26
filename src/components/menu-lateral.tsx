import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listarProjetosVinculados, type Projeto } from '../services/projetoService'
import { EVENTO_CONVITES_ATUALIZADOS } from '../services/conviteService'
import { contarMensagensNaoLidas, EVENTO_MENSAGENS_ATUALIZADAS } from '../services/chatService'
import { useMeuPerfil } from '../hooks/useMeuPerfil';
import { logout } from '../services/usuarioService';
import { removerToken } from '../utils/auth';
import { queryClient } from '../services/queryClient';

interface MenuLateralProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function MenuLateral({ isOpen = false, onClose = () => {} }: MenuLateralProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [meusProjetos, setMeusProjetos] = useState<Projeto[]>([]);
  const [carregandoProjetos, setCarregandoProjetos] = useState(true);
  const [saindo, setSaindo] = useState(false);
  
  const { data: meuPerfil } = useMeuPerfil();

  // O menu fica montado entre as páginas: recarrega a cada navegação (ex.:
  // depois de ser aceito, sair ou criar um projeto) e ao responder um convite.
  useEffect(() => {
    const carregar = () => {
      listarProjetosVinculados({ tamanho: 5 })
        .then((pagina) => setMeusProjetos(pagina.content))
        .catch(() => { })
        .finally(() => setCarregandoProjetos(false));
    };
    carregar();
    window.addEventListener(EVENTO_CONVITES_ATUALIZADOS, carregar);
    return () => window.removeEventListener(EVENTO_CONVITES_ATUALIZADOS, carregar);
  }, [location.pathname]);

  // Badge de "Mensagens": na navegação, a cada 30s e quando a caixa de
  // mensagens avisa que algo mudou (leitura ou mensagem nova).
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  useEffect(() => {
    const atualizar = () => {
      contarMensagensNaoLidas()
        .then((r) => setMensagensNaoLidas(r.total))
        .catch(() => { });
    };
    atualizar();
    const intervalo = window.setInterval(atualizar, 30_000);
    window.addEventListener(EVENTO_MENSAGENS_ATUALIZADAS, atualizar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener(EVENTO_MENSAGENS_ATUALIZADAS, atualizar);
    };
  }, [location.pathname]);

  async function handleSair() {
    setSaindo(true);
    try {
      await logout();
    } catch {
      // Ignora falha no logout remoto — o token local é removido de todo modo abaixo.
    } finally {
      removerToken();
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  }

  const ehAdmin = meuPerfil?.nivelAcesso?.nome?.toUpperCase() === 'ADMIN';

  const activeClass = "bg-[#183E6C] text-white shadow-md font-bold";
  const inactiveClass = "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#F27405] font-medium transition-all duration-200";

  const iniciaisPerfil = meuPerfil
    ? meuPerfil.nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
    : '';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose}></div>
      )}

      {/* AQUI: Usando h-full limpo */}
      <aside className={`${isOpen ? 'flex absolute left-0 z-50' : 'hidden'} lg:flex w-72 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-700 h-full flex-col`}>
        
        {/* PARTE DE CIMA DO MENU */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="flex flex-col gap-2 px-4">

            <Link to="/dashboard" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${location.pathname === '/dashboard' ? activeClass : inactiveClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Início
            </Link>

            <Link to="/projetos" onClick={onClose} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl ${location.pathname === '/projetos' ? activeClass : inactiveClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002 2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Explorar Projetos
            </Link>

            <Link to="/candidaturas" onClick={onClose} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl ${location.pathname === '/candidaturas' ? activeClass : inactiveClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Minhas Candidaturas
            </Link>

            <Link to="/mensagens" onClick={onClose} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl ${location.pathname.startsWith('/mensagens') ? activeClass : inactiveClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.4-3.72A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              <span className="flex-1">Mensagens</span>
              {mensagensNaoLidas > 0 && (
                <span
                  aria-label={`${mensagensNaoLidas} mensagens não lidas`}
                  className="min-w-5 h-5 px-1.5 rounded-full bg-[#F27405] text-white text-[11px] font-bold flex items-center justify-center"
                >
                  {mensagensNaoLidas > 99 ? '99+' : mensagensNaoLidas}
                </span>
              )}
            </Link>

            <Link to="/pessoas" onClick={onClose} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl ${location.pathname === '/pessoas' ? activeClass : inactiveClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              Encontrar Pessoas
            </Link>

            {ehAdmin && (
              <Link to="/admin" onClick={onClose} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl ${location.pathname.startsWith('/admin') ? activeClass : inactiveClass}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15a3 3 0 100-6 3 3 0 000 6z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>
                Administração
              </Link>
            )}
          </nav>

          <div className="px-8 my-6">
            <div className="h-px w-full bg-gray-100 dark:bg-slate-700"></div>
          </div>

          <div className="px-8">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Meus Projetos</p>
              <Link to="/criar-projeto" onClick={onClose} className="text-[#F27405] hover:bg-orange-50 dark:hover:bg-orange-950/40 p-1 rounded transition-colors" title="Criar Novo Projeto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              </Link>
            </div>

            <ul className="flex flex-col gap-1">
              {carregandoProjetos ? (
                <li className="text-sm text-gray-400 dark:text-gray-500 italic py-2">Buscando projetos...</li>
              ) : meusProjetos.length === 0 ? (
                <li className="text-xs text-gray-400 dark:text-gray-500 py-2 leading-relaxed">Você ainda não faz parte de nenhum projeto.</li>
              ) : (
                meusProjetos.map((proj) => (
                  <li key={proj.id}>
                    <Link
                      to={`/detalhes/${proj.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-[#F27405] hover:bg-gray-50 dark:hover:bg-slate-800 py-2.5 px-3 -mx-3 rounded-lg transition-all group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600 group-hover:bg-[#F27405] transition-colors shrink-0"></div>
                      <span className="truncate flex-1">{proj.titulo}</span>
                      {meuPerfil && proj.criador?.id !== meuPerfil.id && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 shrink-0">Membro</span>
                      )}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* PARTE INFERIOR  */}
        {meuPerfil && (
          <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 shrink-0">
            <Link
              to={`/usuarios/${meuPerfil.id}`}
              onClick={onClose}
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-[#183E6C] text-white flex items-center justify-center font-bold text-sm shrink-0">
                {iniciaisPerfil}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{meuPerfil.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{meuPerfil.curso?.nome ?? '—'}</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleSair}
              disabled={saindo}
              title="Sair"
              aria-label="Sair da conta"
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </aside>
    </>
  )
}