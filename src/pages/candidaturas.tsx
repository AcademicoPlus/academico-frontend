import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelarCandidatura,
  listarMinhasCandidaturas,
  type Candidatura,
  type StatusCandidatura,
} from '../services/candidaturaService';
import { ApiError } from '../services/apiClient';
import { STATUS_CANDIDATURA_BADGE, STATUS_CANDIDATURA_LABEL } from '../utils/candidatura';
import { formatarData } from '../utils/projeto';
import ErroCard from '../components/ErroCard';
import EstadoVazio from '../components/EstadoVazio';
import Skeleton from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';

const OPCOES_STATUS: StatusCandidatura[] = ['PENDENTE', 'ACEITO', 'REJEITADO'];

export default function Candidaturas() {
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusCandidatura | ''>('');
  const [candidaturaParaCancelar, setCandidaturaParaCancelar] = useState<Candidatura | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o loading ao trocar o filtro, antes do fetch abaixo
    setCarregando(true);
    listarMinhasCandidaturas({ status: filtroStatus || undefined, tamanho: 50 })
      .then((pagina) => {
        if (!ativo) return;
        setCandidaturas(pagina.content);
        setErro(null);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar suas candidaturas. Tente novamente.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [filtroStatus]);

  const contagem = {
    PENDENTE: candidaturas.filter((c) => c.status === 'PENDENTE').length,
    ACEITO: candidaturas.filter((c) => c.status === 'ACEITO').length,
    REJEITADO: candidaturas.filter((c) => c.status === 'REJEITADO').length,
  };

  async function handleCancelar() {
    if (!candidaturaParaCancelar) return;

    setCancelando(true);
    try {
      await cancelarCandidatura(candidaturaParaCancelar.id);
      setCandidaturas((atual) => atual.filter((c) => c.id !== candidaturaParaCancelar.id));
      setCandidaturaParaCancelar(null);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível cancelar a candidatura.');
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="pb-10 max-w-7xl mx-auto">

      {/* Cabeçalho Padronizado */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#183E6C]">
          Minhas Candidaturas
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{candidaturas.length} candidatura(s) no total</p>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{contagem.PENDENTE}</p>
          <p className="text-sm font-bold text-orange-500 bg-orange-50 dark:bg-orange-950/40 w-fit mx-auto px-3 py-1 rounded-full mt-2">🕒 Pendente</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{contagem.ACEITO}</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 w-fit mx-auto px-3 py-1 rounded-full mt-2">✓ Aceito</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{contagem.REJEITADO}</p>
          <p className="text-sm font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40 w-fit mx-auto px-3 py-1 rounded-full mt-2">✕ Rejeitado</p>
        </div>
      </div>

      {/* Filtro por status */}
      <div className="flex justify-end mb-6">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusCandidatura | '')}
          className="px-5 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#F27405] focus:ring-4 focus:ring-[#F27405]/10 font-medium text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer"
        >
          <option value="">Todos os status</option>
          {OPCOES_STATUS.map((status) => (
            <option key={status} value={status}>{STATUS_CANDIDATURA_LABEL[status]}</option>
          ))}
        </select>
      </div>

      {erro && <ErroCard className="mb-6">{erro}</ErroCard>}

      {carregando ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : candidaturas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 p-12 shadow-sm">
          <EstadoVazio
            titulo="Você ainda não se candidatou a nenhum projeto."
            acao={<Link to="/projetos" className="text-[#F27405] font-bold hover:underline text-sm">Explorar projetos →</Link>}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {candidaturas.map((candidatura) => (
            <div key={candidatura.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2 sm:gap-4">
                <Link to={`/detalhes/${candidatura.projeto.id}`} className="min-w-0">
                  <h3 className="font-bold text-lg text-[#183E6C] dark:text-blue-300 hover:text-[#F27405] transition-colors truncate">{candidatura.projeto.titulo}</h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Candidatou-se em {formatarData(candidatura.dataCandidatura)}</p>
                </Link>
                <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 self-start ${STATUS_CANDIDATURA_BADGE[candidatura.status]}`}>
                  {STATUS_CANDIDATURA_LABEL[candidatura.status]}
                </span>
              </div>

              {candidatura.mensagem && (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl mt-4 border border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">Sua Mensagem</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic">{candidatura.mensagem}</p>
                </div>
              )}

              {candidatura.status === 'REJEITADO' && candidatura.motivoRejeicao && (
                <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-xl mt-4 border border-red-100 dark:border-red-900/50">
                  <p className="text-xs font-bold text-red-400 dark:text-red-400 mb-2 uppercase tracking-wider">Motivo da Rejeição</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{candidatura.motivoRejeicao}</p>
                </div>
              )}

              <div className="flex justify-end items-center mt-4 gap-4">
                {candidatura.status === 'PENDENTE' && (
                  <button
                    type="button"
                    onClick={() => { setErro(null); setCandidaturaParaCancelar(candidatura); }}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Cancelar candidatura
                  </button>
                )}
                <Link to={`/detalhes/${candidatura.projeto.id}`} className="text-xs font-bold text-[#F27405] hover:underline">
                  Ver detalhes do projeto →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {candidaturaParaCancelar && (
        <ConfirmModal
          titulo="Cancelar candidatura"
          mensagem={`Cancelar sua candidatura ao projeto "${candidaturaParaCancelar.projeto.titulo}"?`}
          variante="perigo"
          confirmando={cancelando}
          onCancelar={() => { setCandidaturaParaCancelar(null); setErro(null); }}
          onConfirmar={handleCancelar}
        >
          {erro && <ErroCard>{erro}</ErroCard>}
        </ConfirmModal>
      )}
    </div>
  )
}
