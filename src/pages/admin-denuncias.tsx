// Fila de moderação (só ADMIN). Mostra denúncias pendentes dos três alvos —
// avaliação, projeto e perfil — e aplica a escada de sanções: para cada
// denúncia o backend já manda o histórico do responsável e a medida sugerida,
// que é o que permite "primeiro advertir, depois suspender" com critério.
// A sugestão é só isso: a decisão final é sempre do admin.
import { useCallback, useEffect, useState } from 'react'
import {
  listarDenunciasPendentes,
  resolverDenuncia,
  CATEGORIAS_DENUNCIA,
  MEDIDAS_MODERACAO,
  type Denuncia,
  type MedidaModeracao,
  type TipoAlvoDenuncia,
} from '../services/denunciaService'
import { ApiError } from '../services/apiClient'
import ConfirmModal from '../components/ConfirmModal'

const DIAS_SUSPENSAO_PADRAO = 7;

const FILTROS: { valor: TipoAlvoDenuncia | 'TODAS'; label: string }[] = [
  { valor: 'TODAS', label: 'Todas' },
  { valor: 'AVALIACAO', label: 'Avaliações' },
  { valor: 'PROJETO', label: 'Projetos' },
  { valor: 'PERFIL', label: 'Perfis' },
];

const ROTULO_ALVO: Record<TipoAlvoDenuncia, string> = {
  AVALIACAO: 'Avaliação',
  PROJETO: 'Projeto',
  PERFIL: 'Perfil',
};

