import { useEffect, useState, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Empresa { id: string; nome: string; cnpj: string; endereco: string; telefone: string; email: string; }

export default function EmpresasTecnico() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' });
  const [showNew, setShowNew] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const cnpjLookupDone = useRef(false);

  useEffect(() => { load(); }, []);
  const load = () => api.get('/empresas').then(({ data }) => setEmpresas(data)).catch(() => {});

  const handleCnpjLookup = async (value: string) => {
    const clean = value.replace(/[^\d]/g, '');
    if (clean.length !== 14) return;
    if (cnpjLookupDone.current) return;
    cnpjLookupDone.current = true;
    setCnpjLoading(true);
    toast.loading('Buscando dados do CNPJ...', { id: 'cnpj-lookup' });
    try {
      const { data } = await api.get(`/cnpj/${clean}`);
      setForm({
        nome: data.nome || data.nomeFantasia || '',
        cnpj: cnpj,
        endereco: data.endereco ? `${data.endereco} - ${data.cidade}/${data.estado}` : '',
        telefone: data.telefone || '',
        email: data.email || '',
      });
      toast.dismiss('cnpj-lookup');
      setShowNew(true);
      toast.success('Dados encontrados!');
    } catch {
      toast.dismiss('cnpj-lookup');
      toast.error('CNPJ não encontrado');
      setShowNew(true);
    } finally {
      setCnpjLoading(false);
    }
  };

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    const formatted = d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (d.length === 14) {
      cnpjLookupDone.current = false;
      handleCnpjLookup(d);
    } else {
      cnpjLookupDone.current = false;
    }
    return formatted;
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) { await api.put(`/empresas/${id}`, form); toast.success('Empresa atualizada!'); }
      else { await api.post('/empresas', form); toast.success('Empresa criada!'); }
      setShowNew(false); setEditingId(null); setForm({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' }); setCnpj(''); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/empresas/${id}`); toast.success('Removida!'); load(); } catch { toast.error('Erro'); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Empresas</h1>
          <p className="mt-1 text-sm text-navy-500">{empresas.length} empresas cadastradas</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' }); }} className="btn-primary">
          <FiPlus size={18} /> Nova Empresa
        </button>
      </div>

      {/* Busca CNPJ */}
      <div className="card mb-6 p-4">
        <h3 className="mb-3 text-sm font-bold text-navy-900">Buscar empresa por CNPJ</h3>
        <div className="flex gap-3">
          <input placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(formatCnpj(e.target.value))} className="input-field flex-1" maxLength={18} />
          <button onClick={() => handleCnpjLookup(cnpj)} disabled={cnpjLoading} className="btn-primary bg-navy-900 text-amber-400">
            {cnpjLoading ? <FiLoader className="animate-spin" size={16} /> : <FiSearch size={16} />}
            Buscar
          </button>
        </div>
      </div>

      {/* Formulário nova/editar */}
      {showNew && (
        <div className="card mb-6 p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-navy-900">{editingId ? 'Editar' : 'Nova'} Empresa</h3>
          <div className="space-y-3">
            <input className="input-field w-full" placeholder="Nome da Empresa *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="input-field" placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              <input className="input-field" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <input className="input-field w-full" placeholder="Endereço completo" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            <input className="input-field w-full" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => handleSave(editingId || undefined)} className="btn-primary bg-success-600 hover:bg-success-700"><FiSave size={16} /> Salvar</button>
            <button onClick={() => { setShowNew(false); setEditingId(null); }} className="btn-primary bg-navy-200 text-navy-700 hover:bg-navy-300"><FiX size={16} /> Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {empresas.length === 0 ? (
          <div className="card p-12 text-center"><p className="text-sm text-navy-500">Nenhuma empresa cadastrada</p></div>
        ) : empresas.map((e) => (
          <div key={e.id} className="card p-4 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy-900">{e.nome}</p>
                {e.cnpj && <p className="text-xs text-navy-500">CNPJ: {e.cnpj}</p>}
                {e.endereco && <p className="text-xs text-navy-500">{e.endereco}</p>}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-navy-400">
                  {e.telefone && <span>Tel: {e.telefone}</span>}
                  {e.email && <span>Email: {e.email}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingId(e.id); setForm({ nome: e.nome, cnpj: e.cnpj || '', endereco: e.endereco || '', telefone: e.telefone || '', email: e.email || '' }); setShowNew(true); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiEdit2 size={14} /></button>
                <button onClick={() => handleDelete(e.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
