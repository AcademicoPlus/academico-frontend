// Página de edição do próprio perfil (/usuarios/:id/editar).
// Só acessível pelo dono da conta: compara o :id da URL com o id retornado por GET /usuarios/me.
// Permite alterar foto de perfil (JPG/PNG até 2MB), nome, curso (via listarCursos), bio,
// links externos (LinkedIn, GitHub) e gerenciar habilidades.
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiFetch, ApiError, type PaginaResposta } from '../services/apiClient';
import {
  atualizarMeuPerfil,
  alterarMinhaSenha,
  excluirMinhaConta,
  enviarFotoDePerfil,
  removerFotoDePerfil,
  type UsuarioPerfil,
} from '../services/usuarioService';
import ConfirmModal from '../components/ConfirmModal';
import { removerToken } from '../utils/auth';
import {
  obterMeuPerfilCache,
  atualizarCacheMeuPerfil,
  atualizarHabilidadesNoCacheMeuPerfil,
} from '../hooks/useMeuPerfil';
import { listarCursos, type Curso } from '../services/cursoService';
import {
  adicionarHabilidadeAoPerfil,
  atualizarNivelHabilidade,
  removerHabilidadeDoPerfil,
  type NivelHabilidade,
} from '../services/usuarioHabilidadeService';


// ─── Tipos ────────────────────────────────────────────────────────────────────

type HabilidadeNoPerfil = {
  id: string;
  habilidade: { id: string; nome: string };
  nivel: NivelHabilidade;
};

type HabilidadeResumo = {
  id: string;
  nome: string;
};

const NIVEIS_HABILIDADE: { valor: NivelHabilidade; label: string }[] = [
  { valor: 'INICIANTE', label: 'Iniciante' },
  { valor: 'INTERMEDIARIO', label: 'Intermediário' },
  { valor: 'AVANCADO', label: 'Avançado' },
  { valor: 'EXPERT', label: 'Expert' },
];

// ─── Utilitários de Estilo e Formatação ────────────────────────────────────────

function formatarIniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}


