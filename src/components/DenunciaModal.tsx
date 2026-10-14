// Formulário de denúncia (categoria + relato) reaproveitado pelos três alvos:
// avaliação, projeto e perfil. Antes esse formulário existia só inline na
// página de perfil, para avaliações; ao abrir a denúncia para projetos e
// perfis, mantê-lo em três cópias divergiria as mensagens e a validação.
import { useState } from 'react';

import ConfirmModal from './ConfirmModal';
import {
  CATEGORIAS_DENUNCIA,
  type CategoriaDenuncia,
  type DenunciarPayload,
} from '../services/denunciaService';

// O backend exige entre 10 e 1000 caracteres no motivo; validamos aqui também
// para o usuário saber antes de enviar, não depois do 400.
const MOTIVO_MINIMO = 10;
const MOTIVO_MAXIMO = 1000;

type DenunciaModalProps = {
  titulo: string;
  // Descreve o que está sendo denunciado, p.ex. 'o projeto "Atelier"'.
  descricaoAlvo: string;
  enviando: boolean;
  /**
   * Erro devolvido pelo backend na última tentativa de envio — por exemplo
   * "Você já denunciou este perfil". Entra aqui, e não numa mensagem solta na
   * página, porque o modal continua aberto depois da falha: é onde a pessoa
   * está olhando no momento em que o erro acontece.
   */
  erroEnvio?: string | null;
  onEnviar: (dados: DenunciarPayload) => void;
  onCancelar: () => void;
};

export default function DenunciaModal({
  titulo,
  descricaoAlvo,
  enviando,
  erroEnvio = null,
  onEnviar,
  onCancelar,
}: DenunciaModalProps) {
  const [categoria, setCategoria] = useState<CategoriaDenuncia>('CONTEUDO_OFENSIVO');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const restantes = MOTIVO_MAXIMO - motivo.length;

  // A validação local fala do que a pessoa acabou de digitar, então tem
  // precedência sobre o erro da tentativa anterior.
  const mensagemDeErro = erro ?? erroEnvio;

  function handleConfirmar() {
    const texto = motivo.trim();

    if (texto.length < MOTIVO_MINIMO) {
      setErro(`Explique o que aconteceu em pelo menos ${MOTIVO_MINIMO} caracteres.`);
      return;
    }
    if (texto.length > MOTIVO_MAXIMO) {
      setErro(`O relato não pode passar de ${MOTIVO_MAXIMO} caracteres.`);
      return;
    }

    setErro(null);
    onEnviar({ categoria, motivo: texto });
  }

  return (
    <ConfirmModal
      titulo={titulo}
      mensagem={
        <>
          Sua denúncia sobre {descricaoAlvo} vai para a análise da administração. O conteúdo
          permanece no ar até a decisão.
        </>
      }
      variante="perigo"
      textoConfirmar="Enviar denúncia"
      confirmando={enviando}
      confirmarDesabilitado={motivo.trim().length < MOTIVO_MINIMO}
      onConfirmar={handleConfirmar}
      onCancelar={onCancelar}
    >
      <div className="flex flex-col gap-3">
        {mensagemDeErro && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400"
          >
            {mensagemDeErro}
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
            Motivo
          </span>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaDenuncia)}
            disabled={enviando}
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-primary"
          >
            {CATEGORIAS_DENUNCIA.map((item) => (
              <option
                key={item.valor}
                value={item.valor}
                className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              O que aconteceu?
            </span>
            <span
              className={`text-[11px] ${
                restantes < 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {restantes} restantes
            </span>
          </div>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={enviando}
            rows={4}
            placeholder="Descreva o que viu, com o máximo de detalhe que puder. Isso é o que a administração vai ler para decidir."
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-primary resize-y min-h-[96px]"
          />
        </label>
      </div>
    </ConfirmModal>
  );
}
