// Equipe: criador + membros. O criador remove membros; depois do
// encerramento a equipe congela e vira base das avaliações entre colegas.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProjetoDetalhe } from '../../services/projetoService';
import type { ProjetoMembro } from '../../services/projetoMembroService';
import Avatar from '../Avatar';
import Estrelas from '../Estrelas';

type AbaEquipeProps = {
  projeto: ProjetoDetalhe;
  membros: ProjetoMembro[];
  meuId: string | null;
  souCriador: boolean;
  souMembro: boolean;
  projetoEncerrado: boolean;
  podeConvidar: boolean;
  // IDs avaliados nesta sessão — mora no pai para sobreviver à troca de aba.
  avaliados: Set<string>;
  onAvaliar: (membro: ProjetoMembro, nota: number, comentario: string | undefined) => Promise<string | null>;
  onRemover: (membro: ProjetoMembro) => void;
  onConvidar: () => void;
};

export default function AbaEquipe({
  projeto,
  membros,
  meuId,
  souCriador,
  souMembro,
  projetoEncerrado,
  podeConvidar,
  avaliados,
  onAvaliar,
  onRemover,
  onConvidar,
}: AbaEquipeProps) {
  const [avaliandoId, setAvaliandoId] = useState<string | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrirAvaliacao(membro: ProjetoMembro) {
    setAvaliandoId(membro.id);
    setNota(5);
    setComentario('');
    setErro(null);
  }

  async function enviarAvaliacao(membro: ProjetoMembro) {
    setEnviando(true);
    const falha = await onAvaliar(membro, nota, comentario.trim() || undefined);
    setEnviando(false);
    setErro(falha);
    if (!falha) setAvaliandoId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#183E6C] dark:text-blue-300">Equipe Atual ({projeto.totalMembros})</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {projeto.vagasPreenchidas} de {projeto.vagas} vagas preenchidas
          </p>
        </div>
        {souCriador && podeConvidar && (
          <button
            type="button"
            onClick={onConvidar}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors shrink-0"
          >
            ✉ Convidar pessoa
          </button>
        )}
      </div>

      {projetoEncerrado && souMembro && (
        <p className="text-sm text-gray-600 dark:text-gray-300 bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 rounded-xl px-4 py-3">
          Projeto encerrado: avalie seus colegas de equipe. As avaliações aparecem no perfil de cada um.
        </p>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projeto.criador && (
          <li className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3">
            <Avatar nome={projeto.criador.nome} fotoUrl={projeto.criador.fotoUrl} tamanho="lg" />
            <div className="min-w-0 flex-1">
              <Link to={`/usuarios/${projeto.criador.id}`} className="block text-sm font-bold text-[#183E6C] dark:text-blue-300 truncate hover:underline">
                {projeto.criador.nome}
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{projeto.criador.curso ?? '—'}</p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-[#183E6C]/10 text-[#183E6C] dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
              Criador(a)
            </span>
          </li>
        )}

        {membros.map((membro) => {
          const usuario = membro.usuario;
          const podeAvaliar = projetoEncerrado && souMembro && usuario && usuario.id !== meuId;
          const jaAvaliado = usuario ? avaliados.has(usuario.id) : false;
          const avaliandoEste = avaliandoId === membro.id;

          return (
            <li
              key={membro.id}
              data-testid={`membro-${membro.id}`}
              className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <Avatar nome={usuario?.nome} fotoUrl={usuario?.fotoUrl} tamanho="lg" />
                <div className="min-w-0 flex-1">
                  {usuario ? (
                    <Link to={`/usuarios/${usuario.id}`} className="block text-sm font-bold text-[#183E6C] dark:text-blue-300 truncate hover:underline">
                      {usuario.nome}
                    </Link>
                  ) : (
                    <p className="text-sm font-bold text-gray-400">Usuário removido</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{membro.funcao ?? usuario?.curso ?? '—'}</p>
                </div>
                {souCriador && !projetoEncerrado && (
                  <button
                    type="button"
                    aria-label={`Remover ${usuario?.nome ?? 'membro'} do projeto`}
                    onClick={() => onRemover(membro)}
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
                    {erro && <p role="alert" className="text-xs text-red-500 dark:text-red-400">{erro}</p>}
                    <Estrelas nota={nota} onSelecionar={setNota} tamanho="h-5 w-5" />
                    <textarea
                      rows={2}
                      placeholder="Comentário (opcional)..."
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#183E6C] focus:ring-1 focus:ring-[#183E6C] resize-none text-xs dark:text-gray-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setAvaliandoId(null); setErro(null); }}
                        disabled={enviando}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarAvaliacao(membro)}
                        disabled={enviando}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors disabled:opacity-60"
                      >
                        {enviando ? 'Enviando…' : 'Enviar avaliação'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirAvaliacao(membro)}
                    className="self-start text-xs font-bold text-[#183E6C] dark:text-blue-300 hover:underline"
                  >
                    ★ Avaliar
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>

      {membros.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Nenhum membro no momento.{souCriador && podeConvidar && ' Convide pessoas ou aguarde candidaturas.'}
        </p>
      )}
    </div>
  );
}
