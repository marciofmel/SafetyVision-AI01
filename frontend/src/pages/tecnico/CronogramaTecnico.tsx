import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiClock, FiPlay, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Cronograma {
  id: string; titulo: string; descricao?: string; nr?: string; frequencia: string;
  diaSemana?: number; diaMes?: number; horaPreferida?: string;
  proximaData?: string; ultimaData?: string; ativo: boolean;
  empresa?: { nome: string }; inspecoes?: any[];
}

interface Empresa { id: string; nome: string; }

const emptyForm = {
  titulo: '', descricao: '', nr: '', frequencia: 'mensal', diaSemana: '', diaMes: '', horaPreferida: '', empresaId: '',
};

const FREQUENCIAS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CronogramaTecnico() {
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); loadEmpresas(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/cronogramas'); setCronogramas(data); } catch { toast.error('Erro'); }
  };

  const loadEmpresas = async () => {
    try { const { data } = await api.get('/empresas'); setEmpresas(data); } catch {}
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleEdit = (c: Cronograma) => {
    setForm({
      titulo: c.titulo, descricao: c.descricao || '', nr: c.nr || '',
      frequencia: c.frequencia, diaSemana: c.diaSemana?.toString() || '',
      diaMes: c.diaMes?.toString() || '', horaPreferida: c.horaPreferida || '',
      empresaId: empresas.find(e => e.nome === c.empresa?.nome)?.id || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) return toast.error('Título é obrigatório');
    if (!form.empresaId) return toast.error('Empresa é obrigatória');
    setLoading(true);
    try {
      const payload: any = {
        titulo: form.titulo.trim(), descricao: form.descricao || null, nr: form.nr || null,
        frequencia: form.frequencia, empresaId: form.empresaId,
        diaSemana: form.frequencia === 'semanal' && form.diaSemana ? parseInt(form.diaSemana) : null,
        diaMes: form.frequencia === 'mensal' && form.diaMes ? parseInt(form.diaMes) : null,
        horaPreferida: form.horaPreferida || null,
      };
      if (editingId) {
        await api.put(`/cronogramas/${editingId}`, payload);
        toast.success('Atualizado!');
      } else {
        await api.post('/cronogramas', payload);
        toast.success('Criado!');
      }
      resetForm(); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return;
    try { await api.delete(`/cronogramas/${id}`); toast.success('Excluído!'); load(); } catch { toast.error('Erro'); }
  };

  const handleGerar = async (id: string) => {
    try {
      await api.post(`/cronogramas/${id}/gerar`);
      toast.success('Inspeção agendada!');
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Cronograma de Inspeções</h1>
          <p className="mt-1 text-sm text-navy-500">{cronogramas.length} cronograma(s)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <FiPlus size={18} /> Novo Cronograma
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">{editingId ? 'Editar' : 'Novo Cronograma'}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Título *</label>
                <input type="text" className="input-field w-full" placeholder="Ex: Inspeção NR-12 Mensal" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Empresa *</label>
                <select className="input-field w-full" value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Frequência *</label>
                  <select className="input-field w-full" value={form.frequencia} onChange={e => setForm({ ...form, frequencia: e.target.value })}>
                    {FREQUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">NR</label>
                  <input type="text" className="input-field w-full" placeholder="Ex: NR-12" value={form.nr} onChange={e => setForm({ ...form, nr: e.target.value })} />
                </div>
              </div>
              {form.frequencia === 'semanal' && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Dia da Semana</label>
                  <select className="input-field w-full" value={form.diaSemana} onChange={e => setForm({ ...form, diaSemana: e.target.value })}>
                    <option value="">Selecione...</option>
                    {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              {form.frequencia === 'mensal' && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Dia do Mês</label>
                  <input type="number" min="1" max="31" className="input-field w-full" placeholder="Ex: 15" value={form.diaMes} onChange={e => setForm({ ...form, diaMes: e.target.value })} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Hora Preferida</label>
                <input type="time" className="input-field w-full" value={form.horaPreferida} onChange={e => setForm({ ...form, horaPreferida: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Descrição</label>
                <textarea className="input-field w-full" rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cronogramas.length === 0 ? (
        <div className="card p-12 text-center">
          <FiCalendar className="mx-auto mb-4 text-navy-300" size={40} />
          <p className="text-lg font-bold text-navy-900">Nenhum cronograma</p>
          <p className="text-sm text-navy-400">Crie cronogramas para inspeções recorrentes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cronogramas.map(c => (
            <div key={c.id} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-navy-900"><FiCalendar size={18} /></div>
                  <div>
                    <h3 className="font-bold text-white">{c.titulo}</h3>
                    <p className="text-xs text-amber-300">{c.empresa?.nome} · {c.frequencia} {c.nr ? `· ${c.nr}` : ''}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.ativo ? 'bg-success-100 text-success-700' : 'bg-navy-100 text-navy-500'}`}>
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex gap-4 text-xs text-navy-500">
                  {c.proximaData && (
                    <span className="flex items-center gap-1"><FiClock size={12} /> Próxima: {new Date(c.proximaData).toLocaleDateString('pt-BR')}</span>
                  )}
                  {c.ultimaData && (
                    <span className="flex items-center gap-1"><FiCheckCircle size={12} /> Última: {new Date(c.ultimaData).toLocaleDateString('pt-BR')}</span>
                  )}
                  <span>{c.inspecoes?.length || 0} inspeção(ões)</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleGerar(c.id)} className="flex items-center gap-1 rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-xs font-semibold text-success-700 hover:bg-success-100">
                    <FiPlay size={12} /> Gerar
                  </button>
                  <button onClick={() => handleEdit(c)} className="flex items-center justify-center rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50"><FiEdit2 size={12} /></button>
                  <button onClick={() => handleDelete(c.id)} className="flex items-center justify-center rounded-xl border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50"><FiTrash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
