import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { criarProjeto } from '../services/projetoService';
import { listarHabilidades, type Habilidade } from '../services/habilidadeService';
import { ApiError } from '../services/apiClient';
import { ANOS_MAXIMOS_PRAZO, adicionarAnos, formatarDataISO } from '../utils/projeto';

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

export default function CriarProjeto() {
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vagas, setVagas] = useState('1');
  const [dataFim, setDataFim] = useState('');

  // habilidadeId -> { habilidade, obrigatória }. Guardamos o objeto inteiro
  // (não só o id) porque não mantemos mais o catálogo completo em memória —
  // a busca abaixo é feita sob demanda no backend, e um catálogo com
  // centenas/milhares de habilidades nunca caberia numa única página.
  const [selecionadas, setSelecionadas] = useState<Record<string, { habilidade: Habilidade; obrigatoria: boolean }>>({});

  const [buscaHabilidade, setBuscaHabilidade] = useState('');
  const [sugestoes, setSugestoes] = useState<Habilidade[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [erroBuscaHabilidade, setErroBuscaHabilidade] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});

  // Busca no catálogo (debounced, min. 2 caracteres) — nunca carrega o
  // catálogo inteiro de uma vez, só a fatia que combina com o termo digitado.
  useEffect(() => {
    if (buscaHabilidade.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa as sugestões ao esvaziar a busca
      setSugestoes([]);
      return;
    }
    const temporizador = setTimeout(() => {
      setBuscandoSugestoes(true);
      setErroBuscaHabilidade(null);
      listarHabilidades({ busca: buscaHabilidade.trim(), tamanho: 8 })
        .then((pagina) => setSugestoes(pagina.content.filter((h) => !(h.id in selecionadas))))
        .catch(() => setErroBuscaHabilidade('Não foi possível buscar habilidades.'))
        .finally(() => setBuscandoSugestoes(false));
    }, 350);
    return () => clearTimeout(temporizador);
  }, [buscaHabilidade, selecionadas]);

  // Espelha as mensagens do CriarProjetoRequest (backend), pra já avisar o
  // usuário antes de bater na API — a validação do backend continua sendo a
  // fonte de verdade (ver o catch de ApiError em handleSubmit).
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
    if (!vagas.trim() || Number.isNaN(vagasNumero)) {
      erros.vagas = 'Número de vagas é obrigatório.';
    } else if (vagasNumero < 1) {
      erros.vagas = 'Deve ter no mínimo 1 vaga.';
    }

    if (dataFim) {
      // Ano com 4 dígitos exatos: barra direto valores tipo "12312-01-01" que
      // o input nativo deixa passar (ver comentário de ANOS_MAXIMOS_PRAZO).
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
        erros.dataFim = 'Data de fim inválida.';
      } else {
        const fim = new Date(`${dataFim}T23:59:59`);
        const limite = adicionarAnos(new Date(), ANOS_MAXIMOS_PRAZO);

        if (Number.isNaN(fim.getTime())) {
          // Combinação impossível (ex.: mês 15, dia 32, 30 de fevereiro).
          erros.dataFim = 'Data de fim inválida.';
        } else if (fim.getTime() <= Date.now()) {
          erros.dataFim = 'Data de fim deve ser uma data futura.';
        } else if (fim.getTime() > limite.getTime()) {
          erros.dataFim = `Data de fim não pode passar de ${ANOS_MAXIMOS_PRAZO} anos a partir de hoje.`;
        }
      }
    }

    return erros;
  }

  const habilidadesSelecionadas = Object.values(selecionadas);

  function adicionarHabilidade(habilidade: Habilidade) {
    setSelecionadas((atual) => ({ ...atual, [habilidade.id]: { habilidade, obrigatoria: false } }));
    setBuscaHabilidade('');
    setSugestoes([]);
  }

  function removerHabilidade(id: string) {
    setSelecionadas((atual) => {
      const proximo = { ...atual };
      delete proximo[id];
      return proximo;
    });
  }

  function alternarObrigatoria(id: string) {
    setSelecionadas((atual) => ({
      ...atual,
      [id]: { ...atual[id], obrigatoria: !atual[id].obrigatoria },
    }));
  }

  // Some o erro do campo assim que o usuário mexe nele de novo, em vez de
  // deixar a mensagem antiga (possivelmente já resolvida) até o próximo submit.
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

    const errosValidacao = validar();
    setErrosCampo(errosValidacao);
    if (Object.keys(errosValidacao).length > 0) {
      setErro('Corrija os campos destacados antes de continuar.');
      return;
    }

    setCarregando(true);
    try {
      const projeto = await criarProjeto({
        titulo,
        descricao,
        vagas: Number(vagas),
        dataFim: dataFim ? `${dataFim}T23:59:59` : undefined,
        habilidades: Object.entries(selecionadas).map(([habilidadeId, { obrigatoria }]) => ({
          habilidadeId,
          obrigatoria,
        })),
      });
      navigate(`/detalhes/${projeto.id}`);
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
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-2 pb-16">
      {/* Navegação Superior */}
      <div>
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
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Criar novo projeto
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Descreva o projeto e as habilidades necessárias para atrair os colaboradores certos.
        </p>
      </div>

      {/* Card do Formulário */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] p-5 sm:p-7 md:p-8">

        {erro && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200/90 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{erro}</span>
          </div>
        )}

        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>

          {/* Título do projeto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Título do projeto
            </label>
            <input
              type="text"
              placeholder="Ex.: Sistema Inteligente de Proteção Web"
              value={titulo}
              onChange={(e) => { setTitulo(e.target.value); limparErroCampo('titulo'); }}
              aria-invalid={!!errosCampo.titulo}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all duration-150 ${
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
              placeholder="Conte do que se trata o projeto, os objetivos e o que se espera dos participantes..."
              value={descricao}
              onChange={(e) => { setDescricao(e.target.value); limparErroCampo('descricao'); }}
              rows={5}
              aria-invalid={!!errosCampo.descricao}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none resize-y min-h-[120px] transition-all duration-150 ${
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
                min={formatarDataISO(new Date())}
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

          {/* Habilidades necessárias */}
          <div className="flex flex-col gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Habilidades necessárias (opcional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Defina as competências ideais para quem deseja participar
              </p>
            </div>

            {/* Habilidades já escolhidas */}
            {habilidadesSelecionadas.length > 0 && (
              <div className="flex flex-col gap-2">
                {habilidadesSelecionadas.map(({ habilidade, obrigatoria }) => (
                  <div
                    key={habilidade.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${obterContainerHabilidade(habilidade.nome)}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${obterEstiloHabilidade(habilidade.nome)}`}>
                        {habilidade.nome}
                      </span>
                      {habilidade.categoria && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                          {habilidade.categoria}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={obrigatoria}
                          onChange={() => alternarObrigatoria(habilidade.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-primary focus:ring-primary/20 accent-[#5B4CF5]"
                        />
                        Obrigatória
                      </label>
                      <button
                        type="button"
                        onClick={() => removerHabilidade(habilidade.id)}
                        aria-label={`Remover ${habilidade.nome}`}
                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
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

            {/* Campo de busca no catálogo */}
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

            {/* Resultados da busca */}
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
                    onClick={() => adicionarHabilidade(habilidade)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gray-50/70 dark:bg-slate-800/60 hover:bg-purple-50/60 dark:hover:bg-primary/10 border border-gray-200/60 dark:border-slate-700/60 hover:border-primary/30 transition-all text-left group cursor-pointer"
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
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Link
              to="/projetos"
              className="w-full sm:w-auto text-center px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={carregando}
              className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {carregando ? 'Criando projeto...' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
