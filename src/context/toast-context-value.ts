import { createContext } from 'react';

export type TipoToast = 'erro' | 'sucesso' | 'info';

export type ToastContextValor = {
  mostrarToast: (mensagem: string, tipo?: TipoToast) => void;
};

export const ToastContext = createContext<ToastContextValor | null>(null);
