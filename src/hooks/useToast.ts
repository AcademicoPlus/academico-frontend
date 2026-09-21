import { useContext } from 'react';
import { ToastContext } from '../context/toast-context-value';

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToast precisa ser usado dentro de um ToastProvider');
  }
  return contexto;
}
