// Aba só do criador: tudo que pede ação para montar a equipe — candidaturas
// pendentes primeiro (alguém está esperando resposta), depois convites e
// sugestões de pessoas.
import { Link } from 'react-router-dom';
import type { Candidatura } from '../../services/candidaturaService';
import type { Convite } from '../../services/conviteService';
import type { UsuarioRecomendado } from '../../services/recomendacaoService';
import type { UsuarioResumo } from '../../services/authService';
import Avatar from '../Avatar';
import ErroCard from '../ErroCard';

type AbaGerenciarProps = {
  candidaturas: Candidatura[];
  convites: Convite[];
  recomendados: UsuarioRecomendado[];
  idsConvidados: Set<string>;
  podeConvidar: boolean;
  erro: string | null;
  onAceitar: (candidatura: Candidatura) => void;
  onRejeitar: (candidatura: Candidatura) => void;
  onCancelarConvite: (convite: Convite) => void;
  onConvidar: (usuario: UsuarioResumo | null) => void;
};

function Secao({ titulo, contador, acao, children }: { titulo: string; contador?: number; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-lg font-bold text-[#183E6C] dark:text-blue-300">
          {titulo} {!!contador && <span className="text-gray-400 dark:text-gray-500 font-semibold">({contador})</span>}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function NomeComLink({ usuario }: { usuario: UsuarioResumo | null }) {
  if (!usuario) return <p className="text-sm font-bold text-gray-400">Usuário removido</p>;
  return (
    <Link to={`/usuarios/${usuario.id}`} className="block text-sm font-bold text-gray-900 dark:text-gray-100 truncate hover:underline">
      {usuario.nome}
    </Link>
  );
}

export default function AbaGerenciar({
  candidaturas,
  convites,
  recomendados,
  idsConvidados,
  podeConvidar,
  erro,
  onAceitar,
  onRejeitar,
  onCancelarConvite,
  onConvidar,
}: AbaGerenciarProps) {
  return (
    <div className="flex flex-col gap-10">
      {erro && <ErroCard>{erro}</ErroCard>}

      <Secao titulo="Candidaturas Pendentes" contador={candidaturas.length}>
        {candidaturas.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma candidatura pendente no momento.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {candidaturas.map((candidatura) => (
              <li key={candidatura.id} className="bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar nome={candidatura.usuario?.nome} fotoUrl={candidatura.usuario?.fotoUrl} />
                  <div className="min-w-0 flex-1">
                    <NomeComLink usuario={candidatura.usuario} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{candidatura.usuario?.curso ?? '—'}</p>
                  </div>
                </div>

                {candidatura.mensagem && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-700/70 rounded-xl px-3 py-2.5 mt-3">
                    “{candidatura.mensagem}”
                  </p>
                )}

                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => onRejeitar(candidatura)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => onAceitar(candidatura)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#F27405] hover:bg-[#D96704] shadow-sm transition-colors"
                  >
                    Aceitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao
        titulo="Convites Enviados"
        contador={convites.length}
        acao={podeConvidar && (
          <button
            type="button"
            onClick={() => onConvidar(null)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors shrink-0"
          >
            ✉ Convidar pessoa
          </button>
        )}
      >
        {convites.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum convite aguardando resposta.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {convites.map((convite) => (
              <li key={convite.id} className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-3 rounded-2xl flex items-center gap-3">
                <Avatar nome={convite.convidado?.nome} fotoUrl={convite.convidado?.fotoUrl} />
                <div className="min-w-0 flex-1">
                  <NomeComLink usuario={convite.convidado} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {convite.funcao ?? 'Sem função definida'} · aguardando resposta
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelarConvite(convite)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {recomendados.length > 0 && (
        <Secao titulo="Candidatos Recomendados">
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-3">
            Pessoas com habilidades que combinam com o projeto.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recomendados.map((rec) => (
              <li key={rec.usuario.id} className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar nome={rec.usuario.nome} fotoUrl={rec.usuario.fotoUrl} />
                  <div className="min-w-0 flex-1">
                    <NomeComLink usuario={rec.usuario} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{rec.usuario.curso ?? '—'}</p>
                  </div>
                  <span className="text-xs font-black text-[#F27405] shrink-0" title="Compatibilidade">
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
                    onClick={() => onConvidar(rec.usuario)}
                    className="self-start px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors"
                  >
                    ✉ Convidar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </div>
  );
}
