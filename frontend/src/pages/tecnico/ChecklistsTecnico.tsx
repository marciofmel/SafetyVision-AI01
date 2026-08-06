import { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiEdit3, FiCheck, FiX, FiList, FiAlertTriangle } from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

interface ChecklistItem {
  id?: string;
  texto: string;
  obrigatorio: boolean;
}

interface ChecklistTemplate {
  id: string;
  nome: string;
  descricao: string | null;
  nr: string;
  itens: ChecklistItem[];
  _count?: { itens: number };
  createdAt: string;
}

const NR_OPTIONS = [
  'NR01','NR02','NR03','NR04','NR05','NR06','NR07','NR08','NR09','NR10',
  'NR11','NR12','NR13','NR14','NR15','NR16','NR17','NR18','NR19','NR20',
  'NR21','NR22','NR23','NR24','NR25','NR26','NR27','NR28','NR29','NR30',
  'NR31','NR32','NR33','NR34','NR35','NR36','NR37','NR38',
];

export default function ChecklistsTecnico() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nr, setNr] = useState('');
  const [itens, setItens] = useState<ChecklistItem[]>([{ texto: '', obrigatorio: true }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await api.get('/checklists');
      setTemplates(data);
    } catch {
      toast.error('Erro ao carregar checklists');
    }
  };

  const resetForm = () => {
    setNome('');
    setDescricao('');
    setNr('');
    setItens([{ texto: '', obrigatorio: true }]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = async (id: string) => {
    try {
      const { data } = await api.get(`/checklists/${id}`);
      setNome(data.nome);
      setDescricao(data.descricao || '');
      setNr(data.nr);
      setItens(data.itens.map((i: any) => ({ texto: i.texto, obrigatorio: i.obrigatorio })));
      setEditingId(id);
      setShowForm(true);
    } catch {
      toast.error('Erro ao carregar checklist');
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) return toast.error('Nome é obrigatório');
    if (!nr) return toast.error('Selecione a NR');
    if (itens.length === 0 || itens.every(i => !i.texto.trim())) return toast.error('Adicione pelo menos 1 item');

    setLoading(true);
    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        nr,
        itens: itens.filter(i => i.texto.trim()),
      };

      if (editingId) {
        await api.put(`/checklists/${editingId}`, payload);
        toast.success('Checklist atualizado!');
      } else {
        await api.post('/checklists', payload);
        toast.success('Checklist criado!');
      }
      resetForm();
      loadTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este checklist?')) return;
    try {
      await api.delete(`/checklists/${id}`);
      toast.success('Excluído!');
      loadTemplates();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const addItem = () => setItens([...itens, { texto: '', obrigatorio: true }]);
  const removeItem = (index: number) => setItens(itens.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof ChecklistItem, value: any) => {
    const updated = [...itens];
    updated[index] = { ...updated[index], [field]: value };
    setItens(updated);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Checklists por NR</h1>
          <p className="mt-1 text-sm text-navy-500">Crie templates de verificação por Norma Regulamentadora</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <FiPlus size={18} /> Novo Checklist
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-2xl rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-900">{editingId ? 'Editar Checklist' : 'Novo Checklist'}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">Nome *</label>
                  <input type="text" className="input-field w-full" placeholder="Ex: Checklist NR-12 Máquinas" value={nome} onChange={e => setNome(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy-700">NR *</label>
                  <select className="input-field w-full" value={nr} onChange={e => setNr(e.target.value)}>
                    <option value="">Selecione...</option>
                    {NR_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700">Descrição</label>
                <input type="text" className="input-field w-full" placeholder="Descrição opcional" value={descricao} onChange={e => setDescricao(e.target.value)} />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-semibold text-navy-700">Itens do Checklist *</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
                    <FiPlus size={14} /> Adicionar item
                  </button>
                </div>

                <div className="space-y-2">
                  {itens.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl border border-navy-100 p-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-xs font-bold text-navy-600">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        className="input-field flex-1"
                        placeholder="Descrição do item..."
                        value={item.texto}
                        onChange={e => updateItem(i, 'texto', e.target.value)}
                      />
                      <label className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={item.obrigatorio}
                          onChange={e => updateItem(i, 'obrigatorio', e.target.checked)}
                          className="h-4 w-4 rounded border-navy-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-xs text-navy-500">Obrig.</span>
                      </label>
                      {itens.length > 1 && (
                        <button onClick={() => removeItem(i)} className="shrink-0 rounded-lg p-1.5 text-navy-400 hover:bg-danger-50 hover:text-danger-600">
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Salvando...' : editingId ? 'Atualizar Checklist' : 'Criar Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-100">
            <FiList className="text-navy-400" size={28} />
          </div>
          <p className="text-lg font-bold text-navy-900">Nenhum checklist criado</p>
          <p className="mt-1 text-sm text-navy-400">Crie checklists personalizados para cada NR</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div key={t.id} className="card overflow-hidden transition-all hover:shadow-lg">
              <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-navy-900">
                    <FiAlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{t.nome}</h3>
                    <p className="text-xs text-amber-300">{t.nr}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {t.descricao && <p className="mb-3 text-sm text-navy-500">{t.descricao}</p>}
                <p className="text-xs text-navy-400">{t._count?.itens || t.itens?.length || 0} itens</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => handleEdit(t.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-50">
                    <FiEdit3 size={14} /> Editar
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="flex items-center justify-center rounded-xl border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50">
                    <FiTrash2 size={14} />
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
