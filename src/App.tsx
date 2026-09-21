import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// 1. Importando o "Esqueleto" (Header e Menu)
import LayoutBase from './components/layout-base'

// Guards de rota
import RotaProtegida from './routes/rotaprotegida'
import RotaAdmin from './routes/rotaadmin'

// 2. Importando as Telas Públicas (Fora do sistema)
import Login from './pages/login'
import Cadastro from './pages/cadastro'
import EsqueciSenha from './pages/esqueci-senha'
import TermosDeUso from './pages/termosdeuso'
import PoliticaDePrivacidade from './pages/politicadeprivacidade'

// 3. Importando as Telas Logadas (Dentro do sistema)
import Dashboard from './pages/dashboard'
import Projetos from './pages/projetos'
import ExplorarPessoas from './pages/ExplorarPessoas';
import DetalhesProjeto from './pages/detalhes-projeto'
import Candidaturas from './pages/candidaturas'
import EditarPerfil from './pages/EditarPerfil';
import Perfil from './pages/Perfil';
import CriarProjeto from './pages/criar-projeto'
import EditarProjeto from './pages/editar-projeto'

// 4. Telas de Administrador
import Admin from './pages/admin'
import AdminUsuarios from './pages/admin-usuarios'
import AdminHabilidades from './pages/admin-habilidades'
import AdminDenuncias from './pages/admin-denuncias'
import NaoEncontrado from './pages/nao-encontrado'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redireciona quem entra no site direto para a tela de Login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* ROTAS PÚBLICAS (Ocupam a tela toda, sem o menu) */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/politica-de-privacidade" element={<PoliticaDePrivacidade />} />

        {/* ROTAS DA ÁREA LOGADA (exige token válido; o "LayoutBase" abraça todas essas telas) */}
        <Route element={<RotaProtegida />}>
          <Route element={<LayoutBase />}>

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/pessoas" element={<ExplorarPessoas />} />
            <Route path="/usuarios/:id" element={<Perfil />} />
            <Route path="/usuarios/:id/editar" element={<EditarPerfil />} />

            {/* ALTERADO AQUI: Adicionado o /:id para carregar o projeto */}
            <Route path="/detalhes/:id" element={<DetalhesProjeto />} />

            <Route path="/candidaturas" element={<Candidaturas />} />

            <Route path="/criar-projeto" element={<CriarProjeto />} />
            <Route path="/editar-projeto/:id" element={<EditarProjeto />} />

            {/* ROTAS DE ADMINISTRADOR (exige nivelAcesso ADMIN) */}
            <Route element={<RotaAdmin />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/usuarios" element={<AdminUsuarios />} />
              <Route path="/admin/habilidades" element={<AdminHabilidades />} />
              <Route path="/admin/denuncias" element={<AdminDenuncias />} />
            </Route>

          </Route>
        </Route>

        {/* Qualquer rota não mapeada cai na página 404 */}
        <Route path="*" element={<NaoEncontrado />} />
      </Routes>
    </BrowserRouter>
  )
}