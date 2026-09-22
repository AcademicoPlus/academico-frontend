import { Link, useParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../services/apiClient';
import {
  atualizarProjeto,
  alterarStatusProjeto,
  buscarProjetoPorId,
  type ProjetoDetalhe,
  type StatusProjeto,
} from '../services/projetoService';
import { listarHabilidades, type Habilidade } from '../services/habilidadeService';
import {
  alterarObrigatoriedadeHabilidade,
  desvincularHabilidadeDoProjeto,
  vincularHabilidadeAoProjeto,
} from '../services/projetoHabilidadeService';
import { obterMeuPerfilCache } from '../hooks/useMeuPerfil';
import {
  ANOS_MAXIMOS_PRAZO,
  STATUS_PROJETO_LABEL,
  adicionarAnos,
  formatarDataISO,
} from '../utils/projeto';

const TODOS_STATUS: StatusProjeto[] = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];

const statusBadgeDesign: Record<StatusProjeto, string> = {
  ABERTO: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  EM_ANDAMENTO: 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  CONCLUIDO: 'bg-purple-50 text-primary border border-purple-200/80 dark:bg-primary/15 dark:text-purple-300 dark:border-primary/30',
  CANCELADO: 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
};

// Espelha ProjetoService.validarTransicaoStatus (backend): só sai de status
// final quem nunca entrou nele — ABERTO/EM_ANDAMENTO trocam livremente entre
// si e para qualquer status; CONCLUIDO/CANCELADO não saem mais de lá.
function transicoesDisponiveis(atual: StatusProjeto): StatusProjeto[] {
  if (atual === 'CONCLUIDO' || atual === 'CANCELADO') return [];
  return TODOS_STATUS.filter((status) => status !== atual);
}

