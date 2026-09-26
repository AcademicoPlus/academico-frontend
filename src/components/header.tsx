import { useEffect, useState } from 'react';
import logo from '../assets/logo.png';
import NotificationDropdown from './NotificationDropdown';
import { contarConvitesPendentes, EVENTO_CONVITES_ATUALIZADOS } from '../services/conviteService';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onToggleMenu: () => void;
}

export default function Header({ onToggleMenu }: HeaderProps) {
  // Estado para controlar se a janela (dropdown) está aberta ou fechada
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Por enquanto, notificações = convites de projeto pendentes. Recarrega ao
  // abrir o sininho e quando algum convite é respondido em outra tela.
  const [convitesPendentes, setConvitesPendentes] = useState(0);
  const hasNotifications = convitesPendentes > 0;

  useEffect(() => {
    const atualizar = () => {
      contarConvitesPendentes()
        .then((r) => setConvitesPendentes(r.pendentes))
        .catch(() => setConvitesPendentes(0));
    };
    atualizar();
    window.addEventListener(EVENTO_CONVITES_ATUALIZADOS, atualizar);
    return () => window.removeEventListener(EVENTO_CONVITES_ATUALIZADOS, atualizar);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-900 h-16 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {/* Botão de menu celular */}
        <button
          onClick={onToggleMenu}
          className="text-gray-500 dark:text-gray-400 hover:text-[#F27405] transition-colors lg:hidden"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <img src={logo} alt="Acadêmico+" className="h-8 object-contain" />
      </div>

      {/* Segura o botão e o dropdown juntos */}
      <div className="relative flex items-center gap-1">
        <ThemeToggle />

        <button
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          className="text-gray-400 dark:text-gray-500 hover:text-[#183E6C] dark:hover:text-blue-300 transition-colors relative p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>

          {/* O pontinho só renderiza se hasNotifications for true */}
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 bg-[#F27405] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900"></span>
          )}
        </button>

        {/* A janela renderiza quando isNotificationsOpen for true */}
        {isNotificationsOpen && (
          <NotificationDropdown onClose={() => setIsNotificationsOpen(false)} />
        )}
      </div>
    </header>
  )
}