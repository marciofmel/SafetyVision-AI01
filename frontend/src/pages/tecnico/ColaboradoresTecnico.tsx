import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Colaborador { id: string; nome: string; cargo: string; setorId: string; empresaId: string; setor?: { nome: string }; }
interface Empresa { id: string; nome: string; }
interface Setor { id: string; nome: string; empresaId: string; }

export default function ColaboradoresTecnico() {
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
      if (id) { await api.put(`/colaboradores/${id}`, form); toast.success('Atualizado!'); }
      else { await api.post('/colaboradores', form); toast.success('Colaborador criado!'); }
      setShowNew(false); setEditingId(null); setForm({ nome: '', cargo: '', setorId: '', empresaId: '' }); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/colaboradores/${id}`); toast.success('Removido!'); load(); } catch { toast.error('Erro'); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Colaboradores</h1>
          <p className="mt-1 text-sm text-navy-500">{colabs.length} colaboradores cadastrados</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ nome: '', cargo: '', setorId: '', empresaId: '' }); }} className="btn-primary">
          <FiPlus size={18} /> Novo Colaborador
        </button>
      </div>

      {showNew && (
        <div className="card mb-6 p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-navy-900">{editingId ? 'Editar' : 'Novo'} Colaborador</h3>
          <div className="space-y-3">
            <input className="input-field w-full" placeholder="Nome completo *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <input className="input-field w-full" placeholder="Cargo (ex: Soldador, Eletricista)" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select className="input-field" value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
                <option value="">Selecione a empresa</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <select className="input-field" value={form.setorId} onChange={(e) => setForm({ ...form, setorId: e.target.value })}>
                <option value="">Selecione o setor</option>
                {setores.filter((s) => !form.empresaId || s.empresaId === form.empresaId).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => handleSave(editingId || undefined)} className="btn-primary bg-success-600 hover:bg-success-700"><FiSave size={16} /> Salvar</button>
            <button onClick={() => { setShowNew(false); setEditingId(null); }} className="btn-primary bg-navy-200 text-navy-700 hover:bg-navy-300"><FiX size={16} /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {colabs.length === 0 ? (
          <div className="card p-12 text-center"><p className="text-sm text-navy-500">Nenhum colaborador cadastrado</p></div>
        ) : colabs.map((c) => (
          <div key={c.id} className="card p-4 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-600">{c.nome?.charAt(0)?.toUpperCase()}</div>
                  <div>
                    <p className="font-bold text-navy-900">{c.nome}</p>
                    {c.cargo && <p className="text-xs text-navy-500">{c.cargo}</p>}
                    {c.setor?.nome && <p className="text-xs text-navy-400">Setor: {c.setor.nome}</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingId(c.id); setForm({ nome: c.nome, cargo: c.cargo || '', setorId: c.setorId || '', empresaId: c.empresaId }); setShowNew(true); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiEdit2 size={14} /></button>
                <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
