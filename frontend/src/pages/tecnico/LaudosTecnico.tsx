import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiCheckCircle, FiExternalLink, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Laudo {
  id: string; titulo: string; nr?: string; tipo: string; dataEmissao: string;
  responsavel?: string; responsavelCargo?: string; responsavelCPF?: string;
  aprovado: boolean; conteudoHtml?: string;
  empresa?: { nome: string }; inspecao?: { status: string };
}

interface Empresa { id: string; nome: string; }

const emptyForm = { titulo: '', empresaId: '', inspecaoId: '', nr: '', tipo: 'inspecao', responsavel: '', responsavelCargo: '', responsavelCPF: '' };

export default function LaudosTecnico() {
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); loadEmpresas(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/laudos'); setLaudos(data); } catch { toast.error('Erro'); }
  };
  const loadEmpresas = async () => { try { const { data } = await api.get('/empresas'); setEmpresas(data); } catch {} };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.titulo.trim()) return toast.error('Título obrigatório');
    if (!form.empresaId) return toast.error('Empresa obrigatória');
    setLoading(true);
    try {
      const payload = {
        titulo: form.titulo.trim(), empresaId: form.empresaId,
        inspecaoId: form.inspecaoId || null, nr: form.nr || null, tipo: form.tipo,
        responsavel: form.responsavel || null, responsavelCargo: form.responsavelCargo || null,
        responsavelCPF: form.responsavelCPF || null,
      };
      if (editingId) { await api.put(`/laudos/${editingId}`, payload); toast.success('Atualizado!'); }
      else { await api.post('/laudos', payload); toast.success('Laudo criado!'); }
      resetForm(); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este laudo?')) return;
    try { await api.delete(`/laudos/${id}`); toast.success('Excluído!'); load(); } catch { toast.error('Erro'); }
  };

  const handleApprove = async (id: string) => {
    try { await api.put(`/laudos/${id}`, { aprovado: true }); toast.success('Laudo aprovado!'); load(); } catch { toast.error('Erro'); }
  };

  const tipoLabels: Record<string, string> = { inspecao: 'Inspeção', pgr: 'PGR', apr: 'APR', vistoria: 'Vistoria' };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Laudos de Inspeção</h1>
          <p className="mt-1 text-sm text-navy-500">{laudos.length} laudo(s)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary"><FiPlus size={18} /> Novo Laudo</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">{editingId ? 'Editar Laudo' : 'Novo Laudo'}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="mb-1 block text-sm font-semibold text-navy-700">Título *</label><input type="text" className="input-field w-full" placeholder="Ex: Laudo de Inspeção NR-12" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Empresa *</label>
                <select className="input-field w-full" value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Tipo</label>
                  <select className="input-field w-full" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="inspecao">Inspeção</option><option value="pgr">PGR</option><option value="apr">APR</option><option value="vistoria">Vistoria</option>
                  </select>
                </div>
                <div><label className="mb-1 block text-sm font-semibold text-navy-700">NR</label><input type="text" className="input-field w-full" placeholder="Ex: NR-12" value={form.nr} onChange={e => setForm({ ...form, nr: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-semibold text-navy-700">Responsável</label><input type="text" className="input-field w-full" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm font-semibold text-navy-700">Cargo</label><input type="text" className="input-field w-full" placeholder="Eng. Segurança" value={form.responsavelCargo} onChange={e => setForm({ ...form, responsavelCargo: e.target.value })} /></div>
              </div>
              <div><label className="mb-1 block text-sm font-semibold text-navy-700">CPF do Responsável</label><input type="text" className="input-field w-full" value={form.responsavelCPF} onChange={e => setForm({ ...form, responsavelCPF: e.target.value })} /></div>
              <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3">{loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Laudo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewId && (
        <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4">
              <h2 className="text-lg font-bold text-navy-900">Preview do Laudo</h2>
              <div className="flex gap-2">
                <a href={`/api/laudos/${previewId}/html`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800">
                  <FiExternalLink size={14} /> Abrir
                </a>
                <button onClick={() => setPreviewId(null)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiTrash2 size={18} /></button>
              </div>
            </div>
            <iframe src={`/api/laudos/${previewId}/html`} className="flex-1 border-0 min-h-[500px]" title="Preview" />
          </div>
        </div>
      )}

      {laudos.length === 0 ? (
        <div className="card p-12 text-center">
          <FiFileText className="mx-auto mb-4 text-navy-300" size={40} />
          <p className="text-lg font-bold text-navy-900">Nenhum laudo emitido</p>
          <p className="text-sm text-navy-400">Crie laudos de inspeção, PGR ou APR</p>
        </div>
      ) : (
        <div className="space-y-3">
          {laudos.map(l => (
            <div key={l.id} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-navy-900"><FiFileText size={18} /></div>
                  <div>
                    <h3 className="font-bold text-white">{l.titulo}</h3>
                    <p className="text-xs text-amber-300">{l.empresa?.nome} · {tipoLabels[l.tipo] || l.tipo} · {new Date(l.dataEmissao).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {l.aprovado ? (
                    <span className="flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-700"><FiCheckCircle size={10} /> Aprovado</span>
                  ) : (
                    <button onClick={() => handleApprove(l.id)} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-200">Aprovar</button>
                  )}
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="text-xs text-navy-500">
                  {l.responsavel && <span>Responsável: <strong>{l.responsavel}</strong></span>}
                  {l.nr && <span className="ml-3">NR: <strong>{l.nr}</strong></span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreviewId(l.id)} className="flex items-center gap-1 rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50"><FiPrinter size={12} /> Visualizar</button>
                  <button onClick={() => { setForm({ titulo: l.titulo, empresaId: empresas.find(e => e.nome === l.empresa?.nome)?.id || '', inspecaoId: '', nr: l.nr || '', tipo: l.tipo, responsavel: l.responsavel || '', responsavelCargo: l.responsavelCargo || '', responsavelCPF: l.responsavelCPF || '' }); setEditingId(l.id); setShowForm(true); }} className="flex items-center justify-center rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50"><FiEdit2 size={12} /></button>
                  <button onClick={() => handleDelete(l.id)} className="flex items-center justify-center rounded-xl border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50"><FiTrash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
