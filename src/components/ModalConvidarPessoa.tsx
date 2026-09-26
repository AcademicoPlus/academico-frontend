// Modal do criador para buscar um usuário (via /usuarios/explorar) e
// enviar um convite para o projeto, com função e mensagem opcionais.
import { useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';
import type { UsuarioResumo } from '../services/authService';
import { explorarPerfis } from '../services/usuarioService';
import { convidarParaProjeto } from '../services/conviteService';
import { iniciaisDoNome } from '../utils/projeto';
import ErroCard from './ErroCard';

type ModalConvidarPessoaProps = {
  projetoId: string;
  // Usuários que não podem ser convidados (criador, membros, convites pendentes).
  idsIndisponiveis: Set<string>;
  // Pré-seleciona um usuário (ex.: candidato recomendado) e pula a busca.
  usuarioInicial?: UsuarioResumo | null;
  onFechar: () => void;
  onConvidado: () => void;
};

const ATRASO_BUSCA_MS = 300;

export default function ModalConvidarPessoa({
  projetoId,
  idsIndisponiveis,
  usuarioInicial = null,
  onFechar,
  onConvidado,
}: ModalConvidarPessoaProps) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<UsuarioResumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionado, setSelecionado] = useState<UsuarioResumo | null>(usuarioInicial);
  const [funcao, setFuncao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const termo = busca.trim();
  const buscaAtiva = !selecionado && termo.length >= 2;
  const resultadosVisiveis = buscaAtiva ? resultados : [];

  useEffect(() => {
    if (!buscaAtiva) return;

    let cancelado = false;
    const timer = setTimeout(() => {
      setBuscando(true);
      explorarPerfis({ busca: termo, tamanho: 8 })
        .then((pagina) => { if (!cancelado) setResultados(pagina.content); })
        .catch(() => { if (!cancelado) setResultados([]); })
        .finally(() => { if (!cancelado) setBuscando(false); });
    }, ATRASO_BUSCA_MS);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [termo, buscaAtiva]);

  async function handleEnviar() {
    if (!selecionado) return;

    setErro(null);
    setEnviando(true);
    try {
      await convidarParaProjeto(projetoId, selecionado.id, {
        funcao: funcao.trim() || undefined,
        mensagem: mensagem.trim() || undefined,
      });
      onConvidado();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível enviar o convite.');
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    'w-full p-3 bg-background dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#183E6C] focus:ring-2 focus:ring-[#183E6C]/20 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-convidar-pessoa"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 flex flex-col gap-4">
        <h2 id="titulo-convidar-pessoa" className="text-lg font-bold text-[#183E6C] dark:text-blue-300">
          Convidar para o projeto
        </h2>

        {selecionado ? (
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-[#183E6C] text-white flex items-center justify-center text-sm font-black shrink-0">
              {iniciaisDoNome(selecionado.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#183E6C] dark:text-blue-300 truncate">{selecionado.nome}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selecionado.curso ?? '—'}</p>
            </div>
            {!usuarioInicial && (
              <button
                type="button"
                onClick={() => { setSelecionado(null); setErro(null); }}
                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline"
              >
                Trocar
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="search"
              autoFocus
              aria-label="Buscar pessoa"
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={campo}
            />
            <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
              {buscaAtiva && buscando && <p className="text-xs text-gray-400 dark:text-gray-500 p-2">Buscando…</p>}
              {buscaAtiva && !buscando && resultados.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 p-2">Nenhuma pessoa encontrada.</p>
              )}
              {resultadosVisiveis.map((usuario) => {
                const indisponivel = idsIndisponiveis.has(usuario.id);
                return (
                  <button
                    key={usuario.id}
                    type="button"
                    disabled={indisponivel}
                    onClick={() => setSelecionado(usuario)}
                    className="flex items-center gap-3 p-2 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#183E6C] text-white flex items-center justify-center text-xs font-black shrink-0">
                      {iniciaisDoNome(usuario.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{usuario.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {indisponivel ? 'Já está na equipe ou convidado' : usuario.curso ?? '—'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selecionado && (
          <>
            <input
              type="text"
              aria-label="Função no projeto"
              placeholder="Função no projeto (opcional)"
              maxLength={100}
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              className={campo}
            />
            <textarea
              rows={3}
              aria-label="Mensagem do convite"
              placeholder="Mensagem (opcional)..."
              maxLength={1000}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className={`${campo} resize-none`}
            />
          </>
        )}

        {erro && <ErroCard>{erro}</ErroCard>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            disabled={enviando}
            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!selecionado || enviando}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors disabled:opacity-60"
          >
            {enviando ? 'Enviando…' : 'Enviar convite'}
          </button>
        </div>
      </div>
    </div>
  );
}