function formatarData(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function rotuloCategoria(denuncia: Denuncia): string {
  return CATEGORIAS_DENUNCIA.find((c) => c.valor === denuncia.categoria)?.label ?? denuncia.categoria;
}

/** Medidas aplicáveis: perfil não tem conteúdo destacável para derrubar. */
function medidasPara(denuncia: Denuncia) {
  return MEDIDAS_MODERACAO.filter(
    (m) => !(denuncia.tipoAlvo === 'PERFIL' && m.valor === 'REMOVER_CONTEUDO'),
  );
}

export default function AdminDenuncias() {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [filtro, setFiltro] = useState<TipoAlvoDenuncia | 'TODAS'>('TODAS');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);
  const [erroLinha, setErroLinha] = useState<Record<string, string>>({});

  // Denúncia em julgamento no modal, com a medida já pré-selecionada na
  // sugestão da escada — o admin confirma ou muda.
  const [julgando, setJulgando] = useState<Denuncia | null>(null);
  const [medida, setMedida] = useState<MedidaModeracao>('ARQUIVAR');
  const [dias, setDias] = useState(DIAS_SUSPENSAO_PADRAO);
  const [justificativa, setJustificativa] = useState('');
  const [erroModal, setErroModal] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    listarDenunciasPendentes(filtro === 'TODAS' ? undefined : filtro)
      .then((pagina) => setDenuncias(pagina.content))
      .catch(() => setErro('Não foi possível carregar as denúncias. Tente novamente.'))
      .finally(() => setCarregando(false));
  }, [filtro]);

  useEffect(carregar, [carregar]);

  function abrirJulgamento(denuncia: Denuncia) {
    setJulgando(denuncia);
    setMedida(denuncia.historicoResponsavel?.medidaSugerida ?? 'ARQUIVAR');
    setDias(DIAS_SUSPENSAO_PADRAO);
    setJustificativa('');
    setErroModal(null);
  }

  const puneResponsavel = medida === 'ADVERTENCIA' || medida === 'SUSPENSAO';

  async function handleConfirmar() {
    if (!julgando) return;

    if (puneResponsavel && !justificativa.trim()) {
      setErroModal('Explique a decisão: é o texto que o usuário sancionado vai ler.');
      return;
    }

    const id = julgando.id;
    setErroModal(null);
    setErroLinha((atual) => {
      const proximo = { ...atual };
      delete proximo[id];
      return proximo;
    });
    setResolvendoId(id);
    try {
      await resolverDenuncia(id, {
        medida,
        diasSuspensao: medida === 'SUSPENSAO' ? dias : undefined,
        justificativa: puneResponsavel ? justificativa.trim() : undefined,
      });
      setDenuncias((atual) => atual.filter((item) => item.id !== id));
      setJulgando(null);
    } catch (erroCapturado) {
      const mensagem = erroCapturado instanceof ApiError
        ? erroCapturado.message
        : 'Não foi possível resolver a denúncia.';
      setErroModal(mensagem);
    } finally {
      setResolvendoId(null);
    }
  }

  return (
    <div className="pb-12 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#183E6C] dark:text-blue-300 tracking-tight">Denúncias</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
          {denuncias.length} denúncia(s) pendente(s) de revisão
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Filtrar por tipo de alvo">
        {FILTROS.map((item) => (
          <button
            key={item.valor}
            type="button"
            role="tab"
            aria-selected={filtro === item.valor}
            onClick={() => setFiltro(item.valor)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filtro === item.valor
                ? 'bg-[#183E6C] text-white dark:bg-blue-500'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {carregando && <p className="text-gray-500 dark:text-gray-400">Carregando denúncias…</p>}

      {erro && (
        <p role="alert" className="text-sm font-medium text-red-500 dark:text-red-400">{erro}</p>
      )}

      {!carregando && !erro && denuncias.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-gray-100 dark:border-slate-700 text-center text-gray-500 dark:text-gray-400 font-medium">
          Nenhuma denúncia pendente.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {denuncias.map((denuncia) => {
          const historico = denuncia.historicoResponsavel;

          return (
            <article
              key={denuncia.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#183E6C]/10 dark:bg-blue-500/20 text-[#183E6C] dark:text-blue-300">
                    {ROTULO_ALVO[denuncia.tipoAlvo]}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    {rotuloCategoria(denuncia)}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Recebida em {formatarData(denuncia.criadoEm)}
                </span>
              </div>

              {/* O que foi denunciado */}
              <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  {denuncia.alvo.titulo}
                  {denuncia.alvo.nota != null && (
                    <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">
                      {denuncia.alvo.nota}/5
                    </span>
                  )}
                </p>
                {denuncia.alvo.conteudo && (
                  <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4">
                    {denuncia.alvo.conteudo}
                  </p>
                )}
              </div>

              {/* Relato de quem denunciou */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Relato de {denuncia.denunciante.nome}
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {denuncia.motivo}
                </p>
              </div>

              {/* Histórico do responsável — é o que sustenta a escada */}
              {denuncia.responsavel && historico && (
                <div
                  className={`rounded-xl p-3.5 border text-xs ${
                    historico.medidaSugerida === 'SUSPENSAO'
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    Responsável: {denuncia.responsavel.nome}
                  </p>
                  <p className="mt-1 text-gray-600 dark:text-gray-300">
                    {historico.advertencias} advertência(s) · {historico.suspensoes} suspensão(ões)
                    {historico.suspensoAgora && historico.suspensoAte && (
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {' '}· suspenso até {formatarData(historico.suspensoAte)}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">{historico.justificativaSugestao}</p>
                </div>
              )}

              {erroLinha[denuncia.id] && (
                <p role="alert" className="text-xs font-medium text-red-500 dark:text-red-400">
                  {erroLinha[denuncia.id]}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => abrirJulgamento(denuncia)}
                  disabled={resolvendoId === denuncia.id}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Analisar e decidir
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {julgando && (
        <ConfirmModal
          titulo="Decidir sobre a denúncia"
          mensagem={
            <>
              Alvo: <strong>{julgando.alvo.titulo}</strong>
              {julgando.responsavel && <> · Responsável: <strong>{julgando.responsavel.nome}</strong></>}
            </>
          }
          variante={puneResponsavel ? 'perigo' : 'padrao'}
          textoConfirmar="Aplicar decisão"
          confirmando={resolvendoId === julgando.id}
          onConfirmar={handleConfirmar}
          onCancelar={() => setJulgando(null)}
        >
          <div className="flex flex-col gap-3">
            {erroModal && (
              <p role="alert" className="text-xs font-medium text-red-500 dark:text-red-400">{erroModal}</p>
            )}

            {julgando.historicoResponsavel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/60 rounded-lg p-2.5">
                {julgando.historicoResponsavel.justificativaSugestao}
              </p>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                Medida
              </legend>
              {medidasPara(julgando).map((item) => (
                <label
                  key={item.valor}
                  className={`flex gap-2.5 items-start rounded-xl border p-2.5 cursor-pointer transition-colors ${
                    medida === item.valor
                      ? 'border-[#183E6C] dark:border-blue-500 bg-[#183E6C]/5 dark:bg-blue-500/10'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="medida"
                    value={item.valor}
                    checked={medida === item.valor}
                    onChange={() => setMedida(item.valor)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {item.label}
                      {julgando.historicoResponsavel?.medidaSugerida === item.valor && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#183E6C] dark:text-blue-300">
                          sugerida
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{item.descricao}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {medida === 'SUSPENSAO' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Dias de suspensão
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="w-32 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-primary"
                />
              </label>
            )}

            {puneResponsavel && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Justificativa (o sancionado vai ler isto)
                </span>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={3}
                  placeholder="Diga o que motivou a medida, com clareza suficiente para a pessoa entender o que não pode se repetir."
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-primary resize-y"
                />
              </label>
            )}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
