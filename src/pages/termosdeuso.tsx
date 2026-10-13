// Página estática com o conteúdo de legal/TERMOS_DE_USO.md, linkada a partir
// do checkbox de aceite em cadastro.tsx (o backend exige aceitouTermos=true).
import { Link } from 'react-router-dom';

export default function TermosDeUso() {
  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-slate-950 font-sans py-10 px-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-8">
        <Link to="/cadastro" className="text-[#1472dd] text-sm font-semibold hover:underline">
          ← Voltar para o cadastro
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1">Termos de Uso — Academico+</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Última atualização: agosto de 2026</p>

        <div className="flex flex-col gap-5 text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
          <p>
            Estes Termos regulam o uso da plataforma Academico+ ("Plataforma"), desenvolvida por
            alunos do curso de Bacharelado em Ciência da Computação do Centro Universitário do
            Piauí (UNIFAPI) como parte de um projeto acadêmico. Ao se cadastrar, você concorda com
            estes Termos e com a{' '}
            <Link to="/politica-de-privacidade" className="text-[#1472dd] hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">1. O que é a Plataforma</h2>
            <p>
              A Academico+ é um espaço para alunos e professores da instituição divulgarem e
              encontrarem projetos acadêmicos, formarem equipes por afinidade de habilidades, e
              avaliarem colegas com quem colaboraram.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">2. Cadastro e conta</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas com sua conta.</li>
              <li>As informações fornecidas no cadastro (nome, e-mail, curso, período) devem ser verdadeiras.</li>
              <li>Você pode encerrar sua conta a qualquer momento, através da própria Plataforma ("Excluir minha conta", mediante confirmação de senha).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">3. Conteúdo gerado por você</h2>
            <p className="mb-2">
              Ao publicar um projeto, se candidatar, comentar ou avaliar outro usuário, você é o
              único responsável pelo conteúdo enviado. Você concorda em <strong>não publicar</strong>:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Conteúdo ofensivo, difamatório, discriminatório ou que constitua assédio;</li>
              <li>Informações falsas sobre você ou sobre outras pessoas;</li>
              <li>Dados pessoais de terceiros sem consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">4. Sistema de avaliação entre colaboradores</h2>
            <p className="mb-2">
              Depois que um projeto é encerrado, quem participou dele pode avaliar outros
              participantes (nota de 1 a 5 e comentário). Essa avaliação:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 mb-2">
              <li>Deve refletir de boa-fé a experiência real de colaboração;</li>
              <li>Fica visível no perfil público da pessoa avaliada;</li>
              <li>
                Pode ser <strong>denunciada</strong> pela pessoa avaliada, caso considere o conteúdo
                abusivo, falso ou não relacionado à colaboração (ver seção 6).
              </li>
            </ul>
            <p>
              A Plataforma não se responsabiliza pelo conteúdo das avaliações antes de uma denúncia
              ser analisada, mas se compromete a analisar denúncias e agir sobre conteúdo que viole
              estes Termos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">5. O que não é permitido</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Criar contas falsas ou se passar por outra pessoa;</li>
              <li>Usar a Plataforma para fins diferentes de networking e colaboração acadêmica;</li>
              <li>Tentar acessar dados de outros usuários sem autorização, ou sobrecarregar a infraestrutura da Plataforma (ex.: automação abusiva, força bruta).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">6. Denúncias e medidas de moderação</h2>
            <p className="mb-2">
              Você pode <strong>denunciar</strong> uma avaliação recebida, um projeto ou o perfil de
              outro usuário quando o conteúdo for abusivo, falso, enganoso, caracterizar spam ou
              tentativa de golpe, ou violar estes Termos. A denúncia exige que você indique um motivo
              e descreva o que aconteceu, e é analisada pela administração da Plataforma.
            </p>
            <p className="mb-2">
              Ao julgar uma denúncia procedente, a administração escolhe uma destas medidas, da mais
              branda à mais severa:
            </p>
            <ol className="list-decimal pl-5 flex flex-col gap-1 mb-2">
              <li>
                <strong>Remoção do conteúdo</strong> — a avaliação ou o projeto denunciado sai do ar,
                sem punição ao autor;
              </li>
              <li>
                <strong>Advertência</strong> — o conteúdo sai do ar e o responsável recebe um registro
                formal, exibido para ele no login seguinte, com a justificativa da decisão;
              </li>
              <li>
                <strong>Suspensão</strong> — o conteúdo sai do ar e o acesso do responsável fica
                bloqueado por um prazo determinado, informado a ele junto com o motivo.
              </li>
            </ol>
            <p className="mb-2">
              A regra geral é começar pela advertência e só suspender em caso de reincidência ou de
              violação grave. A decisão é sempre de uma pessoa da administração, nunca automática, e
              leva em conta o histórico de medidas já aplicadas. Denúncias consideradas improcedentes
              são arquivadas, e o conteúdo permanece como estava.
            </p>
            <p className="mb-2">
              Quem denuncia não é informado da decisão individual tomada sobre o alvo, para preservar
              a privacidade das partes. O conteúdo denunciado permanece no ar enquanto a denúncia está
              em análise.
            </p>
            <p>
              Denúncias e medidas ficam registradas para fins de auditoria, inclusive depois de
              cumpridas, mesmo quando o conteúdo denunciado já tiver sido removido.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">7. Natureza do projeto</h2>
            <p>
              A Academico+ é um projeto acadêmico em desenvolvimento (MVP). Funcionalidades podem
              mudar, e a disponibilidade do serviço não é garantida.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">8. Alterações nestes Termos</h2>
            <p>
              Podemos atualizar estes Termos conforme a Plataforma evolui. Mudanças relevantes serão
              comunicadas na própria Plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">9. Contato</h2>
            <p>
              Dúvidas sobre estes Termos podem ser encaminhadas à equipe responsável pelo projeto,
              através dos canais informados no README do projeto.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
