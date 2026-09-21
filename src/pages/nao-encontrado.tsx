import { Link } from 'react-router-dom';

export default function NaoEncontrado() {
  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-slate-950 font-sans flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-10 text-center">
        <p className="text-6xl font-extrabold text-[#183E6C] dark:text-blue-300 mb-2">404</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Página não encontrada</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          O endereço acessado não existe ou foi movido.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white bg-[#183E6C] hover:bg-[#102a4a] transition-colors"
        >
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
