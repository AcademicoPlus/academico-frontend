import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../services/apiClient'
import { buscarProjetoPorId, enviarBannerDoProjeto, removerBannerDoProjeto, type ProjetoDetalhe } from '../services/projetoService'
import { listarMembrosDoProjeto, removerMembroDoProjeto, type ProjetoMembro } from '../services/projetoMembroService'
import { obterMeuPerfilCache } from '../hooks/useMeuPerfil'
import {
  aceitarCandidatura,
  candidatar,
  cancelarCandidatura,
  listarCandidaturasDoProjeto,
  listarMinhasCandidaturas,
  rejeitarCandidatura,
  type Candidatura,
} from '../services/candidaturaService'
import { avaliarParticipante } from '../services/avaliacaoService'
import { recomendarCandidatos, type UsuarioRecomendado } from '../services/recomendacaoService'
import {
  aceitarConvite,
  cancelarConvite,
  EVENTO_CONVITES_ATUALIZADOS,
  listarConvitesDoProjeto,
  listarConvitesRecebidos,
  notificarConvitesAtualizados,
  recusarConvite,
  type Convite,
} from '../services/conviteService'
import type { UsuarioResumo } from '../services/authService'
import { STATUS_PROJETO_BADGE, STATUS_PROJETO_LABEL, formatarData, iniciaisDoNome } from '../utils/projeto'
import CaixaCandidaturat from '../components/caixa-candidaturat'
import Estrelas from '../components/Estrelas'
import ErroCard from '../components/ErroCard'
import ConfirmModal from '../components/ConfirmModal'
import ModalConvidarPessoa from '../components/ModalConvidarPessoa'

export default function DetalhesProjetoRota() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="max-w-5xl mx-auto pb-10">
        <p className="text-gray-500 dark:text-gray-400 mb-4 font-bold text-center">Projeto não encontrado.</p>
        <Link to="/projetos" className="text-[#F27405] font-semibold hover:underline block text-center">← Voltar para projetos</Link>
      </div>
    );
  }

  return <DetalhesProjeto key={id} id={id} />;
}

type AcaoConfirmavel =
  | { tipo: 'cancelarCandidatura' }
  | { tipo: 'aceitarCandidatura'; candidatura: Candidatura }
  | { tipo: 'rejeitarCandidatura'; candidatura: Candidatura }
  | { tipo: 'cancelarConvite'; convite: Convite }
  | { tipo: 'aceitarConvite'; convite: Convite }
  | { tipo: 'recusarConvite'; convite: Convite }
  | { tipo: 'removerMembro'; membro: ProjetoMembro }
  | { tipo: 'sairDoProjeto'; membro: ProjetoMembro }
  | { tipo: 'removerBanner' };

