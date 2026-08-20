import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiShield, FiAlertTriangle, FiCheckCircle, FiClock, FiCamera, FiArrowRight, FiVideo, FiImage, FiX, FiLoader, FiMapPin } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../../api';
import toast from 'react-hot-toast';

const COLORS = ['#0F172A', '#F59E0B', '#16A34A', '#DC2626', '#EA580C', '#8B5CF6'];

export default function DashboardTecnico() {
  const [stats, setStats] = useState({ total: 0, concluidas: 0, emAndamento: 0, riscos: 0 });
  const [recentes, setRecentes] = useState<any[]>([]);
  const [allInspecoes, setAllInspecoes] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const [capturedPreviews, setCapturedPreviews] = useState<string[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number } | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/inspecoes').then(({ data }) => {
      setAllInspecoes(data);
      setStats({
        total: data.length,
        concluidas: data.filter((i: any) => i.status === 'concluida' || i.status === 'analisada').length,
        emAndamento: data.filter((i: any) => i.status === 'em_andamento').length,
        riscos: data.reduce((acc: number, i: any) => acc + (i._count?.riscos || 0), 0),
      });
      setRecentes(data.slice(0, 5));
    }).catch(() => {});
  }, []);

  const hoje = new Date();
  const daqui30 = new Date();
  daqui30.setDate(daqui30.getDate() + 30);

  const [vencimentos, setVencimentos] = useState({ asosVencidos: 0, asosProximos: 0, episVencidos: 0, episProximos: 0, treinamentosPendentes: 0, treinamentosAtrasados: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [asos, epis, treinamentos] = await Promise.all([
          api.get('/asos'),
          api.get('/epis'),
          api.get('/treinamentos'),
        ]);
        const asoVencidos = asos.data.filter((a: any) => a.validoAte && new Date(a.validoAte) < hoje).length;
        const asoProx = asos.data.filter((a: any) => a.validoAte && new Date(a.validoAte) >= hoje && new Date(a.validoAte) <= daqui30).length;
        const epiVencidos = epis.data.filter((e: any) => e.validadeCa && new Date(e.validadeCa) < hoje && e.status === 'ativo').length;
        const epiProx = epis.data.filter((e: any) => e.validadeCa && new Date(e.validadeCa) >= hoje && new Date(e.validadeCa) <= daqui30 && e.status === 'ativo').length;
        const treinAtrasados = treinamentos.data.filter((t: any) => t.dataFim && new Date(t.dataFim) < hoje && t.status !== 'concluido').length;
        const treinPend = treinamentos.data.filter((t: any) => t.status === 'agendado' || t.status === 'pendente').length;
        setVencimentos({ asosVencidos: asoVencidos, asosProximos: asoProx, episVencidos: epiVencidos, episProximos: epiProx, treinamentosPendentes: treinPend, treinamentosAtrasados: treinAtrasados });
      } catch { /* silencioso */ }
    })();
  }, []);

  useEffect(() => {
    if (showPopup && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeolocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGeolocation(null)
      );
    }
  }, [showPopup]);

  useEffect(() => {
    if (showPopup) {
      api.get('/empresas').then(({ data }) => setEmpresas(data)).catch(() => {});
    }
  }, [showPopup]);

  useEffect(() => {
    if (empresaId) {
      api.get(`/setores?empresaId=${empresaId}`).then(({ data }) => setSetores(data)).catch(() => {});
    }
  }, [empresaId]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    setCapturedFiles(selected);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setCapturedPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setCapturedFiles((prev) => prev.filter((_, i) => i !== index));
    setCapturedPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitQuick = async (filesOverride?: File[], previewsOverride?: string[]) => {
    const filesToSend = filesOverride || capturedFiles;
    if (!empresaId || !setorId) return toast.error('Selecione empresa e setor');
    if (filesToSend.length === 0) return toast.error('Adicione pelo menos um arquivo');
    setUploading(true);
    try {
      const payload: any = { empresaId, setorId };
      if (geolocation) {
        payload.latitude = geolocation.lat;
        payload.longitude = geolocation.lng;
      }
      const { data: inspecao } = await api.post('/inspecoes', payload);
      const formData = new FormData();
      filesToSend.forEach((f) => formData.append('files', f));
      await api.post(`/inspecoes/${inspecao.id}/midias`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Arquivos enviados! Analisando...');
      setShowPopup(false);
      setCapturedFiles([]);
      setCapturedPreviews([]);
      setPreviewIndex(null);
      setEmpresaId('');
      setSetorId('');
      setGeolocation(null);
      navigate(`/tecnico/analise/${inspecao.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  const analyzeSingle = (index: number) => {
    if (capturedFiles[index] && capturedPreviews[index]) {
      setPreviewIndex(null);
      handleSubmitQuick([capturedFiles[index]], [capturedPreviews[index]]);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setCapturedFiles([]);
    setCapturedPreviews([]);
    setPreviewIndex(null);
    setEmpresaId('');
    setSetorId('');
    setGeolocation(null);
  };

  // Chart data
  const inspecoesPorMes = (() => {
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const now = new Date();
    return months.slice(0, now.getMonth() + 1).map((m, i) => ({
      name: m,
      inspecoes: allInspecoes.filter(ins => {
        const d = new Date(ins.createdAt);
        return d.getMonth() === i && d.getFullYear() === now.getFullYear();
      }).length,
    }));
  })();

  const riscosPorCategoria = (() => {
    const cats: Record<string, number> = {};
    allInspecoes.forEach(ins => {
      (ins.riscos || []).forEach((r: any) => {
        cats[r.categoria] = (cats[r.categoria] || 0) + 1;
      });
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  })();

  const statusData = [
    { name: 'Concluídas', value: stats.concluidas },
    { name: 'Em Andamento', value: stats.emAndamento },
    { name: 'Total', value: stats.total - stats.concluidas - stats.emAndamento },
  ].filter(d => d.value > 0);

  const cards = [
    { label: 'Minhas Inspeções', value: stats.total, icon: <FiShield />, color: 'bg-navy-900', textColor: 'text-amber-400' },
    { label: 'Concluídas', value: stats.concluidas, icon: <FiCheckCircle />, color: 'bg-success-600', textColor: 'text-white' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: <FiClock />, color: 'bg-amber-500', textColor: 'text-navy-900' },
    { label: 'Riscos Encontrados', value: stats.riscos, icon: <FiAlertTriangle />, color: 'bg-danger-600', textColor: 'text-white' },
  ];

  return (
    <div>
      {/* Hidden file inputs */}
      <input ref={photoRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFiles} className="hidden" />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" multiple onChange={handleFiles} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />

      {/* Popup Inspeção */}
      {showPopup && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4">
              <h2 className="text-lg font-bold text-navy-900">Nova Inspeção</h2>
              <button onClick={closePopup} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Capture */}
              {capturedFiles.length === 0 && (
                <div className="space-y-3">
                  <p className="mb-4 text-center text-sm text-navy-500">Capture ou selecione uma mídia</p>
                  <button onClick={() => photoRef.current?.click()} className="flex w-full items-center gap-4 rounded-xl border-2 border-navy-100 p-5 transition-all hover:border-amber-400 hover:bg-amber-50/50 group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 text-amber-400 group-hover:bg-amber-500 group-hover:text-navy-900 transition-all">
                      <FiCamera size={28} />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold text-navy-900">Tirar Foto</p>
                      <p className="text-xs text-navy-400">Câmera do celular</p>
                    </div>
                  </button>
                  <button onClick={() => videoRef.current?.click()} className="flex w-full items-center gap-4 rounded-xl border-2 border-navy-100 p-5 transition-all hover:border-amber-400 hover:bg-amber-50/50 group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 text-amber-400 group-hover:bg-amber-500 group-hover:text-navy-900 transition-all">
                      <FiVideo size={28} />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold text-navy-900">Gravar Vídeo</p>
                      <p className="text-xs text-navy-400">Vídeo curto do local</p>
                    </div>
                  </button>
                  <button onClick={() => galleryRef.current?.click()} className="flex w-full items-center gap-4 rounded-xl border-2 border-navy-100 p-5 transition-all hover:border-amber-400 hover:bg-amber-50/50 group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 text-amber-400 group-hover:bg-amber-500 group-hover:text-navy-900 transition-all">
                      <FiImage size={28} />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold text-navy-900">Galeria</p>
                      <p className="text-xs text-navy-400">Fotos ou vídeos salvos</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2: Form */}
              {capturedFiles.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-bold text-navy-900">{capturedFiles.length} arquivo(s) selecionado(s)</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {capturedPreviews.map((p, i) => (
                        <div key={i} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ${p.startsWith('data:image') ? 'cursor-pointer' : ''}`} onClick={() => p.startsWith('data:image') && setPreviewIndex(i)}>
                          {p.startsWith('data:video') ? (
                            <video src={p} className="h-full w-full object-cover" />
                          ) : (
                            <img src={p} alt="" className="h-full w-full object-cover" />
                          )}
                          <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="absolute right-0.5 top-0.5 rounded-full bg-danger-600 p-0.5 text-white">
                            <FiX size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setCapturedFiles([]); setCapturedPreviews([]); }} className="text-xs font-semibold text-amber-600 hover:text-amber-700">
                      + Adicionar mais
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-navy-700">Empresa *</label>
                    <select className="input-field w-full" value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setSetorId(''); }}>
                      <option value="">Selecione a empresa...</option>
                      {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-navy-700">Setor *</label>
                    <select className="input-field w-full" value={setorId} onChange={(e) => setSetorId(e.target.value)} disabled={!empresaId}>
                      <option value="">Selecione o setor...</option>
                      {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>

                  {geolocation && (
                    <div className="flex items-center gap-2 rounded-xl bg-success-50 px-4 py-2 text-xs text-success-700">
                      <FiMapPin size={14} />
                      GPS: {geolocation.lat.toFixed(6)}, {geolocation.lng.toFixed(6)}
                    </div>
                  )}

                  <button onClick={() => handleSubmitQuick()} disabled={!empresaId || !setorId || uploading} className="btn-primary w-full py-3 text-base disabled:opacity-50">
                    {uploading ? <FiLoader className="animate-spin" size={18} /> : <FiCamera size={18} />}
                    {uploading ? 'Enviando...' : 'Enviar e Analisar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview da foto selecionada com botao Analisar com IA */}
      {previewIndex !== null && capturedPreviews[previewIndex] && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewIndex(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={capturedPreviews[previewIndex]} alt="Prévia da inspeção" className="max-h-[55vh] w-full bg-navy-900 object-contain" />
            <div className="flex flex-col gap-3 p-4 sm:flex-row">
              <button onClick={() => analyzeSingle(previewIndex)} disabled={uploading} className="btn-primary flex-1 bg-success-600 text-base">
                {uploading ? <FiLoader className="animate-spin" size={18} /> : <FiCamera size={18} />}
                {uploading ? 'Enviando...' : 'Analisar com IA'}
              </button>
              <button onClick={() => setPreviewIndex(null)} className="rounded-xl border-2 border-navy-200 px-6 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Meu Painel</h1>
          <p className="mt-1 text-sm text-navy-500">Suas inspeções de segurança do trabalho</p>
        </div>
        <Link to="/tecnico/nova-inspecao" className="hidden sm:flex btn-primary">
          <FiPlus size={18} /> Inspeção Completa
        </Link>
      </div>

      {/* Botão grande Fazer Inspeção Agora */}
      <button
        onClick={() => setShowPopup(true)}
        className="mb-8 flex w-full items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-navy-900 shadow-xl shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-2xl hover:shadow-amber-500/30 active:scale-[0.98] sm:hidden"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 text-amber-400">
          <FiCamera size={28} />
        </div>
        <div className="text-left">
          <p className="text-xl font-extrabold">Fazer Inspeção Agora</p>
          <p className="text-sm text-navy-700/70">Tire foto, grave vídeo ou escolha da galeria</p>
        </div>
      </button>

      {/* Desktop: 3 botões */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-6 shadow-xl sm:p-8 hidden sm:block">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-navy-900">
            <FiCamera size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Iniciar Inspeção</h2>
          <p className="mt-1 text-sm text-amber-200/80">Capture agora e receba a análise da IA em segundos</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button onClick={() => photoRef.current?.click()} className="group flex flex-col items-center gap-3 rounded-xl bg-amber-500 p-6 text-navy-900 transition-all hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25">
            <FiCamera size={36} className="transition-transform group-hover:scale-110" />
            <div className="text-center">
              <p className="text-base font-bold">Tirar Foto</p>
              <p className="text-xs text-navy-700/70">Câmera do celular</p>
            </div>
          </button>
          <button onClick={() => videoRef.current?.click()} className="group flex flex-col items-center gap-3 rounded-xl bg-white/10 p-6 text-white transition-all hover:bg-white/20 hover:shadow-lg">
            <FiVideo size={36} className="transition-transform group-hover:scale-110" />
            <div className="text-center">
              <p className="text-base font-bold">Gravar Vídeo</p>
              <p className="text-xs text-white/60">Vídeo curto do local</p>
            </div>
          </button>
          <button onClick={() => galleryRef.current?.click()} className="group flex flex-col items-center gap-3 rounded-xl bg-white/10 p-6 text-white transition-all hover:bg-white/20 hover:shadow-lg">
            <FiImage size={36} className="transition-transform group-hover:scale-110" />
            <div className="text-center">
              <p className="text-base font-bold">Galeria</p>
              <p className="text-xs text-white/60">Fotos ou vídeos salvos</p>
            </div>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card overflow-hidden">
            <div className={`${c.color} p-5`}>
              <div className={`${c.textColor} opacity-80`}>{c.icon}</div>
              <p className={`mt-3 text-3xl font-extrabold ${c.textColor}`}>{c.value}</p>
              <p className={`mt-1 text-sm ${c.textColor} opacity-80`}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Vencimentos (FASE 7) */}
      <div className="mb-8">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy-500">
          <FiAlertTriangle size={16} className="text-amber-500" /> Vencimentos e Pendências
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/tecnico/asos" className="card overflow-hidden transition-all hover:border-danger-200 hover:shadow-md">
            <div className="flex items-center justify-between border-b border-navy-100 p-4">
              <p className="text-sm font-bold text-navy-900">ASOs</p>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-500">NR-7</span>
            </div>
            <div className="flex items-center justify-around p-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-danger-600">{vencimentos.asosVencidos}</p>
                <p className="text-[11px] font-semibold text-navy-400">Vencidos</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-amber-500">{vencimentos.asosProximos}</p>
                <p className="text-[11px] font-semibold text-navy-400">Vencem em 30d</p>
              </div>
            </div>
          </Link>

          <Link to="/tecnico/epis" className="card overflow-hidden transition-all hover:border-danger-200 hover:shadow-md">
            <div className="flex items-center justify-between border-b border-navy-100 p-4">
              <p className="text-sm font-bold text-navy-900">EPIs</p>
              <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-500">CA</span>
            </div>
            <div className="flex items-center justify-around p-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-danger-600">{vencimentos.episVencidos}</p>
                <p className="text-[11px] font-semibold text-navy-400">CA Vencido</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-amber-500">{vencimentos.episProximos}</p>
                <p className="text-[11px] font-semibold text-navy-400">Vencem em 30d</p>
              </div>
            </div>
          </Link>

          <Link to="/tecnico/treinamentos" className="card overflow-hidden transition-all hover:border-danger-200 hover:shadow-md">
            <div className="flex items-center justify-between border-b border-navy-100 p-4">
              <p className="text-sm font-bold text-navy-900">Treinamentos</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">NRs</span>
            </div>
            <div className="flex items-center justify-around p-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-danger-600">{vencimentos.treinamentosAtrasados}</p>
                <p className="text-[11px] font-semibold text-navy-400">Atrasados</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-amber-500">{vencimentos.treinamentosPendentes}</p>
                <p className="text-[11px] font-semibold text-navy-400">Pendentes</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Charts */}
      {allInspecoes.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Inspeções por Mês */}
          <div className="card p-6 lg:col-span-2">
            <h3 className="mb-4 font-bold text-navy-900">Inspeções por Mês</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inspecoesPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="inspecoes" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Pie */}
          <div className="card p-6">
            <h3 className="mb-4 font-bold text-navy-900">Status das Inspeções</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Riscos por Categoria */}
      {riscosPorCategoria.length > 0 && (
        <div className="card mb-8 p-6">
          <h3 className="mb-4 font-bold text-navy-900">Riscos por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riscosPorCategoria} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#DC2626" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {recentes.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-900">Inspeções Recentes</h2>
          <div className="space-y-3">
            {recentes.map((insp: any) => (
              <div key={insp.id} className="flex items-center justify-between rounded-xl border border-navy-100 p-4 transition-all hover:border-amber-200 hover:bg-amber-50/30">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
                    <FiShield size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{insp.empresa?.nome} — {insp.setor?.nome}</p>
                    <p className="text-xs text-navy-400">
                      {new Date(insp.createdAt).toLocaleDateString('pt-BR')} · {insp._count?.riscos || 0} riscos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {insp.latitude && (
                    <span className="flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-700">
                      <FiMapPin size={10} /> GPS
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    insp.status === 'concluida' ? 'bg-success-100 text-success-700' :
                    insp.status === 'analisada' ? 'bg-navy-100 text-navy-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {insp.status === 'em_andamento' ? 'Em andamento' : insp.status === 'analisada' ? 'Analisada' : 'Concluída'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
