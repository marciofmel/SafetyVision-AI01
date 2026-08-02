import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiSave, FiCamera, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

export default function ConfigTecnico() {
  const { user, updateUser } = useAuth();
  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [senha, setSenha] = useState('');
  const [foto, setFoto] = useState(user?.foto || '');
  const [preview, setPreview] = useState(user?.foto || '');
  const [showPassword, setShowPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNome(user?.nome || ''); setEmail(user?.email || ''); setFoto(user?.foto || ''); setPreview(user?.foto || ''); }, [user]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { toast.error('Imagem muito grande (máx 500KB)'); return; }
    const reader = new FileReader();
    reader.onload = () => { const r = reader.result as string; setPreview(r); setFoto(r); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      const payload: any = { nome, email };
      if (senha) payload.senha = senha;
      if (foto !== undefined) payload.foto = foto || null;
      const { data } = await api.put('/auth/me', payload);
      updateUser(data);
      setSenha('');
      toast.success('Perfil atualizado!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900 sm:text-3xl">Configurações</h1>
      <div className="card p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-bold text-navy-900">Meu Perfil</h3>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative">
            <div
              className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-dashed border-navy-200 bg-navy-50 overflow-hidden transition-colors hover:border-amber-400"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <FiCamera className="text-navy-300" size={28} />}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-lg font-bold text-navy-900">{user?.nome}</p>
            <p className="text-sm text-navy-500">{user?.email}</p>
            <button onClick={() => fileRef.current?.click()} className="mt-1 text-xs font-medium text-amber-600 hover:text-amber-700">
              Alterar foto
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
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
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} className="input-field w-full pr-10" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500">
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <button onClick={handleSave} className="btn-primary mt-4"><FiSave size={16} /> Salvar Alterações</button>
      </div>
    </div>
  );
}
