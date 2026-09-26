import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Conversa, MensagemProjeto } from '../../services/chatService';
import { STATUS_PROJETO_BADGE, STATUS_PROJETO_LABEL } from '../../utils/projeto';
import { chaveDoDia, formatarHorario, rotuloDoDia } from '../../utils/data-chat';
import Avatar from '../Avatar';

type ConversaAbertaProps = {
  conversa: Conversa;
  mensagens: MensagemProjeto[];
  carregando: boolean;
  erro: string | null;
  conectado: boolean;
  meuId: string | null;
  onEnviar: (conteudo: string) => boolean;
};

// Mensagens seguidas do mesmo autor em até 5 min viram um bloco (sem repetir avatar/nome).
const JANELA_AGRUPAMENTO_MS = 5 * 60 * 1000;
const ALTURA_MAX_COMPOSITOR_PX = 140;

export default function ConversaAberta({
  conversa,
  mensagens,
  carregando,
  erro,
  conectado,
  meuId,
  onEnviar,
}: ConversaAbertaProps) {
  const [rascunho, setRascunho] = useState('');
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [temNovasAbaixo, setTemNovasAbaixo] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const pertoDoFimRef = useRef(true);
  const compositorRef = useRef<HTMLTextAreaElement>(null);

  // Rola para o fim ao abrir e quando chega mensagem — a não ser que a pessoa
  // tenha subido para ler o histórico; aí mostra o aviso "Novas mensagens".
  useLayoutEffect(() => {
    if (pertoDoFimRef.current) {
      fimRef.current?.scrollIntoView?.({ block: 'end' });
    } else {
      setTemNovasAbaixo(true);
    }
  }, [mensagens.length]);

  // Montado de novo a cada conversa (key no pai), então rascunho e scroll já começam zerados.
  useEffect(() => {
    compositorRef.current?.focus();
  }, []);

  function handleScroll() {
    const el = listaRef.current;
    if (!el) return;
    pertoDoFimRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (pertoDoFimRef.current) setTemNovasAbaixo(false);
  }

  function irParaOFim() {
    pertoDoFimRef.current = true;
    setTemNovasAbaixo(false);
    fimRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }

  function ajustarAltura() {
    const el = compositorRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAX_COMPOSITOR_PX)}px`;
  }

  function handleEnviar() {
    const conteudo = rascunho.trim();
    if (!conteudo) return;
    if (!onEnviar(conteudo)) {
      setErroEnvio('Sem conexão com o chat. Tentando reconectar — sua mensagem não foi perdida.');
      return;
    }
    setErroEnvio(null);
    setRascunho('');
    pertoDoFimRef.current = true;
    requestAnimationFrame(() => {
      if (compositorRef.current) compositorRef.current.style.height = 'auto';
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-gray-100 dark:border-slate-800">
        <Link
          to="/mensagens"
          aria-label="Voltar para as conversas"
          className="md:hidden -ml-1 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-[#183E6C] dark:text-blue-300 truncate">{conversa.projeto.titulo}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_PROJETO_BADGE[conversa.projeto.status]}`}>
              {STATUS_PROJETO_LABEL[conversa.projeto.status]}
            </span>
            {!conectado && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" /> Reconectando…
              </span>
            )}
          </div>
        </div>
        <Link
          to={`/detalhes/${conversa.projeto.id}`}
          className="shrink-0 text-xs font-bold text-[#F27405] hover:underline"
        >
          Ver projeto →
        </Link>
      </div>

      {/* Mensagens */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={listaRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-4 md:px-6 py-4 bg-gray-50/60 dark:bg-slate-950/40"
        >
          {carregando ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-10 animate-pulse">Carregando conversa…</p>
          ) : erro ? (
            <p role="alert" className="text-sm text-red-500 dark:text-red-400 text-center mt-10">{erro}</p>
          ) : mensagens.length === 0 ? (
            <div className="text-center mt-16">
              <p className="text-3xl mb-2" aria-hidden="true">👋</p>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Nenhuma mensagem ainda</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Diga oi para a equipe!</p>
            </div>
          ) : (
            <ol className="flex flex-col">
              {mensagens.map((mensagem, i) => {
                const anterior = mensagens[i - 1];
                const novoDia = !anterior || chaveDoDia(anterior.criadoEm) !== chaveDoDia(mensagem.criadoEm);
                const continuacao =
                  !novoDia &&
                  anterior.autor?.id === mensagem.autor?.id &&
                  new Date(mensagem.criadoEm).getTime() - new Date(anterior.criadoEm).getTime() < JANELA_AGRUPAMENTO_MS;
                const minha = mensagem.autor?.id === meuId;

                return (
                  <li key={mensagem.id}>
                    {novoDia && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full px-3 py-1">
                          {rotuloDoDia(mensagem.criadoEm)}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-2 ${minha ? 'flex-row-reverse' : ''} ${continuacao ? 'mt-0.5' : 'mt-3'}`}>
                      {!minha && (
                        continuacao
                          ? <div className="w-8 shrink-0" />
                          : <Avatar nome={mensagem.autor?.nome} fotoUrl={mensagem.autor?.fotoUrl} tamanho="sm" />
                      )}
                      <div
                        className={`max-w-[78%] md:max-w-[65%] px-3.5 py-2 shadow-sm ${
                          minha
                            ? 'bg-[#183E6C] text-white rounded-2xl rounded-br-md'
                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-bl-md'
                        }`}
                      >
                        {!minha && !continuacao && (
                          <p className="text-xs font-bold text-[#F27405] mb-0.5">{mensagem.autor?.nome ?? 'Usuário removido'}</p>
                        )}
                        <p className="text-sm whitespace-pre-line wrap-break-word">{mensagem.conteudo}</p>
                        <p className={`text-[10px] mt-0.5 text-right ${minha ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatarHorario(mensagem.criadoEm)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <div ref={fimRef} />
        </div>

        {temNovasAbaixo && (
          <button
            type="button"
            onClick={irParaOFim}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[#F27405] text-white text-xs font-bold shadow-lg hover:bg-[#D96704]"
          >
            Novas mensagens ↓
          </button>
        )}
      </div>

      {/* Compositor */}
      <div className="px-4 md:px-6 py-3 border-t border-gray-100 dark:border-slate-800">
        {erroEnvio && <p role="alert" className="text-xs text-red-500 dark:text-red-400 mb-2">{erroEnvio}</p>}
        <div className="flex items-end gap-2">
          <textarea
            ref={compositorRef}
            rows={1}
            aria-label="Mensagem"
            placeholder="Escreva uma mensagem…"
            maxLength={4000}
            value={rascunho}
            onChange={(e) => { setRascunho(e.target.value); ajustarAltura(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleEnviar();
              }
            }}
            className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 resize-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!rascunho.trim()}
            aria-label="Enviar mensagem"
            className="w-10 h-10 rounded-full bg-[#F27405] text-white flex items-center justify-center hover:bg-[#D96704] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M13 5l7 7-7 7" /></svg>
          </button>
        </div>
        <p className="hidden md:block text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 ml-1">
          Enter para enviar · Shift + Enter para quebrar linha
        </p>
      </div>
    </div>
  );
}
