import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Colaborador { id: string; nome: string; cargo: string; setorId: string; empresaId: string; setor?: { nome: string }; ativo: boolean; }
interface Setor { id: string; nome: string; empresaId: string; }
interface Empresa { id: string; nome: string; }

export default function ColaboradoresAdmin() {
  const [colabs, setColabs] = useState<Colaborador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', cargo: '', setorId: '', empresaId: '' });
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/colaboradores').catch(() => ({ data: [] })),
      api.get('/empresas').catch(() => ({ data: [] })),
      api.get('/setores').catch(() => ({ data: [] })),
    ]).then(([c, e, s]) => { setColabs(c.data); setEmpresas(e.data); setSetores(s.data); });
  }, []);

  const load = () => api.get('/colaboradores').then(({ data }) => setColabs(data)).catch(() => {});

  const handleSave = async (id?: string) => {
    try {
      if (id) { await api.put(`/colaboradores/${id}`, form); toast.success('Colaborador atualizado!'); }
      else { await api.post('/colaboradores', form); toast.success('Colaborador criado!'); }
      setShowNew(false); setEditingId(null); setForm({ nome: '', cargo: '', setorId: '', empresaId: '' }); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/colaboradores/${id}`); toast.success('Colaborador removido!'); load(); } catch { toast.error('Erro ao remover'); }
  };

  const FormRow = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <tr className="bg-amber-50">
      <td className="p-3"><input className="input-field w-full" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></td>
      <td className="p-3"><input className="input-field w-full" placeholder="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></td>
      <td className="p-3">
        <select className="input-field w-full" value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
          <option value="">Empresa</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </td>
      <td className="p-3">
        <select className="input-field w-full" value={form.setorId} onChange={(e) => setForm({ ...form, setorId: e.target.value })}>
          <option value="">Setor</option>
          {setores.filter((s) => !form.empresaId || s.empresaId === form.empresaId).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
          <h1 className="text-3xl font-extrabold text-navy-900">Colaboradores</h1>
          <p className="mt-1 text-sm text-navy-500">{colabs.length} colaboradores cadastrados</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ nome: '', cargo: '', setorId: '', empresaId: '' }); }} className="btn-primary bg-amber-500 hover:bg-amber-600 text-navy-900">
          <FiPlus size={18} /> Novo Colaborador
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Cargo</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Setor</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {showNew && <FormRow onSave={() => handleSave()} onCancel={() => setShowNew(false)} />}
            {colabs.map((c) => (
              editingId === c.id ? (
                <FormRow key={c.id} onSave={() => handleSave(c.id)} onCancel={() => setEditingId(null)} />
              ) : (
                <tr key={c.id} className="border-b border-navy-50 transition-colors hover:bg-navy-50/50">
                  <td className="px-4 py-3 text-sm font-semibold text-navy-900">{c.nome}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{c.cargo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{empresas.find((e) => e.id === c.empresaId)?.nome || '—'}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{c.setor?.nome || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(c.id); setForm({ nome: c.nome, cargo: c.cargo || '', setorId: c.setorId || '', empresaId: c.empresaId }); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-700"><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
        {colabs.length === 0 && <div className="p-12 text-center"><p className="text-sm text-navy-500">Nenhum colaborador cadastrado</p></div>}
      </div>
    </div>
  );
}
