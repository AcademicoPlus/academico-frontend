// Página "Explorar Pessoas" — lista paginada de usuários com busca por nome
// e filtros por curso e habilidade. Usa explorarPerfis() do usuarioService
// (GET /usuarios/explorar) e os padrões do projeto (apiFetch, construirQuery,
// PaginaResposta).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  explorarPerfis,
  type FiltroExplorarPerfis,
} from '../services/usuarioService';
import { apiFetch, type PaginaResposta } from '../services/apiClient';
import { listarCursos, type Curso } from '../services/cursoService';
import type { UsuarioResumo } from '../services/authService';
import Card from '../components/Card';
import ErroCard from '../components/ErroCard';
import EstadoVazio from '../components/EstadoVazio';
import Skeleton from '../components/Skeleton';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

// O endpoint /usuarios/explorar pode retornar habilidades além do UsuarioResumo
// base. Tipamos localmente para não alterar o service.
type HabilidadeResumo = { id: string; nome: string };

type UsuarioExplorar = UsuarioResumo & {
  habilidades?: HabilidadeResumo[];
};

type HabilidadeCatalogo = { id: string; nome: string };

// ─── Utilitários ──────────────────────────────────────────────────────────────

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/**
 * Badges de habilidade coloridos por categoria de acordo com o design system (mesmo padrão de Perfil.tsx):
 * - Design / UI / UX / Criativo: Roxo / Violeta (primary)
 * - Tecnologia / Código / Frontend / Backend / Dados: Teal / Verde
 * - Marketing / Negócios / Gestão: Rose / Coral
 * - Fallbacks cicláveis: Âmbar, Índigo, Sky, Esmeralda
 */
