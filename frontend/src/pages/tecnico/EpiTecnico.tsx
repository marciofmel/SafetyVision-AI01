import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiShield, FiAlertTriangle, FiCheckCircle, FiPackage, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Epi {
  id: string; nome: string; ca?: string; fabricante?: string; validadeCa?: string;
  dataCompra?: string; vidaUtilMeses?: number; status: string; observacoes?: string;
  empresaId?: string; empresa?: { nome: string }; setor?: { nome: string }; entregas?: any[];
}

interface Empresa { id: string; nome: string; }
interface Setor { id: string; nome: string; empresaId: string; }
interface Colaborador { id: string; nome: string; }

const emptyForm = {
  nome: '', ca: '', fabricante: '', validadeCa: '', dataCompra: '', vidaUtilMeses: '',
  empresaId: '', setorId: '', observacoes: '',
};

export default function EpiTecnico() {
  const [epis, setEpis] = useState<Epi[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showEntrega, setShowEntrega] = useState<Epi | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [colaboradorEntrega, setColaboradorEntrega] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); loadEmpresas(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/epis'); setEpis(data); } catch { toast.error('Erro ao carregar EPIs'); }
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

  const handleEdit = async (epi: Epi) => {
    setForm({
      nome: epi.nome, ca: epi.ca || '', fabricante: epi.fabricante || '',
      validadeCa: epi.validadeCa ? epi.validadeCa.slice(0, 10) : '',
      dataCompra: epi.dataCompra ? epi.dataCompra.slice(0, 10) : '',
      vidaUtilMeses: epi.vidaUtilMeses?.toString() || '',
      empresaId: epi.empresa ? empresas.find(e => e.nome === epi.empresa?.nome)?.id || '' : '',
      setorId: '', observacoes: epi.observacoes || '',
    });
    setEditingId(epi.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório');
    if (!form.empresaId) return toast.error('Empresa é obrigatória');
    setLoading(true);
    try {
      const payload: any = {
        nome: form.nome.trim(), ca: form.ca || null, fabricante: form.fabricante || null,
        validadeCa: form.validadeCa || null, dataCompra: form.dataCompra || null,
        vidaUtilMeses: form.vidaUtilMeses ? parseInt(form.vidaUtilMeses) : null,
        empresaId: form.empresaId, setorId: form.setorId || null, observacoes: form.observacoes || null,
      };
      if (editingId) {
        await api.put(`/epis/${editingId}`, payload);
        toast.success('EPI atualizado!');
      } else {
        await api.post('/epis', payload);
        toast.success('EPI criado!');
      }
      resetForm(); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este EPI?')) return;
    try { await api.delete(`/epis/${id}`); toast.success('Excluído!'); load(); } catch { toast.error('Erro'); }
  };

  const handleEntregar = async () => {
    if (!showEntrega || !colaboradorEntrega) return toast.error('Selecione um colaborador');
    try {
      await api.post(`/epis/${showEntrega.id}/entregar`, { colaboradorId: colaboradorEntrega });
      toast.success('EPI entregue!');
      setShowEntrega(null);
      setColaboradorEntrega('');
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
  };

  const handleDevolver = async (entregaId: string) => {
    try {
      await api.post(`/epis/entrega/${entregaId}/devolver`);
      toast.success('Devolvido!');
      load();
    } catch { toast.error('Erro'); }
  };

  const statusColors: Record<string, string> = {
    ativo: 'bg-success-100 text-success-700',
    vencido: 'bg-danger-100 text-danger-700',
    proximo_vencimento: 'bg-amber-100 text-amber-700',
    inativo: 'bg-navy-100 text-navy-500',
  };

  const getEpiStatus = (epi: Epi) => {
    if (epi.status === 'inativo') return 'inativo';
    if (epi.validadeCa) {
      const diff = new Date(epi.validadeCa).getTime() - Date.now();
      if (diff < 0) return 'vencido';
      if (diff < 30 * 24 * 60 * 60 * 1000) return 'proximo_vencimento';
    }
    return 'ativo';
  };

  const episVencidos = epis.filter(e => getEpiStatus(e) === 'vencido');
  const episProximos = epis.filter(e => getEpiStatus(e) === 'proximo_vencimento');

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Gestão de EPIs</h1>
          <p className="mt-1 text-sm text-navy-500">{epis.length} EPIs cadastrados</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <FiPlus size={18} /> Novo EPI
        </button>
      </div>

      {/* Alertas */}
      {(episVencidos.length > 0 || episProximos.length > 0) && (
        <div className="mb-6 space-y-3">
          {episVencidos.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4">
              <FiAlertTriangle className="text-danger-600" size={20} />
              <p className="text-sm font-semibold text-danger-700">{episVencidos.length} EPI(s) com CA vencido!</p>
            </div>
          )}
          {episProximos.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <FiClock className="text-amber-600" size={20} />
              <p className="text-sm font-semibold text-amber-700">{episProximos.length} EPI(s) vencendo em até 30 dias</p>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">{editingId ? 'Editar EPI' : 'Novo EPI'}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Nome *</label>
                  <input type="text" className="input-field w-full" placeholder="Ex: Capacete de Segurança" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">CA (Certificado de Aprovação)</label>
                  <input type="text" className="input-field w-full" placeholder="Ex: CA 29.145" value={form.ca} onChange={e => setForm({ ...form, ca: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Fabricante</label>
                  <input type="text" className="input-field w-full" placeholder="Ex: 3M" value={form.fabricante} onChange={e => setForm({ ...form, fabricante: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Validade CA</label>
                  <input type="date" className="input-field w-full" value={form.validadeCa} onChange={e => setForm({ ...form, validadeCa: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Data Compra</label>
                  <input type="date" className="input-field w-full" value={form.dataCompra} onChange={e => setForm({ ...form, dataCompra: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Empresa *</label>
                  <select className="input-field w-full" value={form.empresaId} onChange={e => { setForm({ ...form, empresaId: e.target.value, setorId: '' }); loadSetores(e.target.value); loadColaboradores(e.target.value); }}>
                    <option value="">Selecione...</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Setor</label>
                  <select className="input-field w-full" value={form.setorId} onChange={e => setForm({ ...form, setorId: e.target.value })}>
                    <option value="">Todos</option>
                    {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar EPI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrega */}
      {showEntrega && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4">
              <h2 className="text-lg font-bold text-navy-900">Entregar EPI</h2>
              <button onClick={() => setShowEntrega(null)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-navy-600">EPI: <strong>{showEntrega.nome}</strong></p>
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Colaborador *</label>
                <select className="input-field w-full" value={colaboradorEntrega} onChange={e => setColaboradorEntrega(e.target.value)}>
                  <option value="">Selecione...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <button onClick={handleEntregar} disabled={!colaboradorEntrega} className="btn-primary w-full py-3">
                <FiPackage size={18} /> Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {epis.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-100">
            <FiShield className="text-navy-400" size={28} />
          </div>
          <p className="text-lg font-bold text-navy-900">Nenhum EPI cadastrado</p>
          <p className="mt-1 text-sm text-navy-400">Cadastre EPIs para gerenciar entregas e validades</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {epis.map(epi => {
            const st = getEpiStatus(epi);
            return (
              <div key={epi.id} className="card overflow-hidden transition-all hover:shadow-lg">
                <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-navy-900">
                      <FiShield size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{epi.nome}</h3>
                      <p className="text-xs text-amber-300">{epi.ca || 'Sem CA'}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[st]}`}>
                    {st === 'ativo' ? 'Ativo' : st === 'vencido' ? 'Vencido' : st === 'proximo_vencimento' ? 'Próx. Venc.' : 'Inativo'}
                  </span>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <p className="text-navy-500">Fabricante: <strong>{epi.fabricante || '---'}</strong></p>
                  <p className="text-navy-500">Empresa: <strong>{epi.empresa?.nome || '---'}</strong></p>
                  {epi.validadeCa && <p className="text-navy-500">Validade: <strong>{new Date(epi.validadeCa).toLocaleDateString('pt-BR')}</strong></p>}
                  <p className="text-navy-500">Entregas: <strong>{epi.entregas?.length || 0}</strong></p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setColaboradores([]); setShowEntrega(epi); if (epi.empresaId) loadColaboradores(epi.empresaId); }} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50">
                      <FiPackage size={12} /> Entregar
                    </button>
                    <button onClick={() => handleEdit(epi)} className="flex items-center justify-center rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50">
                      <FiEdit2 size={12} />
                    </button>
                    <button onClick={() => handleDelete(epi.id)} className="flex items-center justify-center rounded-xl border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
