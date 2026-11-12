// Card "Complete seu perfil": barra de progresso + o que falta, cada item
// levando direto para a seção certa da tela de edição. Some quando o perfil
// está completo. No dashboard dá para dispensar até a próxima sessão.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { UsuarioPerfil } from '../services/usuarioService';
import { calcularProgressoPerfil } from '../utils/progressoPerfil';

const CHAVE_DISPENSADO = 'academico:progresso-perfil-dispensado';

function lerDispensado(): boolean {
  try {
    return sessionStorage.getItem(CHAVE_DISPENSADO) === '1';
  } catch {
    return false;
  }
}

type CardProgressoPerfilProps = {
  perfil: UsuarioPerfil;
  // Dashboard: "Agora não" esconde até a próxima sessão. Na página do próprio
  // perfil o card fica sempre visível enquanto houver pendência.
  dispensavel?: boolean;
};

export default function CardProgressoPerfil({ perfil, dispensavel = false }: CardProgressoPerfilProps) {
  const [dispensado, setDispensado] = useState(() => dispensavel && lerDispensado());
  const { pendentes, percentual, completo } = calcularProgressoPerfil(perfil);

  if (completo || dispensado) return null;

  const urlEdicao = `/usuarios/${perfil.id}/editar`;
  const proximo = pendentes[0];

  function dispensar() {
    setDispensado(true);
    try {
      sessionStorage.setItem(CHAVE_DISPENSADO, '1');
    } catch {
      // Sem storage (aba privada etc.): fica dispensado só até recarregar.
    }
  }

  return (
    <section
      aria-labelledby="titulo-progresso-perfil"
      className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/40 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="titulo-progresso-perfil" className="text-base font-bold text-[#183E6C] dark:text-blue-300">
            Complete seu perfil
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Perfis completos recebem recomendações melhores e aparecem mais para quem está montando equipe.
          </p>
        </div>
        <span className="text-2xl font-bold text-[#F27405] shrink-0" aria-hidden="true">{percentual}%</span>
      </div>

      <div
        role="progressbar"
        aria-label="Perfil preenchido"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-[#F27405] transition-all duration-500"
          style={{ width: `${percentual}%` }}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {pendentes.map((item) => (
          <li key={item.chave}>
            <Link
              to={`${urlEdicao}#${item.secao}`}
              className="group flex items-start gap-3 rounded-xl p-2.5 -mx-2.5 hover:bg-orange-50/70 dark:hover:bg-orange-950/20 transition-colors"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-gray-300 dark:border-slate-600 group-hover:border-[#F27405] transition-colors"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-[#F27405]">
                  {item.rotulo}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{item.motivo}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
        {dispensavel && (
          <button
            type="button"
            onClick={dispensar}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            Agora não
          </button>
        )}
        <Link
          to={`${urlEdicao}#${proximo.secao}`}
          className="text-center px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#183E6C] hover:bg-blue-900 transition-colors shadow-sm"
        >
          Completar perfil
        </Link>
      </div>
    </section>
  );
}
