import { useCallback, useState, type ReactNode } from 'react';
import { ToastContext, type TipoToast } from './toast-context-value';

type Toast = {
  id: number;
  mensagem: string;
  tipo: TipoToast;
};

let proximoId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrarToast = useCallback((mensagem: string, tipo: TipoToast = 'info') => {
    const id = proximoId++;
    setToasts((atual) => [...atual, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((atual) => atual.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
              toast.tipo === 'erro'
                ? 'bg-red-600'
                : toast.tipo === 'sucesso'
                ? 'bg-green-600'
                : 'bg-[#183E6C]'
            }`}
          >
            {toast.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
