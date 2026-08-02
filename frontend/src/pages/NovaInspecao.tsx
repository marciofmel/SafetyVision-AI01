import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiCamera, FiTrash2 } from 'react-icons/fi';
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
      navigate(`/analise/${inspecao.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar inspeção');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Nova Inspeção</h1>
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">1. Local da Inspeção</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Empresa</label>
              <select value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setSetorId(''); }} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
                <option value="">Selecione...</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Setor</label>
              <select value={setorId} onChange={(e) => setSetorId(e.target.value)} disabled={!empresaId} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm disabled:opacity-50">
                <option value="">Selecione...</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">2. Fotos e Vídeos</h2>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" onChange={handleFiles} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-8 text-gray-500 hover:border-primary-400 hover:text-primary-600">
            <FiCamera size={24} />
            <span>Toque para adicionar fotos ou vídeos</span>
          </button>
          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {previews.map((p, i) => (
                <div key={i} className="group relative">
                  <img src={p} alt="" className="h-32 w-full rounded-lg object-cover" />
                  <button onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100"><FiTrash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">{files.length} arquivo(s) selecionado(s)</p>
        </div>
        <button onClick={handleSubmit} disabled={loading || !empresaId || !setorId || files.length === 0} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
          <FiUpload />
          {loading ? 'Criando e analisando...' : 'Criar Inspeção e Analisar com IA'}
        </button>
      </div>
    </div>
  );
}
