import { useEffect, useMemo, useState } from 'react'
import {
  alterarNivelDeAcesso,
  listarTodosOsUsuarios,
} from '../services/usuarioService'
import { listarNiveisDeAcesso, type NivelAcesso } from '../services/nivelAcessoService'
import type { UsuarioResumo } from '../services/authService'
import { ApiError } from '../services/apiClient'
import { useMeuPerfil } from '../hooks/useMeuPerfil'
import { useNavigate } from 'react-router-dom'

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const { data: meuPerfil } = useMeuPerfil();
  const meuId = meuPerfil?.id ?? null;
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [niveis, setNiveis] = useState<NivelAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  // usuarioId -> nivelId escolhido no <select> mas ainda não salvo
  const [pendentes, setPendentes] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const [erroLinha, setErroLinha] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([listarTodosOsUsuarios(), listarNiveisDeAcesso()])
      .then(([listaUsuarios, listaNiveis]) => {
        setUsuarios(listaUsuarios);
        setNiveis(listaNiveis);
        setErro(null);
      })
      .catch(() => setErro('Não foi possível carregar os usuários. Tente novamente.'))
      .finally(() => setCarregando(false));
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((usuario) =>
      usuario.nome.toLowerCase().includes(termo) ||
      (usuario.curso ?? '').toLowerCase().includes(termo),
    );
  }, [usuarios, busca]);

  function nivelIdAtual(usuario: UsuarioResumo): string {
    return niveis.find((nivel) => nivel.nome === usuario.permission)?.id ?? '';
  }

  function iniciaisDoNome(nome: string): string {
    return nome.trim().charAt(0).toUpperCase() || '?';
  }

  async function salvarNivel(usuario: UsuarioResumo) {
    const novoNivelId = pendentes[usuario.id];
    if (!novoNivelId) return;

    setSalvando((atual) => ({ ...atual, [usuario.id]: true }));
    setErroLinha((atual) => {
      const proximo = { ...atual };
      delete proximo[usuario.id];
      return proximo;
    });

    try {
      await alterarNivelDeAcesso(usuario.id, novoNivelId);
      const novoNivelNome = niveis.find((nivel) => nivel.id === novoNivelId)?.nome ?? usuario.permission;
      setUsuarios((atual) =>
        atual.map((item) => (item.id === usuario.id ? { ...item, permission: novoNivelNome } : item)),
      );
      setPendentes((atual) => {
        const proximo = { ...atual };
        delete proximo[usuario.id];
        return proximo;
      });
    } catch (erroCapturado) {
      const mensagem = erroCapturado instanceof ApiError
        ? erroCapturado.message
        : 'Não foi possível salvar o novo nível de acesso.';
      setErroLinha((atual) => ({ ...atual, [usuario.id]: mensagem }));
    } finally {
      setSalvando((atual) => ({ ...atual, [usuario.id]: false }));
    }
  }

  return (
    <div className="pb-12 max-w-7xl mx-auto">

      {/* Botão de Voltar */}
      <div className='mb-4'>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-purple-400 transition-colors group cursor-pointer"
        >
          <span className="h-7 w-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-2xs group-hover:border-primary/40 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span>Voltar</span>
        </button>
      </div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#183E6C] dark:text-blue-300 tracking-tight">Usuários</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{usuarios.length} usuários cadastrados</p>
        </div>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por nome ou curso..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#F27405] focus:ring-4 focus:ring-[#F27405]/10 text-gray-700 dark:text-gray-200 shadow-sm transition-all"
          />
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </header>

      {erro && (
        <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="flex justify-center py-20"><p className="text-lg font-bold text-gray-400 dark:text-gray-500 animate-pulse">Carregando usuários...</p></div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 p-12 text-center shadow-sm">
          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Curso</th>
                  <th className="px-6 py-4">Período</th>
                  <th className="px-6 py-4">Nota média</th>
                  <th className="px-6 py-4">Nível de acesso</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => {
                  const nivelAtualId = nivelIdAtual(usuario);
                  const nivelSelecionado = pendentes[usuario.id] ?? nivelAtualId;
                  const temAlteracaoPendente = nivelSelecionado !== nivelAtualId;
                  const ehEuMesmo = usuario.id === meuId;

                  return (
                    <tr key={usuario.id} className="border-b border-gray-50 dark:border-slate-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#F27405] flex items-center justify-center font-black border border-orange-100 dark:border-orange-900/50 shrink-0">
                            {iniciaisDoNome(usuario.nome)}
                          </div>
                          <div>
                            <p className="font-bold text-[#183E6C] dark:text-blue-300">{usuario.nome}</p>
                            {ehEuMesmo && <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold">Você</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{usuario.curso ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{usuario.periodo ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {usuario.notaMedia != null ? usuario.notaMedia.toFixed(1) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={nivelSelecionado}
                          disabled={ehEuMesmo || niveis.length === 0}
                          onChange={(e) =>
                            setPendentes((atual) => ({ ...atual, [usuario.id]: e.target.value }))
                          }
                          className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {!nivelAtualId && <option value="">{usuario.permission ?? '—'}</option>}
                          {niveis.map((nivel) => (
                            <option key={nivel.id} value={nivel.id}>{nivel.nome}</option>
                          ))}
                        </select>
                        {erroLinha[usuario.id] && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 max-w-50">{erroLinha[usuario.id]}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {temAlteracaoPendente && (
                          <button
                            type="button"
                            onClick={() => salvarNivel(usuario)}
                            disabled={!!salvando[usuario.id]}
                            className="text-sm font-extrabold text-white bg-[#F27405] hover:bg-[#D96704] px-4 py-2 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {salvando[usuario.id] ? 'Salvando...' : 'Salvar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
