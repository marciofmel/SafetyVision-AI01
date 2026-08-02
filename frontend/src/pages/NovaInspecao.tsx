import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiCamera, FiTrash2, FiCheck, FiMapPin, FiImage } from 'react-icons/fi';
import api from '../api';
import toast from 'react-hot-toast';

export default function NovaInspecao() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/empresas').then(({ data }) => setEmpresas(data));
  }, []);

  useEffect(() => {
    if (empresaId) {
      api.get(`/setores?empresaId=${empresaId}`).then(({ data }) => setSetores(data));
      setSetorId('');
    }
  }, [empresaId]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!empresaId || !setorId) return toast.error('Selecione empresa e setor');
    if (files.length === 0) return toast.error('Adicione pelo menos uma foto');
    setLoading(true);
    try {
      const { data: inspecao } = await api.post('/inspecoes', { empresaId, setorId });
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      await api.post(`/inspecoes/${inspecao.id}/midias`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Inspeção criada! Analisando com IA...');
      navigate(`/tecnico/analise/${inspecao.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar inspeção');
    } finally {
      setLoading(false);
    }
  };

  const step1Done = !!empresaId && !!setorId;
  const step2Done = files.length > 0;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Nova Inspeção</h1>
        <p className="mt-1 text-sm text-navy-500">Siga os passos para criar uma inspeção de segurança</p>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-4">
        {[
          { label: 'Local', done: step1Done },
          { label: 'Fotos', done: step2Done },
          { label: 'Analisar', done: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              s.done ? 'bg-success-500 text-white' : 'bg-navy-100 text-navy-400'
            }`}>
              {s.done ? <FiCheck size={14} /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${s.done ? 'text-navy-900' : 'text-navy-400'}`}>{s.label}</span>
            {i < 2 && <div className="mx-2 h-px w-8 bg-navy-200" />}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className={`card p-6 transition-all ${step1Done ? 'ring-2 ring-success-500/20' : ''}`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-amber-400">
              <FiMapPin size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900">1. Local da Inspeção</h2>
              <p className="text-xs text-navy-400">Selecione a empresa e o setor</p>
            </div>
            {step1Done && <FiCheck className="ml-auto text-success-500" size={20} />}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">Empresa</label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="input-field"
              >
                <option value="">Selecione a empresa...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700">Setor</label>
              <select
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                disabled={!empresaId}
                className="input-field disabled:opacity-50"
              >
                <option value="">Selecione o setor...</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`card p-6 transition-all ${step2Done ? 'ring-2 ring-success-500/20' : ''}`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-amber-400">
              <FiImage size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900">2. Fotos e Vídeos</h2>
              <p className="text-xs text-navy-400">Capture imagens do local para análise</p>
            </div>
            {step2Done && <FiCheck className="ml-auto text-success-500" size={20} />}
          </div>

          <input ref={fileRef} type="file" multiple accept="image/*,video/*" onChange={handleFiles} className="hidden" />

          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-navy-200 p-10 text-navy-400 transition-all hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-600"
          >
            <FiCamera size={40} />
            <div className="text-center">
              <p className="font-semibold">Toque para adicionar fotos ou vídeos</p>
              <p className="mt-1 text-xs text-navy-300">Formatos: JPG, PNG, MP4 · Máx. 50MB por arquivo</p>
            </div>
          </button>

          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {previews.map((p, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl">
                  <img src={p} alt="" className="h-32 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute right-2 top-2 rounded-full bg-danger-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  >
                    <FiTrash2 size={12} />
                  </button>
                  <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {files[i]?.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-navy-500">
              <FiCheck className="text-success-500" size={14} />
              <span>{files.length} arquivo(s) selecionado(s)</span>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !step1Done || !step2Done}
          className="btn-primary w-full py-4 text-base disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" />
              Criando e analisando com IA...
            </>
          ) : (
            <>
              <FiUpload size={18} />
              Criar Inspeção e Analisar com IA
            </>
          )}
        </button>
      </div>
    </div>
  );
}
