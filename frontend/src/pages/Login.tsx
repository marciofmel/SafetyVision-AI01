import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiShield, FiMail, FiLock, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register({ nome, email, senha });
      } else {
        await login(email, senha);
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white"><FiShield size={32} /></div>
          <h1 className="mt-4 text-3xl font-bold text-white">SafetyVision AI</h1>
          <p className="mt-1 text-sm text-white/70">Segurança e Saúde no Trabalho com IA</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">{isRegister ? 'Criar Conta' : 'Entrar'}</h2>
          {isRegister && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-3 text-gray-400" />
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" placeholder="Seu nome" />
              </div>
            </div>
          )}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" placeholder="seu@email.com" />
            </div>
          </div>
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-400" />
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Carregando...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
          <p className="mt-4 text-center text-sm text-gray-500">
            {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="font-medium text-primary-600 hover:underline">
              {isRegister ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
          {!isRegister && (
            <p className="mt-2 text-center text-xs text-gray-400">Admin: admin@safetyvision.com / Admin@123</p>
          )}
        </form>
      </div>
    </div>
  );
}
