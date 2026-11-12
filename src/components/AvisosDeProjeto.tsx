// Avisos de projeto (concluído/cancelado) para quem é membro da equipe.
// Fica no LayoutBase, então aparece em qualquer tela da área logada: busca os
// pendentes ao abrir, a cada minuto e quando a aba volta ao foco. Fechar um
// aviso marca como visto no backend — ele não volta mais.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarAvisosPendentes, marcarAvisoComoVisto, type AvisoProjeto } from '../services/avisoService';

const INTERVALO_MS = 60_000;
const MAXIMO_VISIVEIS = 3;

export default function AvisosDeProjeto() {
  const [avisos, setAvisos] = useState<AvisoProjeto[]>([]);
  const navigate = useNavigate();

  const carregar = useCallback(() => {
    // Falha aqui não deve atrapalhar a tela: tenta de novo no próximo ciclo.
    listarAvisosPendentes().then(setAvisos).catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
    const intervalo = window.setInterval(carregar, INTERVALO_MS);
    const aoVoltarParaAba = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    document.addEventListener('visibilitychange', aoVoltarParaAba);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltarParaAba);
    };
  }, [carregar]);

  function fechar(aviso: AvisoProjeto) {
    // Otimista: some da tela na hora; se o PATCH falhar, volta na próxima busca.
    setAvisos((atuais) => atuais.filter((a) => a.id !== aviso.id));
    marcarAvisoComoVisto(aviso.id).catch(() => {});
  }

  function avaliarEquipe(aviso: AvisoProjeto) {
    fechar(aviso);
    navigate(`/detalhes/${aviso.projetoId}?aba=equipe`);
  }

  if (avisos.length === 0) return null;

  const visiveis = avisos.slice(0, MAXIMO_VISIVEIS);
  const restantes = avisos.length - visiveis.length;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-3"
    >
      {visiveis.map((aviso) => {
        const concluido = aviso.tipo === 'conclusao';
        return (
          <div
            key={aviso.id}
            role="status"
            data-testid={`aviso-${aviso.id}`}
            className={[
              'rounded-2xl border bg-white dark:bg-slate-900 shadow-lg p-4 flex flex-col gap-3',
              concluido
                ? 'border-purple-200 dark:border-primary/40'
                : 'border-red-200 dark:border-red-900/50',
            ].join(' ')}
          >
            <div className="flex flex-col gap-1">
              <p className={`text-sm font-bold ${concluido ? 'text-primary dark:text-purple-300' : 'text-red-700 dark:text-red-400'}`}>
                {concluido ? 'Projeto concluído' : 'Projeto cancelado'}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {concluido
                  ? <>“{aviso.projetoNome}” foi concluído. Agora você pode avaliar seus colegas de equipe.</>
                  : <>“{aviso.projetoNome}” foi cancelado pelo criador.</>}
              </p>
              {!concluido && aviso.motivo && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Motivo: {aviso.motivo}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => fechar(aviso)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                {concluido ? 'Depois' : 'Entendi'}
              </button>
              {concluido && (
                <button
                  type="button"
                  onClick={() => avaliarEquipe(aviso)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors"
                >
                  ★ Avaliar equipe
                </button>
              )}
            </div>
          </div>
        );
      })}

      {restantes > 0 && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          + {restantes} {restantes === 1 ? 'aviso' : 'avisos'}
        </p>
      )}
    </div>
  );
}
