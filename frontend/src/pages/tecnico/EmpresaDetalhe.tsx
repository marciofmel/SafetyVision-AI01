import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiUsers, FiClipboard, FiShield, FiAlertTriangle, FiCheckCircle, FiClock, FiMapPin, FiPhone, FiMail, FiGlobe, FiFileText, FiShare2, FiDownload, FiEdit3, FiMessageSquare, FiMail as FiMailIcon } from 'react-icons/fi';
import api from '../../api';

interface Empresa {
  id: string; nome: string; cnpj: string; endereco: string; telefone: string; email: string;
  bairro: string; cidade: string; estado: string; cep: string;
  naturezaJuridica: string; porte: string; dataAbertura: string; capitalSocial: string;
  situacao: string; atividadePrincipal: string; atividadeSecundaria: string;
  simplesNacional: boolean; empresaMEI: boolean; socios: string; site: string; observacoes: string;
  _count?: Record<string, number>;
}

interface Setor { id: string; nome: string; descricao: string; _count?: { inspecoes: number } }
interface Colaborador { id: string; nome: string; cargo: string; setor?: string; email: string; telefone: string; status: string }
interface Inspecao { id: string; status: string; createdAt: string; notaConformidade: number | null; setor?: { nome: string }; _count?: { midias: number; riscos: number; epiViolacoes: number } }

interface Laudo { id: string; titulo: string; tipo: string; createdAt: string; inspecaoId?: string; empresaId: string; aprovado: boolean }
interface PGR { id: string; titulo: string; revisao: number; vigenciaInicio?: string; vigenciaFim?: string; createdAt: string; aprovado: boolean; itens?: any[] }
interface Cronograma { id: string; nome: string; frequencia: string; proximaData?: string; createdAt: string; inspecoes?: any[] }

type Tab = 'visaoGeral' | 'setores' | 'colaboradores' | 'inspecoes' | 'relatorios';

