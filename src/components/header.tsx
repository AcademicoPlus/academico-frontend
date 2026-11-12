import { useEffect, useState } from 'react';
import logoClara from '../assets/logo.png'; 
import logoEscura from '../assets/logo-escura.png';

import NotificationDropdown from './NotificationDropdown';
import { contarConvitesPendentes, EVENTO_CONVITES_ATUALIZADOS } from '../services/conviteService';
import { EVENTO_AVISOS_ATUALIZADOS, listarAvisosPendentes } from '../services/avisoService';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onToggleMenu: () => void;
}

// Convites e avisos chegam de ações de outras pessoas (o criador convida,
// conclui ou cancela o projeto): sem rechecar, o sino só acenderia no F5.
const INTERVALO_ATUALIZACAO_MS = 60_000;

export default function Header({ onToggleMenu }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [convitesPendentes, setConvitesPendentes] = useState(0);
  const [avisosPendentes, setAvisosPendentes] = useState(0);
  const totalNotificacoes = convitesPendentes + avisosPendentes;
  const hasNotifications = totalNotificacoes > 0;

  useEffect(() => {
    const atualizarConvites = () => {
      contarConvitesPendentes()
        .then((r) => setConvitesPendentes(r.pendentes))
        .catch(() => setConvitesPendentes(0));
    };
    const atualizarAvisos = () => {
      listarAvisosPendentes()
        .then((avisos) => setAvisosPendentes(avisos.length))
        .catch(() => setAvisosPendentes(0));
    };
    const atualizarTudo = () => {
      atualizarConvites();
      atualizarAvisos();
    };
    const aoVoltarParaAba = () => {
      if (document.visibilityState === 'visible') atualizarTudo();
    };

    atualizarTudo();
    const intervalo = window.setInterval(atualizarTudo, INTERVALO_ATUALIZACAO_MS);
    window.addEventListener(EVENTO_CONVITES_ATUALIZADOS, atualizarConvites);
    window.addEventListener(EVENTO_AVISOS_ATUALIZADOS, atualizarAvisos);
    document.addEventListener('visibilitychange', aoVoltarParaAba);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener(EVENTO_CONVITES_ATUALIZADOS, atualizarConvites);
      window.removeEventListener(EVENTO_AVISOS_ATUALIZADOS, atualizarAvisos);
      document.removeEventListener('visibilitychange', aoVoltarParaAba);
    };
  }, []);

  return (
    <header 
      className="shadow-md h-16 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-50 bg-[linear-gradient(to_right,#ecf1f9,#2658ad)] dark:bg-[linear-gradient(to_right,#1c294f)]"
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleMenu}
          aria-label="Abrir menu"
          className="p-2 -ml-1 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors lg:hidden drop-shadow-md"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        
        <img src={logoClara} alt="Acadêmico+" className="block dark:hidden h-8 object-contain drop-shadow-md" />
        <img src={logoEscura} alt="Acadêmico+" className="hidden dark:block h-14 object-contain drop-shadow-md" />
      </div>

      <div className="relative flex items-center gap-1">
        
        {/* Wrapper adicionado ao ThemeToggle para forçar cor e sombra nos ícones de Sol/Lua */}
        <div className="text-white drop-shadow-md [&>button]:text-white/90 hover:[&>button]:text-white hover:[&>button]:bg-white/20 [&>button]:p-2 [&>button]:rounded-full [&>button]:transition-colors">
          <ThemeToggle />
        </div>

        <button
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          aria-label={hasNotifications
            ? `Notificações (${totalNotificacoes} ${totalNotificacoes === 1 ? 'nova' : 'novas'})`
            : 'Notificações'}
          aria-expanded={isNotificationsOpen}
          className="text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors relative p-2 drop-shadow-md"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>

          {hasNotifications && (
            <span className="absolute top-1 right-1.5 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-transparent"></span>
          )}
        </button>

        {isNotificationsOpen && (
          <NotificationDropdown onClose={() => setIsNotificationsOpen(false)} />
        )}
      </div>
    </header>
  );
}