import { useContext } from 'react';
import { ThemeContext } from '../context/theme-context-value';

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) {
    throw new Error('useTheme precisa ser usado dentro de um ThemeProvider');
  }
  return contexto;
}
