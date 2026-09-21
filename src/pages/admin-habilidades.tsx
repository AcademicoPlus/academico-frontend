import { useEffect, useState, type FormEvent } from 'react'
import {
  atualizarHabilidade,
  criarHabilidade,
  listarCategoriasDeHabilidade,
  listarHabilidades,
  removerHabilidade,
  type Habilidade,
} from '../services/habilidadeService'
import { ApiError } from '../services/apiClient'

const TAMANHO_PAGINA = 10;
const ATRASO_BUSCA_MS = 400;

type FormularioHabilidade = {
  nome: string;
  categoria: string;
  descricao: string;
};

const FORMULARIO_VAZIO: FormularioHabilidade = { nome: '', categoria: '', descricao: '' };

export default function AdminHabilidades() {
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [totalElementos, setTotalElementos] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<FormularioHabilidade>(FORMULARIO_VAZIO);
  const [salvandoForm, setSalvandoForm] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [errosCampoForm, setErrosCampoForm] = useState<Record<string, string>>({});

  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(0);
    }, ATRASO_BUSCA_MS);
    return () => clearTimeout(temporizador);
  }, [busca]);

  useEffect(() => {
    listarCategoriasDeHabilidade().then(setCategorias).catch(() => {});
  }, []);

  function recarregar() {
    setCarregando(true);
    listarHabilidades({
      busca: buscaAplicada || undefined,
      categoria: categoriaFiltro || undefined,
      pagina,
      tamanho: TAMANHO_PAGINA,
    })
      .then((paginaResposta) => {
        setHabilidades(paginaResposta.content);
        setTotalElementos(paginaResposta.totalElements);
        setTotalPaginas(paginaResposta.totalPages);
        setErro(null);
      })
      .catch(() => setErro('Não foi possível carregar as habilidades. Tente novamente.'))
      .finally(() => setCarregando(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o loading ao trocar filtro/página, antes do fetch em recarregar()
  useEffect(recarregar, [buscaAplicada, categoriaFiltro, pagina]);

  function iniciarEdicao(habilidade: Habilidade) {
    setEditandoId(habilidade.id);
    setFormulario({
      nome: habilidade.nome,
      categoria: habilidade.categoria,
      descricao: habilidade.descricao ?? '',
    });
    setErroForm(null);
    setErrosCampoForm({});
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroForm(null);
    setErrosCampoForm({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroForm(null);

    const nome = formulario.nome.trim();
    if (!nome) {
      setErrosCampoForm({ nome: 'Nome é obrigatório.' });
      return;
    }

    setSalvandoForm(true);
    try {
      const dados = {
        nome,
        categoria: formulario.categoria.trim() || undefined,
        descricao: formulario.descricao.trim() || undefined,
      };

      if (editandoId) {
        await atualizarHabilidade(editandoId, dados);
      } else {
        await criarHabilidade(dados);
      }

      cancelarEdicao();
      recarregar();
      listarCategoriasDeHabilidade().then(setCategorias).catch(() => {});
    } catch (erroCapturado) {
      if (erroCapturado instanceof ApiError) {
        setErroForm(erroCapturado.message);
        if (erroCapturado.erros) {
          const mapa: Record<string, string> = {};
          for (const { campo, mensagem } of erroCapturado.erros) {
            mapa[campo] = mensagem;
          }
          setErrosCampoForm(mapa);
        }
      } else {
        setErroForm('Não foi possível conectar ao servidor. Tente novamente.');
      }
    } finally {
      setSalvandoForm(false);
    }
  }

  async function handleExcluir(habilidade: Habilidade) {
    const confirmado = window.confirm(`Excluir a habilidade "${habilidade.nome}"? Essa ação não pode ser desfeita.`);
    if (!confirmado) return;

    setErroExclusao(null);
    setExcluindoId(habilidade.id);
    try {
      await removerHabilidade(habilidade.id);
      if (editandoId === habilidade.id) cancelarEdicao();
      recarregar();
    } catch (erroCapturado) {
      const mensagem = erroCapturado instanceof ApiError
        ? erroCapturado.message
        : 'Não foi possível excluir a habilidade.';
      setErroExclusao(mensagem);
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="pb-12 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#183E6C] dark:text-blue-300 tracking-tight">Habilidades</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{totalElementos} habilidades no catálogo</p>
      </header>

      {/* Formulário de criar/editar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-6 md:p-8 mb-8">
        <h2 className="text-lg font-extrabold text-[#183E6C] dark:text-blue-300 mb-4">
          {editandoId ? 'Editar habilidade' : 'Nova habilidade'}
        </h2>

        {erroForm && (
          <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {erroForm}
          </div>
        )}

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Nome</label>
            <input
              type="text"
              placeholder="Ex.: React"
              value={formulario.nome}
              onChange={(e) => setFormulario((atual) => ({ ...atual, nome: e.target.value }))}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 outline-none transition-all text-gray-700 dark:text-gray-200 ${
                errosCampoForm.nome
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                  : 'border-transparent focus:border-[#F27405] focus:ring-[#F27405]/20'
              }`}
            />
            {errosCampoForm.nome && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errosCampoForm.nome}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Categoria</label>
            <input
              type="text"
              placeholder="Ex.: Frontend"
              value={formulario.categoria}
              onChange={(e) => setFormulario((atual) => ({ ...atual, categoria: e.target.value }))}
              list="categorias-existentes"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-200"
            />
            <datalist id="categorias-existentes">
              {categorias.map((categoria) => <option key={categoria} value={categoria} />)}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#183E6C] dark:text-blue-300 mb-2">Descrição (opcional)</label>
            <textarea
              placeholder="Breve descrição da habilidade..."
              value={formulario.descricao}
              onChange={(e) => setFormulario((atual) => ({ ...atual, descricao: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-[#F27405] focus:ring-2 focus:ring-[#F27405]/20 outline-none transition-all text-gray-700 dark:text-gray-200 resize-none"
            />
          </div>

          <div className="md:col-span-2 flex flex-col-reverse md:flex-row gap-3 mt-2">
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="w-full md:w-auto text-center px-6 py-3.5 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar edição
              </button>
            )}
            <button
              type="submit"
              disabled={salvandoForm}
              className="w-full md:w-auto md:flex-1 bg-[#F27405] hover:bg-[#D96704] text-white font-bold py-3.5 px-8 rounded-xl transition-colors shadow-lg shadow-[#F27405]/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {salvandoForm ? 'Salvando...' : editandoId ? 'Salvar edição' : 'Criar habilidade'}
            </button>
          </div>
        </form>
      </div>

      {/* Filtros de listagem */}
      <section className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#F27405] focus:ring-4 focus:ring-[#F27405]/10 text-gray-700 dark:text-gray-200 shadow-sm transition-all"
          />
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <select
          value={categoriaFiltro}
          onChange={(e) => { setCategoriaFiltro(e.target.value); setPagina(0); }}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#F27405] focus:ring-4 focus:ring-[#F27405]/10 font-medium text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer min-w-50"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
        </select>
      </section>

      {erro && (
        <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm">
          {erro}
        </div>
      )}
      {erroExclusao && (
        <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm">
          {erroExclusao}
        </div>
      )}

      {carregando ? (
        <div className="flex justify-center py-20"><p className="text-lg font-bold text-gray-400 dark:text-gray-500 animate-pulse">Carregando habilidades...</p></div>
      ) : habilidades.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 p-12 text-center shadow-sm">
          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">Nenhuma habilidade encontrada.</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Em uso</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {habilidades.map((habilidade) => (
                    <tr key={habilidade.id} className="border-b border-gray-50 dark:border-slate-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#183E6C] dark:text-blue-300">{habilidade.nome}</p>
                        {habilidade.descricao && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 max-w-md truncate">{habilidade.descricao}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{habilidade.categoria}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {habilidade.usuariosCount} usuário(s) · {habilidade.projetosCount} projeto(s)
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 justify-end">
                          <button
                            type="button"
                            onClick={() => iniciarEdicao(habilidade)}
                            className="text-sm font-bold text-[#183E6C] dark:text-blue-300 hover:text-[#F27405] transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluir(habilidade)}
                            disabled={excluindoId === habilidade.id}
                            className="text-sm font-bold text-red-500 dark:text-red-400 hover:text-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {excluindoId === habilidade.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.max(0, atual - 1))}
                disabled={pagina === 0}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Página {pagina + 1} de {totalPaginas}</span>
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.min(totalPaginas - 1, atual + 1))}
                disabled={pagina >= totalPaginas - 1}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
