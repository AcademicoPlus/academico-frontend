import type { ProjetoDetalhe } from '../../services/projetoService';

export default function AbaSobre({ projeto }: { projeto: ProjetoDetalhe }) {
  const obrigatorias = projeto.habilidadesNecessarias.filter((h) => h.obrigatoria);
  const desejaveis = projeto.habilidadesNecessarias.filter((h) => !h.obrigatoria);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-lg font-bold text-[#183E6C] dark:text-blue-300 mb-3">Sobre o Projeto</h2>
        <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed whitespace-pre-line">{projeto.descricao}</p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#183E6C] dark:text-blue-300 mb-3">Habilidades Desejadas</h2>
        {projeto.habilidadesNecessarias.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma habilidade específica requerida.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {obrigatorias.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Obrigatórias</p>
                <div className="flex flex-wrap gap-2">
                  {obrigatorias.map((h) => (
                    <span key={h.id} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#183E6C] text-white">
                      {h.habilidade.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {desejaveis.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Desejáveis</p>
                <div className="flex flex-wrap gap-2">
                  {desejaveis.map((h) => (
                    <span key={h.id} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-orange-50 dark:bg-orange-950/40 text-[#F27405] border border-orange-100 dark:border-orange-900/50">
                      {h.habilidade.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
