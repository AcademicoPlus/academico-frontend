import type { Candidatura } from '../../services/candidaturaService';
import type { Convite } from '../../services/conviteService';
import type { ProjetoMembro } from '../../services/projetoMembroService';
import type { ProjetoDetalhe } from '../../services/projetoService';

// Ações da página de detalhes que passam pelo modal de confirmação único.
export type AcaoConfirmavel =
  | { tipo: 'cancelarCandidatura' }
  | { tipo: 'aceitarCandidatura'; candidatura: Candidatura }
  | { tipo: 'rejeitarCandidatura'; candidatura: Candidatura }
  | { tipo: 'cancelarConvite'; convite: Convite }
  | { tipo: 'aceitarConvite'; convite: Convite }
  | { tipo: 'recusarConvite'; convite: Convite }
  | { tipo: 'removerMembro'; membro: ProjetoMembro }
  | { tipo: 'sairDoProjeto'; membro: ProjetoMembro }
  | { tipo: 'removerBanner' };

export type AbaProjeto = 'sobre' | 'equipe' | 'gerenciar';

// Ações que o visitante precisa ter sempre à mão: candidatar-se ou responder
// a um convite. No celular elas ficam fixas no rodapé em vez de na lateral.
export function acaoEhUrgente(p: {
  projeto: ProjetoDetalhe;
  souCriador: boolean;
  meuVinculo: ProjetoMembro | null;
  meuConvite: Convite | null;
  minhaCandidatura: Candidatura | null;
}): boolean {
  if (p.souCriador || p.meuVinculo) return false;
  return p.meuConvite !== null || (p.minhaCandidatura === null && p.projeto.aceitandoCandidaturas);
}

// Liga cada aba (role="tab") ao seu painel (role="tabpanel") via aria-controls/labelledby.
export const idDaAba = (aba: AbaProjeto) => `aba-projeto-${aba}`;
export const idDoPainel = (aba: AbaProjeto) => `painel-projeto-${aba}`;
