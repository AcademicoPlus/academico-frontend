import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import AvisosDeProjeto from './AvisosDeProjeto';
import * as avisoService from '../services/avisoService';
import type { AvisoProjeto } from '../services/avisoService';

vi.mock('../services/avisoService');

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

function MostraRota() {
  const local = useLocation();
  return <p data-testid="rota">{local.pathname + local.search}</p>;
}

function renderAvisos() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AvisosDeProjeto />
      <Routes>
        <Route path="*" element={<MostraRota />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AvisosDeProjeto', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(avisoService, 'marcarAvisoComoVisto').mockResolvedValue(undefined);
  });

  it('não mostra nada quando não há avisos pendentes', async () => {
    vi.spyOn(avisoService, 'listarAvisosPendentes').mockResolvedValue([]);

    renderAvisos();

    await waitFor(() => expect(avisoService.listarAvisosPendentes).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('avisa a conclusão e leva para a aba Equipe ao clicar em avaliar, marcando como visto', async () => {
    vi.spyOn(avisoService, 'listarAvisosPendentes').mockResolvedValue([aviso()]);

    renderAvisos();

    const card = await screen.findByTestId('aviso-aviso-1');
    expect(within(card).getByText(/“App de Caronas” foi concluído/)).toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: /avaliar equipe/i }));

    expect(avisoService.marcarAvisoComoVisto).toHaveBeenCalledWith('aviso-1');
    expect(screen.getByTestId('rota')).toHaveTextContent('/detalhes/proj-1?aba=equipe');
    expect(screen.queryByTestId('aviso-aviso-1')).not.toBeInTheDocument();
  });

  it('mostra o motivo do cancelamento e some ao clicar em entendi', async () => {
    vi.spyOn(avisoService, 'listarAvisosPendentes').mockResolvedValue([
      aviso({ id: 'aviso-2', tipo: 'cancelamento', motivo: 'Falta de verba' }),
    ]);

    renderAvisos();

    const card = await screen.findByTestId('aviso-aviso-2');
    expect(within(card).getByText(/foi cancelado pelo criador/)).toBeInTheDocument();
    expect(within(card).getByText('Motivo: Falta de verba')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /avaliar equipe/i })).not.toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: /entendi/i }));

    expect(avisoService.marcarAvisoComoVisto).toHaveBeenCalledWith('aviso-2');
    expect(screen.queryByTestId('aviso-aviso-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('rota')).toHaveTextContent('/dashboard');
  });
});
