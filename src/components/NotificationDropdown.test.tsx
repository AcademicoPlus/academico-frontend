import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import NotificationDropdown from './NotificationDropdown';
import Header from './header';
import * as avisoService from '../services/avisoService';
import * as conviteService from '../services/conviteService';
import type { AvisoProjeto } from '../services/avisoService';
import { ThemeProvider } from '../context/ThemeContext';

vi.mock('../services/avisoService', async (importOriginal) => {
  const original = await importOriginal<typeof avisoService>();
  // Mantém o evento real (o sino escuta) e mocka só as chamadas à API.
  return { ...original, listarAvisosPendentes: vi.fn(), marcarAvisoComoVisto: vi.fn() };
});
vi.mock('../services/conviteService', async (importOriginal) => {
  const original = await importOriginal<typeof conviteService>();
  return { ...original, listarConvitesRecebidos: vi.fn(), contarConvitesPendentes: vi.fn() };
});

function aviso(overrides: Partial<AvisoProjeto> = {}): AvisoProjeto {
  return {
    id: 'aviso-1',
    projetoId: 'proj-1',
    projetoNome: 'App de Caronas',
    tipo: 'conclusao',
    motivo: null,
    criadoEm: '2026-11-12T10:00:00',
    ...overrides,
  };
}

function paginaDeConvites(content: conviteService.Convite[] = []) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 20, last: true };
}

function MostraRota() {
  const local = useLocation();
  return <p data-testid="rota">{local.pathname + local.search}</p>;
}

function renderDropdown(onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <NotificationDropdown onClose={onClose} />
      <Routes>
        <Route path="*" element={<MostraRota />} />
      </Routes>
    </MemoryRouter>,
  );
  return onClose;
}

describe('NotificationDropdown — avisos de projeto', () => {
  beforeEach(() => {
    vi.mocked(avisoService.marcarAvisoComoVisto).mockReset().mockResolvedValue(undefined);
    vi.mocked(conviteService.listarConvitesRecebidos).mockReset().mockResolvedValue(paginaDeConvites());
  });

  it('mostra o aviso de conclusão e leva para a aba Equipe ao clicar em avaliar', async () => {
    vi.mocked(avisoService.listarAvisosPendentes).mockResolvedValue([aviso()]);
    const aoRecontar = vi.fn();
    window.addEventListener(avisoService.EVENTO_AVISOS_ATUALIZADOS, aoRecontar);

    const onClose = renderDropdown();

    const card = await screen.findByTestId('aviso-aviso-1');
    expect(within(card).getByText(/foi concluído/)).toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: /avaliar equipe/i }));

    expect(avisoService.marcarAvisoComoVisto).toHaveBeenCalledWith('aviso-1');
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('rota')).toHaveTextContent('/detalhes/proj-1?aba=equipe');
    // O sino é avisado para recontar.
    await waitFor(() => expect(aoRecontar).toHaveBeenCalled());
    window.removeEventListener(avisoService.EVENTO_AVISOS_ATUALIZADOS, aoRecontar);
  });

  it('mostra o motivo do cancelamento e some ao dispensar', async () => {
    vi.mocked(avisoService.listarAvisosPendentes).mockResolvedValue([
      aviso({ id: 'aviso-2', tipo: 'cancelamento', motivo: 'Falta de verba' }),
    ]);

    renderDropdown();

    const card = await screen.findByTestId('aviso-aviso-2');
    expect(within(card).getByText(/foi cancelado pelo criador/)).toBeInTheDocument();
    expect(within(card).getByText('Motivo: Falta de verba')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /avaliar equipe/i })).not.toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: /dispensar/i }));

    expect(avisoService.marcarAvisoComoVisto).toHaveBeenCalledWith('aviso-2');
    expect(screen.queryByTestId('aviso-aviso-2')).not.toBeInTheDocument();
    expect(screen.getByText(/não tem novas notificações/i)).toBeInTheDocument();
  });

  it('continua mostrando os avisos mesmo se a lista de convites falhar', async () => {
    vi.mocked(avisoService.listarAvisosPendentes).mockResolvedValue([aviso()]);
    vi.mocked(conviteService.listarConvitesRecebidos).mockRejectedValue(new Error('falhou'));

    renderDropdown();

    expect(await screen.findByTestId('aviso-aviso-1')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar todas/i);
  });
});

describe('Header — sino de notificações', () => {
  beforeEach(() => {
    vi.mocked(conviteService.contarConvitesPendentes).mockReset().mockResolvedValue({ pendentes: 0 });
  });

  it('acende o sino quando há aviso de projeto pendente, mesmo sem convites', async () => {
    vi.mocked(avisoService.listarAvisosPendentes).mockResolvedValue([aviso()]);

    render(<ThemeProvider><MemoryRouter><Header onToggleMenu={() => {}} /></MemoryRouter></ThemeProvider>);

    expect(await screen.findByRole('button', { name: 'Notificações (1 nova)' })).toBeInTheDocument();
  });

  it('não acende o sino sem convites nem avisos', async () => {
    vi.mocked(avisoService.listarAvisosPendentes).mockResolvedValue([]);

    render(<ThemeProvider><MemoryRouter><Header onToggleMenu={() => {}} /></MemoryRouter></ThemeProvider>);

    await waitFor(() => expect(avisoService.listarAvisosPendentes).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });
});
