import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Setor { id: string; nome: string; descricao: string; empresaId: string; empresa?: { nome: string }; ativo: boolean; }
interface Empresa { id: string; nome: string; }

export default function SetoresAdmin() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', empresaId: '' });
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/admin-data/setores').catch(() => ({ data: [] })),
      api.get('/admin-data/empresas').catch(() => ({ data: [] })),
    ]).then(([s, e]) => { setSetores(s.data); setEmpresas(e.data); });
  }, []);

  const load = () => api.get('/admin-data/setores').then(({ data }) => setSetores(data)).catch(() => {});

  const handleSave = async (id?: string) => {
    try {
      if (id) { await api.put(`/admin-data/setores/${id}`, form); toast.success('Setor atualizado!'); }
      else { await api.post('/admin-data/setores', form); toast.success('Setor criado!'); }
      setShowNew(false); setEditingId(null); setForm({ nome: '', descricao: '', empresaId: '' }); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/admin-data/setores/${id}`); toast.success('Setor removido!'); load(); } catch { toast.error('Erro ao remover'); }
  };

  const formRow = (
    <tr className="bg-amber-50">
      <td className="p-3"><input className="input-field w-full" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></td>
      <td className="p-3"><input className="input-field w-full" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></td>
      <td className="p-3">
        <select className="input-field w-full" value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
          <option value="">Selecione</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </td>
      <td className="p-3">
        <div className="flex gap-2">
          <button onClick={() => handleSave(editingId ?? undefined)} className="rounded-lg bg-success-600 p-2 text-white hover:bg-success-700"><FiSave size={14} /></button>
          <button onClick={() => { setShowNew(false); setEditingId(null); }} className="rounded-lg bg-navy-200 p-2 text-navy-600 hover:bg-navy-300"><FiX size={14} /></button>
        </div>
      </td>
    </tr>
  );

  const showFormRow = showNew;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Setores</h1>
          <p className="mt-1 text-sm text-navy-500">{setores.length} setores cadastrados</p>
        </div>
        <button onClick={() => { setShowNew(true); setEditingId(null); setForm({ nome: '', descricao: '', empresaId: '' }); }} className="btn-primary bg-amber-500 hover:bg-amber-600 text-navy-900">
          <FiPlus size={18} /> Novo Setor
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Descrição</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {showFormRow && formRow}
            {setores.map((s) => (
              editingId === s.id ? (
                <tr key={s.id} className="bg-amber-50">
                  <td className="p-3"><input className="input-field w-full" defaultValue={s.nome} key={`n-${s.id}`} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></td>
                  <td className="p-3"><input className="input-field w-full" placeholder="Descrição" defaultValue={s.descricao || ''} key={`d-${s.id}`} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></td>
                  <td className="p-3">{s.empresa?.nome || '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(s.id)} className="rounded-lg bg-success-600 p-2 text-white hover:bg-success-700"><FiSave size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg bg-navy-200 p-2 text-navy-600 hover:bg-navy-300"><FiX size={14} /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-b border-navy-50 transition-colors hover:bg-navy-50/50">
                  <td className="px-4 py-3 text-sm font-semibold text-navy-900">{s.nome}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{s.descricao || '—'}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{s.empresa?.nome || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(s.id); setForm({ nome: s.nome, descricao: s.descricao || '', empresaId: s.empresaId }); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-700"><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(s.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
        {setores.length === 0 && <div className="p-12 text-center"><p className="text-sm text-navy-500">Nenhum setor cadastrado</p></div>}
      </div>
    </div>
  );
}
