import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface User { id: string; nome: string; email: string; cargo: string; ativo: boolean; createdAt: string; }

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: 'Técnico' });
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, []);

  const load = () => api.get('/usuarios').then(({ data }) => setUsers(data)).catch(() => {});

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        await api.put(`/usuarios/${id}`, { nome: form.nome, email: form.email, cargo: form.cargo });
        toast.success('Usuário atualizado!');
      } else {
        await api.post('/auth/register', form);
        toast.success('Usuário criado!');
      }
      setShowNew(false); setEditingId(null); setForm({ nome: '', email: '', senha: '', cargo: 'Técnico' }); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/usuarios/${id}`); toast.success('Usuário removido!'); load(); } catch { toast.error('Erro ao remover'); }
  };

  const FormRow = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <tr className="bg-amber-50">
      <td className="p-3"><input className="input-field w-full" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></td>
      <td className="p-3"><input className="input-field w-full" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></td>
      <td className="p-3"><input className="input-field w-full" type="password" placeholder="Senha" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></td>
      <td className="p-3">
        <select className="input-field w-full" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}>
          <option value="Técnico">Técnico</option>
          <option value="Admin">Admin</option>
        </select>
      </td>
      <td className="p-3">
        <div className="flex gap-2">
          <button onClick={onSave} className="rounded-lg bg-success-600 p-2 text-white hover:bg-success-700"><FiSave size={14} /></button>
          <button onClick={onCancel} className="rounded-lg bg-navy-200 p-2 text-navy-600 hover:bg-navy-300"><FiX size={14} /></button>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Usuários</h1>
          <p className="mt-1 text-sm text-navy-500">{users.length} usuários cadastrados</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ nome: '', email: '', senha: '', cargo: 'Técnico' }); }} className="btn-primary bg-amber-500 hover:bg-amber-600 text-navy-900">
          <FiPlus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Cargo</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Criado em</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {showNew && <FormRow onSave={() => handleSave()} onCancel={() => setShowNew(false)} />}
            {users.map((u) => (
              editingId === u.id ? (
                <FormRow key={u.id} onSave={() => handleSave(u.id)} onCancel={() => setEditingId(null)} />
              ) : (
                <tr key={u.id} className="border-b border-navy-50 transition-colors hover:bg-navy-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600">
                        {u.nome?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-navy-900">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-navy-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${u.cargo === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-navy-100 text-navy-700'}`}>
                      {u.cargo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-navy-600">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(u.id); setForm({ nome: u.nome, email: u.email, senha: '', cargo: u.cargo }); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-700"><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(u.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-12 text-center"><p className="text-sm text-navy-500">Nenhum usuário cadastrado</p></div>}
      </div>
    </div>
  );
}
