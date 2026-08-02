import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiShield, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/admin');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, senha);
      toast.success('Bem-vindo, Administrador!');
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm sm:h-24 sm:w-24">
            <FiShield className="text-white" size={40} />
          </div>
          <h1 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl">
            Painel <span className="text-navy-900">Admin</span>
          </h1>
          <p className="mb-8 text-lg text-white/80">
            Gerencie empresas, setores, colaboradores e inspeções
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-navy-50 p-6 sm:p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
              <FiShield className="text-navy-900" size={24} />
            </div>
            <span className="text-xl font-bold text-navy-900">Admin</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-900">Painel Administrativo</h2>
            <p className="mt-2 text-sm text-navy-500">Acesse o painel de gerenciamento</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">E-mail</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field pl-11" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">Senha</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                <input type={showPassword ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required className="input-field pl-11 pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500">
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {email === 'admin@safetyvision.com' && (
              <button type="submit" disabled={loading} className="btn-primary w-full bg-amber-500 hover:bg-amber-600 text-navy-900">
                {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" /> : 'Entrar no Admin'}
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-navy-500">
              Técnico?{' '}
              <button onClick={() => navigate('/tecnico/login')} className="font-semibold text-amber-600 hover:text-amber-700">
                Acessar Painel Técnico
              </button>
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-navy-100 bg-white p-4">
            <p className="mb-1 text-xs font-semibold text-navy-400">Dica</p>
            <p className="text-xs text-navy-600">Digite o email do administrador para acessar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
