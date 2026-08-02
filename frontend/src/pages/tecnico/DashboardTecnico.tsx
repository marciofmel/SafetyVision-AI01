import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiShield, FiAlertTriangle, FiCheckCircle, FiClock, FiCamera, FiArrowRight, FiVideo, FiImage, FiX, FiLoader } from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

export default function DashboardTecnico() {
  const [stats, setStats] = useState({ total: 0, concluidas: 0, emAndamento: 0, riscos: 0 });
  const [recentes, setRecentes] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const [capturedPreviews, setCapturedPreviews] = useState<string[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [uploading, setUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/inspecoes').then(({ data }) => {
      setStats({
        total: data.length,
        concluidas: data.filter((i: any) => i.status === 'concluida' || i.status === 'analisada').length,
        emAndamento: data.filter((i: any) => i.status === 'em_andamento').length,
        riscos: data.reduce((acc: number, i: any) => acc + (i._count?.riscos || 0), 0),
      });
      setRecentes(data.slice(0, 5));
    }).catch(() => {});
  }, []);

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

  const handleSubmitQuick = async () => {
    if (!empresaId || !setorId) return toast.error('Selecione empresa e setor');
    if (capturedFiles.length === 0) return toast.error('Adicione pelo menos um arquivo');
    setUploading(true);
    try {
      const { data: inspecao } = await api.post('/inspecoes', { empresaId, setorId });
      const formData = new FormData();
      capturedFiles.forEach((f) => formData.append('files', f));
      await api.post(`/inspecoes/${inspecao.id}/midias`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Arquivos enviados! Analisando...');
      setShowPopup(false);
      setCapturedFiles([]);
      setCapturedPreviews([]);
      setEmpresaId('');
      setSetorId('');
      navigate(`/tecnico/analise/${inspecao.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setCapturedFiles([]);
    setCapturedPreviews([]);
    setEmpresaId('');
    setSetorId('');
  };

  const cards = [
    { label: 'Minhas Inspeções', value: stats.total, icon: <FiShield />, color: 'bg-navy-900', textColor: 'text-amber-400' },
    { label: 'Concluídas', value: stats.concluidas, icon: <FiCheckCircle />, color: 'bg-success-600', textColor: 'text-white' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: <FiClock />, color: 'bg-amber-500', textColor: 'text-navy-900' },
    { label: 'Riscos Encontrados', value: stats.riscos, icon: <FiAlertTriangle />, color: 'bg-danger-600', textColor: 'text-white' },
  ];

  const steps = [
    { num: 1, title: 'Selecionar Empresa', desc: 'Escolha a empresa', icon: <FiShield size={20} /> },
    { num: 2, title: 'Escolher Setor', desc: 'Selecione o setor', icon: <FiAlertTriangle size={20} /> },
    { num: 3, title: 'Capturar Fotos', desc: 'Tire fotos do local', icon: <FiCamera size={20} /> },
    { num: 4, title: 'Análise IA', desc: 'IA analisa riscos', icon: <FiCheckCircle size={20} /> },
    { num: 5, title: 'Gerar Relatório', desc: 'PDF completo', icon: <FiCheckCircle size={20} /> },
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
                        <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                          {p.startsWith('data:video') ? (
                            <video src={p} className="h-full w-full object-cover" />
                          ) : (
                            <img src={p} alt="" className="h-full w-full object-cover" />
                          )}
                          <button onClick={() => removeFile(i)} className="absolute right-0.5 top-0.5 rounded-full bg-danger-600 p-0.5 text-white">
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

                  <button onClick={handleSubmitQuick} disabled={!empresaId || !setorId || uploading} className="btn-primary w-full py-3 text-base disabled:opacity-50">
                    {uploading ? <FiLoader className="animate-spin" size={18} /> : <FiCamera size={18} />}
                    {uploading ? 'Enviando...' : 'Enviar e Analisar'}
                  </button>
                </div>
              )}
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

      <div className="card mb-8 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">Como funciona</h2>
          <Link to="/tecnico/nova-inspecao" className="flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700">
            Inspeção completa <FiArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <div key={i} className="group relative">
              <div className="flex items-start gap-4 rounded-xl border-2 border-navy-100 p-4 transition-all hover:border-amber-400 hover:bg-amber-50/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-amber-400 transition-all group-hover:bg-amber-500 group-hover:text-navy-900">
                  {s.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-600">PASSO {s.num}</p>
                  <p className="text-sm font-semibold text-navy-900">{s.title}</p>
                  <p className="mt-1 text-xs text-navy-400">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
