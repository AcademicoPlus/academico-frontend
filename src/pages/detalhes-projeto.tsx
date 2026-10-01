import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import ErroCard from '../components/ErroCard'
import ConfirmModal from '../components/ConfirmModal'
import ModalConvidarPessoa from '../components/ModalConvidarPessoa'
import CapaProjeto from '../components/projeto/CapaProjeto'
import AbasProjeto, { type DefinicaoAba } from '../components/projeto/AbasProjeto'
import AbaSobre from '../components/projeto/AbaSobre'
import AbaEquipe from '../components/projeto/AbaEquipe'
import AbaGerenciar from '../components/projeto/AbaGerenciar'
import PainelLateralProjeto, { AcaoPrincipal } from '../components/projeto/PainelLateralProjeto'
import { useEhDesktop } from '../hooks/useEhDesktop'
import { acaoEhUrgente, idDaAba, idDoPainel, type AbaProjeto, type AcaoConfirmavel } from '../components/projeto/tipos'

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

const ABAS_VALIDAS: AbaProjeto[] = ['sobre', 'equipe', 'gerenciar'];
const FORMATOS_CAPA = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const LIMITE_CAPA_BYTES = 5 * 1024 * 1024;

function mensagemDeErro(erro: unknown, padrao: string): string {
  return erro instanceof ApiError ? erro.message : padrao;
}

