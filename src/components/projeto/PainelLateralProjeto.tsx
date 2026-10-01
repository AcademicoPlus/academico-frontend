// Coluna fixa ao lado das abas: quem lidera, vagas/prazo e a ação principal
// do visitante (candidatar, responder convite, sair...). No celular aparece
// antes das abas, para a ação não ficar escondida no fim da página.
import { Link } from 'react-router-dom';
import type { ProjetoDetalhe } from '../../services/projetoService';
import type { ProjetoMembro } from '../../services/projetoMembroService';
import type { Candidatura } from '../../services/candidaturaService';
import type { Convite } from '../../services/conviteService';
import { formatarData } from '../../utils/projeto';
import Avatar from '../Avatar';
import CaixaCandidaturat from '../caixa-candidaturat';
import type { AcaoConfirmavel } from './tipos';

type PainelLateralProjetoProps = {
  projeto: ProjetoDetalhe;
  souCriador: boolean;
  souMembro: boolean;
  meuVinculo: ProjetoMembro | null;
  meuConvite: Convite | null;
  minhaCandidatura: Candidatura | null;
  projetoEncerrado: boolean;
  candidatura: {
    mostrandoFormulario: boolean;
    mensagem: string;
    enviando: boolean;
    erro: string | null;
    onAbrir: () => void;
    onFechar: () => void;
    onMudarMensagem: (valor: string) => void;
    onEnviar: () => void;
  };
  onAcao: (acao: AcaoConfirmavel) => void;
  // No celular a ação urgente vai para a barra fixa do rodapé (ver página).
  semAcao?: boolean;
};

const botaoPrimario = 'w-full py-3.5 rounded-xl font-extrabold transition-all bg-[#F27405] text-white hover:bg-[#D96704] shadow-lg shadow-[#F27405]/25';
const botaoPerigo = 'w-full py-3 rounded-xl font-bold transition-all bg-white dark:bg-slate-900 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40';

export function AcaoPrincipal({
  projeto,
  souCriador,
  meuVinculo,
  meuConvite,
  minhaCandidatura,
  projetoEncerrado,
  candidatura,
  onAcao,
}: Omit<PainelLateralProjetoProps, 'souMembro' | 'semAcao'>) {
  if (souCriador) {
    return (
      <Link
        to={`/editar-projeto/${projeto.id}`}
        className="block w-full text-center py-3.5 rounded-xl font-extrabold transition-all bg-white dark:bg-slate-900 border-2 border-[#183E6C] text-[#183E6C] dark:text-blue-300 hover:bg-[#183E6C] hover:text-white"
      >
        ✎ Editar Detalhes
      </Link>
    );
  }

  if (meuVinculo) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-center py-3.5 px-4 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-extrabold">
          ✓ Você faz parte da equipe
        </div>
        {!projetoEncerrado && (
          <button type="button" onClick={() => onAcao({ tipo: 'sairDoProjeto', membro: meuVinculo })} className={botaoPerigo}>
            Sair do projeto
          </button>
        )}
      </div>
    );
  }

  if (meuConvite) {
    return (
      <div className="flex flex-col gap-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-5">
        <p className="font-extrabold text-[#F27405] text-center">✉ Você foi convidado para este projeto</p>
        {meuConvite.funcao && (
          <p className="text-sm text-center text-gray-600 dark:text-gray-300">Função: <span className="font-bold">{meuConvite.funcao}</span></p>
        )}
        {meuConvite.mensagem && (
          <p className="text-sm text-gray-600 dark:text-gray-300 italic text-center">“{meuConvite.mensagem}”</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onAcao({ tipo: 'recusarConvite', convite: meuConvite })} className={botaoPerigo}>
            Recusar
          </button>
          <button type="button" onClick={() => onAcao({ tipo: 'aceitarConvite', convite: meuConvite })} className="py-3 rounded-xl font-extrabold bg-[#F27405] text-white hover:bg-[#D96704] transition-all">
            Aceitar
          </button>
        </div>
      </div>
    );
  }

  if (minhaCandidatura?.status === 'PENDENTE') {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-center py-3 px-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F27405] font-bold text-sm">
          Candidatura enviada — aguardando resposta
        </div>
        <button type="button" onClick={() => onAcao({ tipo: 'cancelarCandidatura' })} className={botaoPerigo}>
          ✕ Cancelar Candidatura
        </button>
      </div>
    );
  }

  if (minhaCandidatura?.status === 'REJEITADO') {
    return (
      <div className="py-4 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400">
        <p className="font-extrabold text-center mb-1">Candidatura rejeitada</p>
        {minhaCandidatura.motivoRejeicao && <p className="text-sm text-center opacity-90">{minhaCandidatura.motivoRejeicao}</p>}
      </div>
    );
  }

  if (!projeto.aceitandoCandidaturas) {
    return (
      <button disabled className="w-full py-3.5 rounded-xl font-extrabold bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
        🚫 Candidaturas Fechadas
      </button>
    );
  }

  if (candidatura.mostrandoFormulario) {
    return (
      <CaixaCandidaturat
        mensagem={candidatura.mensagem}
        onChangeMensagem={candidatura.onMudarMensagem}
        onEnviar={candidatura.onEnviar}
        onCancelar={candidatura.onFechar}
        enviando={candidatura.enviando}
        erro={candidatura.erro}
      />
    );
  }

  return (
    <button type="button" onClick={candidatura.onAbrir} className={botaoPrimario}>
      ✓ Quero me Candidatar
    </button>
  );
}

export default function PainelLateralProjeto(props: PainelLateralProjetoProps) {
  const { projeto, souMembro, semAcao } = props;
  const prazo = formatarData(projeto.dataFim);
  const percentual = projeto.vagas > 0 ? Math.round((projeto.vagasPreenchidas / projeto.vagas) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {!semAcao && <AcaoPrincipal {...props} />}

      {souMembro && (
        <Link
          to={`/mensagens/${projeto.id}`}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 hover:border-[#F27405]/40 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F27405] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.4-3.72A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#183E6C] dark:text-blue-300">Conversa da equipe</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Abrir em Mensagens</p>
          </div>
          <span aria-hidden="true" className="text-[#F27405] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      )}

      <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 flex flex-col gap-5">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-extrabold tracking-widest mb-2">Liderado por</p>
          {projeto.criador ? (
            <Link to={`/usuarios/${projeto.criador.id}`} className="flex items-center gap-3 group">
              <Avatar nome={projeto.criador.nome} fotoUrl={projeto.criador.fotoUrl} tamanho="lg" />
              <div className="min-w-0">
                <p className="font-bold text-[#183E6C] dark:text-blue-300 truncate group-hover:underline">{projeto.criador.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{projeto.criador.curso ?? 'Autor do Projeto'}</p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-gray-400">Usuário removido</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-extrabold tracking-widest mb-1">Vagas</p>
            <p className="font-black text-xl text-[#183E6C] dark:text-blue-300">
              {projeto.vagasPreenchidas}<span className="text-gray-400 dark:text-gray-500 text-base">/{projeto.vagas}</span>
            </p>
            <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full mt-2" aria-hidden="true">
              <div className="bg-[#F27405] h-full rounded-full" style={{ width: `${percentual}%` }} />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-extrabold tracking-widest mb-1">Prazo</p>
            <p className="font-bold text-[#183E6C] dark:text-blue-300 text-sm mt-1">{prazo ?? 'Sem prazo'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
