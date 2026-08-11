import { useState, useEffect } from 'react';
import api from '../../api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUsers, FiCalendar, FiFileText, FiX, FiChevronDown, FiChevronUp, FiMessageSquare } from 'react-icons/fi';

interface CIPA {
  id: string;
  empresaId: string;
  nome: string;
  cnpj?: string;
  cnae?: string;
  grauRisco?: string;
  efetivo?: number;
  siprat?: number;
  dadosAtuais?: string;
  mandatoInicio?: string;
  mandatoFim?: string;
  eleicaoData?: string;
  eleicaoAta?: string;
  reunioes?: string;
  observacoes?: string;
  empresa: { id: string; nome: string };
}

interface Empresa { id: string; nome: string; }

interface Membro {
  nome: string;
  cargo: string;
  setor?: string;
  telefone?: string;
  email?: string;
  eleito?: boolean;
}

interface Reuniao {
  data: string;
  pauta?: string;
  presentes?: string;
  decisoes?: string;
}

export default function CIPATecnico() {
  const [cipas, setCipas] = useState<CIPA[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<CIPA | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalReuniao, setModalReuniao] = useState<string | null>(null);
  const [form, setForm] = useState({
    empresaId: '', nome: '', cnpj: '', cnae: '', grauRisco: '', efetivo: '', siprat: '',
    dadosAtuais: '', mandatoInicio: '', mandatoFim: '', eleicaoData: '', eleicaoAta: '', observacoes: ''
  });
  const [membros, setMembros] = useState<Membro[]>([]);
  const [novoMembro, setNovoMembro] = useState<Membro>({ nome: '', cargo: 'membro', setor: '', telefone: '', email: '' });
  const [formReuniao, setFormReuniao] = useState({ data: '', pauta: '', presentes: '', decisoes: '' });

  const carregar = async () => {
    try {
      const [r1, r2] = await Promise.all([api.get('/cipa'), api.get('/empresas')]);
      setCipas(r1.data); setEmpresas(r2.data);
    } catch {}
  };

  useEffect(() => { carregar(); }, []);

  const cipasFiltradas = cipas.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.empresa.nome.toLowerCase().includes(busca.toLowerCase()));

  const abrirNovo = () => {
    setEditando(null); setMembros([]);
    setForm({ empresaId: empresas[0]?.id || '', nome: '', cnpj: '', cnae: '', grauRisco: '', efetivo: '', siprat: '', dadosAtuais: '', mandatoInicio: '', mandatoFim: '', eleicaoData: '', eleicaoAta: '', observacoes: '' });
    setModalOpen(true);
  };

  const abrirEditar = (cipa: CIPA) => {
    setEditando(cipa);
    let membrosParse: Membro[] = [];
    try { if (cipa.dadosAtuais) membrosParse = JSON.parse(cipa.dadosAtuais); } catch {}
    setMembros(membrosParse);
    setForm({
      empresaId: cipa.empresaId, nome: cipa.nome, cnpj: cipa.cnpj || '', cnae: cipa.cnae || '',
      grauRisco: cipa.grauRisco || '', efetivo: cipa.efetivo?.toString() || '', siprat: cipa.siprat?.toString() || '',
      dadosAtuais: '', mandatoInicio: cipa.mandatoInicio?.split('T')[0] || '', mandatoFim: cipa.mandatoFim?.split('T')[0] || '',
      eleicaoData: cipa.eleicaoData?.split('T')[0] || '', eleicaoAta: cipa.eleicaoAta || '', observacoes: cipa.observacoes || ''
    });
    setModalOpen(true);
  };

  const salvar = async () => {
    try {
      const body: any = {
        ...form, efetivo: form.efetivo ? parseInt(form.efetivo) : null, siprat: form.siprat ? parseInt(form.siprat) : null,
        dadosAtuais: JSON.stringify(membros), mandatoInicio: form.mandatoInicio || null, mandatoFim: form.mandatoFim || null,
        eleicaoData: form.eleicaoData || null,
      };
      if (editando) await api.put(`/cipa/${editando.id}`, body);
      else await api.post('/cipa', body);
      setModalOpen(false); carregar();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro ao salvar CIPA'); }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir esta CIPA?')) return;
    try { await api.delete(`/cipa/${id}`); carregar(); } catch {}
  };

  const adicionarMembro = () => {
    if (!novoMembro.nome) return;
    setMembros([...membros, { ...novoMembro }]);
    setNovoMembro({ nome: '', cargo: 'membro', setor: '', telefone: '', email: '' });
  };

  const removerMembro = (idx: number) => setMembros(membros.filter((_, i) => i !== idx));

  const salvarReuniao = async (cipaId: string) => {
    try {
      await api.post(`/cipa/${cipaId}/reunioes`, formReuniao);
      setModalReuniao(null); setFormReuniao({ data: '', pauta: '', presentes: '', decisoes: '' }); carregar();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro ao salvar reunião'); }
  };

  const parseReunioes = (json?: string): Reuniao[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  };

  const parseMembros = (json?: string): Membro[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">CIPA</h1>
          <p className="text-sm text-navy-400">Comissão Interna de Prevenção de Acidentes (NR-5)</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-amber-400 hover:bg-navy-800 transition-colors">
          <FiPlus size={18} /> Nova CIPA
        </button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, empresa..."
          className="w-full rounded-xl border border-navy-200 bg-white py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-navy-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
      </div>

      <div className="grid gap-4">
        {cipasFiltradas.length === 0 && (
          <div className="rounded-xl border border-navy-100 bg-white p-12 text-center">
            <FiUsers className="mx-auto mb-3 text-navy-200" size={48} />
            <p className="text-navy-400">Nenhuma CIPA cadastrada</p>
          </div>
        )}
        {cipasFiltradas.map(cipa => {
          const membros = parseMembros(cipa.dadosAtuais);
          const reunioes = parseReunioes(cipa.reunioes);
          const isExpanded = expanded === cipa.id;
          return (
            <div key={cipa.id} className="rounded-xl border border-navy-100 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100"><FiUsers className="text-navy-600" /></div>
                  <div>
                    <h3 className="font-semibold text-navy-900">{cipa.nome}</h3>
                    <p className="text-sm text-navy-400">{cipa.empresa.nome}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-navy-400">
                      {cipa.grauRisco && <span>Grau: {cipa.grauRisco}</span>}
                      {cipa.efetivo && <span>• Efetivo: {cipa.efetivo}</span>}
                      {cipa.mandatoInicio && <span>• Mandato: {new Date(cipa.mandatoInicio).toLocaleDateString('pt-BR')} a {cipa.mandatoFim ? new Date(cipa.mandatoFim).toLocaleDateString('pt-BR') : '—'}</span>}
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-navy-500">{membros.length} membro(s)</span>
                      <span className="text-navy-500">{reunioes.length} reunião(ões)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpanded(isExpanded ? null : cipa.id)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50">
                    {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                  <button onClick={() => setModalReuniao(cipa.id)} className="rounded-lg p-2 text-navy-400 hover:bg-blue-50 hover:text-blue-600" title="Nova reunião"><FiMessageSquare size={16} /></button>
                  <button onClick={() => abrirEditar(cipa)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-700"><FiEdit2 size={16} /></button>
                  <button onClick={() => excluir(cipa.id)} className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600"><FiTrash2 size={16} /></button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-navy-100 p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-navy-700 mb-2 flex items-center gap-2"><FiUsers /> Membros</h4>
                    {membros.length === 0 ? <p className="text-sm text-navy-400">Nenhum membro cadastrado</p> : (
                      <div className="space-y-2">
                        {membros.map((m, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-navy-50 p-3">
                            <div>
                              <span className="text-sm font-medium text-navy-900">{m.nome}</span>
                              <span className="ml-2 text-xs text-navy-400">({m.cargo})</span>
                              {m.setor && <span className="ml-2 text-xs text-navy-300">• {m.setor}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy-700 mb-2 flex items-center gap-2"><FiCalendar /> Reuniões</h4>
                    {reunioes.length === 0 ? <p className="text-sm text-navy-400">Nenhuma reunião registrada</p> : (
                      <div className="space-y-2">
                        {reunioes.map((r, i) => (
                          <div key={i} className="rounded-lg bg-navy-50 p-3">
                            <p className="text-sm font-medium text-navy-900">{new Date(r.data).toLocaleDateString('pt-BR')}</p>
                            {r.pauta && <p className="text-xs text-navy-500 mt-1">Pauta: {r.pauta}</p>}
                            {r.decisoes && <p className="text-xs text-green-600 mt-1">Decisões: {r.decisoes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy-900">{editando ? 'Editar CIPA' : 'Nova CIPA'}</h2>
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
                <label className="mb-1 block text-sm font-medium text-navy-700">Nome *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: CIPA Matriz"
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Grau de Risco</label>
                <select value={form.grauRisco} onChange={e => setForm({ ...form, grauRisco: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none">
                  <option value="">Selecione...</option>
                  <option value="1">Grau 1</option><option value="2">Grau 2</option><option value="3">Grau 3</option><option value="4">Grau 4</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Efetivo</label>
                <input type="number" value={form.efetivo} onChange={e => setForm({ ...form, efetivo: e.target.value })} placeholder="Nº de funcionários"
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Início Mandato</label>
                <input type="date" value={form.mandatoInicio} onChange={e => setForm({ ...form, mandatoInicio: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Fim Mandato</label>
                <input type="date" value={form.mandatoFim} onChange={e => setForm({ ...form, mandatoFim: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Data da Eleição</label>
                <input type="date" value={form.eleicaoData} onChange={e => setForm({ ...form, eleicaoData: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-navy-700">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none resize-none" />
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-navy-700 mb-3">Membros da CIPA</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                <input value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} placeholder="Nome"
                  className="sm:col-span-2 rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
                <select value={novoMembro.cargo} onChange={e => setNovoMembro({ ...novoMembro, cargo: e.target.value })}
                  className="rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none">
                  <option value="presidente">Presidente</option><option value="vice-presidente">Vice-Presidente</option>
                  <option value="secretario">Secretário</option><option value="membro">Membro</option><option value="suplente">Suplente</option>
                </select>
                <input value={novoMembro.setor || ''} onChange={e => setNovoMembro({ ...novoMembro, setor: e.target.value })} placeholder="Setor"
                  className="rounded-xl border border-navy-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
                <button onClick={adicionarMembro} className="rounded-xl bg-navy-900 px-3 py-2 text-sm font-semibold text-amber-400 hover:bg-navy-800">+</button>
              </div>
              {membros.length > 0 && (
                <div className="mt-3 space-y-1">
                  {membros.map((m, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
                      <span className="text-sm text-navy-700">{m.nome} <span className="text-xs text-navy-400">({m.cargo})</span></span>
                      <button onClick={() => removerMembro(i)} className="text-red-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-600 hover:bg-navy-50">Cancelar</button>
              <button onClick={salvar} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-amber-400 hover:bg-navy-800">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {modalReuniao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-navy-900">Nova Reunião CIPA</h2>
              <button onClick={() => setModalReuniao(null)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><FiX size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Data *</label>
                <input type="date" value={formReuniao.data} onChange={e => setFormReuniao({ ...formReuniao, data: e.target.value })}
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Pauta</label>
                <textarea value={formReuniao.pauta} onChange={e => setFormReuniao({ ...formReuniao, pauta: e.target.value })} rows={3} placeholder="Pauta da reunião..."
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Presentes</label>
                <input value={formReuniao.presentes} onChange={e => setFormReuniao({ ...formReuniao, presentes: e.target.value })} placeholder="Nomes dos presentes..."
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-navy-700">Decisões</label>
                <textarea value={formReuniao.decisoes} onChange={e => setFormReuniao({ ...formReuniao, decisoes: e.target.value })} rows={2} placeholder="Decisões tomadas..."
                  className="w-full rounded-xl border border-navy-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setModalReuniao(null)} className="rounded-xl border border-navy-200 px-4 py-2 text-sm text-navy-600 hover:bg-navy-50">Cancelar</button>
              <button onClick={() => salvarReuniao(modalReuniao)} className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-navy-800">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
