import { createContext } from 'react';

export type Tema = 'light' | 'dark';

export type ThemeContextValor = {
  tema: Tema;
  alternarTema: () => void;
};

export const ThemeContext = createContext<ThemeContextValor | null>(null);
