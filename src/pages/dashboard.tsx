import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { recomendarProjetos, type ProjetoRecomendado } from '../services/recomendacaoService'
import { listarProjetosVinculados, type Projeto } from '../services/projetoService'
import { useMeuPerfil } from '../hooks/useMeuPerfil'
import { listarMinhasCandidaturas } from '../services/candidaturaService'
import { STATUS_PROJETO_BADGE, STATUS_PROJETO_LABEL } from '../utils/projeto'
import { useToast } from '../hooks/useToast'
import { ApiError } from '../services/apiClient'
import EstadoVazio from '../components/EstadoVazio'
import Skeleton from '../components/Skeleton'

// ─── Utilitários de Perfil ───────────────────────────────────────────────────
function formatarIniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

const avatarPalette = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
];

function obterCorAvatar(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
}

function obterEstiloHabilidade(nomeHabilidade: string): string {
  const norm = nomeHabilidade.toLowerCase().trim();
  if (norm.includes('ui/ux') || norm.includes('design')) {
    return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800';
  }
  if (norm.includes('figma') || norm.includes('marketing')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (norm.includes('react') || norm.includes('java') || norm.includes('front')) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800';
  }
  if (norm.includes('pesquisa') || norm.includes('ux')) {
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
  }
  let h = 0;
  for (let i = 0; i < nomeHabilidade.length; i++) h = (h * 31 + nomeHabilidade.charCodeAt(i)) >>> 0;
  const paletaFallback = [
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
    'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800',
  ];
  return paletaFallback[h % paletaFallback.length];
}

// ─── Dados do Banner ──────────────────────────────────────────────────────────
function mensagemErro(erro: unknown): string {
  return erro instanceof ApiError ? erro.message : 'Não foi possível carregar os dados do dashboard.';
}

// Resolução Recomendada: 1200 x 300 pixels ou 1200 x 350 pixels (uma proporção aproximada de 4:1 ou 16:9 um pouco mais achatada).
const BANNERS = [
  {
    id: 1,
    imagem: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 2,
    imagem: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 3,
    imagem: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
  }
];

