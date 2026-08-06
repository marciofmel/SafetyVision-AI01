import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiBook, FiCalendar, FiUsers, FiCheckCircle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Treinamento {
  id: string; nome: string; nr?: string; descricao?: string; cargaHoraria?: number;
  dataInicio: string; dataFim?: string; local?: string; instrutor?: string; status: string;
  empresaId?: string; empresa?: { nome: string }; participacoes?: any[];
}

interface Empresa { id: string; nome: string; }
interface Colaborador { id: string; nome: string; }

const emptyForm = {
  nome: '', nr: '', descricao: '', cargaHoraria: '', empresaId: '', dataInicio: '', dataFim: '',
  local: '', instrutor: '',
};

const NR_OPTIONS = ['NR01','NR04','NR05','NR06','NR07','NR10','NR12','NR15','NR17','NR20','NR23','NR33','NR35'];

export default function TreinamentosTecnico() {
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showParticipantes, setShowParticipantes] = useState<Treinamento | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); loadEmpresas(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/treinamentos'); setTreinamentos(data); } catch { toast.error('Erro'); }
  };

  const loadEmpresas = async () => {
    try { const { data } = await api.get('/empresas'); setEmpresas(data); } catch {}
  };

  const loadColaboradores = async (empresaId: string) => {
    try {
      const { data } = await api.get('/colaboradores');
      setColaboradores(data.filter((c: any) => c.empresaId === empresaId));
    } catch {}
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleEdit = async (t: Treinamento) => {
    setForm({
      nome: t.nome, nr: t.nr || '', descricao: t.descricao || '',
      cargaHoraria: t.cargaHoraria?.toString() || '',
      empresaId: empresas.find(e => e.nome === t.empresa?.nome)?.id || '',
      dataInicio: t.dataInicio ? t.dataInicio.slice(0, 10) : '',
      dataFim: t.dataFim ? t.dataFim.slice(0, 10) : '',
      local: t.local || '', instrutor: t.instrutor || '',
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório');
    if (!form.empresaId) return toast.error('Empresa é obrigatória');
    if (!form.dataInicio) return toast.error('Data de início é obrigatória');
    setLoading(true);
    try {
      const payload: any = {
        nome: form.nome.trim(), nr: form.nr || null, descricao: form.descricao || null,
        cargaHoraria: form.cargaHoraria ? parseInt(form.cargaHoraria) : null,
        empresaId: form.empresaId, dataInicio: form.dataInicio, dataFim: form.dataFim || null,
        local: form.local || null, instrutor: form.instrutor || null,
      };
      if (editingId) {
        await api.put(`/treinamentos/${editingId}`, payload);
        toast.success('Atualizado!');
      } else {
        await api.post('/treinamentos', payload);
        toast.success('Criado!');
      }
      resetForm(); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return;
    try { await api.delete(`/treinamentos/${id}`); toast.success('Excluído!'); load(); } catch { toast.error('Erro'); }
  };

  const handleAddParticipantes = async () => {
    if (!showParticipantes || selectedCols.length === 0) return toast.error('Selecione colaboradores');
    try {
      await api.post(`/treinamentos/${showParticipantes.id}/participantes`, { colaboradorIds: selectedCols });
      toast.success('Participantes adicionados!');
      setShowParticipantes(null);
      setSelectedCols([]);
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
  };

  const toggleCol = (id: string) => {
    setSelectedCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const statusColors: Record<string, string> = {
    agendado: 'bg-amber-100 text-amber-700',
    em_andamento: 'bg-navy-100 text-navy-700',
    concluido: 'bg-success-100 text-success-700',
    cancelado: 'bg-danger-100 text-danger-700',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Treinamentos</h1>
          <p className="mt-1 text-sm text-navy-500">{treinamentos.length} treinamentos</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <FiPlus size={18} /> Novo Treinamento
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">{editingId ? 'Editar' : 'Novo Treinamento'}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Nome *</label>
                  <input type="text" className="input-field w-full" placeholder="Ex: NR-35 Trabalho em Altura" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">NR</label>
                  <select className="input-field w-full" value={form.nr} onChange={e => setForm({ ...form, nr: e.target.value })}>
                    <option value="">Selecione...</option>
                    {NR_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Carga Horária</label>
                  <input type="number" className="input-field w-full" placeholder="Horas" value={form.cargaHoraria} onChange={e => setForm({ ...form, cargaHoraria: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Empresa *</label>
                  <select className="input-field w-full" value={form.empresaId} onChange={e => { setForm({ ...form, empresaId: e.target.value }); loadColaboradores(e.target.value); }}>
                    <option value="">Selecione...</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Instrutor</label>
                  <input type="text" className="input-field w-full" value={form.instrutor} onChange={e => setForm({ ...form, instrutor: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Data Início *</label>
                  <input type="date" className="input-field w-full" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Data Fim</label>
                  <input type="date" className="input-field w-full" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Local</label>
                  <input type="text" className="input-field w-full" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} />
                </div>
              </div>
              <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showParticipantes && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4">
              <h2 className="text-lg font-bold text-navy-900">Adicionar Participantes</h2>
              <button onClick={() => setShowParticipantes(null)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6">
              <p className="mb-3 text-sm text-navy-600">Treinamento: <strong>{showParticipantes.nome}</strong></p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {colaboradores.length === 0 ? (
                  <p className="text-sm text-navy-400">Nenhum colaborador encontrado</p>
                ) : colaboradores.map(c => (
                  <label key={c.id} className="flex items-center gap-3 rounded-xl border border-navy-100 p-3 cursor-pointer hover:bg-navy-50">
                    <input type="checkbox" checked={selectedCols.includes(c.id)} onChange={() => toggleCol(c.id)} className="h-4 w-4 rounded border-navy-300 text-amber-500" />
                    <span className="text-sm text-navy-700">{c.nome}</span>
                  </label>
                ))}
              </div>
              <button onClick={handleAddParticipantes} disabled={selectedCols.length === 0} className="btn-primary w-full mt-4 py-3">
                <FiUsers size={18} /> Adicionar ({selectedCols.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {treinamentos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-100"><FiBook className="text-navy-400" size={28} /></div>
          <p className="text-lg font-bold text-navy-900">Nenhum treinamento</p>
          <p className="mt-1 text-sm text-navy-400">Crie treinamentos NR-10, NR-33, NR-35 e acompanhe participações</p>
        </div>
      ) : (
        <div className="space-y-4">
          {treinamentos.map(t => (
            <div key={t.id} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-navy-900"><FiBook size={18} /></div>
                  <div>
                    <h3 className="font-bold text-white">{t.nome}</h3>
                    <p className="text-xs text-amber-300">{t.nr || 'Geral'} · {t.empresa?.nome}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[t.status] || 'bg-navy-100 text-navy-500'}`}>
                  {t.status === 'agendado' ? 'Agendado' : t.status === 'em_andamento' ? 'Em Andamento' : t.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-navy-500 sm:grid-cols-4">
                  <div className="flex items-center gap-1"><FiCalendar size={14} /> {new Date(t.dataInicio).toLocaleDateString('pt-BR')}</div>
                  {t.local && <div>📍 {t.local}</div>}
                  {t.instrutor && <div>👨‍🏫 {t.instrutor}</div>}
                  {t.cargaHoraria && <div>⏱ {t.cargaHoraria}h</div>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setColaboradores([]); setShowParticipantes(t); if (t.empresaId) loadColaboradores(t.empresaId); }} className="flex items-center gap-1 rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50">
                    <FiUsers size={12} /> {t.participacoes?.length || 0} Participantes
                  </button>
                  <button onClick={() => handleEdit(t)} className="flex items-center justify-center rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50">
                    <FiEdit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="flex items-center justify-center rounded-xl border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