function DetalhesProjeto({ id }: { id: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ehDesktop = useEhDesktop();

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

  // Visão do criador: candidaturas pendentes, convites enviados e recomendações.
  const [candidaturasPendentes, setCandidaturasPendentes] = useState<Candidatura[]>([]);
  const [convitesPendentes, setConvitesPendentes] = useState<Convite[]>([]);
  const [candidatosRecomendados, setCandidatosRecomendados] = useState<UsuarioRecomendado[]>([]);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  // O modal abre vazio (busca) ou com um candidato recomendado já selecionado.
  const [modalConvite, setModalConvite] = useState<{ usuario: UsuarioResumo | null } | null>(null);

  // Visão do convidado: convite pendente recebido para este projeto.
  const [meuConvite, setMeuConvite] = useState<Convite | null>(null);

  // Ação pendente de confirmação — um único modal cobre todas elas.
  const [acaoConfirmavel, setAcaoConfirmavel] = useState<AcaoConfirmavel | null>(null);
  const [confirmandoAcao, setConfirmandoAcao] = useState(false);

  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const [erroBanner, setErroBanner] = useState<string | null>(null);

  // Mora aqui (e não na aba Equipe) para sobreviver à troca de aba.
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
      const [candidaturas, recomendados, convites] = await Promise.all([
        listarCandidaturasDoProjeto(id, { status: 'PENDENTE', tamanho: 50 }).catch(() => null),
        recomendarCandidatos(id, 5).catch(() => [] as UsuarioRecomendado[]),
        listarConvitesDoProjeto(id, { status: 'PENDENTE', tamanho: 50 }).catch(() => null),
      ]);
      setCandidaturasPendentes(candidaturas?.content ?? []);
      setCandidatosRecomendados(recomendados);
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
      setErroCandidatura(mensagemDeErro(erroCapturado, 'Não foi possível enviar a candidatura.'));
    } finally {
      setEnviandoCandidatura(false);
    }
  }

  // Executa a ação confirmada no modal: fecha o modal e recarrega a página
  // em caso de sucesso; mostra o erro dentro do modal em caso de falha.
  async function executar(acao: () => Promise<unknown>, falha: string, recarregar = true) {
    setErroAcao(null);
    setConfirmandoAcao(true);
    try {
      await acao();
      setAcaoConfirmavel(null);
      setMotivoRejeicao('');
      if (recarregar) await carregarDados();
    } catch (erroCapturado) {
      setErroAcao(mensagemDeErro(erroCapturado, falha));
    } finally {
      setConfirmandoAcao(false);
    }
  }

  function confirmarAcaoPendente() {
    if (!acaoConfirmavel) return;
    switch (acaoConfirmavel.tipo) {
      case 'cancelarCandidatura': {
        const candidatura = minhaCandidatura;
        if (!candidatura) return;
        return executar(async () => {
          await cancelarCandidatura(candidatura.id);
          setMinhaCandidatura(null);
        }, 'Não foi possível cancelar a candidatura.', false);
      }
      case 'aceitarCandidatura':
        return executar(() => aceitarCandidatura(acaoConfirmavel.candidatura.id), 'Não foi possível aceitar a candidatura.');
      case 'rejeitarCandidatura': {
        const motivo = motivoRejeicao.trim();
        if (motivo.length < 5) {
          setErroAcao('O motivo da rejeição precisa ter pelo menos 5 caracteres.');
          return;
        }
        return executar(() => rejeitarCandidatura(acaoConfirmavel.candidatura.id, motivo), 'Não foi possível rejeitar a candidatura.');
      }
      case 'cancelarConvite':
      case 'aceitarConvite':
      case 'recusarConvite': {
        const chamada = { cancelarConvite, aceitarConvite, recusarConvite }[acaoConfirmavel.tipo];
        const falha = {
          cancelarConvite: 'Não foi possível cancelar o convite.',
          aceitarConvite: 'Não foi possível aceitar o convite.',
          recusarConvite: 'Não foi possível recusar o convite.',
        }[acaoConfirmavel.tipo];
        return executar(async () => {
          await chamada(acaoConfirmavel.convite.id);
          notificarConvitesAtualizados();
        }, falha);
      }
      // Expulsão (criador) e saída (o próprio membro) usam o mesmo endpoint; o
      // backend também apaga a candidatura aceita, liberando uma nova.
      case 'removerMembro':
        return executar(() => removerMembroDoProjeto(id, acaoConfirmavel.membro.id), 'Não foi possível remover este membro.');
      case 'sairDoProjeto':
        return executar(() => removerMembroDoProjeto(id, acaoConfirmavel.membro.id), 'Não foi possível sair do projeto.');
      case 'removerBanner':
        return executar(async () => setProjeto(await removerBannerDoProjeto(id)), 'Não foi possível remover a capa do projeto.', false);
    }
  }

  function abrirConfirmacao(acao: AcaoConfirmavel) {
    setErroAcao(null);
    setErroCandidatura(null);
    setMotivoRejeicao('');
    setAcaoConfirmavel(acao);
  }

  function fecharModalConfirmacao() {
    setAcaoConfirmavel(null);
    setErroAcao(null);
    setErroCandidatura(null);
    setMotivoRejeicao('');
  }

  async function handleEnviarBanner(arquivo: File) {
    setErroBanner(null);
    if (!FORMATOS_CAPA.includes(arquivo.type)) {
      setErroBanner('Selecione uma imagem válida (JPG, PNG ou WEBP).');
      return;
    }
    if (arquivo.size > LIMITE_CAPA_BYTES) {
      setErroBanner('A imagem deve ter no máximo 5MB.');
      return;
    }

    setEnviandoBanner(true);
    try {
      setProjeto(await enviarBannerDoProjeto(id, arquivo));
    } catch (erroCapturado) {
      setErroBanner(mensagemDeErro(erroCapturado, 'Não foi possível enviar a capa do projeto.'));
    } finally {
      setEnviandoBanner(false);
    }
  }

  // Devolve a mensagem de erro (ou null) para a aba Equipe exibir no formulário.
  async function handleAvaliar(membro: ProjetoMembro, nota: number, comentario: string | undefined) {
    if (!membro.usuario) return null;
    try {
      await avaliarParticipante(id, membro.usuario.id, nota, comentario);
      setAvaliadosNestaSessao((prev) => new Set(prev).add(membro.usuario!.id));
      return null;
    } catch (erroCapturado) {
      return mensagemDeErro(erroCapturado, 'Não foi possível enviar a avaliação.');
    }
  }

  async function handleConviteEnviado() {
    setModalConvite(null);
    await carregarDados().catch(() => {});
  }

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto pb-12" aria-busy="true" aria-label="Carregando projeto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
          <div className="h-56 sm:h-72 bg-gray-100 dark:bg-slate-800" />
          <div className="p-8 flex flex-col lg:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-3">
              <div className="h-4 w-1/3 rounded bg-gray-100 dark:bg-slate-800" />
              <div className="h-3 w-full rounded bg-gray-100 dark:bg-slate-800" />
              <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-slate-800" />
            </div>
            <div className="lg:w-80 h-40 rounded-2xl bg-gray-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (erro || !projeto) {
    return (
      <div className="max-w-5xl mx-auto pb-10">
        <Link to="/projetos" className="inline-block mb-6 text-gray-500 dark:text-gray-400 hover:text-[#F27405] text-sm font-bold transition-colors">← Voltar para projetos</Link>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-gray-100 dark:border-slate-700 shadow-sm text-center text-gray-500 dark:text-gray-400 font-bold text-lg">{erro ?? 'Projeto não encontrado.'}</div>
      </div>
    );
  }

  const souCriador = meuId !== null && projeto.criador?.id === meuId;
  const meuVinculo = membros.find((m) => m.usuario?.id === meuId) ?? null;
  const souMembro = souCriador || meuVinculo !== null;
  // Equipe congelada após o encerramento — é a base das avaliações.
  const projetoEncerrado = projeto.status === 'CONCLUIDO' || projeto.status === 'CANCELADO';
  const podeConvidar =
    (projeto.status === 'ABERTO' || projeto.status === 'EM_ANDAMENTO') && projeto.vagasPreenchidas < projeto.vagas;

  const idsConvidados = new Set(convitesPendentes.map((c) => c.convidado?.id).filter((v): v is string => !!v));
  const idsIndisponiveis = new Set<string>([
    ...idsConvidados,
    ...membros.map((m) => m.usuario?.id).filter((v): v is string => !!v),
    ...(projeto.criador ? [projeto.criador.id] : []),
  ]);

  const abas: DefinicaoAba[] = [
    { id: 'sobre', rotulo: 'Sobre' },
    { id: 'equipe', rotulo: 'Equipe', contador: membros.length + (projeto.criador ? 1 : 0) },
    ...(souCriador ? [{ id: 'gerenciar' as const, rotulo: 'Gerenciar', pendencias: candidaturasPendentes.length }] : []),
  ];
  const abaPedida = searchParams.get('aba') as AbaProjeto | null;
  const abaAtiva: AbaProjeto =
    abaPedida && ABAS_VALIDAS.includes(abaPedida) && abas.some((a) => a.id === abaPedida) ? abaPedida : 'sobre';

  const propsDoPainel = {
    projeto,
    souCriador,
    meuVinculo,
    meuConvite,
    minhaCandidatura,
    projetoEncerrado,
    candidatura: {
      mostrandoFormulario,
      mensagem,
      enviando: enviandoCandidatura,
      erro: erroCandidatura,
      onAbrir: () => setMostrandoFormulario(true),
      onFechar: () => { setMostrandoFormulario(false); setErroCandidatura(null); },
      onMudarMensagem: setMensagem,
      onEnviar: handleCandidatar,
    },
    onAcao: abrirConfirmacao,
  };
  const acaoNoRodape = !ehDesktop && acaoEhUrgente(propsDoPainel);

  function selecionarAba(aba: AbaProjeto) {
    setSearchParams(aba === 'sobre' ? {} : { aba }, { replace: true });
  }

  return (
    // Com a barra fixa no rodapé, ela mesma encosta no fim da página (sem sobra de padding).
    <div className={`max-w-5xl mx-auto animate-fade-in ${acaoNoRodape ? '' : 'pb-12'}`}>

      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 py-1 pr-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-[#F27405] transition-colors group cursor-pointer"
        >
          <span className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-2xs group-hover:border-[#F27405]/40 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span>Voltar</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 overflow-hidden">
        <CapaProjeto
          projeto={projeto}
          editavel={souCriador}
          enviando={enviandoBanner}
          erro={erroBanner}
          onEnviar={handleEnviarBanner}
          onRemover={() => abrirConfirmacao({ tipo: 'removerBanner' })}
        />

        <AbasProjeto abas={abas} ativa={abaAtiva} onSelecionar={selecionarAba} />

        <div className="p-5 md:p-8 flex flex-col lg:flex-row gap-8">
          <div
            role="tabpanel"
            id={idDoPainel(abaAtiva)}
            aria-labelledby={idDaAba(abaAtiva)}
            className="flex-1 min-w-0 order-2 lg:order-1"
          >
            {abaAtiva === 'sobre' && <AbaSobre projeto={projeto} />}

            {abaAtiva === 'equipe' && (
              <AbaEquipe
                projeto={projeto}
                membros={membros}
                meuId={meuId}
                souCriador={souCriador}
                souMembro={souMembro}
                projetoEncerrado={projetoEncerrado}
                podeConvidar={podeConvidar}
                avaliados={avaliadosNestaSessao}
                onAvaliar={handleAvaliar}
                onRemover={(membro) => abrirConfirmacao({ tipo: 'removerMembro', membro })}
                onConvidar={() => setModalConvite({ usuario: null })}
              />
            )}

            {abaAtiva === 'gerenciar' && souCriador && (
              <AbaGerenciar
                candidaturas={candidaturasPendentes}
                convites={convitesPendentes}
                recomendados={candidatosRecomendados}
                idsConvidados={idsConvidados}
                podeConvidar={podeConvidar}
                erro={acaoConfirmavel ? null : erroAcao}
                onAceitar={(candidatura) => abrirConfirmacao({ tipo: 'aceitarCandidatura', candidatura })}
                onRejeitar={(candidatura) => abrirConfirmacao({ tipo: 'rejeitarCandidatura', candidatura })}
                onCancelarConvite={(convite) => abrirConfirmacao({ tipo: 'cancelarConvite', convite })}
                onConvidar={(usuario) => setModalConvite({ usuario })}
              />
            )}
          </div>

          {/* No celular a lateral só aparece em "Sobre": em Equipe/Gerenciar o conteúdo vem direto. */}
          <aside
            className={`lg:w-80 shrink-0 order-1 lg:order-2 ${abaAtiva === 'sobre' ? '' : 'hidden lg:block'}`}
            aria-label="Resumo do projeto"
          >
            <PainelLateralProjeto {...propsDoPainel} souMembro={souMembro} semAcao={acaoNoRodape} />
          </aside>
        </div>
      </div>

      {acaoNoRodape && (
        <div
          data-testid="acao-rodape"
          className="sticky bottom-0 z-30 -mx-4 -mb-4 mt-4 px-4 pt-3 pb-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-gray-100 dark:border-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
        >
          <AcaoPrincipal {...propsDoPainel} />
        </div>
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
