import { useEffect, useState, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiUpload, FiFileText, FiUsers, FiCheck, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Colaborador {
  id: string; nome: string; cpf?: string; rg?: string; cargo?: string; setorId?: string;
  empresaId: string; telefone?: string; email?: string; dataNascimento?: string;
  admissao?: string; matricula?: string; aso?: string; setor?: { nome: string };
}
interface Empresa { id: string; nome: string; }
interface Setor { id: string; nome: string; empresaId: string; }

const emptyForm = {
  nome: '', cpf: '', rg: '', cargo: '', setorId: '', empresaId: '',
  telefone: '', email: '', dataNascimento: '', admissao: '', matricula: '', aso: '',
};

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskRG(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 9);
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1})$/, '$1-$2');
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(/[,;\t]/).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

export default function ColaboradoresTecnico() {
  const [colabs, setColabs] = useState<Colaborador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'importar' | 'cadastrar'>('cadastrar');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ criados: number; erros: string[]; total: number } | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const csvRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

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
      const payload = {
        ...form,
        cpf: form.cpf.replace(/\D/g, '') || null,
        rg: form.rg.replace(/\D/g, '') || null,
        telefone: form.telefone.replace(/\D/g, '') || null,
        setorId: form.setorId || null,
        email: form.email || null,
        dataNascimento: form.dataNascimento || null,
        admissao: form.admissao || null,
        matricula: form.matricula || null,
        aso: form.aso || null,
      };
      if (id) { await api.put(`/colaboradores/${id}`, payload); toast.success('Atualizado!'); }
      else { await api.post('/colaboradores', payload); toast.success('Colaborador criado!'); }
      setShowForm(false); setEditingId(null); setForm(emptyForm); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/colaboradores/${id}`); toast.success('Removido!'); load(); } catch { toast.error('Erro'); }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedEmpresa) { toast.error('Selecione uma empresa primeiro'); return; }
    setImporting(true); setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { toast.error('Nenhum dado encontrado no CSV'); setImporting(false); return; }
      const mapped = rows.map(r => ({
        nome: r.nome || r.name || r.funcionario || r.colaborador || '',
        cpf: r.cpf || r.cpf || '',
        rg: r.rg || '',
        cargo: r.cargo || r.funcao || r.role || '',
        telefone: r.telefone || r.phone || r.tel || '',
        email: r.email || r.mail || '',
        dataNascimento: r.datanascimento || r.nascimento || r.birth || r['data de nascimento'] || '',
        admissao: r.admissao || r.dataadmissao || r.admissão || r['data de admissão'] || '',
        matricula: r.matricula || r.registration || '',
        aso: r.aso || r['atestado de saude'] || '',
      })).filter(r => r.nome);
      const { data } = await api.post('/colaboradores/importar', { colaboradores: mapped, empresaId: selectedEmpresa });
      setImportResult(data);
      toast.success(`${data.criados} colaborador(es) importado(s)!`);
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro na importação'); }
    setImporting(false);
    if (csvRef.current) csvRef.current.value = '';
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedEmpresa) { toast.error('Selecione uma empresa primeiro'); return; }
    setImporting(true); setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('empresaId', selectedEmpresa);
      const { data } = await api.post('/colaboradores/importar-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(data);
      toast.success(`${data.criados} colaborador(es) extraído(s) do PDF!`);
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro na extração do PDF'); }
    setImporting(false);
    if (pdfRef.current) pdfRef.current.value = '';
  };

  const startEdit = (c: Colaborador) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome, cpf: c.cpf || '', rg: c.rg || '', cargo: c.cargo || '',
      setorId: c.setorId || '', empresaId: c.empresaId, telefone: c.telefone || '',
      email: c.email || '', dataNascimento: c.dataNascimento || '', admissao: c.admissao || '',
      matricula: c.matricula || '', aso: c.aso || '',
    });
    setActiveTab('cadastrar');
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Colaboradores</h1>
          <p className="mt-1 text-sm text-navy-500">{colabs.length} colaboradores cadastrados</p>
        </div>
        <button onClick={() => { setShowForm(true); setActiveTab('cadastrar'); setEditingId(null); setForm(emptyForm); }} className="btn-primary">
          <FiPlus size={18} /> Novo Colaborador
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 overflow-hidden">
          <div className="flex border-b border-navy-200">
            <button
              onClick={() => setActiveTab('cadastrar')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'cadastrar' ? 'bg-safety-500 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
            >
              <FiUsers size={16} className="mr-2 inline" /> Cadastrar Manual
            </button>
            <button
              onClick={() => setActiveTab('importar')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'importar' ? 'bg-safety-500 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
            >
              <FiUpload size={16} className="mr-2 inline" /> Importar Planilha / PDF
            </button>
          </div>

          {activeTab === 'cadastrar' ? (
            <div className="p-4 sm:p-6">
              <h3 className="mb-4 text-lg font-bold text-navy-900">{editingId ? 'Editar' : 'Novo'} Colaborador</h3>
              <div className="space-y-3">
                <input className="input-field w-full" placeholder="Nome completo *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className="input-field w-full" placeholder="CPF" value={form.cpf} onChange={e => setForm({ ...form, cpf: maskCPF(e.target.value) })} maxLength={14} />
                  <input className="input-field w-full" placeholder="RG" value={form.rg} onChange={e => setForm({ ...form, rg: maskRG(e.target.value) })} maxLength={12} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className="input-field w-full" placeholder="Cargo" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} />
                  <input className="input-field w-full" placeholder="Telefone" value={form.telefone} onChange={e => setForm({ ...form, telefone: maskPhone(e.target.value) })} maxLength={15} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className="input-field w-full" placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  <input className="input-field w-full" placeholder="Data de Nascimento (DD/MM/AAAA)" value={form.dataNascimento} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className="input-field w-full" placeholder="Data de Admissão (DD/MM/AAAA)" value={form.admissao} onChange={e => setForm({ ...form, admissao: e.target.value })} />
                  <input className="input-field w-full" placeholder="Matrícula" value={form.matricula} onChange={e => setForm({ ...form, matricula: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select className="input-field" value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}>
                    <option value="">Selecione a empresa *</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                  <select className="input-field" value={form.setorId} onChange={e => setForm({ ...form, setorId: e.target.value })}>
                    <option value="">Selecione o setor</option>
                    {setores.filter(s => !form.empresaId || s.empresaId === form.empresaId).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <input className="input-field w-full" placeholder="ASO (Atestado de Saúde Ocupacional)" value={form.aso} onChange={e => setForm({ ...form, aso: e.target.value })} />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleSave(editingId || undefined)} className="btn-primary bg-success-600 hover:bg-success-700"><FiSave size={16} /> Salvar</button>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="btn-primary bg-navy-200 text-navy-700 hover:bg-navy-300"><FiX size={16} /> Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <label className="mb-1 block text-sm font-semibold text-navy-700">Empresa para importação *</label>
                <select className="input-field w-full" value={selectedEmpresa} onChange={e => setSelectedEmpresa(e.target.value)}>
                  <option value="">Selecione a empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div
                  onClick={() => csvRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-navy-300 bg-navy-50 p-6 text-center transition-colors hover:border-safety-400 hover:bg-safety-50"
                >
                  <FiFileText size={32} className="mb-2 text-navy-400" />
                  <p className="font-bold text-navy-700">Importar CSV / Planilha</p>
                  <p className="mt-1 text-xs text-navy-500">Exporte do Excel como CSV e selecione aqui</p>
                  <p className="mt-2 text-xs text-navy-400">Colunas aceitas: nome, cpf, rg, cargo, telefone, email, dataNascimento, admissao, matricula, aso</p>
                  <input ref={csvRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleCSVImport} />
                </div>

                <div
                  onClick={() => pdfRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-navy-300 bg-navy-50 p-6 text-center transition-colors hover:border-safety-400 hover:bg-safety-50"
                >
                  <FiUpload size={32} className="mb-2 text-navy-400" />
                  <p className="font-bold text-navy-700">Importar PDF</p>
                  <p className="mt-1 text-xs text-navy-500">A IA extrai dados automaticamente do documento</p>
                  <p className="mt-2 text-xs text-navy-400">Funcionários, listas, quadros, formulários</p>
                  <input ref={pdfRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handlePDFImport} />
                </div>
              </div>

              {importing && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-safety-50 p-3 text-sm text-safety-700">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-safety-500 border-t-transparent" />
                  Processando...
                </div>
              )}

              {importResult && (
                <div className="mt-4 rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FiCheck size={18} className="text-success-600" />
                    <span className="font-bold text-navy-900">Resultado da Importação</span>
                  </div>
                  <p className="text-sm text-navy-600">
                    {importResult.criados} de {importResult.total} colaborador(es) importado(s) com sucesso.
                  </p>
                  {importResult.erros.length > 0 && (
                    <div className="mt-2">
                      <p className="flex items-center gap-1 text-sm font-semibold text-danger-600"><FiAlertCircle size={14} /> Erros:</p>
                      <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-danger-500">
                        {importResult.erros.map((err, i) => <li key={i}>• {err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => { setShowForm(false); setImportResult(null); }} className="mt-4 btn-primary bg-navy-200 text-navy-700 hover:bg-navy-300"><FiX size={16} /> Fechar</button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {colabs.length === 0 ? (
          <div className="card p-12 text-center">
            <FiUsers size={40} className="mx-auto mb-3 text-navy-300" />
            <p className="font-bold text-navy-600">Nenhum colaborador cadastrado</p>
            <p className="mt-1 text-sm text-navy-400">Importe uma planilha ou cadastre manualmente</p>
          </div>
        ) : colabs.map(c => (
          <div key={c.id} className="card p-4 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-safety-100 text-sm font-bold text-safety-700">{c.nome?.charAt(0)?.toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">{c.nome}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-500">
                      {c.cargo && <span>{c.cargo}</span>}
                      {c.setor?.nome && <span>Setor: {c.setor.nome}</span>}
                      {c.cpf && <span>CPF: {maskCPF(c.cpf)}</span>}
                      {c.telefone && <span>Tel: {maskPhone(c.telefone)}</span>}
                      {c.email && <span>{c.email}</span>}
                      {c.admissao && <span>Admissão: {c.admissao}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(c)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiEdit2 size={14} /></button>
                <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 text-navy-400 hover:bg-danger-100 hover:text-danger-600"><FiTrash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