function renderIconeHabilidade(nome: string) {
  const norm = nome.toLowerCase().trim();
  if (norm.includes('react')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="2" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(0 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
      </svg>
    );
  }
  if (norm.includes('design') || norm.includes('ui') || norm.includes('ux') || norm.includes('figma')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    );
  }
  if (norm.includes('css') || norm.includes('tailwind')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    );
  }
  if (norm.includes('fastapi') || norm.includes('api')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  if (norm.includes('python')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 14h.01" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

// ─── Componente Local de Input (Variante de tela com o design system primary) ─

interface LocalInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  icon?: ReactNode;
  autoComplete?: string;
}

function LocalInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  hint,
  icon,
  autoComplete,
}: LocalInputProps) {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const isTextarea = type === 'textarea';
  const isPassword = type === 'password';
  const inputType = isPassword ? (mostrarSenha ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
          {label}
          {required && <span className="ml-1 text-primary">*</span>}
        </label>
        {hint && <span className="text-[11px] text-gray-400 dark:text-gray-500">{hint}</span>}
      </div>

      <div
        className={`relative rounded-xl border transition-all duration-150 ${
          error
            ? 'border-red-400 dark:border-red-500/80 bg-red-50/30 dark:bg-red-950/20'
            : 'border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white dark:focus-within:bg-slate-800'
        }`}
      >
        {icon && (
          <div className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 pointer-events-none">
            {icon}
          </div>
        )}

        {isTextarea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            aria-invalid={!!error}
            rows={3}
            className={`w-full rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent outline-none resize-y min-h-[96px] ${
              icon ? 'pl-10' : ''
            }`}
          />
        ) : (
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            aria-invalid={!!error}
            autoComplete={autoComplete}
            className={`w-full rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent outline-none ${
              icon ? 'pl-10' : ''
            } ${isPassword ? 'pr-11' : ''}`}
          />
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 cursor-pointer"
          >
            {mostrarSenha ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function EditarPerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Estados de controle ────────────────────────────────────────────────────
  const [verificando, setVerificando] = useState(true);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);

  // ── Foto de perfil ─────────────────────────────────────────────────────────
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [removendoFoto, setRemovendoFoto] = useState(false);
  const [confirmandoRemocaoFoto, setConfirmandoRemocaoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Cursos e Campos do formulário ──────────────────────────────────────────
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [nome, setNome] = useState('');
  const [idCurso, setIdCurso] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [erroNome, setErroNome] = useState('');

  // ── Habilidades ────────────────────────────────────────────────────────────
  const [habilidades, setHabilidades] = useState<HabilidadeNoPerfil[]>([]);
  const [buscaHabilidade, setBuscaHabilidade] = useState('');
  const [nivelParaAdicionar, setNivelParaAdicionar] = useState<NivelHabilidade>('INICIANTE');
  const [sugestoes, setSugestoes] = useState<HabilidadeResumo[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [atualizandoNivel, setAtualizandoNivel] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Estados de submissão ───────────────────────────────────────────────────
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // ── Segurança: trocar senha ────────────────────────────────────────────────
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState(false);

  // ── Zona de risco: excluir conta ───────────────────────────────────────────
  const [confirmouExclusaoCheckbox, setConfirmouExclusaoCheckbox] = useState(false);
  const [senhaExclusao, setSenhaExclusao] = useState('');
  const [excluindoConta, setExcluindoConta] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  // ── 1. Carrega cursos disponíveis ─────────────────────────────────────────
  useEffect(() => {
    listarCursos()
      .then(setCursos)
      .catch(() => {/* silencia — select ficará vazio */ });
  }, []);

  // ── 2. Verificar se o usuário logado é o dono do perfil ───────────────────
  useEffect(() => {
    obterMeuPerfilCache()
      .then((meuPerfil) => {
        if (meuPerfil.id !== id) {
          navigate(`/usuarios/${id}`, { replace: true });
          return;
        }
        setPerfil(meuPerfil);
        setNome(meuPerfil.nome ?? '');
        setIdCurso(meuPerfil.curso?.id ?? '');
        setPeriodo(meuPerfil.periodo != null ? String(meuPerfil.periodo) : '');
        setFotoUrl(meuPerfil.fotoUrl ?? null);
        setBio(meuPerfil.bio ?? '');
        setLinkedin(meuPerfil.linkedinUrl ?? '');
        setGithub(meuPerfil.githubUrl ?? '');
        setHabilidades((meuPerfil.habilidades ?? []) as HabilidadeNoPerfil[]);
      })
      .catch(() => navigate('/login', { replace: true }))
      .finally(() => setVerificando(false));
  }, [id, navigate]);

  // ── 3. Busca sugestões do catálogo (debounced 350 ms) ─────────────────────
  useEffect(() => {
    if (buscaHabilidade.trim().length < 2) {
      return;
    }
    const t = setTimeout(() => {
      setCarregandoSugestoes(true);
      const idsAtuais = new Set(habilidades.map((h) => h.habilidade.id));
      apiFetch<PaginaResposta<HabilidadeResumo>>(
        `/habilidades?busca=${encodeURIComponent(buscaHabilidade)}`,
      )
        .then((res) => setSugestoes((res.content ?? []).filter((h) => !idsAtuais.has(h.id))))
        .catch(() => setSugestoes([]))
        .finally(() => setCarregandoSugestoes(false));
    }, 350);
    return () => clearTimeout(t);
  }, [buscaHabilidade, habilidades]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSugestoes([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Upload de foto de perfil ───────────────────────────────────────────────
  async function handleFotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErroFoto(null);

    // Validação de tipo (JPG/PNG)
    const formatosPermitidos = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!formatosPermitidos.includes(file.type)) {
      setErroFoto('Selecione uma imagem válida (JPG ou PNG).');
      return;
    }

    // Validação de tamanho (máximo 2MB = 2 * 1024 * 1024 bytes)
    const limiteBytes = 2 * 1024 * 1024;
    if (file.size > limiteBytes) {
      setErroFoto('A imagem deve ter no máximo 2MB.');
      return;
    }

    setEnviandoFoto(true);
    try {
      const atualizado = await enviarFotoDePerfil(file);
      setFotoUrl(atualizado.fotoUrl ?? URL.createObjectURL(file));
      setPerfil(atualizado);
      atualizarCacheMeuPerfil(atualizado);
    } catch (err) {
      setErroFoto(
        err instanceof ApiError ? err.message : 'Falha ao enviar foto de perfil.',
      );
    } finally {
      setEnviandoFoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemoverFoto() {
    setErroFoto(null);
    setRemovendoFoto(true);
    try {
      const atualizado = await removerFotoDePerfil();
      setFotoUrl(atualizado.fotoUrl ?? null);
      setPerfil(atualizado);
      atualizarCacheMeuPerfil(atualizado);
      setConfirmandoRemocaoFoto(false);
    } catch (err) {
      setErroFoto(
        err instanceof ApiError ? err.message : 'Falha ao remover foto de perfil.',
      );
    } finally {
      setRemovendoFoto(false);
    }
  }

  // ── Handlers de habilidade ─────────────────────────────────────────────────

  function handleBuscaHabilidadeChange(valor: string) {
    setBuscaHabilidade(valor);
    if (valor.trim().length < 2) {
      setSugestoes([]);
    }
  }

  async function handleAdicionar(h: HabilidadeResumo) {
    setAdicionando(true);
    setErroGeral(null);
    try {
      const nova = await adicionarHabilidadeAoPerfil(h.id, nivelParaAdicionar);
      const novasHabilidades = [...habilidades, nova as HabilidadeNoPerfil];
      setHabilidades(novasHabilidades);
      setBuscaHabilidade('');
      setNivelParaAdicionar('INICIANTE');
      setSugestoes([]);
      atualizarHabilidadesNoCacheMeuPerfil(novasHabilidades as unknown as UsuarioPerfil['habilidades']);
    } catch (e) {
      setErroGeral(e instanceof ApiError ? e.message : 'Erro ao adicionar habilidade.');
    } finally {
      setAdicionando(false);
    }
  }

  async function handleAlterarNivel(item: HabilidadeNoPerfil, nivel: NivelHabilidade) {
    setAtualizandoNivel(item.id);
    setErroGeral(null);
    try {
      const atualizada = await atualizarNivelHabilidade(item.habilidade.id, nivel);
      const novasHabilidades = habilidades.map((h) =>
        h.id === item.id ? { ...h, nivel: atualizada.nivel } : h,
      );
      setHabilidades(novasHabilidades);
      atualizarHabilidadesNoCacheMeuPerfil(novasHabilidades as unknown as UsuarioPerfil['habilidades']);
    } catch (e) {
      setErroGeral(e instanceof ApiError ? e.message : 'Erro ao atualizar nível da habilidade.');
    } finally {
      setAtualizandoNivel(null);
    }
  }

  async function handleRemover(item: HabilidadeNoPerfil) {
    setRemovendo(item.id);
    setErroGeral(null);
    try {
      await removerHabilidadeDoPerfil(item.habilidade.id);
      const novasHabilidades = habilidades.filter((h) => h.id !== item.id);
      setHabilidades(novasHabilidades);
      atualizarHabilidadesNoCacheMeuPerfil(novasHabilidades as unknown as UsuarioPerfil['habilidades']);
    } catch (e) {
      setErroGeral(e instanceof ApiError ? e.message : 'Erro ao remover habilidade.');
    } finally {
      setRemovendo(null);
    }
  }

  // ── Handler de salvar ─────────────────────────────────────────────────────

  async function handleSalvar() {
    setErroNome('');
    setErroGeral(null);

    if (!nome.trim()) {
      setErroNome('O nome não pode ficar em branco.');
      return;
    }

    setSalvando(true);
    setSucesso(false);
    try {
      const perfilAtualizado = await atualizarMeuPerfil({
        nome: nome.trim(),
        idCurso: idCurso || undefined,
        periodo: periodo ? Number(periodo) : undefined,
        bio: bio.trim() || undefined,
        linkedinUrl: linkedin.trim() || undefined,
        githubUrl: github.trim() || undefined,
      });
      atualizarCacheMeuPerfil(perfilAtualizado);
      setSucesso(true);
      setTimeout(() => navigate(`/usuarios/${id}`), 1200);
    } catch (e) {
      setErroGeral(
        e instanceof ApiError ? e.message : 'Não foi possível salvar as alterações.',
      );
    } finally {
      setSalvando(false);
    }
  }

  // ── Handler de trocar senha ───────────────────────────────────────────────

  async function handleAlterarSenha() {
    setErroSenha(null);
    setSucessoSenha(false);

    if (!senhaAtual || !novaSenha) {
      setErroSenha('Preencha a senha atual e a nova senha.');
      return;
    }
    if (novaSenha.length < 8) {
      setErroSenha('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErroSenha('A confirmação não bate com a nova senha.');
      return;
    }

    setAlterandoSenha(true);
    try {
      await alterarMinhaSenha(senhaAtual, novaSenha);
      setSucessoSenha(true);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (e) {
      setErroSenha(e instanceof ApiError ? e.message : 'Não foi possível alterar a senha.');
    } finally {
      setAlterandoSenha(false);
    }
  }

  // ── Handler de excluir conta ──────────────────────────────────────────────

  async function handleExcluirConta() {
    setErroExclusao(null);

    if (!senhaExclusao) {
      setErroExclusao('Digite sua senha para confirmar.');
      return;
    }

    setExcluindoConta(true);
    try {
      await excluirMinhaConta(senhaExclusao);
      removerToken();
      navigate('/login', { replace: true });
    } catch (e) {
      setErroExclusao(e instanceof ApiError ? e.message : 'Não foi possível excluir a conta.');
    } finally {
      setExcluindoConta(false);
    }
  }

  // ── Render: carregando ────────────────────────────────────────────────────

  if (verificando) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!perfil) return null;

  // ── Render: formulário ────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6 py-2 pb-16">

      {/* Navegação Superior */}
      <div>
        <button
          onClick={() => navigate(`/usuarios/${id}`)}
          aria-label="Cancelar e voltar ao perfil"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-purple-400 transition-colors group cursor-pointer"
        >
          <span className="h-7 w-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-2xs group-hover:border-primary/40 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span>Cancelar e voltar</span>
        </button>
      </div>

      {/* Banner / Cabeçalho com Avatar e Upload de Foto */}
      <section className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Banner Decorativo com Gradiente em Camadas e Blobs Assimétricos */}
        <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-primary/40 via-violet-500/25 to-indigo-100/40 dark:from-primary/45 dark:via-violet-900/35 dark:to-slate-900/90 relative overflow-hidden rounded-t-2xl">
          <div className="absolute -top-10 -right-8 w-64 h-64 bg-primary/20 dark:bg-primary/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-12 w-52 h-52 bg-violet-400/20 dark:bg-[#9286FF]/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
          {/* Linha com Avatar sobrepondo o banner + Botão Alterar Foto no canto superior direito no desktop */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            {/* Avatar Circular sobreposto com Badge de Câmera (centralizado no mobile, à esquerda no desktop) */}
            <div className="flex justify-center sm:justify-start">
              <div className="relative shrink-0">
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt={nome}
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-xl bg-white dark:bg-slate-900 shrink-0"
                  />
                ) : (
                  <div
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-xl bg-gradient-to-tr from-primary via-[#6F60FA] to-[#9286FF] text-white flex items-center justify-center text-3xl font-extrabold shrink-0 select-none"
                  >
                    {formatarIniciais(nome || 'U')}
                  </div>
                )}

                {/* Badge de câmera ancorado no canto inferior direito do avatar */}
                <label
                  htmlFor="foto-perfil-input"
                  title="Alterar foto"
                  className="absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary text-white ring-2 ring-white dark:ring-slate-900 shadow-md flex items-center justify-center cursor-pointer hover:bg-[#4E3FE4] transition-all hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </label>
              </div>
            </div>

            {/* Ações: Botão Alterar Foto (centralizado no mobile, canto superior direito no desktop) */}
            <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFotoChange}
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                id="foto-perfil-input"
              />
              <label
                htmlFor="foto-perfil-input"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-[#4E3FE4] shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer w-fit ${
                  enviandoFoto ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span>{enviandoFoto ? 'Enviando foto…' : 'Alterar foto'}</span>
              </label>
              {fotoUrl && (
                <button
                  type="button"
                  onClick={() => setConfirmandoRemocaoFoto(true)}
                  disabled={enviandoFoto || removendoFoto}
                  className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Remover foto
                </button>
              )}
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium text-center sm:text-right">
                JPG ou PNG · máx. 2 MB
              </span>
              {erroFoto && (
                <p className="text-xs font-medium text-red-500 dark:text-red-400 text-center sm:text-right">{erroFoto}</p>
              )}
            </div>
          </div>

          {/* Nome / Título e Subtítulo empilhados abaixo (centralizado no mobile, alinhado à esquerda no desktop) */}
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Editar perfil
            </h1>
            <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
              Personalize suas informações acadêmicas, conexões e competências
            </p>
          </div>
        </div>
      </section>


      {/* Feedback global de erro ou sucesso */}
      {erroGeral && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200/80 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/50 px-4 py-3.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-3 shadow-xs"
        >
          <div className="h-6 w-6 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-medium">{erroGeral}</span>
        </div>
      )}

      {sucesso && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 dark:bg-emerald-950/40 dark:border-emerald-900/50 px-4 py-3.5 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-3 shadow-xs"
        >
          <div className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
          </div>
          <span className="font-medium">Perfil salvo com sucesso! Redirecionando…</span>
        </div>
      )}

      {/* ── Bloco 1: Informações Gerais do Perfil ────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] p-4 sm:p-6 md:p-8 flex flex-col gap-6">

        {/* Título de seção */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-primary dark:text-purple-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Informações Básicas</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Identificação visual e dados acadêmicos principais</p>
          </div>
        </div>

        {/* Nome Completo */}
        <LocalInput
          label="Nome completo"
          type="text"
          value={nome}
          onChange={(v) => { setNome(v); setErroNome(''); }}
          placeholder="Seu nome completo"
          required
          error={erroNome}
        />

        {/* Cursos e Período em Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Select de Curso */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Curso
            </label>
            <div className="relative rounded-xl border border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all duration-150">
              <select
                value={idCurso}
                onChange={(e) => setIdCurso(e.target.value)}
                className="w-full rounded-xl bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-100 outline-none cursor-pointer appearance-none"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                  Selecione seu curso
                </option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                    {c.nome}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Select de Período */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Período
            </label>
            <div className="relative rounded-xl border border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all duration-150">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full rounded-xl bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-100 outline-none cursor-pointer appearance-none"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                  Não informado
                </option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n} className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                    {n}º período
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <LocalInput
          label="Bio"
          type="textarea"
          value={bio}
          onChange={setBio}
          hint="Até 500 caracteres"
          placeholder="Designer apaixonada por UI/UX e design systems. Busco projetos que unam criatividade e impacto social..."
        />

        {/* Links: LinkedIn e GitHub */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LocalInput
            label="LinkedIn"
            type="url"
            value={linkedin}
            onChange={setLinkedin}
            placeholder="https://linkedin.com/in/usuario"
            icon={
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64c-.93 0-1.68.75-1.68 1.68s.75 1.68 1.68 1.68 1.68-.75 1.68-1.68-.75-1.68-1.68-1.68Z" />
              </svg>
            }
          />

          <LocalInput
            label="GitHub"
            type="url"
            value={github}
            onChange={setGithub}
            placeholder="https://github.com/usuario"
            icon={
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            }
          />
        </div>

      </section>

      {/* ── Bloco 2: Habilidades & Competências ─────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] p-4 sm:p-6 md:p-8 flex flex-col gap-6">

        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Habilidades e Conhecimentos</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Adicione e gerencie suas tecnologias dominadas e níveis de proficiência</p>
          </div>
        </div>

        {/* Seção de busca e seleção de habilidades */}
        <div className="flex flex-col gap-4">
          {/* Barra de Adicionar: Campo de busca + seletor de nível + botão "+ Adicionar" */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              {/* Campo de busca com estado isolado buscaHabilidade e proteção contra autofill de credenciais */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label htmlFor="busca-habilidade" className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Adicionar competência
                </label>
                <div className="relative flex items-center rounded-xl border border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
                  <div className="pl-3.5 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    id="busca-habilidade"
                    name="termo-busca-habilidade"
                    type="search"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={buscaHabilidade}
                    onChange={(e) => handleBuscaHabilidadeChange(e.target.value)}
                    placeholder="Adicionar habilidade..."
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  />
                </div>
              </div>

              {/* Seletor de nível */}
              <div className="sm:w-44 flex flex-col gap-1.5 shrink-0">
                <label htmlFor="nivel-habilidade-select" className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Nível
                </label>
                <div className="relative rounded-xl border border-gray-200/90 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-800/60 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
                  <select
                    id="nivel-habilidade-select"
                    value={nivelParaAdicionar}
                    onChange={(e) => setNivelParaAdicionar(e.target.value as NivelHabilidade)}
                    title="Nível de experiência da habilidade a adicionar"
                    className="w-full rounded-xl bg-transparent px-3.5 py-2.5 pr-8 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer appearance-none"
                  >
                    {NIVEIS_HABILIDADE.map((n) => (
                      <option key={n.valor} value={n.valor} className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                        {n.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Botão + Adicionar */}
              <button
                type="button"
                onClick={() => {
                  const match = sugestoes.find((s) => s.nome.toLowerCase() === buscaHabilidade.trim().toLowerCase()) || sugestoes[0];
                  if (match) {
                    handleAdicionar(match);
                  }
                }}
                disabled={adicionando || (!buscaHabilidade.trim() && sugestoes.length === 0)}
                className="h-[42px] px-5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span>Adicionar</span>
              </button>
            </div>

            {/* Dropdown de sugestões */}
            {(sugestoes.length > 0 || carregandoSugestoes) && (
              <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 backdrop-blur-md">
                {carregandoSugestoes ? (
                  <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-gray-400 dark:text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-slate-600 border-t-primary" />
                    <span>Buscando habilidades…</span>
                  </div>
                ) : (
                  sugestoes.slice(0, 8).map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleAdicionar(h); }}
                      disabled={adicionando}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-purple-300 flex items-center justify-between transition-colors disabled:opacity-50 group cursor-pointer"
                    >
                      <span className="font-medium">{h.nome}</span>
                      <span className="text-xs font-semibold text-primary dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <span>+ Adicionar</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Lista de habilidades: cada habilidade alinhada em linha própria com espaçamento consistente */}
          {habilidades.length > 0 ? (
            <div className="flex flex-col gap-2.5 pt-1">
              {habilidades.map((h) => {
                const estaRemovendo = removendo === h.id;
                const estaAtualizandoNivel = atualizandoNivel === h.id;

                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    {/* Nome e Ícone da habilidade */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">
                        {renderIconeHabilidade(h.habilidade.nome)}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {h.habilidade.nome}
                      </span>
                    </div>

                    {/* Seletor de Nível e Botão de Remover */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="relative">
                        <select
                          value={h.nivel}
                          onChange={(e) => handleAlterarNivel(h, e.target.value as NivelHabilidade)}
                          disabled={estaAtualizandoNivel || estaRemovendo}
                          aria-label={`Nível de experiência em ${h.habilidade.nome}`}
                          className="rounded-lg border border-gray-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 pr-7 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer appearance-none hover:border-gray-300 dark:hover:border-slate-600 focus:border-primary transition-colors disabled:opacity-50"
                        >
                          {NIVEIS_HABILIDADE.map((n) => (
                            <option key={n.valor} value={n.valor} className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                              {n.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemover(h)}
                        disabled={estaRemovendo || estaAtualizandoNivel}
                        title={`Remover ${h.habilidade.nome}`}
                        aria-label={`Remover ${h.habilidade.nome}`}
                        className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                      >
                        {estaRemovendo ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 p-6 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Nenhuma habilidade cadastrada ainda. Busque uma tecnologia acima para associar ao seu perfil.
              </p>
            </div>
          )}
        </div>

      </section>

      {/* ── Bloco 3: Segurança & Trocar Senha ───────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] p-4 sm:p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-primary dark:text-violet-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Segurança</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Altere a senha de acesso à sua conta</p>
          </div>
        </div>

        {erroSenha && (
          <div role="alert" className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{erroSenha}</span>
          </div>
        )}
        {sucessoSenha && (
          <div role="status" className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2.5 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
            <span className="font-medium">Senha alterada com sucesso.</span>
          </div>
        )}

        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleAlterarSenha();
          }}
          className="flex flex-col gap-6"
        >


          <div className="flex flex-col gap-4">
            {/* Senha Atual em largura completa */}
            <LocalInput
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={setSenhaAtual}
              placeholder="Digite sua senha atual"
            />

            {/* Grid com Nova Senha e Confirmação alinhadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LocalInput
                label="Nova senha"
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={setNovaSenha}
                placeholder="Mínimo 8 caracteres"
                hint="• Mínimo 8 caracteres • Letra e número"
              />
              <LocalInput
                label="Confirmar nova senha"
                type="password"
                autoComplete="new-password"
                value={confirmarNovaSenha}
                onChange={setConfirmarNovaSenha}
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={alterandoSenha}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {alterandoSenha ? 'Alterando senha…' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Bloco 4: Zona de Risco (Excluir Conta) ───────────────────────────── */}
      <section className="bg-red-50/40 dark:bg-red-950/20 rounded-2xl border border-red-200/80 dark:border-red-900/50 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.05)] p-4 sm:p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-start gap-3.5 pb-1">
          <div className="h-9 w-9 rounded-xl bg-red-100/80 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/60 dark:border-red-800/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-red-700 dark:text-red-400">
              Zona de Perigo — Excluir Conta
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              Ao excluir sua conta, todas as suas candidaturas ativas, histórico de colaboração e dados de perfil serão permanentemente desativados. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        {erroExclusao && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{erroExclusao}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-red-100 dark:border-red-950/60 p-5 flex flex-col gap-4 shadow-2xs">
          <LocalInput
            label="Digite sua senha atual para autorizar"
            type="password"
            autoComplete="current-password"
            value={senhaExclusao}
            onChange={setSenhaExclusao}
            placeholder="Sua senha de acesso"
          />

          <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={confirmouExclusaoCheckbox}
              onChange={(e) => setConfirmouExclusaoCheckbox(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300 leading-normal">
              Confirmo que desejo excluir permanentemente minha conta institucional e compreendo que meus dados não poderão ser restaurados.
            </span>
          </label>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleExcluirConta}
              disabled={excluindoConta || !confirmouExclusaoCheckbox || !senhaExclusao.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit shadow-xs flex items-center gap-2"
            >
              {excluindoConta ? 'Excluindo conta…' : 'Excluir minha conta permanentemente'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Barra Inferior de Ação: Cancelar e Salvar ───────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Alterações não salvas serão perdidas ao sair.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => navigate(`/usuarios/${id}`)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancelar e voltar
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 shadow-md shadow-slate-900/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {salvando ? (
              'Salvando…'
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                <span>Salvar alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {confirmandoRemocaoFoto && (
        <ConfirmModal
          titulo="Remover foto de perfil"
          mensagem="Tem certeza que deseja remover sua foto de perfil? Você poderá enviar uma nova a qualquer momento."
          variante="perigo"
          confirmando={removendoFoto}
          textoConfirmar="Remover foto"
          onCancelar={() => setConfirmandoRemocaoFoto(false)}
          onConfirmar={handleRemoverFoto}
        />
      )}
    </div>
  );
}
