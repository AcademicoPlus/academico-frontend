import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Tema } from './theme-context-value';

const CHAVE_ARMAZENAMENTO = 'academico:tema';

function lerTemaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
  if (salvo === 'light' || salvo === 'dark') {
    return salvo;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerTemaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
    localStorage.setItem(CHAVE_ARMAZENAMENTO, tema);
  }, [tema]);

  function alternarTema() {
    setTema((atual) => (atual === 'dark' ? 'light' : 'dark'));
  }

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}
