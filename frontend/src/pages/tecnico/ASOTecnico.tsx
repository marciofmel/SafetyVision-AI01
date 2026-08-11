import { useState, useEffect } from 'react';
import api from '../../api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiAlertTriangle, FiCheckCircle, FiClock, FiFileText, FiX, FiFilter } from 'react-icons/fi';

interface ASO {
  id: string;
  colaboradorId: string;
  empresaId: string;
  tipoExame: string;
  dataExame: string;
  validoAte: string;
  medico?: string;
  crm?: string;
  resultado: string;
  restricoes?: string;
  examesComplementares?: string;
  observacoes?: string;
  status: string;
  colaborador: { id: string; nome: string; cpf?: string };
  empresa: { id: string; nome: string };
}

interface Colaborador { id: string; nome: string; cpf?: string; }
interface Empresa { id: string; nome: string; }

export default function ASOTecnico() {
  const [asos, setAsos] = useState<ASO[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<ASO | null>(null);
  const [alertas, setAlertas] = useState<any>({ vencidos: [], proximos: [], totalVencidos: 0, totalProximos: 0 });
  const [form, setForm] = useState({
    colaboradorId: '', empresaId: '', tipoExame: 'admissional', dataExame: '',
    validoAte: '', medico: '', crm: '', resultado: 'apto', restricoes: '',
    examesComplementares: '', observacoes: ''
  });

  const carregar = async () => {
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        api.get('/asos'), api.get('/colaboradores'), api.get('/empresas'), api.get('/asos/alertas')
      ]);
      setAsos(r1.data); setColaboradores(r2.data); setEmpresas(r3.data); setAlertas(r4.data);
    } catch {}
  };

  useEffect(() => { carregar(); }, []);

  const tiposExame = [
    { value: 'admissional', label: 'Admissional' },
    { value: 'demissional', label: 'Demissional' },
    { value: 'periodico', label: 'Periódico' },
    { value: 'retorno', label: 'Retorno ao Trabalho' },
    { value: 'mudanca', label: 'Mudança de Função' },
  ];

  const statusColor = (s: string) => {
    if (s === 'vencido') return 'bg-red-100 text-red-700 border-red-200';
    if (s === 'proximo_vencimento') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const statusIcon = (s: string) => {
    if (s === 'vencido') return <FiAlertTriangle className="text-red-500" />;
    if (s === 'proximo_vencimento') return <FiClock className="text-amber-500" />;
    return <FiCheckCircle className="text-green-500" />;
  };

  const asosFiltrados = asos.filter(a => {
    const matchBusca = !busca || a.colaborador.nome.toLowerCase().includes(busca.toLowerCase()) || a.medico?.toLowerCase().includes(busca.toLowerCase());
    const matchFiltro = filtro === 'todos' || a.status === filtro || a.tipoExame === filtro;
    return matchBusca && matchFiltro;
  });

  const abrirNovo = () => {
    setEditando(null);
    setForm({ colaboradorId: '', empresaId: empresas[0]?.id || '', tipoExame: 'admissional', dataExame: '', validoAte: '', medico: '', crm: '', resultado: 'apto', restricoes: '', examesComplementares: '', observacoes: '' });
    setModalOpen(true);
  };

  const abrirEditar = (aso: ASO) => {
    setEditando(aso);
    setForm({
      colaboradorId: aso.colaboradorId, empresaId: aso.empresaId, tipoExame: aso.tipoExame,
      dataExame: aso.dataExame.split('T')[0], validoAte: aso.validoAte.split('T')[0],
      medico: aso.medico || '', crm: aso.crm || '', resultado: aso.resultado,
      restricoes: aso.restricoes || '', examesComplementares: aso.examesComplementares || '', observacoes: aso.observacoes || ''
    });
    setModalOpen(true);
  };

  const salvar = async () => {
    try {
      const body = { ...form, dataExame: form.dataExame + 'T00:00:00.000Z', validoAte: form.validoAte + 'T00:00:00.000Z' };
      if (editando) await api.put(`/asos/${editando.id}`, body);
      else await api.post('/asos', body);
      setModalOpen(false); carregar();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro ao salvar ASO'); }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir este ASO?')) return;
    try { await api.delete(`/asos/${id}`); carregar(); } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">ASOs</h1>
          <p className="text-sm text-navy-400">Atestados de Saúde Ocupacional (NR-7)</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-amber-400 hover:bg-navy-800 transition-colors">
          <FiPlus size={18} /> Novo ASO
        </button>
      </div>

      {alertas.totalVencidos > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold"><FiAlertTriangle /> {alertas.totalVencidos} ASO(s) vencido(s)</div>
        </div>
      )}
      {alertas.totalProximos > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700 font-semibold"><FiClock /> {alertas.totalProximos} ASO(s) próximo(s) do vencimento</div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por colaborador, médico..."
            className="w-full rounded-xl border border-navy-200 bg-white py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-navy-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="text-navy-300" />
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className="rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-700 focus:border-amber-400 focus:outline-none">
            <option value="todos">Todos</option>
            <option value="valido">Válidos</option>
            <option value="proximo_vencimento">Próx. Vencimento</option>
            <option value="vencido">Vencidos</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {asosFiltrados.length === 0 && (
          <div className="rounded-xl border border-navy-100 bg-white p-12 text-center">
            <FiFileText className="mx-auto mb-3 text-navy-200" size={48} />
            <p className="text-navy-400">Nenhum ASO encontrado</p>
          </div>
        )}
        {asosFiltrados.map(aso => (
          <div key={aso.id} className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1">{statusIcon(aso.status)}</div>
                <div>
                  <h3 className="font-semibold text-navy-900">{aso.colaborador.nome}</h3>
                  <p className="text-sm text-navy-400">{aso.empresa.nome} • {aso.tipoExame.charAt(0).toUpperCase() + aso.tipoExame.slice(1)}</p>
                  {aso.medico && <p className="text-xs text-navy-300 mt-1">Dr(a). {aso.medico} {aso.crm ? `- CRM ${aso.crm}` : ''}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-navy-400">
                    <span>Exame: {new Date(aso.dataExame).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span>Válido até: {new Date(aso.validoAte).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span className={aso.resultado === 'apto' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {aso.resultado === 'apto' ? 'APTO' : 'INAPTO'}
                    </span>
                  </div>
                  {aso.restricoes && <p className="text-xs text-amber-600 mt-1">Restrições: {aso.restricoes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(aso.status)}`}>
                  {aso.status === 'vencido' ? 'VENCIDO' : aso.status === 'proximo_vencimento' ? 'PRÓX. VENC.' : 'VÁLIDO'}
                </span>
                <button onClick={() => abrirEditar(aso)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-700"><FiEdit2 size={16} /></button>
                <button onClick={() => excluir(aso.id)} className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600"><FiTrash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy-900">{editando ? 'Editar ASO' : 'Novo ASO'}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiX size={20} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Empresa *</label>
                <select value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none">
                  <option value="">Selecione...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Colaborador *</label>
                <select value={form.colaboradorId} onChange={e => setForm({ ...form, colaboradorId: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none">
                  <option value="">Selecione...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Tipo de Exame *</label>
                <select value={form.tipoExame} onChange={e => setForm({ ...form, tipoExame: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none">
                  {tiposExame.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Resultado *</label>
                <select value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none">
                  <option value="apto">Apto</option>
                  <option value="inapto">Inapto</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Data do Exame *</label>
                <input type="date" value={form.dataExame} onChange={e => setForm({ ...form, dataExame: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Válido até *</label>
                <input type="date" value={form.validoAte} onChange={e => setForm({ ...form, validoAte: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Médico</label>
                <input value={form.medico} onChange={e => setForm({ ...form, medico: e.target.value })} placeholder="Nome do médico"
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">CRM</label>
                <input value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })} placeholder="CRM/UF"
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-navy-700">Restrições</label>
                <textarea value={form.restricoes} onChange={e => setForm({ ...form, restricoes: e.target.value })} rows={2} placeholder="Restrições médicas..."
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none resize-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-navy-700">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-600 hover:bg-navy-50">Cancelar</button>
              <button onClick={salvar} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-amber-400 hover:bg-navy-800">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