export default function Dashboard() {
  const { data: meuPerfil } = useMeuPerfil();
  const { mostrarToast } = useToast();
  
  const [meusProjetos, setMeusProjetos] = useState<Projeto[]>([]);
  const [carregandoMeusProjetos, setCarregandoMeusProjetos] = useState(true);
  const [recomendados, setRecomendados] = useState<ProjetoRecomendado[]>([]);
  const [carregandoRecomendados, setCarregandoRecomendados] = useState(true);
  const [totalCandidaturasPendentes, setTotalCandidaturasPendentes] = useState<number | null>(null);
  const [totalProjetosAtivos, setTotalProjetosAtivos] = useState<number | null>(null);

  // Estados do Banner
  const [bannerAtual, setBannerAtual] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const proximoBanner = () => setBannerAtual((prev) => (prev === BANNERS.length - 1 ? 0 : prev + 1));
  const bannerAnterior = () => setBannerAtual((prev) => (prev === 0 ? BANNERS.length - 1 : prev - 1));

  useEffect(() => {
    const intervalo = setInterval(() => proximoBanner(), 5000);
    return () => clearInterval(intervalo);
  }, [bannerAtual]);

  const minSwipeDistance = 50;

  const onTouchStartEvent = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart('touches' in e ? e.targetTouches[0].clientX : (e as React.MouseEvent).clientX);
  };

  const onTouchMoveEvent = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd('touches' in e ? e.targetTouches[0].clientX : (e as React.MouseEvent).clientX);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) proximoBanner();
    if (distance < -minSwipeDistance) bannerAnterior();
  };

  useEffect(() => {
    // Criados por mim + os que participo; o total também alimenta o contador do perfil.
    listarProjetosVinculados({ tamanho: 3 })
      .then((pagina) => {
        setMeusProjetos(pagina.content);
        setTotalProjetosAtivos(pagina.totalElements);
      })
      .catch((erro) => mostrarToast(mensagemErro(erro), 'erro'))
      .finally(() => setCarregandoMeusProjetos(false));

    recomendarProjetos(5)
      .then(setRecomendados)
      .catch((erro) => mostrarToast(mensagemErro(erro), 'erro'))
      .finally(() => setCarregandoRecomendados(false));

    listarMinhasCandidaturas({ status: 'PENDENTE', tamanho: 1 })
      .then((pagina) => setTotalCandidaturasPendentes(pagina.totalElements))
      .catch((erro) => mostrarToast(mensagemErro(erro), 'erro'));

  }, [mostrarToast]);

  const primeiroNome = meuPerfil?.nome?.split(' ')[0] || '';
  const nomeCurso = meuPerfil?.curso?.nome ?? 'Estudante';
  const cursoEPeriodo = meuPerfil?.periodo != null ? `${nomeCurso} - ${meuPerfil.periodo}º período` : nomeCurso;
  
  const habilidades = (meuPerfil?.habilidades ?? []) as { id: string; habilidade: { id: string; nome: string }; nivel?: string }[];

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-7xl mx-auto">
      
      {/* Banner Rotativo (Topo) */}
      <div 
        className="relative w-full h-56 md:h-64 rounded-2xl overflow-hidden shadow-md group cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStartEvent}
        onTouchMove={onTouchMoveEvent}
        onTouchEnd={onTouchEndEvent}
        onMouseDown={onTouchStartEvent}
        onMouseMove={onTouchMoveEvent}
        onMouseUp={onTouchEndEvent}
        onMouseLeave={() => {
          if (touchStart) onTouchEndEvent();
          setTouchStart(null);
        }}
      >
        {BANNERS.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out select-none pointer-events-none ${
              index === bannerAtual ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={banner.imagem}
              alt=""
              className="w-full h-full object-cover"
              draggable="false"
            />
          </div>
        ))}

        <button onClick={(e) => { e.stopPropagation(); bannerAnterior(); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/20 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:block"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <button onClick={(e) => { e.stopPropagation(); proximoBanner(); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/20 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:block"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {BANNERS.map((_, index) => (
            <button key={index} onClick={(e) => { e.stopPropagation(); setBannerAtual(index); }} className={`h-2 rounded-full transition-all duration-300 ${index === bannerAtual ? 'bg-[#F27405] w-8' : 'bg-white/60 hover:bg-white w-2'}`} />
          ))}
        </div>
      </div>

      {/* Grid Principal Layout: Esquerda (Conteúdo) | Direita (Perfil + Recomendações) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* COLUNA ESQUERDA (Ocupa 2 espaços) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Cabeçalho de Boas Vindas */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div>
              <h1 className="text-2xl font-bold text-[#183E6C] dark:text-blue-300">
                Olá{primeiroNome ? `, ${primeiroNome}` : ''} 👋
              </h1>
              <p className="text-gray-500 dark:text-gray-300 text-sm mt-1">
                O que vamos construir hoje?
              </p>
            </div>
            <Link to="/criar-projeto" className="text-sm bg-[#183E6C] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-sm whitespace-nowrap">
              + Novo Projeto
            </Link>
          </div>

          {/* Seção Meus Projetos */}
          <div className="flex flex-col gap-4">
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
                  titulo="Você ainda não participa de nenhum projeto."
                  className="py-8"
                  acao={<Link to="/criar-projeto" className="text-[#F27405] font-bold hover:underline text-sm">Criar o primeiro →</Link>}
                />
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-700">
                  {meusProjetos.map((proj) => {
                    const percentual = proj.vagas > 0 ? Math.round((proj.vagasPreenchidas / proj.vagas) * 100) : 0;
                    return (
                      <Link key={proj.id} to={`/detalhes/${proj.id}`} className="p-5 block hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        
                        {/* AQUI ESTÁ O AJUSTE RESPONSIVO */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                          
                          {/* Área do Título e Habilidades */}
                          <div className="flex-1 w-full min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-bold text-[#183E6C] dark:text-blue-300 text-base truncate">{proj.titulo}</h3>
                              {meuPerfil && proj.criador && proj.criador.id !== meuPerfil.id && (
                                <span className="text-[10px] bg-orange-50 dark:bg-orange-950/40 text-[#F27405] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">Membro</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {proj.habilidadesNecessarias.slice(0, 3).map((h) => (
                                <span key={h.id} className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-[#183E6C] dark:text-blue-300 px-2 py-1 rounded font-bold border border-blue-100 dark:border-blue-800">
                                  {h.habilidade.nome}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Área da Barra de Progresso e Estado */}
                          <div className="flex flex-col items-start md:items-end shrink-0 w-full md:w-32 mt-2 md:mt-0">
                            <div className="flex justify-between items-center w-full md:w-auto">
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${STATUS_PROJETO_BADGE[proj.status]}`}>
                                {STATUS_PROJETO_LABEL[proj.status]}
                              </span>
                              {/* Oculto no Desktop, Visível no Mobile (alinhado à direita) */}
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium md:hidden">
                                {proj.vagasPreenchidas}/{proj.vagas} vagas
                              </span>
                            </div>
                            
                            <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full mt-3">
                              <div className="bg-[#183E6C] h-full rounded-full transition-all" style={{ width: `${percentual}%` }}></div>
                            </div>
                            
                            {/* Oculto no Mobile, Visível no Desktop */}
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium hidden md:block">
                              {proj.vagasPreenchidas}/{proj.vagas} vagas
                            </p>
                          </div>

                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (Ocupa 1 espaço) */}
        <div className="flex flex-col gap-6">
          
          {/* Card de Perfil Resumido */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-[#183E6C] relative"></div>
            
            <div className="px-5 pb-5 relative flex flex-col items-center text-center">
              <div className="-mt-12 mb-3 relative">
                <Link to={meuPerfil ? `/usuarios/${meuPerfil.id}` : '#'}>
                  {meuPerfil?.fotoUrl ? (
                    <img
                      src={meuPerfil.fotoUrl}
                      alt={meuPerfil.nome}
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-sm bg-white dark:bg-slate-900"
                    />
                  ) : (
                    <div
                      className={`h-24 w-24 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm flex items-center justify-center text-2xl font-bold bg-white dark:bg-slate-900 ${meuPerfil ? obterCorAvatar(meuPerfil.nome) : 'bg-gray-100 text-gray-500'}`}
                    >
                      {meuPerfil ? formatarIniciais(meuPerfil.nome) : '?'}
                    </div>
                  )}
                </Link>
              </div>

              {meuPerfil ? (
                <>
                  <Link to={`/usuarios/${meuPerfil.id}`} className="hover:underline flex items-center gap-1.5 justify-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {meuPerfil.nome}
                    </h2>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                    {cursoEPeriodo}
                  </p>
                  
                  {meuPerfil.bio && (
                    <p className="text-sm text-[#183E6C] dark:text-blue-300 mt-2 font-medium">
                      {meuPerfil.bio}
                    </p>
                  )}

                  {habilidades.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-3 w-full px-2">
                      {habilidades.slice(0, 4).map((h) => (
                        <span 
                          key={h.id} 
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${obterEstiloHabilidade(h.habilidade.nome)}`}
                        >
                          {h.habilidade.nome}
                        </span>
                      ))}
                      {habilidades.length > 4 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50">
                          +{habilidades.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 mt-2 w-full">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 dark:border-slate-800 divide-x divide-gray-100 dark:divide-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{totalProjetosAtivos ?? '-'}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mt-1">Projetos</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{totalCandidaturasPendentes ?? '-'}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mt-1">Candidaturas</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{recomendados.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mt-1">Sugestões</span>
              </div>
            </div>
          </div>

          {/* Seção: Recomendado para você */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#183E6C] dark:text-blue-300">Recomendado para você</h2>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden divide-y divide-gray-50 dark:divide-slate-700">
              {carregandoRecomendados ? (
                <div className="p-5 flex flex-col gap-3">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
              ) : recomendados.length === 0 ? (
                <EstadoVazio titulo="Nenhuma recomendação no momento." className="py-8" />
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
    </div>
  )
}