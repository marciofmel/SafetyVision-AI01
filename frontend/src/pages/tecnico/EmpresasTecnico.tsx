import { useEffect, useState, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiLoader, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Empresa {
  id: string; nome: string; cnpj: string; endereco: string; telefone: string; email: string;
  bairro: string; cidade: string; estado: string; cep: string;
  naturezaJuridica: string; porte: string; dataAbertura: string; capitalSocial: string;
  situacao: string; atividadePrincipal: string; atividadeSecundaria: string;
  simplesNacional: boolean; empresaMEI: boolean; socios: string; site: string; observacoes: string;
}

const emptyForm = {
  nome: '', cnpj: '', endereco: '', telefone: '', email: '',
  bairro: '', cidade: '', estado: '', cep: '',
  naturezaJuridica: '', porte: '', dataAbertura: '', capitalSocial: '',
  situacao: '', atividadePrincipal: '', atividadeSecundaria: '',
  simplesNacional: false, empresaMEI: false, socios: '', site: '', observacoes: '',
};

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3');
}

function maskCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{5})(\d{0,3})$/, '$1-$2');
}

export default function EmpresasTecnico() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showNew, setShowNew] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjFound, setCnpjFound] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const cnpjLookupDone = useRef(false);

  useEffect(() => { load(); }, []);
  const load = () => api.get('/empresas').then(({ data }) => setEmpresas(data)).catch(() => {});

  const handleCnpjLookup = async (value: string) => {
    const clean = value.replace(/[^\d]/g, '');
    if (clean.length !== 14) return;
    if (cnpjLookupDone.current) return;
    cnpjLookupDone.current = true;
    setCnpjLoading(true);
    setCnpjFound(false);
    toast.loading('Buscando informações da empresa na internet...', { id: 'cnpj-lookup' });
    try {
      const { data } = await api.get(`/cnpj/${clean}`, { timeout: 30000 });
      setForm({
        nome: data.nomeFantasia || data.nome || '',
        cnpj: data.cnpj || maskCnpj(clean),
        endereco: data.endereco || '',
        telefone: data.telefone || '',
        email: data.email || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || '',
        naturezaJuridica: data.naturezaJuridica || '',
        porte: data.porte || '',
        dataAbertura: data.dataAbertura || '',
        capitalSocial: data.capitalSocial || '',
        situacao: data.situacao || '',
        atividadePrincipal: data.atividadePrincipal || '',
        atividadeSecundaria: data.atividadeSecundaria || '',
        simplesNacional: data.simplesNacional || false,
        empresaMEI: data.empresaMEI || false,
        socios: Array.isArray(data.socios) ? data.socios.join(', ') : (data.socios || ''),
        site: data.site || '',
        observacoes: data.observacoes || '',
      });
      setCnpjFound(true);
      toast.dismiss('cnpj-lookup');
      setShowNew(true);
      toast.success('Empresa encontrada! Todos os campos preenchidos.', { duration: 4000 });
    } catch {
      toast.dismiss('cnpj-lookup');
      toast.error('CNPJ não encontrado');
      setShowNew(true);
      setCnpjFound(false);
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleCnpjInput = (v: string) => {
    const formatted = maskCnpj(v);
    setCnpj(formatted);
    const clean = v.replace(/\D/g, '');
    if (clean.length === 14) {
      cnpjLookupDone.current = false;
      handleCnpjLookup(clean);
    } else {
      cnpjLookupDone.current = false;
      setCnpjFound(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error('Nome da empresa é obrigatório');
    try {
      if (editingId) {
        await api.put(`/empresas/${editingId}`, form);
        toast.success('Empresa atualizada!');
      } else {
        await api.post('/empresas', form);
        toast.success('Empresa criada!');
      }
      setShowNew(false);
      setEditingId(null);
      setForm(emptyForm);
      setCnpj('');
      setCnpjFound(false);
      setShowExtra(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/empresas/${id}`); toast.success('Removida!'); load(); } catch { toast.error('Erro'); }
  };

  const handleEdit = (e: Empresa) => {
    setEditingId(e.id);
    setForm({
      nome: e.nome || '', cnpj: e.cnpj || '', endereco: e.endereco || '', telefone: e.telefone || '', email: e.email || '',
      bairro: e.bairro || '', cidade: e.cidade || '', estado: e.estado || '', cep: e.cep || '',
      naturezaJuridica: e.naturezaJuridica || '', porte: e.porte || '', dataAbertura: e.dataAbertura || '', capitalSocial: e.capitalSocial || '',
      situacao: e.situacao || '', atividadePrincipal: e.atividadePrincipal || '', atividadeSecundaria: e.atividadeSecundaria || '',
      simplesNacional: e.simplesNacional || false, empresaMEI: e.empresaMEI || false, socios: e.socios || '', site: e.site || '', observacoes: e.observacoes || '',
    });
    setShowNew(true);
    setCnpjFound(false);
    setShowExtra(false);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Empresas</h1>
          <p className="mt-1 text-sm text-navy-500">{empresas.length} empresas cadastradas</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm(emptyForm); setEditingId(null); setCnpjFound(false); setShowExtra(false); }} className="btn-primary">
          <FiPlus size={18} /> Nova Empresa
        </button>
      </div>

      {/* Busca CNPJ */}
      <div className="card mb-6 p-4">
        <h3 className="mb-3 text-sm font-bold text-navy-900">Buscar empresa por CNPJ</h3>
        <div className="flex gap-3">
          <input placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => handleCnpjInput(e.target.value)} className="input-field flex-1" maxLength={18} />
          <button onClick={() => handleCnpjLookup(cnpj.replace(/\D/g, ''))} disabled={cnpjLoading} className="btn-primary bg-navy-900 text-amber-400">
            {cnpjLoading ? <FiLoader className="animate-spin" size={16} /> : <FiSearch size={16} />}
            Buscar
          </button>
        </div>
        {cnpjFound && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
            <FiCheckCircle size={16} />
            <span>Dados encontrados! Revise e edite os campos abaixo antes de salvar.</span>
          </div>
        )}
      </div>

      {/* Formulário */}
      {showNew && (
        <div className="card mb-6 p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-navy-900">{editingId ? 'Editar' : 'Nova'} Empresa</h3>
          {cnpjFound && <p className="mb-3 text-xs text-navy-500">Dados preenchidos automaticamente. Todos os campos são editáveis.</p>}

          {/* Campos principais */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-600">Nome da Empresa *</label>
              <input className="input-field w-full" placeholder="Razão Social ou Nome Fantasia" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">CNPJ</label>
                <input className="input-field" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })} maxLength={18} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">Telefone</label>
                <input className="input-field" placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} maxLength={15} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-600">Endereço</label>
              <input className="input-field w-full" placeholder="Rua, número" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">Bairro</label>
                <input className="input-field" placeholder="Bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">Cidade</label>
                <input className="input-field" placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">UF</label>
                <input className="input-field" placeholder="UF" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">CEP</label>
                <input className="input-field" placeholder="00000-000" value={form.cep} onChange={(e) => setForm({ ...form, cep: maskCep(e.target.value) })} maxLength={9} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">Email</label>
                <input className="input-field" placeholder="email@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Toggle dados extras */}
          <button onClick={() => setShowExtra(!showExtra)} className="mt-4 flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700">
            {showExtra ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            {showExtra ? 'Ocultar dados adicionais' : 'Ver dados adicionais da empresa'}
          </button>

          {/* Dados extras */}
          {showExtra && (
            <div className="mt-4 space-y-3 rounded-xl border border-navy-100 bg-navy-50/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-600">Natureza Jurídica</label>
                  <input className="input-field" placeholder="Ex: Empresário Individual" value={form.naturezaJuridica} onChange={(e) => setForm({ ...form, naturezaJuridica: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-600">Porte</label>
                  <input className="input-field" placeholder="Ex: Micro Empresa" value={form.porte} onChange={(e) => setForm({ ...form, porte: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-600">Data de Abertura</label>
                  <input className="input-field" placeholder="DD/MM/AAAA" value={form.dataAbertura} onChange={(e) => setForm({ ...form, dataAbertura: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-600">Capital Social</label>
                  <input className="input-field" placeholder="R$ 0,00" value={form.capitalSocial} onChange={(e) => setForm({ ...form, capitalSocial: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-600">Situação Cadastral</label>
                  <input className="input-field" placeholder="Ex: Ativa" value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">Atividade Principal</label>
                <input className="input-field w-full" placeholder="Descrição da atividade principal" value={form.atividadePrincipal} onChange={(e) => setForm({ ...form, atividadePrincipal: e.target.value })} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">Atividades Secundárias</label>
                <input className="input-field w-full" placeholder="Descrição das atividades secundárias" value={form.atividadeSecundaria} onChange={(e) => setForm({ ...form, atividadeSecundaria: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-600">Sócios</label>
                  <input className="input-field" placeholder="Nomes dos sócios" value={form.socios} onChange={(e) => setForm({ ...form, socios: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-600">Site</label>
                  <input className="input-field" placeholder="https://..." value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-navy-700">
                  <input type="checkbox" checked={form.simplesNacional || false} onChange={(e) => setForm({ ...form, simplesNacional: e.target.checked })} className="h-4 w-4 rounded border-navy-300 text-amber-500 focus:ring-amber-500" />
                  Simples Nacional
                </label>
                <label className="flex items-center gap-2 text-sm text-navy-700">
                  <input type="checkbox" checked={form.empresaMEI || false} onChange={(e) => setForm({ ...form, empresaMEI: e.target.checked })} className="h-4 w-4 rounded border-navy-300 text-amber-500 focus:ring-amber-500" />
                  Empresa MEI
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-navy-600">Observações</label>
                <textarea className="input-field w-full" rows={2} placeholder="Notas adicionais..." value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={handleSave} className="btn-primary bg-success-600 hover:bg-success-700"><FiSave size={16} /> Salvar</button>
            <button onClick={() => { setShowNew(false); setEditingId(null); setCnpjFound(false); setShowExtra(false); }} className="btn-primary bg-navy-200 text-navy-700 hover:bg-navy-300"><FiX size={16} /> Cancelar</button>
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
                {e.endereco && <p className="text-xs text-navy-500">{e.endereco}{e.bairro ? `, ${e.bairro}` : ''}{e.cidade && e.estado ? ` - ${e.cidade}/${e.estado}` : ''}</p>}
                {e.cep && <p className="text-xs text-navy-400">CEP: {e.cep}</p>}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-navy-400">
                  {e.telefone && <span>Tel: {e.telefone}</span>}
                  {e.email && <span>Email: {e.email}</span>}
                  {e.situacao && <span className="text-success-600">{e.situacao}</span>}
                </div>
                {e.atividadePrincipal && <p className="mt-1 text-xs text-navy-400">Atividade: {e.atividadePrincipal}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(e)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiEdit2 size={14} /></button>
                <button onClick={() => handleDelete(e.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
