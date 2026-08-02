import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Empresa { id: string; nome: string; cnpj: string; endereco: string; telefone: string; email: string; ativo: boolean; }

export default function EmpresasAdmin() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' });
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, []);
  const load = () => api.get('/empresas').then(({ data }) => setEmpresas(data)).catch(() => {});

  const handleSave = async (id?: string) => {
    try {
      if (id) { await api.put(`/empresas/${id}`, form); toast.success('Empresa atualizada!'); }
      else { await api.post('/empresas', form); toast.success('Empresa criada!'); }
      setShowNew(false); setEditingId(null); setForm({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' }); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/empresas/${id}`); toast.success('Empresa removida!'); load(); } catch { toast.error('Erro ao remover'); }
  };

  const FormFields = () => (
    <div className="space-y-3">
      <input className="input-field w-full" placeholder="Nome da Empresa *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      <input className="input-field w-full" placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
      <input className="input-field w-full" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
      <input className="input-field w-full" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="input-field w-full" placeholder="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Empresas</h1>
          <p className="mt-1 text-sm text-navy-500">{empresas.length} empresas cadastradas</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' }); }} className="btn-primary bg-amber-500 hover:bg-amber-600 text-navy-900">
          <FiPlus size={18} /> Nova Empresa
        </button>
      </div>

      {/* New form */}
      {showNew && (
        <div className="card mb-6 p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-navy-900">Nova Empresa</h3>
          <FormFields />
          <div className="mt-4 flex gap-2">
            <button onClick={() => handleSave()} className="btn-primary bg-success-600 hover:bg-success-700"><FiSave size={16} /> Salvar</button>
            <button onClick={() => setShowNew(false)} className="btn-primary bg-navy-200 text-navy-700 hover:bg-navy-300"><FiX size={16} /> Cancelar</button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="card hidden overflow-hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">CNPJ</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Telefone</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              editingId === e.id ? (
                <tr key={e.id} className="bg-amber-50">
                  <td className="p-3"><input className="input-field w-full" value={form.nome} onChange={(ev) => setForm({ ...form, nome: ev.target.value })} /></td>
                  <td className="p-3"><input className="input-field w-full" value={form.cnpj} onChange={(ev) => setForm({ ...form, cnpj: ev.target.value })} /></td>
                  <td className="p-3"><input className="input-field w-full" value={form.telefone} onChange={(ev) => setForm({ ...form, telefone: ev.target.value })} /></td>
                  <td className="p-3"><input className="input-field w-full" value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} /></td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(e.id)} className="rounded-lg bg-success-600 p-2 text-white"><FiSave size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg bg-navy-200 p-2 text-navy-600"><FiX size={14} /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={e.id} className="border-b border-navy-50 hover:bg-navy-50/50">
                  <td className="px-4 py-3 text-sm font-semibold text-navy-900">{e.nome}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{e.cnpj || '—'}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{e.telefone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{e.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(e.id); setForm({ nome: e.nome, cnpj: e.cnpj || '', endereco: e.endereco || '', telefone: e.telefone || '', email: e.email || '' }); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-700"><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(e.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {empresas.length === 0 ? (
          <div className="card p-8 text-center"><FiBriefcase className="mx-auto mb-3 text-navy-300" size={32} /><p className="text-sm text-navy-500">Nenhuma empresa cadastrada</p></div>
        ) : empresas.map((e) => (
          <div key={e.id} className="card p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-bold text-navy-900">{e.nome}</p>
                {e.cnpj && <p className="text-xs text-navy-500">CNPJ: {e.cnpj}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingId(e.id); setForm({ nome: e.nome, cnpj: e.cnpj || '', endereco: e.endereco || '', telefone: e.telefone || '', email: e.email || '' }); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiEdit2 size={14} /></button>
                <button onClick={() => handleDelete(e.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
              </div>
            </div>
            <div className="space-y-1 text-xs text-navy-500">
              {e.telefone && <p>Tel: {e.telefone}</p>}
              {e.email && <p>Email: {e.email}</p>}
            </div>
            {editingId === e.id && (
              <div className="mt-3 border-t border-navy-100 pt-3">
                <FormFields />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleSave(e.id)} className="btn-primary flex-1 bg-success-600"><FiSave size={14} /> Salvar</button>
                  <button onClick={() => setEditingId(null)} className="btn-primary bg-navy-200 text-navy-700"><FiX size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
