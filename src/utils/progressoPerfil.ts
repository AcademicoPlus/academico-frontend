// Quanto do perfil está preenchido, para o card "Complete seu perfil".
// Nome, e-mail e curso são obrigatórios no cadastro, então não entram aqui:
// a lista é só do que a pessoa pode ter deixado para depois.
import type { UsuarioPerfil } from '../services/usuarioService';

// O mínimo para a recomendação por compatibilidade ter com o que trabalhar.
export const MINIMO_HABILIDADES = 3;

// Âncoras das seções da tela de edição (EditarPerfil.tsx).
export type SecaoPerfil = 'secao-foto' | 'secao-informacoes' | 'secao-habilidades';

export type ItemPerfil = {
  chave: 'habilidades' | 'foto' | 'bio' | 'periodo' | 'links';
  rotulo: string;
  // Por que vale a pena preencher — é o que convence a pessoa a clicar.
  motivo: string;
  peso: number;
  concluido: boolean;
  secao: SecaoPerfil;
};

export type ProgressoPerfil = {
  itens: ItemPerfil[];
  pendentes: ItemPerfil[];
  percentual: number;
  completo: boolean;
};

function preenchido(valor: string | null | undefined): boolean {
  return !!valor && valor.trim().length > 0;
}

export function calcularProgressoPerfil(perfil: UsuarioPerfil): ProgressoPerfil {
  const totalHabilidades = perfil.habilidades?.length ?? 0;

  // Ordem = importância. Habilidades pesam mais: são a base das recomendações,
  // que são o que a plataforma oferece de diferente.
  const itens: ItemPerfil[] = [
    {
      chave: 'habilidades',
      rotulo: totalHabilidades >= MINIMO_HABILIDADES
        ? `Pelo menos ${MINIMO_HABILIDADES} habilidades`
        : `Adicione pelo menos ${MINIMO_HABILIDADES} habilidades (${totalHabilidades} de ${MINIMO_HABILIDADES})`,
      motivo: 'É com elas que recomendamos projetos para você e que os criadores te encontram.',
      peso: 40,
      concluido: totalHabilidades >= MINIMO_HABILIDADES,
      secao: 'secao-habilidades',
    },
    {
      chave: 'foto',
      rotulo: 'Foto de perfil',
      motivo: 'Perfis com foto passam mais confiança para quem vai te chamar para um projeto.',
      peso: 15,
      concluido: preenchido(perfil.fotoUrl),
      secao: 'secao-foto',
    },
    {
      chave: 'bio',
      rotulo: 'Bio',
      motivo: 'Conte em poucas linhas o que você estuda e o que te interessa.',
      peso: 20,
      concluido: preenchido(perfil.bio),
      secao: 'secao-informacoes',
    },
    {
      chave: 'periodo',
      rotulo: 'Período do curso',
      motivo: 'Ajuda os criadores a montar equipes com experiências diferentes.',
      peso: 10,
      concluido: perfil.periodo != null,
      secao: 'secao-informacoes',
    },
    {
      chave: 'links',
      rotulo: 'LinkedIn ou GitHub',
      motivo: 'Mostra seus trabalhos e facilita o contato fora da plataforma.',
      peso: 15,
      concluido: preenchido(perfil.linkedinUrl) || preenchido(perfil.githubUrl),
      secao: 'secao-informacoes',
    },
  ];

  const pesoTotal = itens.reduce((soma, item) => soma + item.peso, 0);
  const pesoConcluido = itens.filter((item) => item.concluido).reduce((soma, item) => soma + item.peso, 0);
  const pendentes = itens.filter((item) => !item.concluido);

  return {
    itens,
    pendentes,
    percentual: Math.round((pesoConcluido / pesoTotal) * 100),
    completo: pendentes.length === 0,
  };
}
