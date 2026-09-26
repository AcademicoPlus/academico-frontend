// Caixa "Mensagens": lista de conversas (uma por projeto) à esquerda e a
// conversa aberta à direita. No celular mostra uma coisa de cada vez —
// /mensagens é a lista, /mensagens/:projetoId é a conversa.
import { Link, useParams } from 'react-router-dom';
import { useMeuPerfil } from '../hooks/useMeuPerfil';
import { useCaixaDeMensagens } from '../hooks/useCaixaDeMensagens';
import ListaConversas from '../components/mensagens/ListaConversas';
import ConversaAberta from '../components/mensagens/ConversaAberta';

export default function Mensagens() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const { data: meuPerfil } = useMeuPerfil();
  const meuId = meuPerfil?.id ?? null;
  const caixa = useCaixaDeMensagens(projetoId ?? null, meuId);

  const conversaAberta = projetoId ? caixa.conversas.find((c) => c.projeto.id === projetoId) ?? null : null;

  return (
    <div className="h-full max-w-6xl mx-auto flex bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <aside
        className={`${projetoId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 md:border-r border-gray-100 dark:border-slate-800 min-h-0`}
      >
        <ListaConversas
          conversas={caixa.conversas}
          carregando={caixa.carregandoConversas}
          erro={caixa.erroConversas}
          projetoAbertoId={projetoId ?? null}
          meuId={meuId}
        />
      </aside>

      <section className={`${projetoId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0 min-h-0`}>
        {conversaAberta ? (
          <ConversaAberta
            key={conversaAberta.projeto.id}
            conversa={conversaAberta}
            mensagens={caixa.mensagens}
            carregando={caixa.carregandoMensagens}
            erro={caixa.erroMensagens}
            conectado={caixa.conectado}
            meuId={meuId}
            onEnviar={caixa.enviar}
          />
        ) : projetoId && !caixa.carregandoConversas ? (
          <div className="m-auto text-center px-6">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Conversa não encontrada.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Você não faz mais parte da equipe deste projeto.</p>
            <Link to="/mensagens" className="inline-block mt-3 text-sm font-bold text-[#F27405] hover:underline">← Voltar às conversas</Link>
          </div>
        ) : (
          <div className="m-auto text-center px-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#F27405] flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.4-3.72A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Selecione uma conversa</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Escolha um projeto à esquerda para falar com a equipe.</p>
          </div>
        )}
      </section>
    </div>
  );
}
