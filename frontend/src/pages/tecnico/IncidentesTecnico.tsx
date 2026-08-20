import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiAlertTriangle, FiCalendar, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Incidente {
  id: string; dataIncidente: string; descricao: string; tipo: string; gravidade: string;
  local?: string; danos?: string; causas?: string; acoesCorretivas?: string;
  registroCAT?: boolean; numeroCAT?: string; dataNotificacao?: string;
  empresa?: { nome: string }; setor?: { nome: string }; colaborador?: { nome: string };
  inspecao?: { titulo: string };
}

interface Empresa { id: string; nome: string; }
interface Setor { id: string; nome: string; }
interface Colaborador { id: string; nome: string; }

const emptyForm = {
  data: '', descricao: '', tipo: '', gravidade: '', empresaId: '', setorId: '',
  colaboradorId: '', local: '', danos: '', causas: '', acoesCorretivas: '',
  registroCAT: '', numeroCAT: '', dataNotificacao: '',
};

const TIPOS = [
  { value: 'queda', label: 'Queda de altura' },
  { value: 'eletrico', label: 'Acidente elétrico' },
  { value: 'maquinario', label: 'Envolvimento com maquinário' },
  { value: 'quimico', label: 'Exposição a produtos químicos' },
  { value: 'ergonomico', label: 'Lesão por esforço repetitivo' },
  { value: 'deslizamento', label: 'Deslizamento / Queda de物体' },
  { value: 'atropelamento', label: 'Atropelamento' },
  { value: 'incendio', label: 'Incêndio / Explosão' },
  { value: 'afogamento', label: 'Afogamento' },
  { value: 'outro', label: 'Outro' },
];

const GRAVIDADES = [
  { value: 'leve', label: 'Leve (atestado até 15 dias)' },
  { value: 'moderada', label: 'Moderada (atestado > 15 dias)' },
  { value: 'grave', label: 'Grave (internação)' },
  { value: 'fatal', label: 'Fatal (óbito)' },
  { value: 'quase_acidente', label: 'Quase acidente (near miss)' },
];

