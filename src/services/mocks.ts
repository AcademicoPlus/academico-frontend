// Dados fictícios usados no lugar do backend real quando VITE_USE_MOCKS=true
// (ver apiClient.ts). Objetivo: quem está no frontend consegue rodar
// `npm run dev` e testar as telas sem precisar subir o academico-backend
// nem o banco. Veja docs/CONECTANDO_FRONT_BACKEND.md, seção "Testando sem
// o backend".
//
// Rotas com segmento fixo (sem :id) moram num `case` do switch abaixo; rotas
// com id dinâmico (ex.: /projetos/:id) são casadas por regex logo depois do
// switch. Cada uma devolve os dados já no formato do DTO do backend (mesma
// forma que o service espera). Pra simular uma tela nova sem backend, edite
// aqui — não precisa mexer no service nem na página.
import { ApiError, type ErroCampo } from './apiError';
import type { CadastroRequest, CadastroResponse, LoginRequest, LoginResponse, UsuarioResumo } from './authService';
import type { Curso } from './cursoService';
import type { Habilidade, SalvarHabilidadeRequest } from './habilidadeService';
import type { AtualizarProjetoRequest, CriarProjetoRequest, Projeto, ProjetoDetalhe, StatusProjeto } from './projetoService';
import type { ProjetoMembro } from './projetoMembroService';
import type { ProjetoRecomendado } from './recomendacaoService';
import type { UsuarioPerfil } from './usuarioService';
import type { NivelAcesso } from './nivelAcessoService';
import type { Denuncia } from './denunciaService';
import type { Candidatura } from './candidaturaService';
import type { Convite } from './conviteService';
import type { Conversa, MensagemProjeto } from './chatService';
import type { PaginaResposta } from './apiClient';

// Latência artificial pra tela de fato passar pelo estado de "carregando".
const ATRASO_MS = 500;

function resolverComAtraso<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ATRASO_MS));
}

function rejeitarComAtraso<T>(erro: ApiError): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(erro), ATRASO_MS));
}

