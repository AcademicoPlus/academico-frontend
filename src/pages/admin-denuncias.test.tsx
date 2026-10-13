import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AdminDenuncias from './admin-denuncias';
import * as denunciaService from '../services/denunciaService';
import type { Denuncia } from '../services/denunciaService';
import type { UsuarioResumo } from '../services/authService';

vi.mock('../services/denunciaService', async (importOriginal) => {
  // As listas de categorias/medidas são dados, não comportamento: a página
  // monta os rótulos a partir delas, então precisam vir do módulo real.
  const real = await importOriginal<typeof denunciaService>();
  return {
    ...real,
    listarDenunciasPendentes: vi.fn(),
    resolverDenuncia: vi.fn(),
  };
});

const DENUNCIANTE: UsuarioResumo = {
  id: 'user-1', nome: 'Ana Silva', curso: 'Ciência da Computação', fotoUrl: null,
  permission: 'ALUNO', periodo: 3, notaMedia: null, totalAvaliacoes: null,
};

const RESPONSAVEL: UsuarioResumo = {
  id: 'user-2', nome: 'Bruno Alves', curso: 'Engenharia', fotoUrl: null,
  permission: 'ALUNO', periodo: 5, notaMedia: 3.5, totalAvaliacoes: 4,
};

const DENUNCIA_DE_AVALIACAO: Denuncia = {
  id: 'den-1',
  tipoAlvo: 'AVALIACAO',
  alvo: {
    id: 'aval-1',
    titulo: 'Avaliação de Bruno Alves',
    conteudo: 'Comentário ofensivo',
    nota: 1,
    autor: RESPONSAVEL,
  },
  responsavel: RESPONSAVEL,
  denunciante: DENUNCIANTE,
  categoria: 'CONTEUDO_OFENSIVO',
  motivo: 'Linguagem abusiva',
  status: 'PENDENTE',
  medida: null,
  historicoResponsavel: {
    advertencias: 0,
    suspensoes: 0,
    suspensoAgora: false,
    suspensoAte: null,
    medidaSugerida: 'ADVERTENCIA',
    justificativaSugestao: 'Sem histórico de sanções: a escada recomenda começar pela advertência.',
  },
  criadoEm: '2026-01-01T00:00:00Z',
  analisadoEm: null,
};

// Mesmo responsável, já com duas advertências: a escada deve sugerir suspender.
const DENUNCIA_DE_PERFIL_REINCIDENTE: Denuncia = {
  ...DENUNCIA_DE_AVALIACAO,
  id: 'den-2',
  tipoAlvo: 'PERFIL',
  alvo: {
    id: RESPONSAVEL.id,
    titulo: 'Bruno Alves',
    conteudo: 'Vendo trabalhos prontos',
    nota: null,
    autor: RESPONSAVEL,
  },
  categoria: 'GOLPE',
  motivo: 'Perfil usado para vender trabalhos prontos',
  historicoResponsavel: {
    advertencias: 2,
    suspensoes: 0,
    suspensoAgora: false,
    suspensoAte: null,
    medidaSugerida: 'SUSPENSAO',
    justificativaSugestao: 'Já acumula 2 advertência(s): a escada recomenda suspender por 7 dias.',
  },
};

function mockarLista(denuncias: Denuncia[]) {
  vi.mocked(denunciaService.listarDenunciasPendentes).mockResolvedValue({
    content: denuncias, totalElements: denuncias.length, totalPages: 1, number: 0, size: 10, last: true,
  });
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminDenuncias />
    </MemoryRouter>,
  );
}

