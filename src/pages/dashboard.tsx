import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { recomendarProjetos, type ProjetoRecomendado } from '../services/recomendacaoService'
import { listarMeusProjetos, type Projeto } from '../services/projetoService'
import { useMeuPerfil } from '../hooks/useMeuPerfil'
import { listarMinhasCandidaturas } from '../services/candidaturaService'
import { STATUS_PROJETO_BADGE, STATUS_PROJETO_LABEL } from '../utils/projeto'
import { useToast } from '../hooks/useToast'
import { ApiError } from '../services/apiClient'
import EstadoVazio from '../components/EstadoVazio'
import Skeleton from '../components/Skeleton'

function mensagemErro(erro: unknown): string {
  return erro instanceof ApiError ? erro.message : 'Não foi possível carregar os dados do dashboard.';
}

export default function Dashboard() {
  const { data: meuPerfil } = useMeuPerfil();
  const { mostrarToast } = useToast();
  const [meusProjetos, setMeusProjetos] = useState<Projeto[]>([]);
  const [carregandoMeusProjetos, setCarregandoMeusProjetos] = useState(true);
  const [recomendados, setRecomendados] = useState<ProjetoRecomendado[]>([]);
  const [carregandoRecomendados, setCarregandoRecomendados] = useState(true);
  const [totalCandidaturasPendentes, setTotalCandidaturasPendentes] = useState<number | null>(null);
  const [totalProjetosAtivos, setTotalProjetosAtivos] = useState<number | null>(null);

  useEffect(() => {
    listarMeusProjetos({ tamanho: 3 })
      .then((pagina) => setMeusProjetos(pagina.content))
      .catch((erro) => mostrarToast(mensagemErro(erro), 'erro'))
      .finally(() => setCarregandoMeusProjetos(false));

    recomendarProjetos(5)
      .then(setRecomendados)
      .catch((erro) => mostrarToast(mensagemErro(erro), 'erro'))
      .finally(() => setCarregandoRecomendados(false));

    listarMinhasCandidaturas({ status: 'PENDENTE', tamanho: 1 })
      .then((pagina) => setTotalCandidaturasPendentes(pagina.totalElements))
      .catch((erro) => mostrarToast(mensagemErro(erro), 'erro'));

    listarMeusProjetos({ status: 'ABERTO', tamanho: 1 })
      .then((pagina) => setTotalProjetosAtivos(pagina.totalElements))
      .catch((erro) => mostrarToast(mensagemErro(erro), 'erro'));
  }, [mostrarToast]);

  const primeiroNome = meuPerfil?.nome.split(' ')[0];

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-7xl mx-auto">
      
      {/* Cabeçalho Padronizado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          {/* MESMA FONTE DO PROJETOS.TSX */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#183E6C] dark:text-blue-300">
            Olá{primeiroNome ? `, ${primeiroNome}` : ''} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-300 text-sm mt-1">
            Bem-vindo(a) de volta ao Acadêmico+
          </p>
        </div>
        <Link to="/criar-projeto" className="text-sm bg-[#183E6C] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-sm">
          + Novo Projeto
        </Link>
      </div>

      {/* Métricas Minimalistas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Projetos ativos', value: totalProjetosAtivos?.toString() ?? '—', border: 'border-blue-200' },
          { label: 'Candidaturas', value: totalCandidaturasPendentes?.toString() ?? '—', border: 'border-orange-200' },
          { label: 'Recomendações', value: recomendados.length.toString(), border: 'border-green-200' },
        ].map((item, i) => (
          <div key={i} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border-l-4 ${item.border} border-y border-r border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between`}>
            <div>
              <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{item.label}</p>
              <p className="text-2xl font-bold text-[#183E6C] dark:text-blue-300 mt-1">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* Coluna Principal: Meus Projetos */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#183E6C] dark:text-blue-300">Meus Projetos</h2>
            <Link to="/projetos" className="text-sm text-[#F27405] font-bold hover:underline">Ver todos</Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-2">
            {carregandoMeusProjetos ? (
              <div className="p-5 flex flex-col gap-3">
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ) : meusProjetos.length === 0 ? (
              <EstadoVazio
                titulo="Você ainda não criou nenhum projeto."
                className="py-8"
                acao={<Link to="/criar-projeto" className="text-[#F27405] font-bold hover:underline text-sm">Criar o primeiro →</Link>}
              />
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {meusProjetos.map((proj) => {
                  const percentual = proj.vagas > 0 ? Math.round((proj.vagasPreenchidas / proj.vagas) * 100) : 0;
                  return (
                    <Link key={proj.id} to={`/detalhes/${proj.id}`} className="p-5 block hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-[#183E6C] dark:text-blue-300 text-base">{proj.titulo}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {proj.habilidadesNecessarias.slice(0, 3).map((h) => (
                              <span key={h.id} className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-[#183E6C] dark:text-blue-300 px-2 py-1 rounded font-bold border border-blue-100 dark:border-blue-800">
                                {h.habilidade.nome}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 w-32">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${STATUS_PROJETO_BADGE[proj.status]}`}>
                            {STATUS_PROJETO_LABEL[proj.status]}
                          </span>
                          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full mt-3">
                            <div className="bg-[#183E6C] h-full rounded-full" style={{ width: `${percentual}%` }}></div>
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">{proj.vagasPreenchidas}/{proj.vagas} vagas</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Lateral: Recomendações */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-[#183E6C] dark:text-blue-300">Recomendado para você</h2>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden divide-y divide-gray-50 dark:divide-slate-700">
            {carregandoRecomendados ? (
              <div className="p-5 flex flex-col gap-3">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ) : recomendados.length === 0 ? (
              <EstadoVazio titulo="Nenhuma recomendação baseada nas suas habilidades." className="py-8" />
            ) : (
              recomendados.map(({ projeto }) => (
                <Link key={projeto.id} to={`/detalhes/${projeto.id}`} className="p-5 block hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group">
                  <h4 className="font-bold text-sm text-[#183E6C] dark:text-blue-300 group-hover:text-[#F27405] transition-colors leading-tight line-clamp-2">
                    {projeto.titulo}
                  </h4>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-300 font-medium truncate pr-2">{projeto.criador?.nome ?? 'Autor desconhecido'}</p>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/50 px-2 py-1 rounded whitespace-nowrap">
                      Visualizar
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}