const CURSOS_MOCK: Curso[] = [
  { id: '11111111-1111-1111-1111-111111111111', nome: 'Ciência da Computação', criadoEm: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222222', nome: 'Engenharia de Software', criadoEm: '2024-01-01T00:00:00Z' },
  { id: '33333333-3333-3333-3333-333333333333', nome: 'Design Gráfico', criadoEm: '2024-01-01T00:00:00Z' },
  { id: '44444444-4444-4444-4444-444444444444', nome: 'Administração', criadoEm: '2024-01-01T00:00:00Z' },
  { id: '55555555-5555-5555-5555-555555555555', nome: 'Psicologia', criadoEm: '2024-01-01T00:00:00Z' },
];

// Catálogo único de habilidades, no mesmo formato do endpoint real
// GET /habilidades (ver habilidadeService.ts). Serve tanto o painel admin e
// os seletores de criar/editar-projeto (catálogo completo, com categoria)
// quanto os cards de ExplorarPessoas e os perfis fictícios abaixo — um único
// catálogo, para que o filtro de habilidade em Explorar Pessoas realmente
// bata com o que os usuários fictícios têm no perfil.
const HABILIDADES_MOCK: Habilidade[] = [
  { id: 'hab-java', nome: 'Java', categoria: 'Backend', descricao: null, usuariosCount: 2, projetosCount: 1, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-spring', nome: 'Spring Boot', categoria: 'Backend', descricao: null, usuariosCount: 1, projetosCount: 1, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-react', nome: 'React', categoria: 'Frontend', descricao: null, usuariosCount: 4, projetosCount: 2, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-docker', nome: 'Docker', categoria: 'DevOps', descricao: null, usuariosCount: 1, projetosCount: 1, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-marketing', nome: 'Marketing Digital', categoria: 'Marketing', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-branding', nome: 'Branding', categoria: 'Marketing', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-seo', nome: 'SEO', categoria: 'Marketing', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-ads', nome: 'Google Ads', categoria: 'Marketing', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-reactnative', nome: 'React Native', categoria: 'Frontend', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-ts', nome: 'TypeScript', categoria: 'Frontend', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-node', nome: 'Node.js', categoria: 'Backend', descricao: null, usuariosCount: 2, projetosCount: 1, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-aws', nome: 'AWS', categoria: 'DevOps', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-psico', nome: 'Psicologia', categoria: 'Pesquisa', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-pesquisa', nome: 'Pesquisa', categoria: 'Pesquisa', descricao: null, usuariosCount: 2, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-uxr', nome: 'UX Research', categoria: 'Design', descricao: null, usuariosCount: 1, projetosCount: 0, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-uiux', nome: 'UI/UX', categoria: 'Design', descricao: null, usuariosCount: 1, projetosCount: 1, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-figma', nome: 'Figma', categoria: 'Design', descricao: null, usuariosCount: 2, projetosCount: 1, criadoEm: '2024-01-01T00:00:00Z' },
  { id: 'hab-python', nome: 'Python', categoria: 'Backend', descricao: null, usuariosCount: 1, projetosCount: 1, criadoEm: '2024-01-01T00:00:00Z' },
];

// Atalho pra puxar uma habilidade do catálogo pelo id, sem repetir o
// objeto inteiro toda vez que um usuário fictício precisa dela.
const acha = (id: string) => HABILIDADES_MOCK.find((h) => h.id === id)!;

// Credenciais fixas pra testar o login sem backend.
export const CREDENCIAIS_MOCK = {
  email: 'ana.silva@academico.edu.br',
  senha: 'senha123',
};

// Níveis de acesso — ADMIN é o nível do USUARIO_LOGADO_MOCK, pra dar pra
// navegar nas telas de administrador (/admin/*) sem precisar do backend.
const NIVEIS_ACESSO_MOCK: NivelAcesso[] = [
  { id: 'nivel-mock-aluno', nome: 'ALUNO', descricao: 'Estudante da instituição.' },
  { id: 'nivel-mock-professor', nome: 'PROFESSOR', descricao: 'Docente da instituição.' },
  { id: 'nivel-mock-admin', nome: 'ADMIN', descricao: 'Administrador da plataforma.' },
];

// "Usuário logado" nos mocks — mesma pessoa que o login mock devolve.
// permission = ADMIN pra dar pra testar as telas /admin/* sem backend.
const USUARIO_LOGADO_MOCK: UsuarioResumo = {
  id: 'usuario-mock-1',
  nome: 'Ana Silva',
  curso: 'Ciência da Computação',
  fotoUrl: null,
  permission: 'ADMIN',
  periodo: 4,
  notaMedia: 4.5,
  totalAvaliacoes: 3,
};

const LUCAS_MENDES_MOCK: UsuarioResumo = {
  id: 'usuario-mock-2',
  nome: 'Lucas Mendes',
  curso: 'Ciência da Computação',
  fotoUrl: null,
  permission: 'ALUNO',
  periodo: 6,
  notaMedia: 4.8,
  totalAvaliacoes: 5,
};

const MARIA_COSTA_MOCK: UsuarioResumo = {
  id: 'usuario-mock-3',
  nome: 'Maria Costa',
  curso: 'Administração',
  fotoUrl: null,
  permission: 'ALUNO',
  periodo: 5,
  notaMedia: 4.2,
  totalAvaliacoes: 2,
};

// "Banco" em memória dos usuários — usado por GET /usuarios e mutado pelo
// PATCH /usuarios/:id/nivel-acesso (tela admin-usuarios).
const USUARIOS_ADMIN_MOCK: UsuarioResumo[] = [USUARIO_LOGADO_MOCK, LUCAS_MENDES_MOCK, MARIA_COSTA_MOCK];

// "Banco" em memória das denúncias pendentes — mutado pelo PATCH
// /denuncias/:id/resolver (tela admin-denuncias).
const DENUNCIAS_MOCK: Denuncia[] = [
  {
    id: 'denuncia-mock-1',
    avaliacaoId: 'avaliacao-mock-1',
    avaliador: LUCAS_MENDES_MOCK,
    notaAvaliacao: 1,
    comentarioAvaliacao: 'Não entregou nada e ainda me xingou no grupo do projeto.',
    denunciante: MARIA_COSTA_MOCK,
    motivo: 'Avaliação com linguagem ofensiva e sem relação com o desempenho no projeto.',
    status: 'PENDENTE',
    criadoEm: '2024-04-01T10:00:00Z',
    analisadoEm: null,
  },
];

// "Banco" em memória das candidaturas — mutado por POST /candidaturas,
// DELETE /candidaturas/:id e pelos PATCH de aceitar/rejeitar. Um seed em
// cada status/direção pra dar pra testar as duas visões (candidato e
// criador do projeto) sem precisar candidatar-se do zero.
const CANDIDATURAS_MOCK: Candidatura[] = [
  {
    id: 'candidatura-mock-1',
    projeto: { id: 'projeto-seed-2', titulo: 'Sistema Inteligente de Proteção Web', status: 'EM_ANDAMENTO' },
    usuario: MARIA_COSTA_MOCK,
    status: 'PENDENTE',
    mensagem: 'Tenho experiência com Node e adoraria contribuir!',
    motivoRejeicao: null,
    dataCandidatura: '2024-04-05T10:00:00Z',
    dataResposta: null,
  },
  {
    id: 'candidatura-mock-2',
    projeto: { id: 'projeto-seed-1', titulo: 'App de Saúde Mental para Universitários', status: 'ABERTO' },
    usuario: USUARIO_LOGADO_MOCK,
    status: 'PENDENTE',
    mensagem: 'Adoro esse tema, quero muito ajudar!',
    motivoRejeicao: null,
    dataCandidatura: '2024-04-06T10:00:00Z',
    dataResposta: null,
  },
];

type UsuarioMock = UsuarioResumo & { habilidades: Habilidade[] };

// Pessoas fictícias para a tela Explorar Pessoas — nomes, cursos e
// habilidades variados de propósito, para testar busca, filtro por curso
// e filtro por habilidade com resultados diferentes.
const USUARIOS_MOCK: UsuarioMock[] = [
  { id: 'usuario-mock-2', nome: 'Bruno Alves', curso: 'Ciência da Computação', fotoUrl: null, permission: 'ALUNO', periodo: 6, notaMedia: 4.8, totalAvaliacoes: 5, habilidades: [acha('hab-java'), acha('hab-spring'), acha('hab-react'), acha('hab-docker')] },
  { id: 'usuario-mock-3', nome: 'Carla Mendes', curso: 'Design Gráfico', fotoUrl: null, permission: 'ALUNO', periodo: 3, notaMedia: 4.2, totalAvaliacoes: 2, habilidades: [acha('hab-marketing'), acha('hab-branding'), acha('hab-seo'), acha('hab-ads')] },
  { id: 'usuario-mock-4', nome: 'Diego Santos', curso: 'Engenharia de Software', fotoUrl: null, permission: 'ALUNO', periodo: 5, notaMedia: 4.6, totalAvaliacoes: 8, habilidades: [acha('hab-reactnative'), acha('hab-ts'), acha('hab-node'), acha('hab-aws')] },
  { id: 'usuario-mock-5', nome: 'Eduarda Lima', curso: 'Psicologia', fotoUrl: null, permission: 'ALUNO', periodo: 2, notaMedia: 4.9, totalAvaliacoes: 1, habilidades: [acha('hab-psico'), acha('hab-pesquisa'), acha('hab-uxr')] },
  { id: 'usuario-mock-6', nome: 'Felipe Rocha', curso: 'Administração', fotoUrl: null, permission: 'PROFESSOR', periodo: null, notaMedia: null, totalAvaliacoes: null, habilidades: [acha('hab-uiux'), acha('hab-pesquisa')] },
  { id: 'usuario-mock-7', nome: 'Giovana Ribeiro', curso: 'Ciência da Computação', fotoUrl: null, permission: 'ALUNO', periodo: 8, notaMedia: 4.7, totalAvaliacoes: 6, habilidades: [acha('hab-java'), acha('hab-react')] },
];

// Perfil completo (mutável) do usuário logado nos mocks. GET e PUT
// /usuarios/me leem e escrevem neste mesmo objeto, para que as alterações
// feitas em EditarPerfil realmente "persistam" enquanto o app está aberto
// (sem isso, toda edição seria perdida ao recarregar a tela de perfil).
let meuPerfilMock = {
  id: 'usuario-mock-1',
  email: CREDENCIAIS_MOCK.email,
  nome: 'Ana Silva',
  nivelAcesso: NIVEIS_ACESSO_MOCK.find((nivel) => nivel.nome === USUARIO_LOGADO_MOCK.permission) ?? null,
  curso: CURSOS_MOCK[0], // Ciência da Computação
  periodo: 4,
  bio: 'Designer apaixonada por UI/UX e design systems. Busco projetos que unam criatividade e impacto social. Tenho experiência com Figma, pesquisa com usuários e prototipagem de alta fidelidade.' as string | null,
  fotoUrl: null as string | null,
  linkedinUrl: 'https://linkedin.com/in' as string | null,
  githubUrl: 'https://github.com' as string | null,
  habilidades: [
    { id: 'perfil-hab-1', habilidade: acha('hab-uiux'), nivel: 'AVANCADO', endossado: true, endossadoPor: 'Prof. Carvalho' },
    { id: 'perfil-hab-2', habilidade: acha('hab-figma'), nivel: 'EXPERT', endossado: true, endossadoPor: 'Prof. Carvalho' },
    { id: 'perfil-hab-3', habilidade: acha('hab-react'), nivel: 'INTERMEDIARIO', endossado: false },
    { id: 'perfil-hab-4', habilidade: acha('hab-marketing'), nivel: 'INICIANTE', endossado: false },
    { id: 'perfil-hab-5', habilidade: acha('hab-uxr'), nivel: 'INTERMEDIARIO', endossado: false },
  ],
  notaMedia: 4.8,
  totalAvaliacoes: 6,
  termosAceitosEm: '2024-01-01T00:00:00Z',
  ativo: true,
  criadoEm: '2024-01-01T00:00:00Z',
  atualizadoEm: '2024-01-01T00:00:00Z',
};

// Perfil completo de outro usuário (GET /usuarios/:id) — monta um
// UsuarioPerfil a partir da entrada correspondente em USUARIOS_MOCK,
// já que UsuarioResumo (usado no Explorar Pessoas) não tem bio/links/etc.
function mockBuscarUsuarioPorId(id: string) {
  const usuario = USUARIOS_MOCK.find((u) => u.id === id);
  if (!usuario) {
    return rejeitarComAtraso(new ApiError(404, 'Usuário não encontrado.'));
  }
  const curso = CURSOS_MOCK.find((c) => c.nome === usuario.curso) ?? null;
  return resolverComAtraso({
    id: usuario.id,
    email: `${usuario.nome.toLowerCase().replace(/\s+/g, '.')}@academico.edu.br`,
    nivelAcesso: null,
    nome: usuario.nome,
    curso,
    periodo: usuario.periodo,
    bio: null,
    fotoUrl: usuario.fotoUrl,
    linkedinUrl: null,
    githubUrl: null,
    habilidades: usuario.habilidades.map((h, i) => ({
      id: `${usuario.id}-hab-${i}`,
      habilidade: h,
      nivel: 'INTERMEDIARIO',
      endossado: false,
    })),
    notaMedia: usuario.notaMedia,
    totalAvaliacoes: usuario.totalAvaliacoes,
    termosAceitosEm: '2024-01-01T00:00:00Z',
    ativo: true,
    criadoEm: '2024-01-01T00:00:00Z',
    atualizadoEm: '2024-01-01T00:00:00Z',
  });
}

// Usar esse e-mail no cadastro simula "e-mail já cadastrado" (erro 400 com
// erro de campo, igual ao que o backend devolve).
const EMAIL_JA_CADASTRADO_MOCK = 'duplicado@academico.edu.br';

function habilidadeNecessariaMock(habilidadeId: string, obrigatoria: boolean) {
  const habilidade = HABILIDADES_MOCK.find((h) => h.id === habilidadeId)!;
  return {
    id: `vinculo-mock-${habilidade.id}`,
    habilidade: { id: habilidade.id, nome: habilidade.nome, categoria: habilidade.categoria },
    obrigatoria,
  };
}

// "Banco" em memória — começa com um seed e cresce a cada POST /projetos
// simulado, pra dar pra criar um projeto e já ver ele aparecer no feed.
// Esta é a ÚNICA lista de projetos do arquivo (Dashboard, Projetos,
// DetalhesProjeto e a seção "Meus projetos" de Perfil usam todos ela).
const PROJETOS_MOCK: ProjetoDetalhe[] = [
  {
    id: 'projeto-seed-1',
    criador: LUCAS_MENDES_MOCK,
    titulo: 'App de Saúde Mental para Universitários',
    descricao: 'Desenvolvimento de uma aplicação móvel focada no bem-estar e saúde mental de estudantes universitários, com recursos de mindfulness, tracking de humor e conexão com suporte psicológico institucional.',
    bannerUrl: null,
    status: 'ABERTO',
    vagas: 3,
    vagasPreenchidas: 1,
    vagasDisponiveis: 2,
    aceitandoCandidaturas: true,
    dataFim: '2026-12-15T23:59:59',
    ativo: true,
    criadoEm: '2024-02-01T10:00:00Z',
    atualizadoEm: '2024-02-01T10:00:00Z',
    habilidadesNecessarias: [
      habilidadeNecessariaMock('hab-react', true),
      habilidadeNecessariaMock('hab-figma', false),
    ],
    totalMembros: 1,
    totalCandidaturasPendentes: 0,
  },
  {
    id: 'projeto-seed-2',
    criador: USUARIO_LOGADO_MOCK,
    titulo: 'Sistema Inteligente de Proteção Web',
    descricao: 'Desenvolvimento de um sistema voltado para segurança online utilizando análise de comportamento visual e aprendizado de máquina para detectar acessos suspeitos.',
    bannerUrl: null,
    status: 'EM_ANDAMENTO',
    vagas: 5,
    vagasPreenchidas: 2,
    vagasDisponiveis: 3,
    aceitandoCandidaturas: true,
    dataFim: null,
    ativo: true,
    criadoEm: '2024-01-15T10:00:00Z',
    atualizadoEm: '2024-01-15T10:00:00Z',
    habilidadesNecessarias: [
      habilidadeNecessariaMock('hab-node', true),
      habilidadeNecessariaMock('hab-python', true),
    ],
    totalMembros: 2,
    totalCandidaturasPendentes: 1,
  },
  {
    id: 'projeto-seed-3',
    criador: MARIA_COSTA_MOCK,
    titulo: 'Plataforma de E-commerce Sustentável',
    descricao: 'Criação de uma plataforma focada em produtos sustentáveis locais, conectando produtores e consumidores da região de forma direta e sem intermediários.',
    bannerUrl: null,
    status: 'ABERTO',
    vagas: 4,
    vagasPreenchidas: 3,
    vagasDisponiveis: 1,
    aceitandoCandidaturas: true,
    dataFim: '2026-11-30T23:59:59',
    ativo: true,
    criadoEm: '2024-03-10T10:00:00Z',
    atualizadoEm: '2024-03-10T10:00:00Z',
    habilidadesNecessarias: [habilidadeNecessariaMock('hab-react', true)],
    totalMembros: 3,
    totalCandidaturasPendentes: 0,
  },
];

// Membros por projeto — só pros seeds (projetos criados no mock viram membro
// único: o próprio criador, resolvido em membrosDoProjetoMock).
const MEMBROS_MOCK: Record<string, ProjetoMembro[]> = {
  'projeto-seed-1': [
    { id: 'membro-mock-1', projeto: null, usuario: LUCAS_MENDES_MOCK, funcao: 'Criador(a)', dataAdesao: '2024-02-01T10:00:00Z' },
  ],
  'projeto-seed-2': [
    { id: 'membro-mock-2', projeto: null, usuario: USUARIO_LOGADO_MOCK, funcao: 'Criador(a)', dataAdesao: '2024-01-15T10:00:00Z' },
    { id: 'membro-mock-3', projeto: null, usuario: LUCAS_MENDES_MOCK, funcao: 'Desenvolvedor(a)', dataAdesao: '2024-01-20T10:00:00Z' },
  ],
  'projeto-seed-3': [
    { id: 'membro-mock-4', projeto: null, usuario: MARIA_COSTA_MOCK, funcao: 'Criador(a)', dataAdesao: '2024-03-10T10:00:00Z' },
    { id: 'membro-mock-5', projeto: null, usuario: LUCAS_MENDES_MOCK, funcao: 'Desenvolvedor(a)', dataAdesao: '2024-03-12T10:00:00Z' },
    { id: 'membro-mock-6', projeto: null, usuario: USUARIO_LOGADO_MOCK, funcao: 'Designer', dataAdesao: '2024-03-14T10:00:00Z' },
  ],
};

function membrosDoProjetoMock(projeto: ProjetoDetalhe): ProjetoMembro[] {
  return (
    MEMBROS_MOCK[projeto.id] ?? [
      {
        id: `membro-mock-criador-${projeto.id}`,
        projeto: null,
        usuario: projeto.criador,
        funcao: 'Criador(a)',
        dataAdesao: projeto.criadoEm,
      },
    ]
  );
}

function paraResumo(projeto: ProjetoDetalhe): Projeto {
  return clonar({
    id: projeto.id,
    criador: projeto.criador,
    titulo: projeto.titulo,
    descricao: projeto.descricao,
    bannerUrl: projeto.bannerUrl,
    status: projeto.status,
    habilidadesNecessarias: projeto.habilidadesNecessarias,
    vagas: projeto.vagas,
    vagasPreenchidas: projeto.vagasPreenchidas,
    dataFim: projeto.dataFim,
  });
}

// PROJETOS_MOCK guarda os objetos "reais" do banco em memória — nunca
// devolve eles direto pro front. Sem clonar, o componente que recebe a
// resposta segura a MESMA referência, e um `[...habilidadesNecessarias, x]`
// feito ali em cima de um array que a própria mutação aqui já alterou
// duplica a entrada (foi exatamente o que aconteceu com o vínculo de
// habilidade antes desse helper existir).
function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function paginar<T>(itens: T[]): PaginaResposta<T> {
  return {
    content: itens,
    totalElements: itens.length,
    totalPages: 1,
    number: 0,
    size: itens.length,
    last: true,
  };
}

type MockOptions = {
  method: string;
  body?: unknown;
};

// Simula o comportamento de explorarPerfis (busca, filtro por curso e
// paginação), já que essa rota tem query string variável e não cabe em
// um `case` fixo do switch abaixo.
function mockExplorarPerfis(query: URLSearchParams): Promise<PaginaResposta<UsuarioResumo>> {
  const busca = query.get('busca')?.toLowerCase() ?? '';
  const idCurso = query.get('idCurso') ?? '';
  const idHabilidade = query.get('idHabilidade') ?? '';
  const page = Number(query.get('page') ?? '0');
  const size = Number(query.get('size') ?? '10');

  // idCurso vem como id (ver CadastroRequest), mas UsuarioResumo.curso é
  // só o nome — então convertemos o id pro nome antes de filtrar.
  const nomeCursoFiltro = idCurso
    ? CURSOS_MOCK.find((curso) => curso.id === idCurso)?.nome
    : undefined;

  const filtrados = USUARIOS_MOCK.filter((usuario) => {
    const bateBusca =
      !busca ||
      usuario.nome.toLowerCase().includes(busca) ||
      (usuario.curso?.toLowerCase().includes(busca) ?? false);
    const bateCurso = !nomeCursoFiltro || usuario.curso === nomeCursoFiltro;
    const bateHabilidade =
      !idHabilidade || usuario.habilidades.some((h) => h.id === idHabilidade);
    return bateBusca && bateCurso && bateHabilidade;
  });

  const inicio = page * size;
  const pagina = filtrados.slice(inicio, inicio + size);

  const resposta: PaginaResposta<UsuarioResumo> = {
    content: pagina,
    totalElements: filtrados.length,
    totalPages: Math.ceil(filtrados.length / size) || 1,
    number: page,
    size,
    last: inicio + size >= filtrados.length,
  };

  return resolverComAtraso(resposta);
}

// Simula GET /habilidades com busca/categoria/paginação de verdade — usado
// tanto pelo autocomplete de criar/editar-projeto e Explorar Pessoas quanto
// pela paginação do painel admin, então precisa filtrar de fato em vez de
// devolver o catálogo inteiro (senão o mock mascara o mesmo problema de
// escala que a busca server-side existe justamente para evitar).
function mockListarHabilidades(query: URLSearchParams): Promise<PaginaResposta<Habilidade>> {
  const busca = query.get('busca')?.toLowerCase() ?? '';
  const categoria = query.get('categoria') ?? '';
  const page = Number(query.get('page') ?? '0');
  const size = Number(query.get('size') ?? '10');

  const filtradas = HABILIDADES_MOCK.filter((h) => {
    const bateBusca =
      !busca ||
      h.nome.toLowerCase().includes(busca) ||
      h.categoria.toLowerCase().includes(busca);
    const bateCategoria = !categoria || h.categoria === categoria;
    return bateBusca && bateCategoria;
  });

  const inicio = page * size;
  const pagina = filtradas.slice(inicio, inicio + size);

  return resolverComAtraso({
    content: pagina,
    totalElements: filtradas.length,
    totalPages: Math.ceil(filtradas.length / size) || 1,
    number: page,
    size,
    last: inicio + size >= filtradas.length,
  });
}

// "Banco" em memória dos convites de projeto. Seed: Maria (criadora do
// projeto-seed-3) já convidou o usuário logado, pra o sininho ter conteúdo.
const CONVITES_MOCK: Convite[] = [
  {
    id: 'convite-seed-1',
    projeto: { id: 'projeto-seed-3', titulo: '', status: 'ABERTO' },
    convidado: USUARIO_LOGADO_MOCK,
    convidante: MARIA_COSTA_MOCK,
    funcao: 'Frontend',
    mensagem: 'Vi seu perfil e acho que você combina com o projeto!',
    status: 'PENDENTE',
    criadoEm: '2026-09-20T10:00:00Z',
    respondidoEm: null,
  },
];

// Rotas /convites/* — devolve null quando a rota não é de convite.
function mockConvites(method: string, caminhoBase: string, parametros: URLSearchParams, body: unknown): Promise<unknown> | null {
  const comTitulo = (c: Convite): Convite => {
    const projeto = PROJETOS_MOCK.find((p) => p.id === c.projeto.id);
    return projeto ? { ...c, projeto: { id: projeto.id, titulo: projeto.titulo, status: projeto.status } } : c;
  };
  const filtrarStatus = (lista: Convite[]) => {
    const status = parametros.get('status');
    return status ? lista.filter((c) => c.status === status) : lista;
  };

  if (method === 'GET' && caminhoBase === '/convites/recebidos') {
    const recebidos = CONVITES_MOCK.filter((c) => c.convidado?.id === USUARIO_LOGADO_MOCK.id);
    return resolverComAtraso(paginar(filtrarStatus(recebidos).map(comTitulo)));
  }

  if (method === 'GET' && caminhoBase === '/convites/recebidos/contagem') {
    const pendentes = CONVITES_MOCK.filter((c) => c.convidado?.id === USUARIO_LOGADO_MOCK.id && c.status === 'PENDENTE').length;
    return resolverComAtraso({ pendentes });
  }

  const matchDoProjeto = method === 'GET' && caminhoBase.match(/^\/convites\/projeto\/([^/]+)$/);
  if (matchDoProjeto) {
    const doProjeto = CONVITES_MOCK.filter((c) => c.projeto.id === matchDoProjeto[1]);
    return resolverComAtraso(paginar(filtrarStatus(doProjeto).map(comTitulo)));
  }

  if (method === 'POST' && caminhoBase === '/convites') {
    const dados = body as { projetoId: string; usuarioId: string; funcao?: string; mensagem?: string };
    const projeto = PROJETOS_MOCK.find((p) => p.id === dados.projetoId);
    const convidado = USUARIOS_ADMIN_MOCK.find((u) => u.id === dados.usuarioId)
      ?? USUARIOS_MOCK.find((u) => u.id === dados.usuarioId);
    if (!projeto || !convidado) {
      return rejeitarComAtraso(new ApiError(404, 'Projeto ou usuário não encontrado.'));
    }
    if (CONVITES_MOCK.some((c) => c.projeto.id === projeto.id && c.convidado?.id === convidado.id && c.status === 'PENDENTE')) {
      return rejeitarComAtraso(new ApiError(400, 'Já existe um convite pendente para este usuário.'));
    }
    const novo: Convite = {
      id: `convite-mock-${Date.now()}`,
      projeto: { id: projeto.id, titulo: projeto.titulo, status: projeto.status },
      convidado: convidado as UsuarioResumo,
      convidante: projeto.criador,
      funcao: dados.funcao ?? null,
      mensagem: dados.mensagem ?? null,
      status: 'PENDENTE',
      criadoEm: new Date().toISOString(),
      respondidoEm: null,
    };
    CONVITES_MOCK.push(novo);
    return resolverComAtraso(clonar(novo));
  }

  const matchResposta = method === 'PATCH' && caminhoBase.match(/^\/convites\/([^/]+)\/(aceitar|recusar|cancelar)$/);
  if (matchResposta) {
    const convite = CONVITES_MOCK.find((c) => c.id === matchResposta[1]);
    if (!convite) {
      return rejeitarComAtraso(new ApiError(404, 'Convite não encontrado.'));
    }
    if (convite.status !== 'PENDENTE') {
      return rejeitarComAtraso(new ApiError(400, 'Este convite já foi respondido.'));
    }
    const acao = matchResposta[2];
    convite.status = acao === 'aceitar' ? 'ACEITO' : acao === 'recusar' ? 'RECUSADO' : 'CANCELADO';
    convite.respondidoEm = new Date().toISOString();

    const projeto = PROJETOS_MOCK.find((p) => p.id === convite.projeto.id);
    if (acao === 'aceitar' && projeto && convite.convidado) {
      const membrosDoProjeto = MEMBROS_MOCK[projeto.id] ?? (MEMBROS_MOCK[projeto.id] = membrosDoProjetoMock(projeto));
      membrosDoProjeto.push({
        id: `membro-mock-${Date.now()}`,
        projeto: null,
        usuario: convite.convidado,
        funcao: convite.funcao,
        dataAdesao: new Date().toISOString(),
      });
      projeto.vagasPreenchidas += 1;
      projeto.vagasDisponiveis = Math.max(0, projeto.vagas - projeto.vagasPreenchidas);
      projeto.totalMembros += 1;
    }
    return resolverComAtraso(clonar(comTitulo(convite)));
  }

  return null;
}

// "Banco" em memória do chat. Seed: conversa no projeto-seed-2 (criado pelo
// usuário logado) com mensagens do Lucas, ainda não lidas.
const MENSAGENS_MOCK: MensagemProjeto[] = [
  { id: 'msg-seed-1', projetoId: 'projeto-seed-2', autor: LUCAS_MENDES_MOCK, conteudo: 'Oi! Vi que o backend já está no ar 🎉', criadoEm: new Date(Date.now() - 26 * 3600_000).toISOString() },
  { id: 'msg-seed-2', projetoId: 'projeto-seed-2', autor: USUARIO_LOGADO_MOCK, conteudo: 'Sim! Falta só o deploy.', criadoEm: new Date(Date.now() - 25 * 3600_000).toISOString() },
  { id: 'msg-seed-3', projetoId: 'projeto-seed-2', autor: LUCAS_MENDES_MOCK, conteudo: 'Fechado. Apresentamos na sexta?', criadoEm: new Date(Date.now() - 20 * 60_000).toISOString() },
  { id: 'msg-seed-4', projetoId: 'projeto-seed-2', autor: LUCAS_MENDES_MOCK, conteudo: 'Posso fazer os slides.', criadoEm: new Date(Date.now() - 19 * 60_000).toISOString() },
];
const LEITURAS_MOCK: Record<string, string> = {
  'projeto-seed-2': new Date(Date.now() - 24 * 3600_000).toISOString(),
};

function conversasMock(): Conversa[] {
  const meus = PROJETOS_MOCK.filter((p) =>
    p.criador?.id === USUARIO_LOGADO_MOCK.id || membrosDoProjetoMock(p).some((m) => m.usuario?.id === USUARIO_LOGADO_MOCK.id),
  );
  return meus
    .map((p) => {
      const doProjeto = MENSAGENS_MOCK.filter((m) => m.projetoId === p.id);
      const lidoAte = LEITURAS_MOCK[p.id];
      return {
        projeto: { id: p.id, titulo: p.titulo, status: p.status },
        bannerUrl: p.bannerUrl,
        ultimaMensagem: doProjeto[doProjeto.length - 1] ?? null,
        naoLidas: doProjeto.filter((m) => m.autor?.id !== USUARIO_LOGADO_MOCK.id && (!lidoAte || m.criadoEm > lidoAte)).length,
      };
    })
    .sort((a, b) => (b.ultimaMensagem?.criadoEm ?? '').localeCompare(a.ultimaMensagem?.criadoEm ?? ''));
}

// Rotas do chat — devolve null quando a rota não é do chat.
function mockChat(method: string, caminhoBase: string, body: unknown): Promise<unknown> | null {
  if (method === 'GET' && caminhoBase === '/conversas') {
    return resolverComAtraso(conversasMock());
  }
  if (method === 'GET' && caminhoBase === '/conversas/nao-lidas') {
    return resolverComAtraso({ total: conversasMock().reduce((soma, c) => soma + c.naoLidas, 0) });
  }
  const matchLida = method === 'PUT' && caminhoBase.match(/^\/conversas\/([^/]+)\/lida$/);
  if (matchLida) {
    LEITURAS_MOCK[matchLida[1]] = new Date().toISOString();
    return resolverComAtraso(undefined);
  }
  const matchMensagens = caminhoBase.match(/^\/projetos\/([^/]+)\/mensagens$/);
  if (matchMensagens && method === 'GET') {
    return resolverComAtraso(clonar(MENSAGENS_MOCK.filter((m) => m.projetoId === matchMensagens[1])));
  }
  // Só existe no mock: substitui o SEND do STOMP (ver criarClienteMock em chatService).
  if (matchMensagens && method === 'POST') {
    const nova: MensagemProjeto = {
      id: `msg-mock-${Date.now()}`,
      projetoId: matchMensagens[1],
      autor: USUARIO_LOGADO_MOCK,
      conteudo: (body as { conteudo: string }).conteudo,
      criadoEm: new Date().toISOString(),
    };
    MENSAGENS_MOCK.push(nova);
    return resolverComAtraso(clonar(nova));
  }
  return null;
}

export function mockFetch<TResposta>(caminho: string, { method, body }: MockOptions): Promise<TResposta> {
  const [caminhoBase, queryString] = caminho.split('?');
  const parametros = new URLSearchParams(queryString ?? '');

  if (method === 'GET' && caminhoBase === '/usuarios/explorar') {
    return mockExplorarPerfis(parametros) as unknown as Promise<TResposta>;
  }

  if (method === 'GET' && caminhoBase === '/habilidades') {
    return mockListarHabilidades(parametros) as unknown as Promise<TResposta>;
  }

  const respostaChat = mockChat(method, caminhoBase, body);
  if (respostaChat) return respostaChat as Promise<TResposta>;

  if (caminhoBase.startsWith('/convites')) {
    const resposta = mockConvites(method, caminhoBase, parametros, body);
    if (resposta) return resposta as Promise<TResposta>;
  }

  // Perfil de outro usuário: GET /usuarios/usuario-mock-N (mas não /usuarios/me)
  if (method === 'GET' && /^\/usuarios\/usuario-mock-\d+$/.test(caminhoBase)) {
    const usuarioId = caminhoBase.split('/').pop()!;
    return mockBuscarUsuarioPorId(usuarioId) as unknown as Promise<TResposta>;
  }

  const rota = `${method} ${caminhoBase}`;
  switch (rota) {
    case 'GET /cursos':
      return resolverComAtraso(CURSOS_MOCK as unknown as TResposta);

    case 'GET /habilidades/categorias': {
      const categorias = [...new Set(HABILIDADES_MOCK.map((h) => h.categoria))];
      return resolverComAtraso(categorias as unknown as TResposta);
    }

    case 'POST /habilidades': {
      const dados = body as SalvarHabilidadeRequest;
      const nova: Habilidade = {
        id: `habilidade-mock-${Date.now()}`,
        nome: dados.nome,
        categoria: dados.categoria ?? 'Geral',
        descricao: dados.descricao ?? null,
        usuariosCount: 0,
        projetosCount: 0,
        criadoEm: new Date().toISOString(),
      };
      HABILIDADES_MOCK.push(nova);
      return resolverComAtraso(clonar(nova) as unknown as TResposta);
    }

    case 'GET /usuarios':
      return resolverComAtraso(clonar(USUARIOS_ADMIN_MOCK) as unknown as TResposta); // não USUARIOS_MOCK

    case 'GET /niveis-acesso':
      return resolverComAtraso(NIVEIS_ACESSO_MOCK as unknown as TResposta);

    case 'GET /denuncias':
      return resolverComAtraso(paginar(clonar(DENUNCIAS_MOCK)) as unknown as TResposta);

    case 'GET /usuarios/me':
      return resolverComAtraso({ ...meuPerfilMock } as unknown as TResposta);

    case 'PUT /usuarios/me': {
      const dados = body as {
        nome: string; idCurso?: string; bio?: string; linkedinUrl?: string; githubUrl?: string;
      };
      const cursoEscolhido = dados.idCurso
        ? CURSOS_MOCK.find((c) => c.id === dados.idCurso) ?? meuPerfilMock.curso
        : meuPerfilMock.curso;
      meuPerfilMock = {
        ...meuPerfilMock,
        nome: dados.nome,
        curso: cursoEscolhido,
        bio: dados.bio ?? null,
        linkedinUrl: dados.linkedinUrl ?? null,
        githubUrl: dados.githubUrl ?? null,
      };
      return resolverComAtraso({ ...meuPerfilMock } as unknown as TResposta);
    }

    case 'POST /candidaturas': {
      const dados = body as { projetoId: string; mensagem?: string };
      const projeto = PROJETOS_MOCK.find((p) => p.id === dados.projetoId);
      if (!projeto) {
        return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
      }
      if (projeto.criador?.id === USUARIO_LOGADO_MOCK.id) {
        return rejeitarComAtraso(new ApiError(400, 'Você não pode se candidatar ao seu próprio projeto.'));
      }
      if (CANDIDATURAS_MOCK.some((c) => c.projeto.id === dados.projetoId && c.usuario?.id === USUARIO_LOGADO_MOCK.id)) {
        return rejeitarComAtraso(new ApiError(400, 'Você já se candidatou a este projeto.'));
      }
      const agora = new Date().toISOString();
      const nova: Candidatura = {
        id: `candidatura-mock-${Date.now()}`,
        projeto: { id: projeto.id, titulo: projeto.titulo, status: projeto.status },
        usuario: USUARIO_LOGADO_MOCK,
        status: 'PENDENTE',
        mensagem: dados.mensagem ?? null,
        motivoRejeicao: null,
        dataCandidatura: agora,
        dataResposta: null,
      };
      CANDIDATURAS_MOCK.push(nova);
      projeto.totalCandidaturasPendentes += 1;
      return resolverComAtraso(clonar(nova) as unknown as TResposta);
    }

    case 'GET /candidaturas/minhas': {
      const status = parametros.get('status');
      const minhas = CANDIDATURAS_MOCK.filter(
        (c) => c.usuario?.id === USUARIO_LOGADO_MOCK.id && (!status || c.status === status),
      );
      return resolverComAtraso(paginar(clonar(minhas)) as unknown as TResposta);
    }

    case 'GET /projetos': {
      const busca = parametros.get('busca')?.toLowerCase();
      const status = parametros.get('status');
      const filtrados = PROJETOS_MOCK.filter((projeto) => {
        if (status && projeto.status !== status) return false;
        if (busca && !projeto.titulo.toLowerCase().includes(busca) && !projeto.descricao.toLowerCase().includes(busca)) {
          return false;
        }
        return true;
      });
      return resolverComAtraso(paginar(filtrados.map(paraResumo)) as unknown as TResposta);
    }

    case 'GET /projetos/meus-projetos': {
      const meus = PROJETOS_MOCK.filter((p) => p.criador?.id === USUARIO_LOGADO_MOCK.id);
      return resolverComAtraso(paginar(meus.map(paraResumo)) as unknown as TResposta);
    }

    case 'GET /projetos/vinculados': {
      const status = parametros.get('status');
      const vinculados = PROJETOS_MOCK.filter((p) =>
        (p.criador?.id === USUARIO_LOGADO_MOCK.id || membrosDoProjetoMock(p).some((m) => m.usuario?.id === USUARIO_LOGADO_MOCK.id))
        && (!status || p.status === status),
      );
      return resolverComAtraso(paginar(vinculados.map(paraResumo)) as unknown as TResposta);
    }

    case 'GET /projetos/participando': {
      const participando = PROJETOS_MOCK.filter((p) =>
        membrosDoProjetoMock(p).some((m) => m.usuario?.id === USUARIO_LOGADO_MOCK.id && p.criador?.id !== USUARIO_LOGADO_MOCK.id),
      );
      return resolverComAtraso(paginar(participando.map(paraResumo)) as unknown as TResposta);
    }

    case 'GET /recomendacoes/projetos': {
      const limite = Number(parametros.get('limite')) || 5;
      // Mesmo filtro do RecomendacaoService real: só ABERTO e de outra pessoa
      // (a pontuação de compatibilidade em si é só ilustrativa aqui).
      const recomendados: ProjetoRecomendado[] = PROJETOS_MOCK
        .filter((p) => p.status === 'ABERTO' && p.criador?.id !== USUARIO_LOGADO_MOCK.id)
        .slice(0, limite)
        .map((p) => ({
          projeto: paraResumo(p),
          compatibilidade: 0.75,
          habilidadesEmComum: clonar(p.habilidadesNecessarias.slice(0, 1).map((h) => h.habilidade)),
        }));
      return resolverComAtraso(recomendados as unknown as TResposta);
    }

    case 'POST /projetos': {
      const dados = body as CriarProjetoRequest;
      const habilidadesNecessarias = (dados.habilidades ?? [])
        .filter((vinculo) => HABILIDADES_MOCK.some((h) => h.id === vinculo.habilidadeId))
        .map((vinculo) => habilidadeNecessariaMock(vinculo.habilidadeId, vinculo.obrigatoria ?? false));

      const agora = new Date().toISOString();
      const novoProjeto: ProjetoDetalhe = {
        id: `projeto-mock-${agora}`,
        criador: USUARIO_LOGADO_MOCK,
        titulo: dados.titulo,
        descricao: dados.descricao,
        bannerUrl: null,
        status: 'ABERTO',
        vagas: dados.vagas,
        vagasPreenchidas: 0,
        vagasDisponiveis: dados.vagas,
        aceitandoCandidaturas: true,
        dataFim: dados.dataFim ?? null,
        ativo: true,
        criadoEm: agora,
        atualizadoEm: agora,
        habilidadesNecessarias,
        totalMembros: 1,
        totalCandidaturasPendentes: 0,
      };
      PROJETOS_MOCK.unshift(novoProjeto);
      return resolverComAtraso(clonar(novoProjeto) as unknown as TResposta);
    }

    case 'POST /auth/login': {
      const { email, senha } = body as LoginRequest;
      if (email === CREDENCIAIS_MOCK.email && senha === CREDENCIAIS_MOCK.senha) {
        const resposta: LoginResponse = {
          sucesso: true,
          mensagem: 'Login realizado com sucesso.',
          token: 'token-mock-dev',
          usuario: USUARIO_LOGADO_MOCK,
          avisosCancelamento: [],
        };
        return resolverComAtraso(resposta as unknown as TResposta);
      }
      // Mesma mensagem que o AuthService real devolve pra credenciais erradas.
      return rejeitarComAtraso(new ApiError(401, 'Email ou senha incorretos.'));
    }

    case 'POST /auth/cadastro': {
      const dados = body as CadastroRequest;
      if (dados.email === EMAIL_JA_CADASTRADO_MOCK) {
        const erroCampo: ErroCampo = { campo: 'email', mensagem: 'E-mail já cadastrado.' };
        return rejeitarComAtraso(
          new ApiError(400, `E-mail '${dados.email}' já está cadastrado no sistema.`, [erroCampo]),
        );
      }
      const resposta: CadastroResponse = {
        sucesso: true,
        mensagem: 'Cadastro realizado com sucesso.',
      };
      return resolverComAtraso(resposta as unknown as TResposta);
    }

    default: {
      // Rotas com :id (ex.: "/projetos/abc123" ou "/projetos/abc123/membros") —
      // casadas por regex porque o id muda a cada projeto criado.
      const matchMembros = method === 'GET' && caminhoBase.match(/^\/projetos\/([^/]+)\/membros$/);
      if (matchMembros) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchMembros[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        return resolverComAtraso(clonar(membrosDoProjetoMock(projeto)) as unknown as TResposta);
      }

      // Expulsão/saída: remove o vínculo, libera a vaga e apaga a candidatura
      // aceita (mesmas regras do ProjetoMembroService.remover).
      const matchRemoverMembro = method === 'DELETE' && caminhoBase.match(/^\/projetos\/([^/]+)\/membros\/([^/]+)$/);
      if (matchRemoverMembro) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchRemoverMembro[1]);
        const membrosDoProjeto = projeto
          ? MEMBROS_MOCK[projeto.id] ?? (MEMBROS_MOCK[projeto.id] = membrosDoProjetoMock(projeto))
          : [];
        const indice = membrosDoProjeto.findIndex((m) => m.id === matchRemoverMembro[2]);
        if (!projeto || indice < 0) {
          return rejeitarComAtraso(new ApiError(404, 'Membro não encontrado com o ID informado.'));
        }
        if (projeto.status === 'CONCLUIDO' || projeto.status === 'CANCELADO') {
          return rejeitarComAtraso(new ApiError(400, 'Não é possível alterar a equipe de um projeto encerrado.'));
        }
        const [removido] = membrosDoProjeto.splice(indice, 1);
        const indiceCandidatura = CANDIDATURAS_MOCK.findIndex(
          (c) => c.projeto.id === projeto.id && c.usuario?.id === removido.usuario?.id,
        );
        if (indiceCandidatura >= 0) CANDIDATURAS_MOCK.splice(indiceCandidatura, 1);
        projeto.vagasPreenchidas = Math.max(0, projeto.vagasPreenchidas - 1);
        projeto.vagasDisponiveis = Math.max(0, projeto.vagas - projeto.vagasPreenchidas);
        projeto.totalMembros = Math.max(0, projeto.totalMembros - 1);
        return resolverComAtraso({ sucesso: true, mensagem: 'Membro removido do projeto com sucesso.' } as unknown as TResposta);
      }

      const matchProjeto =method === 'GET' && caminhoBase.match(/^\/projetos\/([^/]+)$/);
      if (matchProjeto) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchProjeto[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        return resolverComAtraso(clonar(projeto) as unknown as TResposta);
      }

      const matchAtualizar = method === 'PUT' && caminhoBase.match(/^\/projetos\/([^/]+)$/);
      if (matchAtualizar) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchAtualizar[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        if (projeto.status === 'CONCLUIDO' || projeto.status === 'CANCELADO') {
          return rejeitarComAtraso(
            new ApiError(400, `Projetos com status ${projeto.status} não podem ser editados.`),
          );
        }
        const dados = body as AtualizarProjetoRequest;
        if (dados.vagas < projeto.totalMembros) {
          return rejeitarComAtraso(
            new ApiError(400, `O número de vagas não pode ser menor do que as vagas já preenchidas (${projeto.totalMembros}).`),
          );
        }
        projeto.titulo = dados.titulo;
        projeto.descricao = dados.descricao;
        projeto.vagas = dados.vagas;
        projeto.vagasDisponiveis = dados.vagas - projeto.vagasPreenchidas;
        projeto.dataFim = dados.dataFim ?? null;
        projeto.atualizadoEm = new Date().toISOString();
        return resolverComAtraso(clonar(projeto) as unknown as TResposta);
      }

      const matchBanner = method === 'POST' && caminhoBase.match(/^\/projetos\/([^/]+)\/banner$/);
      if (matchBanner) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchBanner[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        projeto.bannerUrl = `https://picsum.photos/seed/${projeto.id}-banner-${Date.now()}/1200/400`;
        projeto.atualizadoEm = new Date().toISOString();
        return resolverComAtraso(clonar(projeto) as unknown as TResposta);
      }

      const matchStatus = method === 'PATCH' && caminhoBase.match(/^\/projetos\/([^/]+)\/status$/);
      if (matchStatus) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchStatus[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        if (projeto.status === 'CONCLUIDO' || projeto.status === 'CANCELADO') {
          return rejeitarComAtraso(
            new ApiError(400, `Projetos com status ${projeto.status} não podem ter o status alterado.`),
          );
        }
        const { status } = body as { status: StatusProjeto; motivo?: string };
        if (status === projeto.status) {
          return rejeitarComAtraso(new ApiError(400, `O projeto já está com o status ${status}.`));
        }
        projeto.status = status;
        projeto.aceitandoCandidaturas = status === 'ABERTO';
        projeto.atualizadoEm = new Date().toISOString();
        return resolverComAtraso(clonar(projeto) as unknown as TResposta);
      }

      const matchVincularHabilidade = method === 'POST' && caminhoBase.match(/^\/projetos\/([^/]+)\/habilidades$/);
      if (matchVincularHabilidade) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchVincularHabilidade[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        const { habilidadeId, obrigatoria } = body as { habilidadeId: string; obrigatoria?: boolean };
        if (!HABILIDADES_MOCK.some((h) => h.id === habilidadeId)) {
          return rejeitarComAtraso(new ApiError(404, 'Habilidade não encontrada.'));
        }
        const vinculo = habilidadeNecessariaMock(habilidadeId, obrigatoria ?? false);
        projeto.habilidadesNecessarias = [...projeto.habilidadesNecessarias, vinculo];
        return resolverComAtraso(clonar(vinculo) as unknown as TResposta);
      }

      const matchAlterarObrigatoriedade =
        method === 'PATCH' && caminhoBase.match(/^\/projetos\/([^/]+)\/habilidades\/([^/]+)$/);
      if (matchAlterarObrigatoriedade) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchAlterarObrigatoriedade[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        const habilidadeId = matchAlterarObrigatoriedade[2];
        const obrigatoria = parametros.get('obrigatoria') === 'true';
        const vinculo = projeto.habilidadesNecessarias.find((h) => h.habilidade.id === habilidadeId);
        if (!vinculo) {
          return rejeitarComAtraso(new ApiError(404, 'Vínculo de habilidade não encontrado.'));
        }
        vinculo.obrigatoria = obrigatoria;
        return resolverComAtraso(clonar(vinculo) as unknown as TResposta);
      }

      const matchDesvincularHabilidade =
        method === 'DELETE' && caminhoBase.match(/^\/projetos\/([^/]+)\/habilidades\/([^/]+)$/);
      if (matchDesvincularHabilidade) {
        const projeto = PROJETOS_MOCK.find((p) => p.id === matchDesvincularHabilidade[1]);
        if (!projeto) {
          return rejeitarComAtraso(new ApiError(404, 'Projeto não encontrado.'));
        }
        const habilidadeId = matchDesvincularHabilidade[2];
        projeto.habilidadesNecessarias = projeto.habilidadesNecessarias.filter((h) => h.habilidade.id !== habilidadeId);
        return resolverComAtraso({ sucesso: true, mensagem: 'Habilidade desvinculada.' } as unknown as TResposta);
      }

      const matchAtualizarHabilidade = method === 'PUT' && caminhoBase.match(/^\/habilidades\/([^/]+)$/);
      if (matchAtualizarHabilidade) {
        const habilidade = HABILIDADES_MOCK.find((h) => h.id === matchAtualizarHabilidade[1]);
        if (!habilidade) {
          return rejeitarComAtraso(new ApiError(404, 'Habilidade não encontrada.'));
        }
        const dados = body as SalvarHabilidadeRequest;
        habilidade.nome = dados.nome;
        habilidade.categoria = dados.categoria ?? habilidade.categoria;
        habilidade.descricao = dados.descricao ?? null;
        return resolverComAtraso(clonar(habilidade) as unknown as TResposta);
      }

      const matchExcluirHabilidade = method === 'DELETE' && caminhoBase.match(/^\/habilidades\/([^/]+)$/);
      if (matchExcluirHabilidade) {
        const habilidade = HABILIDADES_MOCK.find((h) => h.id === matchExcluirHabilidade[1]);
        if (!habilidade) {
          return rejeitarComAtraso(new ApiError(404, 'Habilidade não encontrada.'));
        }
        if (habilidade.usuariosCount > 0 || habilidade.projetosCount > 0) {
          return rejeitarComAtraso(
            new ApiError(400, 'Não é possível excluir uma habilidade que já está em uso.'),
          );
        }
        const indice = HABILIDADES_MOCK.indexOf(habilidade);
        HABILIDADES_MOCK.splice(indice, 1);
        return resolverComAtraso({ sucesso: true, mensagem: 'Habilidade excluída.' } as unknown as TResposta);
      }

      const matchNivelAcesso = method === 'PATCH' && caminhoBase.match(/^\/usuarios\/([^/]+)\/nivel-acesso$/);
      if (matchNivelAcesso) {
        const usuario = USUARIOS_MOCK.find((u) => u.id === matchNivelAcesso[1]);
        if (!usuario) {
          return rejeitarComAtraso(new ApiError(404, 'Usuário não encontrado.'));
        }
        const idNivel = parametros.get('idNivel');
        const nivel = NIVEIS_ACESSO_MOCK.find((n) => n.id === idNivel);
        if (!nivel) {
          return rejeitarComAtraso(new ApiError(404, 'Nível de acesso não encontrado.'));
        }
        usuario.permission = nivel.nome;
        const perfil: UsuarioPerfil = {
          id: usuario.id,
          email: `${usuario.nome.toLowerCase().replace(/\s+/g, '.')}@academico.edu.br`,
          nome: usuario.nome,
          nivelAcesso: nivel,
          curso: CURSOS_MOCK.find((c) => c.nome === usuario.curso) ?? null,
          periodo: usuario.periodo,
          bio: null,
          fotoUrl: usuario.fotoUrl,
          linkedinUrl: null,
          githubUrl: null,
          habilidades: [],
          notaMedia: usuario.notaMedia,
          totalAvaliacoes: usuario.totalAvaliacoes,
          termosAceitosEm: '2024-01-01T00:00:00Z',
          ativo: true,
          criadoEm: '2024-01-01T00:00:00Z',
          atualizadoEm: new Date().toISOString(),
        };
        return resolverComAtraso(perfil as unknown as TResposta);
      }

      const matchCancelarCandidatura = method === 'DELETE' && caminhoBase.match(/^\/candidaturas\/([^/]+)$/);
      if (matchCancelarCandidatura) {
        const candidatura = CANDIDATURAS_MOCK.find((c) => c.id === matchCancelarCandidatura[1]);
        if (!candidatura) {
          return rejeitarComAtraso(new ApiError(404, 'Candidatura não encontrada.'));
        }
        if (candidatura.status !== 'PENDENTE') {
          return rejeitarComAtraso(new ApiError(400, 'Só é possível cancelar candidaturas pendentes.'));
        }
        const projeto = PROJETOS_MOCK.find((p) => p.id === candidatura.projeto.id);
        if (projeto) projeto.totalCandidaturasPendentes = Math.max(0, projeto.totalCandidaturasPendentes - 1);
        CANDIDATURAS_MOCK.splice(CANDIDATURAS_MOCK.indexOf(candidatura), 1);
        return resolverComAtraso({ sucesso: true, mensagem: 'Candidatura cancelada com sucesso.' } as unknown as TResposta);
      }

      const matchCandidaturasDoProjeto = method === 'GET' && caminhoBase.match(/^\/candidaturas\/projeto\/([^/]+)$/);
      if (matchCandidaturasDoProjeto) {
        const status = parametros.get('status');
        const doProjeto = CANDIDATURAS_MOCK.filter(
          (c) => c.projeto.id === matchCandidaturasDoProjeto[1] && (!status || c.status === status),
        );
        return resolverComAtraso(paginar(clonar(doProjeto)) as unknown as TResposta);
      }

      const matchAceitarCandidatura = method === 'PATCH' && caminhoBase.match(/^\/candidaturas\/([^/]+)\/aceitar$/);
      if (matchAceitarCandidatura) {
        const candidatura = CANDIDATURAS_MOCK.find((c) => c.id === matchAceitarCandidatura[1]);
        if (!candidatura) {
          return rejeitarComAtraso(new ApiError(404, 'Candidatura não encontrada.'));
        }
        const projeto = PROJETOS_MOCK.find((p) => p.id === candidatura.projeto.id);
        if (projeto) {
          projeto.vagasPreenchidas += 1;
          projeto.vagasDisponiveis = Math.max(0, projeto.vagas - projeto.vagasPreenchidas);
          projeto.totalMembros += 1;
          projeto.totalCandidaturasPendentes = Math.max(0, projeto.totalCandidaturasPendentes - 1);
          const { funcao } = (body as { funcao?: string }) ?? {};
          const membrosDoProjeto = MEMBROS_MOCK[projeto.id] ?? (MEMBROS_MOCK[projeto.id] = membrosDoProjetoMock(projeto));
          membrosDoProjeto.push({
            id: `membro-mock-${Date.now()}`,
            projeto: null,
            usuario: candidatura.usuario,
            funcao: funcao ?? null,
            dataAdesao: new Date().toISOString(),
          });
        }
        candidatura.status = 'ACEITO';
        candidatura.dataResposta = new Date().toISOString();
        return resolverComAtraso(clonar(candidatura) as unknown as TResposta);
      }

      const matchRejeitarCandidatura = method === 'PATCH' && caminhoBase.match(/^\/candidaturas\/([^/]+)\/rejeitar$/);
      if (matchRejeitarCandidatura) {
        const candidatura = CANDIDATURAS_MOCK.find((c) => c.id === matchRejeitarCandidatura[1]);
        if (!candidatura) {
          return rejeitarComAtraso(new ApiError(404, 'Candidatura não encontrada.'));
        }
        const { motivoRejeicao } = body as { motivoRejeicao: string };
        candidatura.status = 'REJEITADO';
        candidatura.motivoRejeicao = motivoRejeicao;
        candidatura.dataResposta = new Date().toISOString();
        const projeto = PROJETOS_MOCK.find((p) => p.id === candidatura.projeto.id);
        if (projeto) projeto.totalCandidaturasPendentes = Math.max(0, projeto.totalCandidaturasPendentes - 1);
        return resolverComAtraso(clonar(candidatura) as unknown as TResposta);
      }

      const matchResolverDenuncia = method === 'PATCH' && caminhoBase.match(/^\/denuncias\/([^/]+)\/resolver$/);
      if (matchResolverDenuncia) {
        const denuncia = DENUNCIAS_MOCK.find((d) => d.id === matchResolverDenuncia[1]);
        if (!denuncia) {
          return rejeitarComAtraso(new ApiError(404, 'Denúncia não encontrada.'));
        }
        const procedente = parametros.get('procedente') === 'true';
        denuncia.status = procedente ? 'PROCEDENTE' : 'IMPROCEDENTE';
        denuncia.analisadoEm = new Date().toISOString();
        const indice = DENUNCIAS_MOCK.indexOf(denuncia);
        DENUNCIAS_MOCK.splice(indice, 1);
        return resolverComAtraso(clonar(denuncia) as unknown as TResposta);
      }

      return rejeitarComAtraso(
        new ApiError(
          501,
          `Mock não implementado para "${rota}". Adicione um caso em services/mocks.ts ou rode com VITE_USE_MOCKS=false para usar o backend real.`,
        ),
      );
    }
  }
}