function obterEstiloHabilidade(nomeHabilidade: string): string {
  const norm = nomeHabilidade.toLowerCase().trim();

  // Design / UI / UX / Criação
  if (
    norm.includes('ui') ||
    norm.includes('ux') ||
    norm.includes('design') ||
    norm.includes('figma') ||
    norm.includes('cria') ||
    norm.includes('prototip')
  ) {
    return 'bg-purple-50 text-primary border border-purple-200/80 dark:bg-primary/15 dark:text-purple-300 dark:border-primary/30';
  }

  // Tecnologia / Desenvolvimento / Programação / Dados
  if (
    norm.includes('react') ||
    norm.includes('tech') ||
    norm.includes('dev') ||
    norm.includes('js') ||
    norm.includes('ts') ||
    norm.includes('code') ||
    norm.includes('program') ||
    norm.includes('python') ||
    norm.includes('java') ||
    norm.includes('node') ||
    norm.includes('sql') ||
    norm.includes('html') ||
    norm.includes('css') ||
    norm.includes('git') ||
    norm.includes('front') ||
    norm.includes('back')
  ) {
    return 'bg-teal-50 text-teal-700 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60';
  }

  // Marketing / Comunicação / Negócios / Gestão
  if (
    norm.includes('market') ||
    norm.includes('seo') ||
    norm.includes('gest') ||
    norm.includes('produt') ||
    norm.includes('comunic') ||
    norm.includes('venda') ||
    norm.includes('lead')
  ) {
    return 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
  }

  // Fallbacks determinísticos por hash (âmbar, índigo, sky, esmeralda)
  const paletas = [
    'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  ];

  let h = 0;
  for (let i = 0; i < nomeHabilidade.length; i++) h = (h * 31 + nomeHabilidade.charCodeAt(i)) >>> 0;
  return paletas[h % paletas.length];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700/80 shadow-xs p-6 flex flex-col justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-3/5 rounded-md" />
          <Skeleton className="h-3 w-2/5 rounded-md" />
        </div>
      </div>
      <div className="flex gap-1.5 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExplorarPessoas() {
  const navigate = useNavigate();

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [busca, setBusca] = useState('');
  const [idCursoSelecionado, setIdCursoSelecionado] = useState('');
  const [idHabilidadeSelecionada, setIdHabilidadeSelecionada] = useState('');

  // ── Dados ──────────────────────────────────────────────────────────────────
  const [usuarios, setUsuarios] = useState<UsuarioExplorar[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // ── Listas de filtro ───────────────────────────────────────────────────────
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [habilidadesCatalogo, setHabilidadesCatalogo] = useState<HabilidadeCatalogo[]>([]);

  // Debounce da busca por texto
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Filtros "commitados" (após debounce)
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroExplorarPerfis>({});

  // ── Carrega cursos e catálogo de habilidades uma vez ──────────────────────
  useEffect(() => {
    listarCursos()
      .then(setCursos)
      .catch(() => {/* select de cursos ficará vazio */});

    apiFetch<PaginaResposta<HabilidadeCatalogo>>('/habilidades?size=100')
      .then((res) => setHabilidadesCatalogo(res.content ?? []))
      .catch(() => {/* select de habilidades ficará vazio */});
  }, []);

  // ── Busca usuários sempre que o filtro ativo mudar ────────────────────────
  useEffect(() => {
    explorarPerfis({ ...filtroAtivo, tamanho: 20 })
      .then((res) => {
        setUsuarios((res.content ?? []) as UsuarioExplorar[]);
        setTotal(res.totalElements ?? null);
      })
      .catch((e: Error) => setErro(e.message ?? 'Erro ao carregar pessoas.'))
      .finally(() => setCarregando(false));
  }, [filtroAtivo]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Atualiza o filtro ativo já sinalizando o início do carregamento —
  // evita disparar setState de forma síncrona dentro do effect acima.
  function atualizarFiltroAtivo(
    atualizar: (f: FiltroExplorarPerfis) => FiltroExplorarPerfis,
  ) {
    setCarregando(true);
    setErro(null);
    setFiltroAtivo(atualizar);
  }

  function handleBusca(valor: string) {
    setBusca(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      atualizarFiltroAtivo((f) => ({ ...f, busca: valor || undefined, pagina: undefined }));
    }, 400);
  }

  function handleCurso(valor: string) {
    setIdCursoSelecionado(valor);
    atualizarFiltroAtivo((f) => ({ ...f, idCurso: valor || undefined, pagina: undefined }));
  }

  function handleHabilidade(valor: string) {
    setIdHabilidadeSelecionada(valor);
    atualizarFiltroAtivo((f) => ({ ...f, idHabilidade: valor || undefined, pagina: undefined }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const subtitulo = (() => {
    if (carregando) return 'Buscando…';

    if (total !== null) {
      return `${total} ${total === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}`;
    }

    return 'Encontre colaboradores por nome, curso ou habilidade';
  })();

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Explorar Pessoas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitulo}</p>
      </div>

      {/* Barra de busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4 rounded-2xl bg-background dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-xs">

        {/* Campo de busca */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => handleBusca(e.target.value)}
            placeholder="Buscar por nome ou curso..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4
                       text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none
                       focus:border-primary focus:ring-2 focus:ring-primary/20
                       transition-all duration-150"
          />
        </div>

        {/* Filtro por curso */}
        <div className="relative w-full sm:w-52 shrink-0">
          <select
            value={idCursoSelecionado}
            onChange={(e) => handleCurso(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-3.5 pr-9 text-sm
                       text-gray-700 dark:text-gray-200 outline-none focus:border-primary focus:ring-2
                       focus:ring-primary/20 transition-all duration-150 cursor-pointer"
          >
            <option value="">Todos os cursos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* Filtro por habilidade */}
        <div className="relative w-full sm:w-52 shrink-0">
          <select
            value={idHabilidadeSelecionada}
            onChange={(e) => handleHabilidade(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-3.5 pr-9 text-sm
                       text-gray-700 dark:text-gray-200 outline-none focus:border-primary focus:ring-2
                       focus:ring-primary/20 transition-all duration-150 cursor-pointer"
          >
            <option value="">Todas as habilidades</option>
            {habilidadesCatalogo.map((h) => (
              <option key={h.id} value={h.id}>{h.nome}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Erro */}
      {erro && <ErroCard>{erro}</ErroCard>}

      {/* Grid */}
      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : usuarios.length === 0 ? (
        <EstadoVazio
          icone="🔍"
          titulo="Nenhuma pessoa encontrada."
          descricao="Tente outros termos ou remova os filtros."
          className="py-16"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {usuarios.map((u) => (
            <Card
              key={u.id}
              onClick={() => navigate(`/usuarios/${u.id}`)}
              className="p-5 hover:border-primary/40 dark:hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="flex flex-col gap-3.5">

                {/* Avatar circular + nome + curso */}
                <div className="flex items-center gap-3.5">
                  {u.fotoUrl ? (
                    <img
                      src={u.fotoUrl}
                      alt={u.nome}
                      className="h-12 w-12 rounded-full object-cover shrink-0 ring-2 ring-primary/20 dark:ring-primary/30"
                    />
                  ) : (
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shrink-0 bg-gradient-to-tr from-primary via-[#6F60FA] to-[#9286FF] text-white shadow-xs ring-2 ring-primary/20 dark:ring-primary/30"
                    >
                      {iniciais(u.nome)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                      {u.nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {u.curso ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Badge de professor */}
                {u.permission === 'PROFESSOR' && (
                  <div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-primary border border-primary/20 dark:bg-primary/15 dark:text-purple-300 dark:border-primary/30">
                      Professor
                    </span>
                  </div>
                )}
              </div>

              {/* Habilidades como pills coloridas por categoria */}
              {(u.habilidades ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {(u.habilidades ?? []).slice(0, 3).map((h) => (
                    <span
                      key={h.id}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${obterEstiloHabilidade(h.nome)}`}
                    >
                      {h.nome}
                    </span>
                  ))}
                  {(u.habilidades ?? []).length > 3 && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 border border-gray-200/60 dark:border-slate-700">
                      +{(u.habilidades ?? []).length - 3}
                    </span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}

