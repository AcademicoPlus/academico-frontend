import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listarProjetos, type Projeto, type StatusProjeto } from '../services/projetoService'
import { STATUS_PROJETO_BADGE, STATUS_PROJETO_LABEL, iniciaisDoNome } from '../utils/projeto'
import ErroCard from '../components/ErroCard'
import EstadoVazio from '../components/EstadoVazio'
import Skeleton from '../components/Skeleton'

const OPCOES_STATUS: StatusProjeto[] = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];
const ATRASO_BUSCA_MS = 400;

export default function Projetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [totalElementos, setTotalElementos] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [status, setStatus] = useState<StatusProjeto | ''>('');

  useEffect(() => {
    const temporizador = setTimeout(() => setBuscaAplicada(busca.trim()), ATRASO_BUSCA_MS);
    return () => clearTimeout(temporizador);
  }, [busca]);

  useEffect(() => {
    let ativo = true;
    listarProjetos({ busca: buscaAplicada || undefined, status: status || undefined, tamanho: 20 })
      .then((pagina) => {
        if (!ativo) return;
        setProjetos(pagina.content);
        setTotalElementos(pagina.totalElements);
        setErro(null);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar os projetos. Tente novamente.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [buscaAplicada, status]);

  return (
    <div className="pb-12 max-w-7xl mx-auto">
      
      {/* Header e Ação Principal */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#183E6C] dark:text-blue-300 tracking-tight">Explorar Projetos</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2 font-medium">{totalElementos} oportunidades disponíveis no momento</p>
        </div>
        <Link to="/criar-projeto" className="bg-[#F27405] text-white px-8 py-3.5 rounded-xl font-extrabold shadow-lg shadow-[#F27405]/30 hover:bg-[#D96704] hover:-translate-y-0.5 transition-all text-center w-full md:w-auto">
          + Criar Novo Projeto
        </Link>
      </header>

      {/* Filtros de Busca */}
      <section className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Buscar por título, tag ou área..." 
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setCarregando(true); }}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:border-[#F27405] focus:ring-4 focus:ring-[#F27405]/10 text-gray-700 dark:text-gray-100 shadow-sm transition-all"
          />
          <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as StatusProjeto | ''); setCarregando(true); }}
          className="px-6 py-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:border-[#F27405] focus:ring-4 focus:ring-[#F27405]/10 font-medium text-gray-700 dark:text-gray-100 shadow-sm cursor-pointer min-w-50"
        >
          <option value="">Todos os status</option>
          {OPCOES_STATUS.map((opcao) => (
            <option key={opcao} value={opcao}>{STATUS_PROJETO_LABEL[opcao]}</option>
          ))}
        </select>
      </section>

      {erro && <ErroCard className="mb-6">{erro}</ErroCard>}

      {carregando ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col gap-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : projetos.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 p-12 shadow-sm">
          <EstadoVazio titulo="Nenhum projeto encontrado com os filtros atuais." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {projetos.map((proj) => (
            <div key={proj.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden group hover:shadow-[0_15px_40px_rgb(0,0,0,0.08)] transition-all duration-300">

              {/* Capa do Card Clicável */}
              <Link to={`/detalhes/${proj.id}`} className="relative h-36 sm:h-56 overflow-hidden bg-linear-to-br from-[#183E6C] to-[#0B1D33] block cursor-pointer">
                {proj.bannerUrl && (
                  <img
                    src={proj.bannerUrl}
                    alt={`Capa do projeto ${proj.titulo}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-[#0B1D33]/90 via-[#0B1D33]/20 to-transparent"></div>
                
                <div className="absolute top-4 right-4 z-10">
                  <span className={`bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm ${STATUS_PROJETO_BADGE[proj.status]}`}>
                    {STATUS_PROJETO_LABEL[proj.status]}
                  </span>
                </div>
                
                <h3 className="absolute bottom-4 left-6 right-6 font-extrabold text-2xl text-white leading-tight drop-shadow-md">
                  {proj.titulo}
                </h3>
              </Link>
              
              <div className="p-6 md:p-8 flex flex-col flex-1">
                <p className="text-gray-500 dark:text-gray-300 mb-6 line-clamp-3 leading-relaxed">
                  {proj.descricao}
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
                  {proj.habilidadesNecessarias.map(h => (
                    <span key={h.id} className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg font-bold">
                      {h.habilidade.nome}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-5 border-t border-gray-100 dark:border-slate-700 mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#F27405] flex justify-center items-center font-black border border-orange-100 dark:border-orange-900/50">
                      {proj.criador ? iniciaisDoNome(proj.criador.nome) : '?'}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-[#183E6C] dark:text-blue-300">{proj.criador?.nome ?? 'Usuário removido'}</span>
                    </div>
                  </div>

                  <Link to={`/detalhes/${proj.id}`} className="text-sm font-extrabold text-[#F27405] bg-orange-50 dark:bg-orange-950/40 px-5 py-2.5 rounded-xl hover:bg-[#F27405] hover:text-white transition-colors">
                    Detalhes →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}