function DetalhesProjeto({ id }: { id: string }) {
  const [projeto, setProjeto] = useState<ProjetoDetalhe | null>(null);
  const [membros, setMembros] = useState<ProjetoMembro[]>([]);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Visão do candidato: minha própria candidatura a este projeto (se existir).
  const [minhaCandidatura, setMinhaCandidatura] = useState<Candidatura | null>(null);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [enviandoCandidatura, setEnviandoCandidatura] = useState(false);
  const [erroCandidatura, setErroCandidatura] = useState<string | null>(null);

  // Visão do criador: candidaturas pendentes recebidas neste projeto.
  const [candidaturasPendentes, setCandidaturasPendentes] = useState<Candidatura[]>([]);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  // Visão do criador: candidatos recomendados para o projeto.
  const [candidatosRecomendados, setCandidatosRecomendados] = useState<UsuarioRecomendado[]>([]);

  // Visão do criador: convites enviados ainda sem resposta. O modal abre
  // vazio (busca) ou com um candidato recomendado já selecionado.
  const [convitesPendentes, setConvitesPendentes] = useState<Convite[]>([]);
  const [modalConvite, setModalConvite] = useState<{ usuario: UsuarioResumo | null } | null>(null);

  // Visão do convidado: convite pendente recebido para este projeto.
  const [meuConvite, setMeuConvite] = useState<Convite | null>(null);

  // Ação pendente de confirmação (cancelar/aceitar/rejeitar candidatura,
  // cancelar/aceitar/recusar convite) — um único modal cobre todas elas.
  const [acaoConfirmavel, setAcaoConfirmavel] = useState<AcaoConfirmavel | null>(null);
  const [confirmandoAcao, setConfirmandoAcao] = useState(false);

  // Upload da capa/banner do projeto (só o criador vê o controle).
  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const [erroBanner, setErroBanner] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Avaliação de colegas de equipe (só após o projeto terminar).
  const [avaliandoMembroId, setAvaliandoMembroId] = useState<string | null>(null);
  const [notaAvaliacao, setNotaAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState<string | null>(null);
  const [avaliadosNestaSessao, setAvaliadosNestaSessao] = useState<Set<string>>(new Set());

  // Reutilizada tanto no carregamento inicial quanto depois de qualquer ação
  // (candidatar, cancelar, aceitar, rejeitar) — assim vagas/membros/status
  // continuam consistentes sem precisar atualizar cada pedaço à mão.
  async function carregarDados() {
    const [detalhe, listaDeMembros, meuPerfil] = await Promise.all([
      buscarProjetoPorId(id),
      listarMembrosDoProjeto(id).catch(() => [] as ProjetoMembro[]),
      obterMeuPerfilCache().catch(() => null),
    ]);

    setProjeto(detalhe);
    setMembros(listaDeMembros);
    setMeuId(meuPerfil?.id ?? null);

    const souCriador = meuPerfil !== null && detalhe.criador?.id === meuPerfil.id;

    if (souCriador) {
      const pagina = await listarCandidaturasDoProjeto(id, { status: 'PENDENTE', tamanho: 50 }).catch(() => null);
      setCandidaturasPendentes(pagina?.content ?? []);
      const recomendados = await recomendarCandidatos(id, 5).catch(() => [] as UsuarioRecomendado[]);
      setCandidatosRecomendados(recomendados);
      const convites = await listarConvitesDoProjeto(id, { status: 'PENDENTE', tamanho: 50 }).catch(() => null);
      setConvitesPendentes(convites?.content ?? []);
    } else {
      const [pagina, convites] = await Promise.all([
        listarMinhasCandidaturas({ tamanho: 100 }).catch(() => null),
        listarConvitesRecebidos({ status: 'PENDENTE', tamanho: 50 }).catch(() => null),
      ]);
      setMinhaCandidatura(pagina?.content.find((c) => c.projeto.id === id) ?? null);
      setMeuConvite(convites?.content.find((c) => c.projeto.id === id) ?? null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o loading ao trocar de projeto, antes do fetch abaixo
    setCarregando(true);
    setErro(null);
    carregarDados()
      .catch((erroCapturado) => {
        setErro(erroCapturado instanceof ApiError && erroCapturado.status === 404 ? 'Projeto não encontrado.' : 'Não foi possível carregar este projeto.');
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // O convite pode ser aceito/recusado pelo dropdown do header com esta
  // página aberta — recarrega para refletir equipe e vagas.
  useEffect(() => {
    const recarregar = () => { carregarDados().catch(() => {}); };
    window.addEventListener(EVENTO_CONVITES_ATUALIZADOS, recarregar);
    return () => window.removeEventListener(EVENTO_CONVITES_ATUALIZADOS, recarregar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCandidatar() {
    setErroCandidatura(null);
    setEnviandoCandidatura(true);
    try {
      const nova = await candidatar(id, mensagem.trim() || undefined);
      setMinhaCandidatura(nova);
      setMostrandoFormulario(false);
      setMensagem('');
    } catch (erroCapturado) {
      setErroCandidatura(
        erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível enviar a candidatura.',
      );
    } finally {
      setEnviandoCandidatura(false);
    }
  }

  async function handleCancelarCandidatura() {
    if (!minhaCandidatura) return;

    setErroCandidatura(null);
    setConfirmandoAcao(true);
    try {
      await cancelarCandidatura(minhaCandidatura.id);
      setMinhaCandidatura(null);
      setAcaoConfirmavel(null);
    } catch (erroCapturado) {
      setErroCandidatura(
        erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível cancelar a candidatura.',
      );
    } finally {
      setConfirmandoAcao(false);
    }
  }

  async function handleAceitar(candidatura: Candidatura) {
    setErroAcao(null);
    setConfirmandoAcao(true);
    try {
      await aceitarCandidatura(candidatura.id);
      setAcaoConfirmavel(null);
      await carregarDados();
    } catch (erroCapturado) {
      setErroAcao(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível aceitar a candidatura.');
    } finally {
      setConfirmandoAcao(false);
    }
  }

  async function handleRejeitar(candidatura: Candidatura) {
    const motivo = motivoRejeicao.trim();
    if (motivo.length < 5) {
      setErroAcao('O motivo da rejeição precisa ter pelo menos 5 caracteres.');
      return;
    }

    setErroAcao(null);
    setConfirmandoAcao(true);
    try {
      await rejeitarCandidatura(candidatura.id, motivo);
      setMotivoRejeicao('');
      setAcaoConfirmavel(null);
      await carregarDados();
    } catch (erroCapturado) {
      setErroAcao(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível rejeitar a candidatura.');
    } finally {
      setConfirmandoAcao(false);
    }
  }

  // Cancelar (criador), aceitar ou recusar (convidado) — mesmo fluxo de
  // erro/recarga; só muda a chamada e a mensagem de falha.
  async function handleResponderConvite(acao: (conviteId: string) => Promise<Convite>, convite: Convite, falha: string) {
    setErroAcao(null);
    setConfirmandoAcao(true);
    try {
      await acao(convite.id);
      setAcaoConfirmavel(null);
      await carregarDados();
      notificarConvitesAtualizados();
    } catch (erroCapturado) {
      setErroAcao(erroCapturado instanceof ApiError ? erroCapturado.message : falha);
    } finally {
      setConfirmandoAcao(false);
    }
  }

  // Expulsão (criador) e saída (o próprio membro) usam o mesmo endpoint; o
  // backend também apaga a candidatura aceita, liberando uma nova.
  async function handleRemoverMembro(membro: ProjetoMembro, falha: string) {
    setErroAcao(null);
    setConfirmandoAcao(true);
    try {
      await removerMembroDoProjeto(id, membro.id);
      setAcaoConfirmavel(null);
      await carregarDados();
    } catch (erroCapturado) {
      setErroAcao(erroCapturado instanceof ApiError ? erroCapturado.message : falha);
    } finally {
      setConfirmandoAcao(false);
    }
  }

  async function handleConviteEnviado() {
    setModalConvite(null);
    await carregarDados().catch(() => {});
  }

  async function handleBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setErroBanner(null);

    const formatosPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!formatosPermitidos.includes(arquivo.type)) {
      setErroBanner('Selecione uma imagem válida (JPG, PNG ou WEBP).');
      return;
    }

    const limiteBytes = 5 * 1024 * 1024;
    if (arquivo.size > limiteBytes) {
      setErroBanner('A imagem deve ter no máximo 5MB.');
      return;
    }

    setEnviandoBanner(true);
    try {
      const atualizado = await enviarBannerDoProjeto(id, arquivo);
      setProjeto(atualizado);
    } catch (erroCapturado) {
      setErroBanner(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível enviar a capa do projeto.');
    } finally {
      setEnviandoBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  }

  async function handleRemoverBanner() {
    setErroAcao(null);
    setConfirmandoAcao(true);
    try {
      const atualizado = await removerBannerDoProjeto(id);
      setProjeto(atualizado);
      setAcaoConfirmavel(null);
    } catch (erroCapturado) {
      setErroAcao(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível remover a capa do projeto.');
    } finally {
      setConfirmandoAcao(false);
    }
  }

  function fecharModalConfirmacao() {
    setAcaoConfirmavel(null);
    setErroAcao(null);
    setErroCandidatura(null);
    setMotivoRejeicao('');
  }

  function confirmarAcaoPendente() {
    if (!acaoConfirmavel) return;
    switch (acaoConfirmavel.tipo) {
      case 'cancelarCandidatura':
        return handleCancelarCandidatura();
      case 'aceitarCandidatura':
        return handleAceitar(acaoConfirmavel.candidatura);
      case 'rejeitarCandidatura':
        return handleRejeitar(acaoConfirmavel.candidatura);
      case 'cancelarConvite':
        return handleResponderConvite(cancelarConvite, acaoConfirmavel.convite, 'Não foi possível cancelar o convite.');
      case 'aceitarConvite':
        return handleResponderConvite(aceitarConvite, acaoConfirmavel.convite, 'Não foi possível aceitar o convite.');
      case 'recusarConvite':
        return handleResponderConvite(recusarConvite, acaoConfirmavel.convite, 'Não foi possível recusar o convite.');
      case 'removerMembro':
        return handleRemoverMembro(acaoConfirmavel.membro, 'Não foi possível remover este membro.');
      case 'sairDoProjeto':
        return handleRemoverMembro(acaoConfirmavel.membro, 'Não foi possível sair do projeto.');
      case 'removerBanner':
        return handleRemoverBanner();
    }
  }

  async function handleEnviarAvaliacao(membro: ProjetoMembro) {
    if (!membro.usuario) return;

    setErroAvaliacao(null);
    setEnviandoAvaliacao(true);
    try {
      await avaliarParticipante(id, membro.usuario.id, notaAvaliacao, comentarioAvaliacao.trim() || undefined);
      setAvaliadosNestaSessao((prev) => new Set(prev).add(membro.usuario!.id));
      setAvaliandoMembroId(null);
      setNotaAvaliacao(5);
      setComentarioAvaliacao('');
    } catch (erroCapturado) {
      setErroAvaliacao(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  if (carregando) return <div className="flex justify-center py-20"><p className="text-lg font-bold text-gray-400 dark:text-gray-500 animate-pulse">Carregando projeto...</p></div>;

  if (erro || !projeto) {
    return (
      <div className="max-w-5xl mx-auto pb-10">
        <Link to="/projetos" className="inline-block mb-6 text-gray-500 dark:text-gray-400 hover:text-[#F27405] text-sm font-bold transition-colors">← Voltar para projetos</Link>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-gray-100 dark:border-slate-700 shadow-sm text-center text-gray-500 dark:text-gray-400 font-bold text-lg">{erro ?? 'Projeto não encontrado.'}</div>
      </div>
    );
  }

  const prazo = formatarData(projeto.dataFim);
  const souCriador = meuId !== null && projeto.criador?.id === meuId;
  const meuVinculo = membros.find((m) => m.usuario?.id === meuId) ?? null;
  const souMembro = souCriador || meuVinculo !== null;
  // Equipe congelada após o encerramento — é a base das avaliações.
  const projetoEncerrado = projeto.status === 'CONCLUIDO' || projeto.status === 'CANCELADO';

  const idsConvidados = new Set(convitesPendentes.map((c) => c.convidado?.id).filter((v): v is string => !!v));
  const idsIndisponiveis = new Set<string>([
    ...idsConvidados,
    ...membros.map((m) => m.usuario?.id).filter((v): v is string => !!v),
    ...(projeto.criador ? [projeto.criador.id] : []),
  ]);
  const podeConvidar =
    (projeto.status === 'ABERTO' || projeto.status === 'EM_ANDAMENTO') && projeto.vagasPreenchidas < projeto.vagas;

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-fade-in">
      <Link to="/projetos" className="inline-flex items-center gap-2 mb-8 text-gray-500 dark:text-gray-400 hover:text-[#F27405] text-sm font-bold transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Voltar para explorar
      </Link>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 overflow-hidden mb-8">

        {/* Capa do Projeto (Hero Section) */}
        <div className="h-64 sm:h-80 w-full relative bg-linear-to-br from-[#183E6C] to-[#0B1D33]">
          {projeto.bannerUrl && (
            <img src={projeto.bannerUrl} alt="Capa" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-[#0B1D33]/90 via-[#0B1D33]/40 to-transparent"></div>
          <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 pr-6">
            <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider mb-4 inline-block shadow-sm ${STATUS_PROJETO_BADGE[projeto.status]}`}>
              ● {STATUS_PROJETO_LABEL[projeto.status]}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">{projeto.titulo}</h1>
          </div>

          {souCriador && (
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
              <input
                type="file"
                ref={bannerInputRef}
                onChange={handleBannerChange}
                accept="image/jpeg,image/png,image/jpg,image/webp"
                className="hidden"
                id="banner-projeto-input"
              />
              <label
                htmlFor="banner-projeto-input"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm cursor-pointer transition-colors ${enviandoBanner ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {enviandoBanner ? 'Enviando…' : '📷 Alterar capa'}
              </label>
              {projeto.bannerUrl && (
                <button
                  type="button"
                  onClick={() => { setErroAcao(null); setAcaoConfirmavel({ tipo: 'removerBanner' }); }}
                  disabled={enviandoBanner}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-black/40 hover:bg-red-600/80 backdrop-blur-sm cursor-pointer transition-colors disabled:opacity-60 disabled:pointer-events-none"
                >
                  🗑️ Remover capa
                </button>
              )}
              {erroBanner && (
                <p className="max-w-56 text-right text-xs font-semibold text-red-200 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                  {erroBanner}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 md:p-10 flex flex-col lg:flex-row gap-10">

          <div className="lg:w-2/3">
            <h2 className="text-xl font-bold text-[#183E6C] dark:text-blue-300 mb-4">Sobre o Projeto</h2>
            <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg leading-relaxed mb-10 whitespace-pre-line">{projeto.descricao}</p>

            <h2 className="text-xl font-bold text-[#183E6C] dark:text-blue-300 mb-4">Habilidades Desejadas</h2>
            {projeto.habilidadesNecessarias.length > 0 ? (
              <div className="flex flex-wrap gap-3 mb-8">
                {projeto.habilidadesNecessarias.map((h) => (
                  <span key={h.id} className={`px-4 py-2 rounded-xl text-sm font-bold border ${h.obrigatoria ? 'bg-[#183E6C] text-white border-[#183E6C]' : 'bg-orange-50 dark:bg-orange-950/40 text-[#F27405] border-orange-100 dark:border-orange-900/50'}`}>
                    {h.habilidade.nome} {h.obrigatoria && <span className="opacity-75 font-medium ml-1">• Obrigatória</span>}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic mb-8">Nenhuma habilidade específica requerida.</p>
            )}

            {/* Membros do Projeto */}
            <h2 className="text-xl font-bold text-[#183E6C] dark:text-blue-300 mb-4 mt-8">Equipe Atual ({projeto.totalMembros})</h2>
            {membros.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum membro no momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {membros.map((membro) => {
                  const podeAvaliar =
                    projetoEncerrado && membro.usuario && membro.usuario.id !== meuId;
                  const jaAvaliado = membro.usuario ? avaliadosNestaSessao.has(membro.usuario.id) : false;
                  const avaliandoEste = avaliandoMembroId === membro.id;

                  return (
                    <div key={membro.id} className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#183E6C] text-white flex items-center justify-center text-sm font-black shadow-sm shrink-0">
                          {membro.usuario ? iniciaisDoNome(membro.usuario.nome) : '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#183E6C] dark:text-blue-300 truncate">{membro.usuario?.nome ?? 'Usuário removido'}</p>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{membro.funcao ?? membro.usuario?.curso ?? '—'}</p>
                        </div>
                        {souCriador && !projetoEncerrado && (
                          <button
                            type="button"
                            aria-label={`Remover ${membro.usuario?.nome ?? 'membro'} do projeto`}
                            onClick={() => { setErroAcao(null); setAcaoConfirmavel({ tipo: 'removerMembro', membro }); }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      {podeAvaliar && (
                        jaAvaliado ? (
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Avaliado</p>
                        ) : avaliandoEste ? (
                          <div className="flex flex-col gap-2">
                            {erroAvaliacao && (
                              <p role="alert" className="text-xs text-red-500 dark:text-red-400">{erroAvaliacao}</p>
                            )}
                            <Estrelas nota={notaAvaliacao} onSelecionar={setNotaAvaliacao} tamanho="h-5 w-5" />
                            <textarea
                              rows={2}
                              placeholder="Comentário (opcional)..."
                              value={comentarioAvaliacao}
                              onChange={(e) => setComentarioAvaliacao(e.target.value)}
                              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#183E6C] focus:ring-1 focus:ring-[#183E6C] resize-none text-xs dark:text-gray-100"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => { setAvaliandoMembroId(null); setErroAvaliacao(null); }}
                                disabled={enviandoAvaliacao}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEnviarAvaliacao(membro)}
                                disabled={enviandoAvaliacao}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors disabled:opacity-60"
                              >
                                {enviandoAvaliacao ? 'Enviando…' : 'Enviar avaliação'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setAvaliandoMembroId(membro.id); setNotaAvaliacao(5); setComentarioAvaliacao(''); setErroAvaliacao(null); }}
                            className="self-start text-xs font-bold text-[#183E6C] dark:text-blue-300 hover:underline"
                          >
                            ★ Avaliar
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Candidaturas recebidas (só o criador do projeto vê) */}
            {souCriador && (
              <>
                <h2 className="text-xl font-bold text-primary dark:text-purple-400 mb-4 mt-8">
                  Candidaturas Pendentes {candidaturasPendentes.length > 0 && `(${candidaturasPendentes.length})`}
                </h2>

                {erroAcao && <ErroCard className="mb-4">{erroAcao}</ErroCard>}

                {candidaturasPendentes.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma candidatura pendente no momento.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {candidaturasPendentes.map((candidatura) => (
                      <div
                        key={candidatura.id}
                        className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-center gap-3.5 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary via-[#6F60FA] to-[#9286FF] text-white flex items-center justify-center text-sm font-black shadow-xs ring-2 ring-primary/20 dark:ring-primary/30 shrink-0 select-none">
                            {candidatura.usuario ? iniciaisDoNome(candidatura.usuario.nome) : '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{candidatura.usuario?.nome ?? 'Usuário removido'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{candidatura.usuario?.curso ?? '—'}</p>
                          </div>
                        </div>

                        {candidatura.mensagem && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 italic bg-background dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 rounded-xl p-3 mb-3">
                            "{candidatura.mensagem}"
                          </p>
                        )}

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => { setErroAcao(null); setMotivoRejeicao(''); setAcaoConfirmavel({ tipo: 'rejeitarCandidatura', candidatura }); }}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-all cursor-pointer"
                          >
                            Rejeitar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setErroAcao(null); setAcaoConfirmavel({ tipo: 'aceitarCandidatura', candidatura }); }}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-[#4E3FE4] shadow-sm hover:shadow-md shadow-primary/20 transition-all cursor-pointer"
                          >
                            Aceitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 mb-4 mt-8">
                  <h2 className="text-xl font-bold text-[#183E6C] dark:text-blue-300">
                    Convites Enviados {convitesPendentes.length > 0 && `(${convitesPendentes.length})`}
                  </h2>
                  {podeConvidar && (
                    <button
                      type="button"
                      onClick={() => setModalConvite({ usuario: null })}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors shrink-0"
                    >
                      ✉ Convidar pessoa
                    </button>
                  )}
                </div>

                {convitesPendentes.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum convite aguardando resposta.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {convitesPendentes.map((convite) => (
                      <div key={convite.id} className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#183E6C] text-white flex items-center justify-center text-sm font-black shrink-0">
                          {convite.convidado ? iniciaisDoNome(convite.convidado.nome) : '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#183E6C] dark:text-blue-300 truncate">{convite.convidado?.nome ?? 'Usuário removido'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {convite.funcao ?? 'Sem função definida'} · aguardando resposta
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setErroAcao(null); setAcaoConfirmavel({ tipo: 'cancelarConvite', convite }); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {candidatosRecomendados.length > 0 && (
                  <>
                    <h2 className="text-xl font-bold text-[#183E6C] dark:text-blue-300 mb-4 mt-8">
                      Candidatos Recomendados
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {candidatosRecomendados.map((rec) => (
                        <div key={rec.usuario.id} className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#183E6C] text-white flex items-center justify-center text-sm font-black shrink-0">
                              {iniciaisDoNome(rec.usuario.nome)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-[#183E6C] dark:text-blue-300 truncate">{rec.usuario.nome}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{rec.usuario.curso ?? '—'}</p>
                            </div>
                            <span className="text-xs font-black text-[#F27405] shrink-0">
                              {Math.round(rec.compatibilidade * 100)}%
                            </span>
                          </div>

                          {rec.habilidadesEmComum.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {rec.habilidadesEmComum.map((h) => (
                                <span key={h.id} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 dark:bg-orange-950/40 text-[#F27405] border border-orange-100 dark:border-orange-900/50">
                                  {h.nome}
                                </span>
                              ))}
                            </div>
                          )}

                          {idsConvidados.has(rec.usuario.id) ? (
                            <p className="self-start text-xs font-semibold text-[#F27405]">✉ Convite enviado</p>
                          ) : podeConvidar && (
                            <button
                              type="button"
                              onClick={() => setModalConvite({ usuario: rec.usuario })}
                              className="self-start px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors"
                            >
                              ✉ Convidar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-2">Liderado por</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#F27405] flex justify-center items-center font-black text-xl border border-orange-100 dark:border-orange-900/50 shadow-sm">
                  {projeto.criador ? iniciaisDoNome(projeto.criador.nome) : '?'}
                </div>
                <div>
                  <p className="font-extrabold text-[#183E6C] dark:text-blue-300 text-lg leading-tight">{projeto.criador?.nome ?? 'Usuário removido'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Autor do Projeto</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-1">Vagas</p>
                <p className="font-black text-2xl text-[#183E6C] dark:text-blue-300">{projeto.vagasPreenchidas}<span className="text-gray-400 dark:text-gray-500 text-lg">/{projeto.vagas}</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-1">Prazo</p>
                <p className="font-bold text-[#183E6C] dark:text-blue-300 text-sm mt-1.5">{prazo ?? 'Sem prazo'}</p>
              </div>
            </div>

            {souCriador ? (
              <Link to={`/editar-projeto/${projeto.id}`} className="w-full text-center py-4 rounded-xl font-extrabold transition-all shadow-sm bg-white dark:bg-slate-900 border-2 border-[#183E6C] text-[#183E6C] dark:text-blue-300 hover:bg-[#183E6C] hover:text-white">
                ✎ Editar Detalhes
              </Link>
            ) : meuVinculo ? (
              <div className="flex flex-col gap-3">
                <div className="text-center py-4 px-4 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-extrabold">
                  ✓ Você faz parte da equipe
                </div>
                {!projetoEncerrado && (
                  <button
                    type="button"
                    onClick={() => { setErroAcao(null); setAcaoConfirmavel({ tipo: 'sairDoProjeto', membro: meuVinculo }); }}
                    className="w-full py-3 rounded-xl font-bold transition-all bg-white dark:bg-slate-900 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    Sair do projeto
                  </button>
                )}
              </div>
            ) : meuConvite ? (
              <div className="flex flex-col gap-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-5">
                <p className="font-extrabold text-[#F27405] text-center">✉ Você foi convidado para este projeto</p>
                {meuConvite.funcao && (
                  <p className="text-sm text-center text-gray-600 dark:text-gray-300">Função: <span className="font-bold">{meuConvite.funcao}</span></p>
                )}
                {meuConvite.mensagem && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic text-center">"{meuConvite.mensagem}"</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setErroAcao(null); setAcaoConfirmavel({ tipo: 'recusarConvite', convite: meuConvite }); }}
                    className="py-3 rounded-xl font-extrabold bg-white dark:bg-slate-900 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                  >
                    Recusar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setErroAcao(null); setAcaoConfirmavel({ tipo: 'aceitarConvite', convite: meuConvite }); }}
                    className="py-3 rounded-xl font-extrabold bg-[#F27405] text-white hover:bg-[#D96704] transition-all"
                  >
                    Aceitar
                  </button>
                </div>
              </div>
            ) : minhaCandidatura ? (
              minhaCandidatura.status === 'PENDENTE' ? (
                <div className="flex flex-col gap-3">
                  <div className="text-center py-3 px-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F27405] font-bold text-sm">
                    Candidatura enviada — aguardando resposta
                  </div>
                  <button
                    onClick={() => { setErroCandidatura(null); setAcaoConfirmavel({ tipo: 'cancelarCandidatura' }); }}
                    className="w-full py-4 rounded-xl font-extrabold transition-all shadow-sm bg-white dark:bg-slate-900 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    ✕ Cancelar Candidatura
                  </button>
                </div>
              ) : minhaCandidatura.status === 'ACEITO' ? (
                <div className="text-center py-4 px-4 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-extrabold">
                  ✓ Você faz parte da equipe
                </div>
              ) : (
                <div className="py-4 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400">
                  <p className="font-extrabold text-center mb-1">Candidatura rejeitada</p>
                  {minhaCandidatura.motivoRejeicao && (
                    <p className="text-sm text-center opacity-90">{minhaCandidatura.motivoRejeicao}</p>
                  )}
                </div>
              )
            ) : !projeto.aceitandoCandidaturas ? (
              <button disabled className="w-full py-4 rounded-xl font-extrabold bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
                🚫 Candidaturas Fechadas
              </button>
            ) : mostrandoFormulario ? (
              <CaixaCandidaturat
                mensagem={mensagem}
                onChangeMensagem={setMensagem}
                onEnviar={handleCandidatar}
                onCancelar={() => { setMostrandoFormulario(false); setErroCandidatura(null); }}
                enviando={enviandoCandidatura}
                erro={erroCandidatura}
              />
            ) : (
              <button
                onClick={() => setMostrandoFormulario(true)}
                className="w-full py-4 rounded-xl font-extrabold transition-all duration-300 shadow-lg bg-[#F27405] text-white hover:bg-[#D96704] hover:-translate-y-0.5 shadow-[#F27405]/30"
              >
                ✓ Quero me Candidatar
              </button>
            )}
          </div>

        </div>
      </div>

      {souMembro && (
        <Link
          to={`/mensagens/${id}`}
          className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-6 mb-8 hover:border-[#F27405]/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#F27405] flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.4-3.72A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#183E6C] dark:text-blue-300">Conversa da equipe</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fale com todos os membros em Mensagens.</p>
          </div>
          <span className="text-sm font-bold text-[#F27405] group-hover:translate-x-0.5 transition-transform">Abrir →</span>
        </Link>
      )}

      {acaoConfirmavel && (
        <ConfirmModal
          titulo={
            acaoConfirmavel.tipo === 'cancelarCandidatura' ? 'Cancelar candidatura' :
            acaoConfirmavel.tipo === 'aceitarCandidatura' ? 'Aceitar candidato' :
            acaoConfirmavel.tipo === 'rejeitarCandidatura' ? 'Rejeitar candidato' :
            acaoConfirmavel.tipo === 'removerBanner' ? 'Remover capa do projeto' :
            acaoConfirmavel.tipo === 'cancelarConvite' ? 'Cancelar convite' :
            acaoConfirmavel.tipo === 'aceitarConvite' ? 'Aceitar convite' :
            acaoConfirmavel.tipo === 'recusarConvite' ? 'Recusar convite' :
            acaoConfirmavel.tipo === 'removerMembro' ? 'Remover da equipe' :
            'Sair do projeto'
          }
          mensagem={
            acaoConfirmavel.tipo === 'cancelarCandidatura' ? 'Cancelar sua candidatura a este projeto?' :
            acaoConfirmavel.tipo === 'aceitarCandidatura' ? `Aceitar ${acaoConfirmavel.candidatura.usuario?.nome ?? 'este candidato'} no projeto?` :
            acaoConfirmavel.tipo === 'rejeitarCandidatura' ? `Rejeitar a candidatura de ${acaoConfirmavel.candidatura.usuario?.nome ?? 'este candidato'}?` :
            acaoConfirmavel.tipo === 'removerBanner' ? 'Tem certeza que deseja remover a capa deste projeto?' :
            acaoConfirmavel.tipo === 'cancelarConvite' ? `Cancelar o convite enviado para ${acaoConfirmavel.convite.convidado?.nome ?? 'este usuário'}?` :
            acaoConfirmavel.tipo === 'aceitarConvite' ? 'Aceitar o convite e entrar na equipe deste projeto?' :
            acaoConfirmavel.tipo === 'recusarConvite' ? 'Recusar o convite para este projeto?' :
            acaoConfirmavel.tipo === 'removerMembro' ? `Remover ${acaoConfirmavel.membro.usuario?.nome ?? 'este membro'} da equipe? A vaga será liberada e a pessoa perde o acesso ao chat do projeto.` :
            'Tem certeza que deseja sair deste projeto? Você perde o acesso ao chat e precisará de um novo convite ou candidatura para voltar.'
          }
          variante={['cancelarCandidatura', 'rejeitarCandidatura', 'removerBanner', 'cancelarConvite', 'recusarConvite', 'removerMembro', 'sairDoProjeto'].includes(acaoConfirmavel.tipo) ? 'perigo' : 'padrao'}
          confirmando={confirmandoAcao}
          textoConfirmar={
            acaoConfirmavel.tipo === 'rejeitarCandidatura' ? 'Confirmar rejeição' :
            acaoConfirmavel.tipo === 'removerBanner' ? 'Remover capa' :
            acaoConfirmavel.tipo === 'removerMembro' ? 'Remover' :
            acaoConfirmavel.tipo === 'sairDoProjeto' ? 'Sair do projeto' :
            'Confirmar'
          }
          confirmarDesabilitado={acaoConfirmavel.tipo === 'rejeitarCandidatura' && motivoRejeicao.trim().length < 5}
          onCancelar={fecharModalConfirmacao}
          onConfirmar={confirmarAcaoPendente}
        >
          {acaoConfirmavel.tipo === 'rejeitarCandidatura' && (
            <textarea
              rows={3}
              placeholder="Motivo da rejeição (mínimo 5 caracteres)..."
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              className="w-full p-3 bg-background dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
            />
          )}
          {(erroAcao || erroCandidatura) && <ErroCard>{erroAcao || erroCandidatura}</ErroCard>}
        </ConfirmModal>
      )}

      {modalConvite && (
        <ModalConvidarPessoa
          projetoId={id}
          idsIndisponiveis={idsIndisponiveis}
          usuarioInicial={modalConvite.usuario}
          onFechar={() => setModalConvite(null)}
          onConvidado={handleConviteEnviado}
        />
      )}
    </div>
  )
}
