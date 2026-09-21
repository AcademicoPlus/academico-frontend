import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, type FormEvent } from 'react';
import { criarProjeto } from '../services/projetoService';
import { listarHabilidades, type Habilidade } from '../services/habilidadeService';
import { ApiError } from '../services/apiClient';
import { ANOS_MAXIMOS_PRAZO, adicionarAnos, formatarDataISO } from '../utils/projeto';

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
    <div className="max-w-3xl mx-auto pb-10">
      <Link to="/projetos" className="inline-block mb-6 text-gray-500 dark:text-gray-400 hover:text-[#F27405] text-sm font-medium transition-colors">
        ← Voltar para projetos
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#183E6C] dark:text-blue-300">Criar novo projeto</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Descreva o projeto e as habilidades necessárias para atrair os colaboradores certos.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-6 md:p-8">

        {erro && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400">
            {erro}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>

          <div>
            <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Título do projeto</label>
            <input
              type="text"
              placeholder="Ex.: Sistema Inteligente de Proteção Web"
              value={titulo}
              onChange={(e) => { setTitulo(e.target.value); limparErroCampo('titulo'); }}
              aria-invalid={!!errosCampo.titulo}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 outline-none transition-all text-gray-700 dark:text-gray-100 ${
                errosCampo.titulo
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                  : 'border-transparent focus:border-[#F27405] focus:ring-[#F27405]/20'
              }`}
            />
            {errosCampo.titulo && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errosCampo.titulo}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Descrição</label>
            <textarea
              placeholder="Conte do que se trata o projeto, os objetivos e o que se espera dos participantes..."
              value={descricao}
              onChange={(e) => { setDescricao(e.target.value); limparErroCampo('descricao'); }}
              rows={5}
              aria-invalid={!!errosCampo.descricao}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 outline-none transition-all text-gray-700 dark:text-gray-100 resize-none ${
                errosCampo.descricao
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                  : 'border-transparent focus:border-[#F27405] focus:ring-[#F27405]/20'
              }`}
            />
            {errosCampo.descricao && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errosCampo.descricao}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Número de vagas</label>
              <input
                type="number"
                min={1}
                value={vagas}
                onChange={(e) => { setVagas(e.target.value); limparErroCampo('vagas'); }}
                aria-invalid={!!errosCampo.vagas}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 outline-none transition-all text-gray-700 dark:text-gray-100 ${
                  errosCampo.vagas
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                    : 'border-transparent focus:border-[#F27405] focus:ring-[#F27405]/20'
                }`}
              />
              {errosCampo.vagas && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errosCampo.vagas}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Prazo final (opcional)</label>
              <input
                type="date"
                value={dataFim}
                min={formatarDataISO(new Date())}
                max={formatarDataISO(adicionarAnos(new Date(), ANOS_MAXIMOS_PRAZO))}
                onChange={(e) => { setDataFim(e.target.value); limparErroCampo('dataFim'); }}
                aria-invalid={!!errosCampo.dataFim}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 outline-none transition-all text-gray-700 dark:text-gray-100 ${
                  errosCampo.dataFim
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                    : 'border-transparent focus:border-[#F27405] focus:ring-[#F27405]/20'
                }`}
              />
              {errosCampo.dataFim && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errosCampo.dataFim}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Habilidades necessárias (opcional)</label>

            {/* Habilidades já escolhidas: aqui o usuário decide obrigatoriedade ou remove */}
            {habilidadesSelecionadas.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {habilidadesSelecionadas.map(({ habilidade, obrigatoria }) => (
                  <div
                    key={habilidade.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-[#F27405]/30 bg-orange-50 dark:bg-orange-950/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{habilidade.nome}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">{habilidade.categoria}</span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={obrigatoria}
                          onChange={() => alternarObrigatoria(habilidade.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 dark:border-slate-600 text-[#183E6C] focus:ring-[#183E6C]/20"
                        />
                        Obrigatória
                      </label>
                      <button
                        type="button"
                        onClick={() => removerHabilidade(habilidade.id)}
                        aria-label={`Remover ${habilidade.nome}`}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar habilidade por nome ou categoria... (mín. 2 letras)"
                value={buscaHabilidade}
                onChange={(e) => setBuscaHabilidade(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-sm text-gray-700 dark:text-gray-100"
              />
            </div>

            {/* Resultados da busca no catálogo (server-side): clicar adiciona */}
            {buscaHabilidade.trim().length < 2 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Digite ao menos 2 letras para buscar uma habilidade no catálogo.</p>
            ) : buscandoSugestoes ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Buscando…</p>
            ) : erroBuscaHabilidade ? (
              <p className="text-sm text-red-500 dark:text-red-400">{erroBuscaHabilidade}</p>
            ) : sugestoes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Nenhuma habilidade encontrada para "{buscaHabilidade}".
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {sugestoes.map((habilidade) => (
                  <button
                    type="button"
                    key={habilidade.id}
                    onClick={() => adicionarHabilidade(habilidade)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent hover:border-[#F27405]/30 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{habilidade.nome}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">{habilidade.categoria}</span>
                    </span>
                    <span className="text-[#F27405] text-lg leading-none font-bold shrink-0">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-3 mt-4">
            <Link
              to="/projetos"
              className="w-full md:w-auto text-center px-6 py-3.5 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={carregando}
              className="w-full flex-1 bg-[#F27405] hover:bg-[#D96704] text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-[#F27405]/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {carregando ? 'Criando projeto...' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
