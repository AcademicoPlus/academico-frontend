import { useRef, type ChangeEvent } from 'react';
import type { ProjetoDetalhe } from '../../services/projetoService';
import { STATUS_PROJETO_BADGE, STATUS_PROJETO_LABEL } from '../../utils/projeto';

type CapaProjetoProps = {
  projeto: ProjetoDetalhe;
  editavel: boolean;
  enviando: boolean;
  erro: string | null;
  onEnviar: (arquivo: File) => void;
  onRemover: () => void;
};

export default function CapaProjeto({ projeto, editavel, enviando, erro, onEnviar, onRemover }: CapaProjetoProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (arquivo) onEnviar(arquivo);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="h-56 sm:h-72 w-full relative bg-linear-to-br from-[#183E6C] to-[#0B1D33]">
      {projeto.bannerUrl && <img src={projeto.bannerUrl} alt="Capa" className="w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-linear-to-t from-[#0B1D33]/90 via-[#0B1D33]/40 to-transparent" />
      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 pr-6">
        <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider mb-3 inline-block shadow-sm ${STATUS_PROJETO_BADGE[projeto.status]}`}>
          ● {STATUS_PROJETO_LABEL[projeto.status]}
        </span>
        <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight drop-shadow-lg">{projeto.titulo}</h1>
      </div>

      {editavel && (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <input
            type="file"
            ref={inputRef}
            onChange={handleChange}
            accept="image/jpeg,image/png,image/jpg,image/webp"
            className="hidden"
            id="banner-projeto-input"
          />
          <label
            htmlFor="banner-projeto-input"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm cursor-pointer transition-colors ${enviando ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
            {enviando ? 'Enviando…' : 'Alterar capa' }
          </label>
          {projeto.bannerUrl && (
            <button
              type="button"
              onClick={onRemover}
              disabled={enviando}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-black/40 hover:bg-red-600/80 backdrop-blur-sm cursor-pointer transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              🗑️ Remover capa
            </button>
          )}
          {erro && (
            <p className="max-w-56 text-right text-xs font-semibold text-red-200 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5">{erro}</p>
          )}
        </div>
      )}
    </div>
  );
}
