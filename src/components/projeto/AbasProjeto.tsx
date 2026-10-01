// Barra de abas acessível (padrão WAI-ARIA "tabs"): setas ←/→, Home e End
// movem o foco e ativam a aba vizinha.
import { useRef, type KeyboardEvent } from 'react';
import { idDaAba, idDoPainel, type AbaProjeto } from './tipos';

export type DefinicaoAba = {
  id: AbaProjeto;
  rotulo: string;
  // Número exibido ao lado do rótulo (ex.: tamanho da equipe).
  contador?: number;
  // Pede atenção (ex.: candidaturas aguardando resposta) — vira um badge laranja.
  pendencias?: number;
};

type AbasProjetoProps = {
  abas: DefinicaoAba[];
  ativa: AbaProjeto;
  onSelecionar: (aba: AbaProjeto) => void;
};

export default function AbasProjeto({ abas, ativa, onSelecionar }: AbasProjetoProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const destinos: Record<string, number> = {
      ArrowRight: (indice + 1) % abas.length,
      ArrowLeft: (indice - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    };
    const destino = destinos[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    const aba = abas[destino];
    onSelecionar(aba.id);
    refs.current[aba.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Seções do projeto"
      className="flex gap-1 overflow-x-auto border-b border-gray-100 dark:border-slate-800 px-4 md:px-8"
    >
      {abas.map((aba, indice) => {
        const selecionada = aba.id === ativa;
        return (
          <button
            key={aba.id}
            ref={(el) => { refs.current[aba.id] = el; }}
            type="button"
            role="tab"
            id={idDaAba(aba.id)}
            aria-selected={selecionada}
            aria-controls={idDoPainel(aba.id)}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onSelecionar(aba.id)}
            onKeyDown={(e) => handleKeyDown(e, indice)}
            className={`relative flex items-center gap-2 px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#F27405]/40 rounded-t-lg ${
              selecionada
                ? 'text-[#183E6C] dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-[#183E6C] dark:hover:text-blue-300'
            }`}
          >
            {aba.rotulo}
            {aba.contador !== undefined && (
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{aba.contador}</span>
            )}
            {!!aba.pendencias && (
              <span
                aria-label={`${aba.pendencias} pendentes`}
                className="min-w-5 h-5 px-1.5 rounded-full bg-[#F27405] text-white text-[11px] font-bold flex items-center justify-center"
              >
                {aba.pendencias}
              </span>
            )}
            {selecionada && <span aria-hidden="true" className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-[#F27405]" />}
          </button>
        );
      })}
    </div>
  );
}