describe('AdminDenuncias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista as denúncias pendentes com alvo, relato e categoria', async () => {
    mockarLista([DENUNCIA_DE_AVALIACAO]);

    renderPagina();

    expect(await screen.findByText('Avaliação de Bruno Alves')).toBeInTheDocument();
    expect(screen.getByText('Linguagem abusiva')).toBeInTheDocument();
    expect(screen.getByText(/Relato de Ana Silva/i)).toBeInTheDocument();
    expect(screen.getByText(/Conteúdo ofensivo ou discriminatório/i)).toBeInTheDocument();
  });

  it('mostra o histórico do responsável, que é o que sustenta a escada', async () => {
    mockarLista([DENUNCIA_DE_PERFIL_REINCIDENTE]);

    renderPagina();

    expect(await screen.findByText(/Responsável: Bruno Alves/i)).toBeInTheDocument();
    // Aparece duas vezes: na contagem e no texto da sugestão.
    expect(screen.getAllByText(/2 advertência\(s\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/recomenda suspender/i).length).toBeGreaterThan(0);
  });

  it('filtra a fila por tipo de alvo', async () => {
    mockarLista([DENUNCIA_DE_AVALIACAO]);

    renderPagina();
    await screen.findByText('Avaliação de Bruno Alves');

    await userEvent.click(screen.getByRole('tab', { name: 'Perfis' }));

    await waitFor(() =>
      expect(denunciaService.listarDenunciasPendentes).toHaveBeenLastCalledWith('PERFIL'),
    );
  });

  it('arquiva uma denúncia sem exigir justificativa', async () => {
    mockarLista([DENUNCIA_DE_AVALIACAO]);
    vi.mocked(denunciaService.resolverDenuncia).mockResolvedValue({
      ...DENUNCIA_DE_AVALIACAO, status: 'IMPROCEDENTE', medida: 'ARQUIVAR',
    });

    renderPagina();
    await screen.findByText('Avaliação de Bruno Alves');

    await userEvent.click(screen.getByRole('button', { name: /analisar e decidir/i }));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('radio', { name: /arquivar/i }));
    await userEvent.click(screen.getByRole('button', { name: /aplicar decisão/i }));

    await waitFor(() =>
      expect(denunciaService.resolverDenuncia).toHaveBeenCalledWith('den-1', {
        medida: 'ARQUIVAR',
        diasSuspensao: undefined,
        justificativa: undefined,
      }),
    );
    expect(await screen.findByText(/nenhuma denúncia pendente/i)).toBeInTheDocument();
  });

  it('pré-seleciona a medida sugerida pela escada ao abrir o julgamento', async () => {
    mockarLista([DENUNCIA_DE_PERFIL_REINCIDENTE]);

    renderPagina();
    await screen.findByText(/Responsável: Bruno Alves/i);

    await userEvent.click(screen.getByRole('button', { name: /analisar e decidir/i }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('radio', { name: /suspender/i })).toBeChecked();
    // Suspensão pede prazo; a UI já propõe um.
    expect(screen.getByRole('spinbutton')).toHaveValue(7);
  });

  it('não deixa advertir sem justificativa, que é o texto lido pelo sancionado', async () => {
    mockarLista([DENUNCIA_DE_AVALIACAO]);

    renderPagina();
    await screen.findByText('Avaliação de Bruno Alves');

    await userEvent.click(screen.getByRole('button', { name: /analisar e decidir/i }));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('radio', { name: /advertir/i }));
    await userEvent.click(screen.getByRole('button', { name: /aplicar decisão/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/explique a decisão/i);
    expect(denunciaService.resolverDenuncia).not.toHaveBeenCalled();
  });

  it('suspende enviando prazo e justificativa', async () => {
    mockarLista([DENUNCIA_DE_PERFIL_REINCIDENTE]);
    vi.mocked(denunciaService.resolverDenuncia).mockResolvedValue({
      ...DENUNCIA_DE_PERFIL_REINCIDENTE, status: 'PROCEDENTE', medida: 'SUSPENSAO',
    });

    renderPagina();
    await screen.findByText(/Responsável: Bruno Alves/i);

    await userEvent.click(screen.getByRole('button', { name: /analisar e decidir/i }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByRole('textbox'), 'Venda de trabalhos acadêmicos.');
    await userEvent.click(screen.getByRole('button', { name: /aplicar decisão/i }));

    await waitFor(() =>
      expect(denunciaService.resolverDenuncia).toHaveBeenCalledWith('den-2', {
        medida: 'SUSPENSAO',
        diasSuspensao: 7,
        justificativa: 'Venda de trabalhos acadêmicos.',
      }),
    );
  });

  it('não oferece remover conteúdo quando o alvo é um perfil', async () => {
    mockarLista([DENUNCIA_DE_PERFIL_REINCIDENTE]);

    renderPagina();
    await screen.findByText(/Responsável: Bruno Alves/i);

    await userEvent.click(screen.getByRole('button', { name: /analisar e decidir/i }));
    await screen.findByRole('dialog');

    expect(screen.queryByRole('radio', { name: /remover conteúdo/i })).not.toBeInTheDocument();
  });
});
