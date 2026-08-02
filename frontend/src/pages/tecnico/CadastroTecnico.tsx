import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiShield, FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CadastroTecnico() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/tecnico');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) return toast.error('As senhas não conferem');
    if (senha.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres');
    setLoading(true);
    try {
      await register({ nome, email, senha, cargo: 'Técnico' });
      toast.success('Cadastro realizado! Bem-vindo!');
      navigate('/tecnico');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-500/20 backdrop-blur-sm">
            <FiShield className="text-amber-400" size={48} />
          </div>
          <h1 className="mb-4 text-4xl font-extrabold text-white">
            Safety<span className="text-amber-400">Vision</span> AI
          </h1>
          <p className="mb-8 text-lg text-navy-300">
            Cadastre-se como técnico SST e comece a realizar inspeções
          </p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: '99%', label: 'Precisão' },
              { value: '<5s', label: 'Análise' },
              { value: '24/7', label: 'Disponível' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-amber-400">{s.value}</p>
                <p className="text-xs text-navy-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-navy-50 p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/tecnico/login')} className="mb-6 flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700">
            <FiArrowLeft size={16} /> Voltar ao login
          </button>

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900">
              <FiShield className="text-amber-400" size={24} />
            </div>
            <span className="text-xl font-bold text-navy-900">SafetyVision</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-900">Cadastro de Técnico</h2>
            <p className="mt-2 text-sm text-navy-500">Preencha seus dados para começar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">Nome completo</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="input-field pl-11" placeholder="Seu nome completo" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">E-mail</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field pl-11" placeholder="seu@email.com" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">Senha</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                <input type={showPassword ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required className="input-field pl-11 pr-11" placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500">
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">Confirmar senha</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                <input type={showPassword ? 'text' : 'password'} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required className="input-field pl-11 pr-11" placeholder="Repita a senha" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Cadastrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-navy-500">
              Já tem conta?{' '}
              <button onClick={() => navigate('/tecnico/login')} className="font-semibold text-amber-600 hover:text-amber-700">
                Entrar
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
