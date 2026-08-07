import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiCheckCircle, FiClock, FiAlertTriangle, FiPlusCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface PGR {
  id: string; titulo: string; descricao?: string; revisao: number; dataRevisao: string;
  vigenciaInicio?: string; vigenciaFim?: string; responsavel?: string; aprovado: boolean;
  empresa?: { nome: string }; itens?: PGRItem[];
}

interface PGRItem {
  id: string; processo: string; perigo: string; riscos: string;
  medidasControle?: string; riscoResidual?: string; prioridade?: string;
  norma?: string; responsavel?: string; prazo?: string; status: string;
}

interface Empresa { id: string; nome: string; }

const emptyForm = { titulo: '', descricao: '', empresaId: '', responsavel: '', vigenciaInicio: '', vigenciaFim: '' };
const emptyItem = { processo: '', perigo: '', riscos: '', medidasControle: '', riscoResidual: '', prioridade: 'media', norma: '', responsavel: '', prazo: '' };

export default function PGRTecnico() {
  const [pgrs, setPGRs] = useState<PGR[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showItem, setShowItem] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); loadEmpresas(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/pgr'); setPGRs(data); } catch { toast.error('Erro'); }
  };
  const loadEmpresas = async () => { try { const { data } = await api.get('/empresas'); setEmpresas(data); } catch {} };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.titulo.trim()) return toast.error('Título obrigatório');
    if (!form.empresaId) return toast.error('Empresa obrigatória');
    setLoading(true);
    try {
      const payload = { ...form, titulo: form.titulo.trim(), descricao: form.descricao || null, responsavel: form.responsavel || null, vigenciaInicio: form.vigenciaInicio || null, vigenciaFim: form.vigenciaFim || null };
      if (editingId) { await api.put(`/pgr/${editingId}`, payload); toast.success('Atualizado!'); }
      else { await api.post('/pgr', payload); toast.success('Criado!'); }
      resetForm(); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir PGR e todos os itens?')) return;
    try { await api.delete(`/pgr/${id}`); toast.success('Excluído!'); load(); } catch { toast.error('Erro'); }
  };

  const handleAddItem = async () => {
    if (!showItem || !itemForm.processo.trim() || !itemForm.perigo.trim()) return toast.error('Processo e Perigo obrigatórios');
    try {
      await api.post(`/pgr/${showItem}/itens`, itemForm);
      toast.success('Item adicionado!');
      setItemForm(emptyItem);
      setShowItem(null);
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Excluir item?')) return;
    try { await api.delete(`/pgr/item/${itemId}`); toast.success('Excluído!'); load(); } catch { toast.error('Erro'); }
  };

  const prioridadeColors: Record<string, string> = {
    alta: 'bg-danger-100 text-danger-700', media: 'bg-amber-100 text-amber-700', baixa: 'bg-success-100 text-success-700',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Programa de Gerenciamento de Riscos</h1>
          <p className="mt-1 text-sm text-navy-500">{pgrs.length} PGR(s)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary"><FiPlus size={18} /> Novo PGR</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">{editingId ? 'Editar PGR' : 'Novo PGR'}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Título *</label>
                <input type="text" className="input-field w-full" placeholder="Ex: PGR 2026 - Empresa X" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
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
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Responsável</label>
                  <input type="text" className="input-field w-full" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Vigência Início</label>
                  <input type="date" className="input-field w-full" value={form.vigenciaInicio} onChange={e => setForm({ ...form, vigenciaInicio: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Descrição</label>
                <textarea className="input-field w-full" rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3">{loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar PGR'}</button>
            </div>
          </div>
        </div>
      )}

      {showItem && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">Adicionar Item</h2>
              <button onClick={() => setShowItem(null)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="mb-1 block text-sm font-semibold text-navy-700">Processo *</label><input type="text" className="input-field w-full" value={itemForm.processo} onChange={e => setItemForm({ ...itemForm, processo: e.target.value })} /></div>
              <div><label className="mb-1 block text-sm font-semibold text-navy-700">Perigo *</label><input type="text" className="input-field w-full" value={itemForm.perigo} onChange={e => setItemForm({ ...itemForm, perigo: e.target.value })} /></div>
              <div><label className="mb-1 block text-sm font-semibold text-navy-700">Riscos</label><textarea className="input-field w-full" rows={2} value={itemForm.riscos} onChange={e => setItemForm({ ...itemForm, riscos: e.target.value })} /></div>
              <div><label className="mb-1 block text-sm font-semibold text-navy-700">Medidas de Controle</label><textarea className="input-field w-full" rows={2} value={itemForm.medidasControle} onChange={e => setItemForm({ ...itemForm, medidasControle: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-semibold text-navy-700">Prioridade</label>
                  <select className="input-field w-full" value={itemForm.prioridade} onChange={e => setItemForm({ ...itemForm, prioridade: e.target.value })}>
                    <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
                  </select>
                </div>
                <div><label className="mb-1 block text-sm font-semibold text-navy-700">Norma</label><input type="text" className="input-field w-full" placeholder="Ex: NR-12" value={itemForm.norma} onChange={e => setItemForm({ ...itemForm, norma: e.target.value })} /></div>
              </div>
              <button onClick={handleAddItem} className="btn-primary w-full py-3"><FiPlusCircle size={18} /> Adicionar Item</button>
            </div>
          </div>
        </div>
      )}

      {pgrs.length === 0 ? (
        <div className="card p-12 text-center">
          <FiFileText className="mx-auto mb-4 text-navy-300" size={40} />
          <p className="text-lg font-bold text-navy-900">Nenhum PGR criado</p>
          <p className="text-sm text-navy-400">Crie PGRs para gerenciar riscos por processo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pgrs.map(p => (
            <div key={p.id} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-navy-900"><FiFileText size={18} /></div>
                  <div>
                    <h3 className="font-bold text-white">{p.titulo}</h3>
                    <p className="text-xs text-amber-300">{p.empresa?.nome} · Rev. {p.revisao} · {p.itens?.length || 0} itens</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.aprovado && <span className="rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-700">Aprovado</span>}
                  <button onClick={() => { setShowItem(p.id); }} className="rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"><FiPlus size={12} /> Item</button>
                  <button onClick={() => { setForm({ titulo: p.titulo, descricao: p.descricao || '', empresaId: empresas.find(e => e.nome === p.empresa?.nome)?.id || '', responsavel: p.responsavel || '', vigenciaInicio: p.vigenciaInicio?.slice(0, 10) || '', vigenciaFim: p.vigenciaFim?.slice(0, 10) || '' }); setEditingId(p.id); setShowForm(true); }} className="flex items-center justify-center rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50"><FiEdit2 size={12} /></button>
                  <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center rounded-xl border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50"><FiTrash2 size={12} /></button>
                </div>
              </div>
              {p.itens && p.itens.length > 0 && (
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-navy-100">
                        <th className="px-2 py-1.5 text-left font-semibold text-navy-600">Processo</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-navy-600">Perigo</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-navy-600">Riscos</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-navy-600">Controle</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-navy-600">Prioridade</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-navy-600"></th>
                      </tr></thead>
                      <tbody>
                        {p.itens.map(item => (
                          <tr key={item.id} className="border-b border-navy-50">
                            <td className="px-2 py-2 font-medium text-navy-900">{item.processo}</td>
                            <td className="px-2 py-2 text-navy-600">{item.perigo}</td>
                            <td className="px-2 py-2 text-navy-500 max-w-[200px] truncate">{item.riscos}</td>
                            <td className="px-2 py-2 text-navy-500 max-w-[200px] truncate">{item.medidasControle || '---'}</td>
                            <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${prioridadeColors[item.prioridade || 'media']}`}>{item.prioridade || 'media'}</span></td>
                            <td className="px-2 py-2"><button onClick={() => handleDeleteItem(item.id)} className="text-danger-500 hover:text-danger-700"><FiTrash2 size={12} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
