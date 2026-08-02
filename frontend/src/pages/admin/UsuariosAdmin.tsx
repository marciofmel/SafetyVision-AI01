import { useEffect, useState, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiCamera, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface User { id: string; nome: string; email: string; cargo: string; foto?: string | null; ativo: boolean; createdAt: string; }

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: 'Técnico', foto: '' });
  const [showNew, setShowNew] = useState(false);
  const [preview, setPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = () => api.get('/usuarios').then(({ data }) => setUsers(data)).catch(() => {});

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { toast.error('Imagem muito grande (máx 500KB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setForm({ ...form, foto: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        await api.put(`/usuarios/${id}`, { nome: form.nome, email: form.email, cargo: form.cargo, foto: form.foto || null });
        toast.success('Usuário atualizado!');
      } else {
        await api.post('/usuarios', form);
        toast.success('Usuário criado!');
      }
      setShowNew(false); setEditingId(null); setForm({ nome: '', email: '', senha: '', cargo: 'Técnico', foto: '' }); setPreview(''); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/usuarios/${id}`); toast.success('Usuário removido!'); load(); } catch { toast.error('Erro ao remover'); }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ nome: u.nome, email: u.email, senha: '', cargo: u.cargo, foto: u.foto || '' });
    setPreview(u.foto || '');
    setShowNew(true);
  };

  const Avatar = ({ src, name }: { src?: string | null; name: string }) => (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-navy-900 overflow-hidden">
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name?.charAt(0)?.toUpperCase()}
    </div>
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Usuários</h1>
          <p className="mt-1 text-sm text-navy-500">{users.length} usuários cadastrados</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ nome: '', email: '', senha: '', cargo: 'Técnico', foto: '' }); setPreview(''); }} className="btn-primary bg-amber-500 hover:bg-amber-600 text-navy-900">
          <FiPlus size={18} /> Novo Usuário
        </button>
      </div>

      {/* Formulário modal */}
      {showNew && (
        <div className="card mb-6 p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-navy-900">{editingId ? 'Editar' : 'Novo'} Usuário</h3>
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Foto */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-dashed border-navy-200 bg-navy-50 overflow-hidden transition-colors hover:border-amber-400"
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <FiCamera className="text-navy-300" size={28} />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button onClick={() => fileRef.current?.click()} className="text-xs font-medium text-amber-600 hover:text-amber-700">
                Escolher foto
              </button>
            </div>

            {/* Campos */}
            <div className="flex-1 space-y-3">
              <input className="input-field w-full" placeholder="Nome completo *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <input className="input-field w-full" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <div className="relative">
                <input className="input-field w-full pr-10" type={showPassword ? 'text' : 'password'} placeholder={editingId ? "Nova senha (vazio = manter)" : "Senha *"} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500">
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              <select className="input-field w-full" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}>
                <option value="Técnico">Técnico</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => handleSave(editingId || undefined)} className="btn-primary bg-success-600 hover:bg-success-700"><FiSave size={16} /> Salvar</button>
            <button onClick={() => { setShowNew(false); setEditingId(null); setPreview(''); }} className="btn-primary bg-navy-200 text-navy-700 hover:bg-navy-300"><FiX size={16} /> Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="card p-12 text-center"><p className="text-sm text-navy-500">Nenhum usuário cadastrado</p></div>
        ) : users.map((u) => (
          <div key={u.id} className="card flex items-center gap-4 p-4 transition-all hover:shadow-md">
            <Avatar src={u.foto} name={u.nome} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-navy-900">{u.nome}</p>
              <p className="text-xs text-navy-500">{u.email}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${u.cargo === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-navy-100 text-navy-700'}`}>
              {u.cargo}
            </span>
            <span className="text-xs text-navy-400 hidden sm:block">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</span>
            <div className="flex gap-1">
              <button onClick={() => startEdit(u)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-700"><FiEdit2 size={14} /></button>
              <button onClick={() => handleDelete(u.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
