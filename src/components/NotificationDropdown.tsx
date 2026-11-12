import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../services/apiClient';
import {
  aceitarConvite,
  listarConvitesRecebidos,
  notificarConvitesAtualizados,
  recusarConvite,
  type Convite,
} from '../services/conviteService';
import {
  listarAvisosPendentes,
  marcarAvisoComoVisto,
  notificarAvisosAtualizados,
  type AvisoProjeto,
} from '../services/avisoService';

interface NotificationDropdownProps {
  onClose: () => void;
}

// Notificações: convites de projeto pendentes e avisos de projeto (concluído
// ou cancelado) para quem é membro da equipe.
export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const [convites, setConvites] = useState<Convite[]>([]);
  const [avisos, setAvisos] = useState<AvisoProjeto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Uma fonte falhar não esconde a outra.
    Promise.allSettled([
      listarConvitesRecebidos({ status: 'PENDENTE', tamanho: 20 }),
      listarAvisosPendentes(),
    ])
      .then(([resultadoConvites, resultadoAvisos]) => {
        if (resultadoConvites.status === 'fulfilled') setConvites(resultadoConvites.value.content);
        if (resultadoAvisos.status === 'fulfilled') setAvisos(resultadoAvisos.value);
        if (resultadoConvites.status === 'rejected' || resultadoAvisos.status === 'rejected') {
          setErro('Não foi possível carregar todas as notificações.');
        }
      })
      .finally(() => setCarregando(false));
  }, []);

  async function responder(convite: Convite, aceitar: boolean) {
    setErro(null);
    setRespondendoId(convite.id);
    try {
      await (aceitar ? aceitarConvite(convite.id) : recusarConvite(convite.id));
      setConvites((atuais) => atuais.filter((c) => c.id !== convite.id));
      notificarConvitesAtualizados();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível responder ao convite.');
    } finally {
      setRespondendoId(null);
    }
  }

  function dispensar(aviso: AvisoProjeto) {
    // Otimista: some da lista na hora. Se o PATCH falhar, o aviso volta na
    // próxima vez que as notificações forem abertas.
    setAvisos((atuais) => atuais.filter((a) => a.id !== aviso.id));
    marcarAvisoComoVisto(aviso.id)
      .catch(() => {})
      .finally(notificarAvisosAtualizados);
  }

  function avaliarEquipe(aviso: AvisoProjeto) {
    dispensar(aviso);
    onClose();
    navigate(`/detalhes/${aviso.projetoId}?aba=equipe`);
  }

  const vazio = convites.length === 0 && avisos.length === 0;

  return (
    <div className="absolute top-14 right-0 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-lg rounded-xl z-50 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
        <h3 className="font-semibold text-[#183E6C] dark:text-blue-300">Notificações</h3>
        <button
          onClick={onClose}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium"
        >
          Fechar
        </button>
      </div>

      {erro && <p role="alert" className="px-4 pt-3 text-xs text-red-500 dark:text-red-400">{erro}</p>}

      <div className="max-h-80 overflow-y-auto">
        {carregando ? (
          <div className="p-6 text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Carregando…</div>
        ) : vazio ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Você não tem novas notificações no momento.
          </div>
        ) : (
          <>
            {avisos.map((aviso) => {
              const concluido = aviso.tipo === 'conclusao';
              return (
                <div key={aviso.id} data-testid={`aviso-${aviso.id}`} className="p-4 border-b border-gray-50 dark:border-slate-700">
                  <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${concluido ? 'text-primary dark:text-purple-300' : 'text-red-600 dark:text-red-400'}`}>
                    {concluido ? 'Projeto concluído' : 'Projeto cancelado'}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="font-semibold">{aviso.projetoNome}</span>
                    {concluido
                      ? ' foi concluído. Agora você pode avaliar seus colegas de equipe.'
                      : ' foi cancelado pelo criador.'}
                  </p>
                  {!concluido && aviso.motivo && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Motivo: {aviso.motivo}</p>
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => dispensar(aviso)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Dispensar
                    </button>
                    {concluido && (
                      <button
                        type="button"
                        onClick={() => avaliarEquipe(aviso)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors"
                      >
                        ★ Avaliar equipe
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {convites.map((convite) => (
              <div key={convite.id} className="p-4 border-b border-gray-50 dark:border-slate-700">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">{convite.convidante?.nome ?? 'Alguém'}</span> convidou você para{' '}
                  <Link
                    to={`/detalhes/${convite.projeto.id}`}
                    onClick={onClose}
                    className="font-semibold text-[#F27405] hover:underline"
                  >
                    {convite.projeto.titulo}
                  </Link>
                  {convite.funcao && <> como <span className="font-semibold">{convite.funcao}</span></>}.
                </p>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => responder(convite, false)}
                    disabled={respondendoId === convite.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                  >
                    Recusar
                  </button>
                  <button
                    type="button"
                    onClick={() => responder(convite, true)}
                    disabled={respondendoId === convite.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors disabled:opacity-60"
                  >
                    Aceitar
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
