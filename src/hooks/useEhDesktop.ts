// true a partir do breakpoint lg do Tailwind (1024px). Usado quando o layout
// do celular não é só CSS — ex.: mover a ação principal para uma barra fixa
// sem renderizar o mesmo botão duas vezes. Sem matchMedia (jsdom), assume desktop.
import { useEffect, useState } from 'react';

const CONSULTA = '(min-width: 1024px)';

function consultar(): boolean {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia(CONSULTA).matches;
}

export function useEhDesktop(): boolean {
  const [ehDesktop, setEhDesktop] = useState(consultar);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(CONSULTA);
    const onChange = () => setEhDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return ehDesktop;
}
