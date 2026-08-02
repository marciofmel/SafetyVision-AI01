import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

export default function ConfigTecnico() {
  const { user } = useAuth();
  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [senha, setSenha] = useState('');

  useEffect(() => { setNome(user?.nome || ''); setEmail(user?.email || ''); }, [user]);

  const handleSave = async () => {
    try {
      const payload: any = { nome, email };
      if (senha) payload.senha = senha;
      await api.put(`/auth/me`, payload);
      toast.success('Perfil atualizado!');
      setSenha('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900 sm:text-3xl">Configurações</h1>
      <div className="card p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-bold text-navy-900">Meu Perfil</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-navy-600">Nome</label>
            <input className="input-field w-full" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-navy-600">Email</label>
            <input className="input-field w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-navy-600">Nova senha (deixe vazio para manter)</label>
            <input type="password" className="input-field w-full" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
        </div>
        <button onClick={handleSave} className="btn-primary mt-4"><FiSave size={16} /> Salvar Alterações</button>
      </div>
    </div>
  );
}