/**
 * Badges de habilidade coloridos por categoria de acordo com o design system:
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

function obterContainerHabilidade(nomeHabilidade: string): string {
  const norm = nomeHabilidade.toLowerCase().trim();
  if (
    norm.includes('ui') ||
    norm.includes('ux') ||
    norm.includes('design') ||
    norm.includes('figma') ||
    norm.includes('cria') ||
    norm.includes('prototip')
  ) {
    return 'border-purple-200/70 bg-purple-50/40 dark:border-purple-900/40 dark:bg-purple-950/20';
  }
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
    return 'border-teal-200/70 bg-teal-50/40 dark:border-teal-900/40 dark:bg-teal-950/20';
  }
  if (
    norm.includes('market') ||
    norm.includes('seo') ||
    norm.includes('gest') ||
    norm.includes('produt') ||
    norm.includes('comunic') ||
    norm.includes('venda') ||
    norm.includes('lead')
  ) {
    return 'border-rose-200/70 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20';
  }
  return 'border-gray-200/80 bg-gray-50/60 dark:border-slate-700/70 dark:bg-slate-800/40';
}

export default function EditarProjetoRota() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-6 py-2 pb-16">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Projeto não encontrado.</p>
        <Link to="/projetos" className="text-primary font-semibold hover:underline">← Voltar para projetos</Link>
      </div>
    );
  }

  // key={id} força remontar ao trocar de projeto — mesmo padrão da tela de detalhes.
  return <EditarProjeto key={id} id={id} />;
}

function EditarProjeto({ id }: { id: string }) {
  const [projeto, setProjeto] = useState<ProjetoDetalhe | null>(null);
  const [souCriador, setSouCriador] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vagas, setVagas] = useState('1');
  const [dataFim, setDataFim] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});

  const [buscaHabilidade, setBuscaHabilidade] = useState('');
  const [sugestoes, setSugestoes] = useState<Habilidade[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [erroBuscaHabilidade, setErroBuscaHabilidade] = useState<string | null>(null);
  const [habilidadeEmAcao, setHabilidadeEmAcao] = useState<string | null>(null);
  const [erroHabilidade, setErroHabilidade] = useState<string | null>(null);

  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  useEffect(() => {
    let ativo = true;
    Promise.all([buscarProjetoPorId(id), obterMeuPerfilCache().catch(() => null)])
      .then(([detalhe, meuPerfil]) => {
        if (!ativo) return;
        setProjeto(detalhe);
        setSouCriador(meuPerfil !== null && detalhe.criador?.id === meuPerfil.id);
        setTitulo(detalhe.titulo);
        setDescricao(detalhe.descricao);
        setVagas(String(detalhe.vagas));
        setDataFim(detalhe.dataFim ? detalhe.dataFim.slice(0, 10) : '');
      })
      .catch((erroCapturado) => {
        if (!ativo) return;
        setErroCarregamento(
          erroCapturado instanceof ApiError && erroCapturado.status === 404
            ? 'Projeto não encontrado.'
            : 'Não foi possível carregar este projeto. Tente novamente.',
        );
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [id]);

  // Busca no catálogo (debounced, min. 2 caracteres) — nunca carrega o
  // catálogo inteiro de uma vez, só a fatia que combina com o termo digitado.
  useEffect(() => {
    if (buscaHabilidade.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa as sugestões ao esvaziar a busca
      setSugestoes([]);
      return;
    }
    const idsJaVinculados = new Set((projeto?.habilidadesNecessarias ?? []).map((h) => h.habilidade.id));
    const temporizador = setTimeout(() => {
      setBuscandoSugestoes(true);
      setErroBuscaHabilidade(null);
      listarHabilidades({ busca: buscaHabilidade.trim(), tamanho: 8 })
        .then((pagina) => setSugestoes(pagina.content.filter((h) => !idsJaVinculados.has(h.id))))
        .catch(() => setErroBuscaHabilidade('Não foi possível buscar habilidades.'))
        .finally(() => setBuscandoSugestoes(false));
    }, 350);
    return () => clearTimeout(temporizador);
  }, [buscaHabilidade, projeto?.habilidadesNecessarias]);

  function validar(): Record<string, string> {
    const erros: Record<string, string> = {};

    const tituloAparado = titulo.trim();
    if (!tituloAparado) {
      erros.titulo = 'Título é obrigatório.';
    } else if (tituloAparado.length < 5 || tituloAparado.length > 255) {
      erros.titulo = 'Título deve ter entre 5 e 255 caracteres.';
    }

    const descricaoAparada = descricao.trim();
    if (!descricaoAparada) {
      erros.descricao = 'Descrição é obrigatória.';
    } else if (descricaoAparada.length < 20) {
      erros.descricao = 'Descrição deve ter no mínimo 20 caracteres.';
    }

    const vagasNumero = Number(vagas);
    const minimoVagas = projeto?.totalMembros ?? 1;
    if (!vagas.trim() || Number.isNaN(vagasNumero)) {
      erros.vagas = 'Número de vagas é obrigatório.';
    } else if (vagasNumero < 1) {
      erros.vagas = 'Deve ter no mínimo 1 vaga.';
    } else if (vagasNumero < minimoVagas) {
      erros.vagas = `Não pode ser menor que os ${minimoVagas} membros já no projeto.`;
    }

    // Diferente da criação, uma data de fim já vencida é permitida aqui (um
    // projeto em andamento pode manter o prazo original) — só barramos lixo
    // de input (ver ANOS_MAXIMOS_PRAZO) e datas impossíveis.
    if (dataFim) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
        erros.dataFim = 'Data de fim inválida.';
      } else {
        const fim = new Date(`${dataFim}T23:59:59`);
        const limite = adicionarAnos(new Date(), ANOS_MAXIMOS_PRAZO);
        if (Number.isNaN(fim.getTime())) {
          erros.dataFim = 'Data de fim inválida.';
        } else if (fim.getTime() > limite.getTime()) {
          erros.dataFim = `Data de fim não pode passar de ${ANOS_MAXIMOS_PRAZO} anos a partir de hoje.`;
        }
      }
    }

    return erros;
  }

  function limparErroCampo(campo: string) {
    setErrosCampo((atual) => {
      if (!(campo in atual)) return atual;
      const proximo = { ...atual };
      delete proximo[campo];
      return proximo;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    const errosValidacao = validar();
    setErrosCampo(errosValidacao);
    if (Object.keys(errosValidacao).length > 0) {
      setErro('Corrija os campos destacados antes de continuar.');
      return;
    }

    setSalvando(true);
    try {
      const atualizado = await atualizarProjeto(id, {
        titulo,
        descricao,
        vagas: Number(vagas),
        dataFim: dataFim ? `${dataFim}T23:59:59` : undefined,
      });
      setProjeto(atualizado);
      setSucesso('Alterações salvas.');
    } catch (erroCapturado) {
      if (erroCapturado instanceof ApiError) {
        setErro(erroCapturado.message);
        if (erroCapturado.erros) {
          const mapa: Record<string, string> = {};
          for (const { campo, mensagem } of erroCapturado.erros) {
            mapa[campo] = mensagem;
          }
          setErrosCampo(mapa);
        }
      } else {
        setErro('Não foi possível conectar ao servidor. Tente novamente.');
      }
    } finally {
      setSalvando(false);
    }
  }

  const habilidadesSelecionadas = projeto?.habilidadesNecessarias ?? [];

  async function handleAdicionarHabilidade(habilidadeId: string) {
    setErroHabilidade(null);
    setHabilidadeEmAcao(habilidadeId);
    try {
      const vinculo = await vincularHabilidadeAoProjeto(id, habilidadeId, false);
      setProjeto((atual) => (atual ? { ...atual, habilidadesNecessarias: [...atual.habilidadesNecessarias, vinculo] } : atual));
      setBuscaHabilidade('');
      setSugestoes([]);
    } catch (erroCapturado) {
      setErroHabilidade(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível adicionar a habilidade.');
    } finally {
      setHabilidadeEmAcao(null);
    }
  }

  async function handleRemoverHabilidade(habilidadeId: string) {
    setErroHabilidade(null);
    setHabilidadeEmAcao(habilidadeId);
    try {
      await desvincularHabilidadeDoProjeto(id, habilidadeId);
      setProjeto((atual) =>
        atual
          ? { ...atual, habilidadesNecessarias: atual.habilidadesNecessarias.filter((h) => h.habilidade.id !== habilidadeId) }
          : atual,
      );
    } catch (erroCapturado) {
      setErroHabilidade(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível remover a habilidade.');
    } finally {
      setHabilidadeEmAcao(null);
    }
  }

  async function handleAlternarObrigatoria(habilidadeId: string, obrigatoriaAtual: boolean) {
    setErroHabilidade(null);
    setHabilidadeEmAcao(habilidadeId);
    try {
      const atualizado = await alterarObrigatoriedadeHabilidade(id, habilidadeId, !obrigatoriaAtual);
      setProjeto((atual) =>
        atual
          ? {
              ...atual,
              habilidadesNecessarias: atual.habilidadesNecessarias.map((h) =>
                h.habilidade.id === habilidadeId ? atualizado : h,
              ),
            }
          : atual,
      );
    } catch (erroCapturado) {
      setErroHabilidade(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível atualizar a habilidade.');
    } finally {
      setHabilidadeEmAcao(null);
    }
  }

  async function handleMudarStatus(novoStatus: StatusProjeto, motivo?: string) {
    setErroStatus(null);
    setAlterandoStatus(true);
    try {
      const atualizado = await alterarStatusProjeto(id, novoStatus, motivo);
      setProjeto(atualizado);
      setConfirmandoCancelamento(false);
      setMotivoCancelamento('');
    } catch (erroCapturado) {
      setErroStatus(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível alterar o status.');
    } finally {
      setAlterandoStatus(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (erroCarregamento || !projeto) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-6 py-2 pb-16">
        <Link
          to="/projetos"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-purple-400 transition-colors group cursor-pointer"
        >
          <span className="h-7 w-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-2xs group-hover:border-primary/40 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span>Voltar para projetos</span>
        </Link>
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center text-gray-500 dark:text-gray-400">
          {erroCarregamento ?? 'Projeto não encontrado.'}
        </div>
      </div>
    );
  }

  if (souCriador === false) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-6 py-2 pb-16">
        <Link
          to={`/detalhes/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-purple-400 transition-colors group cursor-pointer"
        >
          <span className="h-7 w-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-2xs group-hover:border-primary/40 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span>Voltar para o projeto</span>
        </Link>
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center text-gray-500 dark:text-gray-400">
          Você não tem permissão para editar este projeto.
        </div>
      </div>
    );
  }

  const statusFinal = projeto.status === 'CONCLUIDO' || projeto.status === 'CANCELADO';

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-2 pb-16">
      {/* Navegação Superior */}
      <div>
        <Link
          to={`/detalhes/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-purple-400 transition-colors group cursor-pointer"
        >
          <span className="h-7 w-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-2xs group-hover:border-primary/40 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span>Voltar para o projeto</span>
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Editar projeto
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{projeto.titulo}</p>
      </div>

      {/* Card 1: Informações Básicas */}
      <section className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] p-5 sm:p-7 md:p-8 flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-primary dark:text-purple-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Informações Básicas</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Edite os dados principais do projeto</p>
          </div>
        </div>

        {erro && (
          <div role="alert" className="rounded-xl border border-red-200/90 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div role="status" className="rounded-xl border border-green-200/90 bg-green-50/90 dark:bg-green-950/40 dark:border-green-900/50 p-4 text-sm text-green-700 dark:text-green-300 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{sucesso}</span>
          </div>
        )}

        {statusFinal && (
          <div className="rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700 p-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Projetos com status <span className="font-semibold text-gray-700 dark:text-gray-200">{STATUS_PROJETO_LABEL[projeto.status]}</span> não podem ser editados.
          </div>
        )}

        <fieldset disabled={statusFinal} className="flex flex-col gap-5 disabled:opacity-50">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            {/* Título do projeto */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Título do projeto
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => { setTitulo(e.target.value); limparErroCampo('titulo'); }}
                aria-invalid={!!errosCampo.titulo}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition-all duration-150 ${
                  errosCampo.titulo
                    ? 'border-red-400 dark:border-red-500/80 bg-red-50/30 dark:bg-red-950/20 focus:border-red-400 focus:ring-4 focus:ring-red-400/10'
                    : 'border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-800'
                }`}
              />
              {errosCampo.titulo && (
                <p role="alert" className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errosCampo.titulo}
                </p>
              )}
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Descrição
              </label>
              <textarea
                value={descricao}
                onChange={(e) => { setDescricao(e.target.value); limparErroCampo('descricao'); }}
                rows={5}
                aria-invalid={!!errosCampo.descricao}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none resize-y min-h-[120px] transition-all duration-150 ${
                  errosCampo.descricao
                    ? 'border-red-400 dark:border-red-500/80 bg-red-50/30 dark:bg-red-950/20 focus:border-red-400 focus:ring-4 focus:ring-red-400/10'
                    : 'border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-800'
                }`}
              />
              {errosCampo.descricao && (
                <p role="alert" className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errosCampo.descricao}
                </p>
              )}
            </div>

            {/* Vagas e Prazo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Número de vagas
                </label>
                <input
                  type="number"
                  min={1}
                  value={vagas}
                  onChange={(e) => { setVagas(e.target.value); limparErroCampo('vagas'); }}
                  aria-invalid={!!errosCampo.vagas}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition-all duration-150 ${
                    errosCampo.vagas
                      ? 'border-red-400 dark:border-red-500/80 bg-red-50/30 dark:bg-red-950/20 focus:border-red-400 focus:ring-4 focus:ring-red-400/10'
                      : 'border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-800'
                  }`}
                />
                {errosCampo.vagas && (
                  <p role="alert" className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errosCampo.vagas}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Prazo final (opcional)
                </label>
                <input
                  type="date"
                  value={dataFim}
                  max={formatarDataISO(adicionarAnos(new Date(), ANOS_MAXIMOS_PRAZO))}
                  onChange={(e) => { setDataFim(e.target.value); limparErroCampo('dataFim'); }}
                  aria-invalid={!!errosCampo.dataFim}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none transition-all duration-150 ${
                    errosCampo.dataFim
                      ? 'border-red-400 dark:border-red-500/80 bg-red-50/30 dark:bg-red-950/20 focus:border-red-400 focus:ring-4 focus:ring-red-400/10'
                      : 'border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-800'
                  }`}
                />
                {errosCampo.dataFim && (
                  <p role="alert" className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errosCampo.dataFim}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={salvando}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </fieldset>
      </section>

      {/* Card 2: Habilidades Necessárias */}
      <section className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] p-5 sm:p-7 md:p-8 flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Habilidades Necessárias</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie as competências esperadas dos participantes</p>
          </div>
        </div>

        {erroHabilidade && (
          <div role="alert" className="rounded-xl border border-red-200/90 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{erroHabilidade}</span>
          </div>
        )}

        {habilidadesSelecionadas.length > 0 && (
          <div className="flex flex-col gap-2">
            {habilidadesSelecionadas.map((vinculo) => (
              <div
                key={vinculo.id}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${obterContainerHabilidade(vinculo.habilidade.nome)}`}
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${obterEstiloHabilidade(vinculo.habilidade.nome)}`}>
                    {vinculo.habilidade.nome}
                  </span>
                  {vinculo.habilidade.categoria && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                      {vinculo.habilidade.categoria}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3.5 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={vinculo.obrigatoria}
                      disabled={habilidadeEmAcao === vinculo.habilidade.id}
                      onChange={() => handleAlternarObrigatoria(vinculo.habilidade.id, vinculo.obrigatoria)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-primary focus:ring-primary/20 accent-[#5B4CF5]"
                    />
                    Obrigatória
                  </label>
                  <button
                    type="button"
                    disabled={habilidadeEmAcao === vinculo.habilidade.id}
                    onClick={() => handleRemoverHabilidade(vinculo.habilidade.id)}
                    aria-label={`Remover ${vinculo.habilidade.nome}`}
                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer disabled:opacity-40"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Busca de habilidade */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar habilidade por nome ou categoria... (mín. 2 letras)"
            value={buscaHabilidade}
            onChange={(e) => setBuscaHabilidade(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 dark:bg-slate-800/60 border border-gray-200/90 dark:border-slate-700/80 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        {buscaHabilidade.trim().length < 2 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">Digite ao menos 2 letras para buscar uma habilidade no catálogo.</p>
        ) : buscandoSugestoes ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">Buscando…</p>
        ) : erroBuscaHabilidade ? (
          <p className="text-xs text-red-500 dark:text-red-400">{erroBuscaHabilidade}</p>
        ) : sugestoes.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Nenhuma habilidade encontrada para "{buscaHabilidade}".
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {sugestoes.map((habilidade) => (
              <button
                type="button"
                key={habilidade.id}
                disabled={habilidadeEmAcao === habilidade.id}
                onClick={() => handleAdicionarHabilidade(habilidade.id)}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gray-50/70 dark:bg-slate-800/60 hover:bg-purple-50/60 dark:hover:bg-primary/10 border border-gray-200/60 dark:border-slate-700/60 hover:border-primary/30 transition-all text-left group cursor-pointer disabled:opacity-50"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${obterEstiloHabilidade(habilidade.nome)}`}>
                    {habilidade.nome}
                  </span>
                  {habilidade.categoria && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                      {habilidade.categoria}
                    </span>
                  )}
                </span>
                <span className="text-primary font-bold text-lg leading-none shrink-0 group-hover:scale-110 transition-transform">
                  +
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Card 3: Status do Projeto */}
      <section className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] p-5 sm:p-7 md:p-8 flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Status do Projeto</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Controle a fase atual de andamento do projeto</p>
          </div>
        </div>

        <div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeDesign[projeto.status]}`}>
            {STATUS_PROJETO_LABEL[projeto.status]}
          </span>
        </div>

        {erroStatus && (
          <div role="alert" className="rounded-xl border border-red-200/90 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{erroStatus}</span>
          </div>
        )}

        {statusFinal ? (
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
            Projetos com status final não podem ter o status alterado.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2.5">
              {transicoesDisponiveis(projeto.status)
                .filter((status) => status !== 'CANCELADO')
                .map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={alterandoStatus}
                    onClick={() => handleMudarStatus(status)}
                    className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-primary/40 text-primary dark:text-purple-300 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                  >
                    Marcar como {STATUS_PROJETO_LABEL[status]}
                  </button>
                ))}

              {!confirmandoCancelamento && (
                <button
                  type="button"
                  disabled={alterandoStatus}
                  onClick={() => setConfirmandoCancelamento(true)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  Cancelar projeto
                </button>
              )}
            </div>

            {confirmandoCancelamento && (
              <div className="rounded-xl border border-red-200/90 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900/50 p-4 sm:p-5 flex flex-col gap-3">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  Cancelar avisa todos os membros do projeto. Essa ação não pode ser desfeita.
                </p>
                <textarea
                  placeholder="Motivo do cancelamento (opcional)"
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-xl outline-none focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                />
                <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-1">
                  <button
                    type="button"
                    disabled={alterandoStatus}
                    onClick={() => { setConfirmandoCancelamento(false); setMotivoCancelamento(''); }}
                    className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={alterandoStatus}
                    onClick={() => handleMudarStatus('CANCELADO', motivoCancelamento.trim() || undefined)}
                    className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    {alterandoStatus ? 'Cancelando...' : 'Confirmar cancelamento'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
