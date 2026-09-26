import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Conversa } from '../../services/chatService';
import { formatarQuandoCurto } from '../../utils/data-chat';
import { iniciaisDoNome } from '../../utils/projeto';

type ListaConversasProps = {
  conversas: Conversa[];
  carregando: boolean;
  erro: string | null;
  projetoAbertoId: string | null;
  meuId: string | null;
};

function previa(conversa: Conversa, meuId: string | null): string {
  const m = conversa.ultimaMensagem;
  if (!m) return 'Nenhuma mensagem ainda';
  const autor = m.autor?.id === meuId ? 'Você' : m.autor?.nome.split(' ')[0] ?? 'Alguém';
  return `${autor}: ${m.conteudo}`;
}

export default function ListaConversas({ conversas, carregando, erro, projetoAbertoId, meuId }: ListaConversasProps) {
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const filtradas = termo ? conversas.filter((c) => c.projeto.titulo.toLowerCase().includes(termo)) : conversas;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <h1 className="text-lg font-bold text-[#183E6C] dark:text-blue-300 mb-3">Mensagens</h1>
        <input
          type="search"
          aria-label="Buscar conversa"
          placeholder="Buscar conversa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <div className="p-4 flex flex-col gap-4" aria-label="Carregando conversas">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-800" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : erro ? (
          <p role="alert" className="p-4 text-sm text-red-500 dark:text-red-400">{erro}</p>
        ) : conversas.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Nenhuma conversa por aqui.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Cada projeto em que você participa ganha uma conversa com a equipe.
            </p>
            <Link to="/projetos" className="inline-block mt-3 text-sm font-bold text-[#F27405] hover:underline">
              Explorar projetos →
            </Link>
          </div>
        ) : filtradas.length === 0 ? (
          <p className="p-4 text-sm text-gray-400 dark:text-gray-500">Nenhuma conversa encontrada.</p>
        ) : (
          <ul>
            {filtradas.map((conversa) => {
              const ativa = conversa.projeto.id === projetoAbertoId;
              const temNovas = conversa.naoLidas > 0;
              return (
                <li key={conversa.projeto.id}>
                  <Link
                    to={`/mensagens/${conversa.projeto.id}`}
                    aria-current={ativa ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 border-l-4 transition-colors ${
                      ativa
                        ? 'bg-orange-50/70 dark:bg-slate-800 border-[#F27405]'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {conversa.bannerUrl ? (
                      <img src={conversa.bannerUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div aria-hidden="true" className="w-11 h-11 rounded-xl bg-linear-to-br from-[#183E6C] to-[#0B1D33] text-white flex items-center justify-center text-sm font-black shrink-0">
                        {iniciaisDoNome(conversa.projeto.titulo)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm truncate ${temNovas ? 'font-extrabold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-100'}`}>
                          {conversa.projeto.titulo}
                        </p>
                        {conversa.ultimaMensagem && (
                          <span className={`text-[11px] shrink-0 ${temNovas ? 'text-[#F27405] font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                            {formatarQuandoCurto(conversa.ultimaMensagem.criadoEm)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${temNovas ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                          {previa(conversa, meuId)}
                        </p>
                        {temNovas && (
                          <span
                            aria-label={`${conversa.naoLidas} não lidas`}
                            className="min-w-5 h-5 px-1.5 rounded-full bg-[#F27405] text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                          >
                            {conversa.naoLidas > 99 ? '99+' : conversa.naoLidas}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
