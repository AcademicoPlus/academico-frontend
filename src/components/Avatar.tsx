// Foto de perfil com fallback para as iniciais (quando não há foto ou ela
// falha ao carregar).
import { useState } from 'react';
import { iniciaisDoNome } from '../utils/projeto';

const TAMANHOS = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-sm',
} as const;

type AvatarProps = {
  nome: string | null | undefined;
  fotoUrl?: string | null;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
};

export default function Avatar({ nome, fotoUrl, tamanho = 'md', className = '' }: AvatarProps) {
  const [falhou, setFalhou] = useState(false);
  const base = `${TAMANHOS[tamanho]} rounded-full shrink-0 ${className}`;

  if (fotoUrl && !falhou) {
    return <img src={fotoUrl} alt={nome ?? ''} onError={() => setFalhou(true)} className={`${base} object-cover`} />;
  }

  return (
    <div aria-hidden="true" className={`${base} bg-[#183E6C] text-white flex items-center justify-center font-black select-none`}>
      {nome ? iniciaisDoNome(nome) : '?'}
    </div>
  );
}