export default function EmpresaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [inspecoes, setInspecoes] = useState<Inspecao[]>([]);
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [pgrs, setPgrs] = useState<PGR[]>([]);
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([]);
  const [tab, setTab] = useState<Tab>('visaoGeral');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(`/empresas/${id}`),
      api.get(`/empresas/${id}/setores`),
      api.get(`/empresas/${id}/colaboradores`),
      api.get(`/empresas/${id}/inspecoes`),
      api.get(`/laudos?empresaId=${id}`),
      api.get(`/pgr?empresaId=${id}`),
      api.get(`/cronogramas?empresaId=${id}`),
    ]).then(([e, s, c, i, l, p, cr]) => {
      setEmpresa(e.data);
      setSetores(s.data);
      setColaboradores(c.data);
      setInspecoes(i.data);
      setLaudos(l.data || []);
      setPgrs(p.data || []);
      setCronogramas(cr.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="card p-12 text-center">
        <p className="text-navy-500">Empresa não encontrada</p>
        <Link to="/tecnico/empresas" className="mt-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700">
          <FiArrowLeft size={16} /> Voltar
        </Link>
      </div>
    );
  }

  const c = empresa._count || {};
  const inspecoesAnalizadas = inspecoes.filter(i => i.status === 'analisada').length;
  const totalRiscos = inspecoes.reduce((acc, i) => acc + (i._count?.riscos || 0), 0);

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'visaoGeral', label: 'Visão Geral', icon: <FiBriefcase size={16} /> },
    { key: 'setores', label: 'Setores', icon: <FiMapPin size={16} />, count: c.setores },
    { key: 'colaboradores', label: 'Colaboradores', icon: <FiUsers size={16} />, count: c.colaboradores },
    { key: 'inspecoes', label: 'Inspeções', icon: <FiClipboard size={16} />, count: c.inspecoes },
    { key: 'relatorios', label: 'Relatórios', icon: <FiFileText size={16} />, count: (laudos.length + pgrs.length + cronogramas.length) },
  ];

  return (
    <div>
      <Link to="/tecnico/empresas" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-navy-700">
        <FiArrowLeft size={16} /> Voltar para Empresas
      </Link>

      <div className="mb-6 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{empresa.nome}</h1>
            {empresa.cnpj && <p className="mt-1 text-sm text-amber-200/80">CNPJ: {empresa.cnpj}</p>}
            {empresa.situacao && (
              <span className="mt-2 inline-block rounded-full bg-success-500/20 px-3 py-1 text-xs font-bold text-success-400">
                {empresa.situacao}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-amber-200/70">
            {empresa.endereco && <span className="flex items-center gap-1"><FiMapPin size={12} /> {empresa.endereco}{empresa.cidade ? `, ${empresa.cidade}/${empresa.estado}` : ''}</span>}
            {empresa.telefone && <span className="flex items-center gap-1"><FiPhone size={12} /> {empresa.telefone}</span>}
            {empresa.email && <span className="flex items-center gap-1"><FiMail size={12} /> {empresa.email}</span>}
            {empresa.site && <span className="flex items-center gap-1"><FiGlobe size={12} /> {empresa.site}</span>}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-navy-900">{c.setores || 0}</p>
          <p className="text-xs text-navy-500">Setores</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-navy-900">{c.colaboradores || 0}</p>
          <p className="text-xs text-navy-500">Colaboradores</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-navy-900">{c.inspecoes || 0}</p>
          <p className="text-xs text-navy-500">Inspeções</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-danger-600">{totalRiscos}</p>
          <p className="text-xs text-navy-500">Riscos Identificados</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${tab === t.key ? 'bg-amber-500 text-navy-900 shadow-lg shadow-amber-500/25' : 'bg-white text-navy-600 hover:bg-navy-50'}`}>
            {t.icon} {t.label} {t.count !== undefined && <span className="ml-1 rounded-full bg-navy-900/10 px-2 py-0.5 text-xs">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'visaoGeral' && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-6">
            <h3 className="mb-3 text-sm font-bold text-navy-900">Dados da Empresa</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: 'Natureza Jurídica', value: empresa.naturezaJuridica },
                { label: 'Porte', value: empresa.porte },
                { label: 'Data de Abertura', value: empresa.dataAbertura },
                { label: 'Capital Social', value: empresa.capitalSocial },
                { label: 'Simples Nacional', value: empresa.simplesNacional ? 'Sim' : 'Não' },
                { label: 'Empresa MEI', value: empresa.empresaMEI ? 'Sim' : 'Não' },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <p className="text-xs font-semibold text-navy-500">{f.label}</p>
                  <p className="text-sm font-medium text-navy-900">{f.value}</p>
                </div>
              ))}
            </div>
            {empresa.atividadePrincipal && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-navy-500">Atividade Principal</p>
                <p className="text-sm text-navy-900">{empresa.atividadePrincipal}</p>
              </div>
            )}
            {empresa.socios && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-navy-500">Sócios</p>
                <p className="text-sm text-navy-900">{empresa.socios}</p>
              </div>
            )}
            {empresa.observacoes && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-navy-500">Observações</p>
                <p className="text-sm text-navy-900">{empresa.observacoes}</p>
              </div>
            )}
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="mb-3 text-sm font-bold text-navy-900">Resumo de conformidade</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-lg font-bold text-success-600">{inspecoesAnalizadas}</p>
                <p className="text-xs text-navy-500">Analisadas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{c.asos || 0}</p>
                <p className="text-xs text-navy-500">ASOs</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{c.treinamentos || 0}</p>
                <p className="text-xs text-navy-500">Treinamentos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-danger-600">{c.incidentes || 0}</p>
                <p className="text-xs text-navy-500">Incidentes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'setores' && (
        <div className="space-y-3">
          {setores.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-sm text-navy-500">Nenhum setor cadastrado</p></div>
          ) : setores.map(s => (
            <div key={s.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-bold text-navy-900">{s.nome}</p>
                {s.descricao && <p className="text-xs text-navy-500">{s.descricao}</p>}
              </div>
              <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold text-navy-600">
                {s._count?.inspecoes || 0} inspeções
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'colaboradores' && (
        <div className="space-y-3">
          {colaboradores.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-sm text-navy-500">Nenhum colaborador cadastrado</p></div>
          ) : colaboradores.map(col => (
            <div key={col.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-bold text-navy-900">{col.nome}</p>
                <div className="flex flex-wrap gap-3 text-xs text-navy-500">
                  {col.cargo && <span>{col.cargo}</span>}
                  {col.setor && <span>Setor: {col.setor}</span>}
                  {col.email && <span>{col.email}</span>}
                  {col.telefone && <span>{col.telefone}</span>}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${col.status === 'ativo' ? 'bg-success-100 text-success-700' : 'bg-navy-100 text-navy-500'}`}>
                {col.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'inspecoes' && (
        <div className="space-y-3">
          {inspecoes.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-sm text-navy-500">Nenhuma inspeção realizada</p></div>
          ) : inspecoes.map(ins => (
            <Link key={ins.id} to={`/tecnico/relatorio/${ins.id}`} className="card block p-4 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-navy-500">{ins.setor?.nome || 'Setor'} · {new Date(ins.createdAt).toLocaleDateString('pt-BR')}</p>
                  <div className="mt-1 flex gap-3 text-xs">
                    <span className="text-navy-600">{ins._count?.midias || 0} mídias</span>
                    <span className="text-danger-600">{ins._count?.riscos || 0} riscos</span>
                    <span className="text-amber-600">{ins._count?.epiViolacoes || 0} EPIs</span>
                  </div>
                </div>
                <div className="text-right">
                  {ins.notaConformidade != null && (
                    <span className={`text-lg font-extrabold ${ins.notaConformidade >= 70 ? 'text-success-600' : ins.notaConformidade >= 40 ? 'text-amber-600' : 'text-danger-600'}`}>
                      {ins.notaConformidade}/100
                    </span>
                  )}
                  <p className={`text-xs font-semibold ${ins.status === 'analisada' ? 'text-success-600' : 'text-amber-600'}`}>
                    {ins.status === 'analisada' ? 'Analisada' : 'Em andamento'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'relatorios' && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><FiFileText size={16} className="text-amber-600" /> Laudos ({laudos.length})</h3>
            {laudos.length === 0 ? <div className="card p-8 text-center text-sm text-navy-500">Nenhum laudo gerado</div> : <div className="space-y-2">{laudos.map(l => (
              <div key={l.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1"><p className="truncate font-bold text-navy-900">{l.titulo}</p><div className="mt-1 flex flex-wrap gap-2 text-xs text-navy-500"><span className={`rounded-full px-2 py-0.5 ${l.aprovado ? 'bg-success-100 text-success-700' : 'bg-amber-100 text-amber-700'}`}>{l.aprovado ? 'Aprovado' : 'Pendente'}</span><span>{l.tipo}</span><span>{new Date(l.createdAt).toLocaleDateString('pt-BR')}</span></div></div>
                <div className="flex gap-1">
                  <button className="rounded-lg p-2 text-navy-400 hover:bg-navy-100" title="Editar"><FiEdit3 size={16} /></button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Laudo: ${l.titulo} - ${window.location.origin}/api/laudos/${l.id}/html`)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-green-600 hover:bg-green-50" title="WhatsApp"><FiMessageSquare size={16} /></a>
                  <a href={`mailto:?subject=${encodeURIComponent(l.titulo)}&body=${encodeURIComponent(`${window.location.origin}/api/laudos/${l.id}/html`)}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="E-mail"><FiMailIcon size={16} /></a>
                  <a href={`/api/laudos/${l.id}/html`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Baixar"><FiDownload size={16} /></a>
                </div>
              </div>
            ))}</div>}
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><FiShield size={16} className="text-navy-600" /> PGRs ({pgrs.length})</h3>
            {pgrs.length === 0 ? <div className="card p-8 text-center text-sm text-navy-500">Nenhum PGR cadastrado</div> : <div className="space-y-2">{pgrs.map(p => (
              <div key={p.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1"><p className="truncate font-bold text-navy-900">{p.titulo}</p><div className="mt-1 flex flex-wrap gap-2 text-xs text-navy-500"><span className={`rounded-full px-2 py-0.5 ${p.aprovado ? 'bg-success-100 text-success-700' : 'bg-amber-100 text-amber-700'}`}>{p.aprovado ? 'Aprovado' : 'Em revisão'}</span><span>Rev {p.revisao}</span><span>{p.itens?.length || 0} itens</span><span>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span></div></div>
                <div className="flex gap-1">
                  <button className="rounded-lg p-2 text-navy-400 hover:bg-navy-100" title="Editar"><FiEdit3 size={16} /></button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`PGR: ${p.titulo}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-green-600 hover:bg-green-50" title="WhatsApp"><FiMessageSquare size={16} /></a>
                  <a href={`mailto:?subject=${encodeURIComponent(p.titulo)}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="E-mail"><FiMailIcon size={16} /></a>
                  <button className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Baixar"><FiDownload size={16} /></button>
                </div>
              </div>
            ))}</div>}
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><FiClipboard size={16} className="text-amber-600" /> Cronogramas ({cronogramas.length})</h3>
            {cronogramas.length === 0 ? <div className="card p-8 text-center text-sm text-navy-500">Nenhum cronograma cadastrado</div> : <div className="space-y-2">{cronogramas.map(c => (
              <div key={c.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1"><p className="truncate font-bold text-navy-900">{c.nome}</p><div className="mt-1 flex flex-wrap gap-2 text-xs text-navy-500"><span className="rounded-full bg-navy-100 px-2 py-0.5 capitalize">{c.frequencia}</span>{c.proximaData && <span>Próxima: {new Date(c.proximaData).toLocaleDateString('pt-BR')}</span>}<span>{c.inspecoes?.length || 0} agendadas</span></div></div>
                <div className="flex gap-1">
                  <button className="rounded-lg p-2 text-navy-400 hover:bg-navy-100" title="Editar"><FiEdit3 size={16} /></button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Cronograma: ${c.nome}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-green-600 hover:bg-green-50" title="WhatsApp"><FiMessageSquare size={16} /></a>
                  <a href={`mailto:?subject=${encodeURIComponent(c.nome)}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="E-mail"><FiMailIcon size={16} /></a>
                  <button className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Baixar"><FiDownload size={16} /></button>
                </div>
              </div>
            ))}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