export default function IncidentesTecnico() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); loadEmpresas(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/incidentes'); setIncidentes(data); } catch { toast.error('Erro'); }
  };

  const loadEmpresas = async () => {
    try { const { data } = await api.get('/empresas'); setEmpresas(data); } catch {}
  };

  const loadSetores = async (empresaId: string) => {
    try { const { data } = await api.get(`/setores?empresaId=${empresaId}`); setSetores(data); } catch {}
  };

  const loadColaboradores = async (empresaId: string) => {
    try {
      const { data } = await api.get('/colaboradores');
      setColaboradores(data.filter((c: any) => c.empresaId === empresaId));
    } catch {}
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleEdit = async (inc: Incidente) => {
    setForm({
      data: inc.dataIncidente ? inc.dataIncidente.slice(0, 10) : '', descricao: inc.descricao,
      tipo: inc.tipo, gravidade: inc.gravidade,
      empresaId: empresas.find(e => e.nome === inc.empresa?.nome)?.id || '',
      setorId: '', colaboradorId: '',
      local: inc.local || '', danos: inc.danos || '', causas: inc.causas || '',
      acoesCorretivas: inc.acoesCorretivas || '',
      registroCAT: inc.registroCAT ? 'sim' : 'nao', numeroCAT: inc.numeroCAT || '',
      dataNotificacao: inc.dataNotificacao ? inc.dataNotificacao.slice(0, 10) : '',
    });
    setEditingId(inc.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) return toast.error('Descrição é obrigatória');
    if (!form.tipo) return toast.error('Tipo é obrigatório');
    if (!form.gravidade) return toast.error('Gravidade é obrigatória');
    if (!form.empresaId) return toast.error('Empresa é obrigatória');
    if (!form.data) return toast.error('Data é obrigatória');
    setLoading(true);
    try {
      const payload: any = {
        dataIncidente: form.data, descricao: form.descricao.trim(), tipo: form.tipo,
        gravidade: form.gravidade, empresaId: form.empresaId,
        setorId: form.setorId || null, colaboradoresEnvolvidos: form.colaboradorId || null,
        localIncidente: form.local || null, danos: form.danos || null, causas: form.causas || null,
        acoesCorretivas: form.acoesCorretivas || null,
        catNumero: form.numeroCAT || null,
        catData: form.dataNotificacao || null,
      };
      if (editingId) {
        await api.put(`/incidentes/${editingId}`, payload);
        toast.success('Atualizado!');
      } else {
        await api.post('/incidentes', payload);
        toast.success('Incidente registrado!');
      }
      resetForm(); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este incidente?')) return;
    try { await api.delete(`/incidentes/${id}`); toast.success('Excluído!'); load(); } catch { toast.error('Erro'); }
  };

  const gravidadeColors: Record<string, string> = {
    leves: 'bg-amber-100 text-amber-700',
    moderada: 'bg-orange-100 text-orange-700',
    grave: 'bg-danger-100 text-danger-700',
    fatal: 'bg-red-600 text-white',
    quase_acidente: 'bg-navy-100 text-navy-700',
  };

  const gravidadeLabels: Record<string, string> = {
    leves: 'Leve', moderada: 'Moderada', grave: 'Grave', fatal: 'Fatal', quase_acidente: 'Near Miss',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Incidentes</h1>
          <p className="mt-1 text-sm text-navy-500">{incidentes.length} registro(s)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <FiPlus size={18} /> Novo Incidente
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">{editingId ? 'Editar Incidente' : 'Novo Incidente'}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Data *</label>
                  <input type="date" className="input-field w-full" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Tipo *</label>
                  <select className="input-field w-full" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="">Selecione...</option>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Gravidade *</label>
                  <select className="input-field w-full" value={form.gravidade} onChange={e => setForm({ ...form, gravidade: e.target.value })}>
                    <option value="">Selecione...</option>
                    {GRAVIDADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Empresa *</label>
                  <select className="input-field w-full" value={form.empresaId} onChange={e => {
                    setForm({ ...form, empresaId: e.target.value, setorId: '', colaboradorId: '' });
                    loadSetores(e.target.value); loadColaboradores(e.target.value);
                  }}>
                    <option value="">Selecione...</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Setor</label>
                  <select className="input-field w-full" value={form.setorId} onChange={e => setForm({ ...form, setorId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Colaborador</label>
                  <select className="input-field w-full" value={form.colaboradorId} onChange={e => setForm({ ...form, colaboradorId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Local</label>
                  <input type="text" className="input-field w-full" placeholder="Ex: Cobertura" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Descrição *</label>
                  <textarea className="input-field w-full" rows={3} placeholder="Descreva o incidente..." value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Danos</label>
                  <textarea className="input-field w-full" rows={2} value={form.danos} onChange={e => setForm({ ...form, danos: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Causas Prováveis</label>
                  <textarea className="input-field w-full" rows={2} value={form.causas} onChange={e => setForm({ ...form, causas: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Ações Corretivas</label>
                  <textarea className="input-field w-full" rows={2} value={form.acoesCorretivas} onChange={e => setForm({ ...form, acoesCorretivas: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Registro CAT?</label>
                  <select className="input-field w-full" value={form.registroCAT} onChange={e => setForm({ ...form, registroCAT: e.target.value })}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </div>
                {form.registroCAT === 'sim' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-navy-700">Nº CAT</label>
                      <input type="text" className="input-field w-full" value={form.numeroCAT} onChange={e => setForm({ ...form, numeroCAT: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-navy-700">Data Notificação</label>
                      <input type="date" className="input-field w-full" value={form.dataNotificacao} onChange={e => setForm({ ...form, dataNotificacao: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
              <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Registrar Incidente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {incidentes.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-100"><FiAlertTriangle className="text-navy-400" size={28} /></div>
          <p className="text-lg font-bold text-navy-900">Nenhum incidente registrado</p>
          <p className="mt-1 text-sm text-navy-400">Registre acidentes, quase-acidentes e CATs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidentes.map(inc => (
            <div key={inc.id} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-500 text-white"><FiAlertTriangle size={18} /></div>
                  <div>
                    <h3 className="font-bold text-white">{inc.descricao.slice(0, 60)}{inc.descricao.length > 60 ? '...' : ''}</h3>
                    <p className="text-xs text-amber-300">{inc.empresa?.nome} · {new Date(inc.dataIncidente).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gravidadeColors[inc.gravidade] || 'bg-navy-100 text-navy-500'}`}>
                  {gravidadeLabels[inc.gravidade] || inc.gravidade}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex gap-2 text-xs text-navy-500">
                  {inc.registroCAT && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700"><FiFileText size={10} /> CAT {inc.numeroCAT || ''}</span>}
                  {inc.local && <span>📍 {inc.local}</span>}
                  {inc.colaborador && <span>👤 {inc.colaborador.nome}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(inc)} className="flex items-center justify-center rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50"><FiEdit2 size={12} /></button>
                  <button onClick={() => handleDelete(inc.id)} className="flex items-center justify-center rounded-xl border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50"><FiTrash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
