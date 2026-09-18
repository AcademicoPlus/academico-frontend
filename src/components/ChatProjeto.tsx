import { useEffect, useRef, useState } from 'react';
import { useChatProjeto } from '../hooks/useChatProjeto';
import { iniciaisDoNome } from '../utils/projeto';
import ErroCard from './ErroCard';

type ChatProjetoProps = {
  projetoId: string;
  meuId: string | null;
};

function formatarHorario(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data));
}

export default function ChatProjeto({ projetoId, meuId }: ChatProjetoProps) {
  const { mensagens, carregando, erro, enviar } = useChatProjeto(projetoId, true);
  const [rascunho, setRascunho] = useState('');
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView?.({ block: 'end' });
  }, [mensagens.length]);

  function handleEnviar() {
    const conteudo = rascunho.trim();
    if (!conteudo) return;
    enviar(conteudo);
    setRascunho('');
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-6 md:p-8 mb-8">
      <h2 className="text-xl font-bold text-[#183E6C] dark:text-blue-300 mb-4">Chat da Equipe</h2>

      {erro && <ErroCard className="mb-4">{erro}</ErroCard>}

      <div className="h-80 overflow-y-auto bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        {carregando ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center my-auto">Carregando conversa...</p>
        ) : mensagens.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center my-auto">
            Nenhuma mensagem ainda. Diga oi para a equipe!
          </p>
        ) : (
          mensagens.map((mensagem) => {
            const minha = mensagem.autor?.id === meuId;
            return (
              <div key={mensagem.id} className={`flex items-start gap-3 ${minha ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-[#183E6C] text-white flex items-center justify-center text-xs font-black shrink-0">
                  {mensagem.autor ? iniciaisDoNome(mensagem.autor.nome) : '?'}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${minha ? 'bg-[#183E6C] text-white' : 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 text-gray-700 dark:text-gray-200'}`}>
                  {!minha && (
                    <p className="text-xs font-bold text-[#F27405] mb-0.5">{mensagem.autor?.nome ?? 'Usuário removido'}</p>
                  )}
                  <p className="text-sm whitespace-pre-line break-words">{mensagem.conteudo}</p>
                  <p className={`text-[10px] mt-1 ${minha ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                    {formatarHorario(mensagem.criadoEm)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={fimDaListaRef} />
      </div>

      <div className="flex gap-3 mt-4">
        <textarea
          rows={1}
          placeholder="Escreva uma mensagem..."
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleEnviar();
            }
          }}
          className="flex-1 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#F27405] focus:ring-1 focus:ring-[#F27405] resize-none text-sm text-gray-700 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          onClick={handleEnviar}
          disabled={!rascunho.trim()}
          className="bg-[#183E6C] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#102a4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
