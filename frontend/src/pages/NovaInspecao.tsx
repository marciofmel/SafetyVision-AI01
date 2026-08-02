import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiCamera, FiTrash2, FiCheck, FiMapPin, FiSearch, FiLoader } from 'react-icons/fi';
import api from '../api';
import toast from 'react-hot-toast';

export default function NovaInspecao() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [inspecaoId, setInspecaoId] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjData, setCnpjData] = useState<any>(null);
  const [novaEmpresa, setNovaEmpresa] = useState(false);
  const [novoSetor, setNovoSetor] = useState(false);
  const [novoSetorNome, setNovoSetorNome] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/empresas').then(({ data }) => setEmpresas(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (empresaId) {
      api.get(`/setores?empresaId=${empresaId}`).then(({ data }) => setSetores(data)).catch(() => {});
    }
  }, [empresaId]);

  const handleCnpjLookup = async (value: string) => {
    const clean = value.replace(/[^\d]/g, '');
    if (clean.length !== 14) return;
    setCnpjLoading(true);
    try {
      const { data } = await api.get(`/cnpj/${clean}`, { timeout: 30000 });
      setCnpjData(data);
      toast.success('Dados da empresa encontrados!');
      setNovaEmpresa(true);
    } catch (err: any) {
      console.error('CNPJ lookup error:', err);
      toast.error(err.message?.includes('timeout') ? 'Servidor demorou. Preencha manualmente.' : 'CNPJ não encontrado. Preencha manualmente.');
      setNovaEmpresa(true);
    } finally {
      setCnpjLoading(false);
    }
  };

  const formatCnpj = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 14);
    const formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (digits.length === 14 && cnpj.replace(/[^\d]/g, '').length !== 14) {
      handleCnpjLookup(digits);
    }
    return formatted;
  };

  const handleCreateEmpresa = async () => {
    try {
      const payload = {
        nome: cnpjData?.nome || cnpjData?.nomeFantasia || 'Empresa',
        cnpj: cnpj || '',
        endereco: cnpjData?.endereco ? `${cnpjData.endereco}, ${cnpjData.cidade || ''} - ${cnpjData.estado || ''}` : '',
        telefone: cnpjData?.telefone || '',
        email: cnpjData?.email || '',
      };
      const { data } = await api.post('/empresas', payload);
      setEmpresas((prev) => [...prev, data]);
      setEmpresaId(data.id);
      setNovaEmpresa(false);
      toast.success('Empresa criada!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar empresa');
    }
  };

  const handleCreateSetor = async () => {
    if (!novoSetorNome.trim()) return toast.error('Nome do setor é obrigatório');
    try {
      const { data } = await api.post('/setores', { nome: novoSetorNome, empresaId });
      setSetores((prev) => [...prev, data]);
      setSetorId(data.id);
      setNovoSetor(false);
      setNovoSetorNome('');
      toast.success('Setor criado!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar setor');
    }
  };

  const handleStartInspection = async () => {
    if (!empresaId || !setorId) return toast.error('Selecione empresa e setor');
    try {
      const { data } = await api.post('/inspecoes', { empresaId, setorId });
      setInspecaoId(data.id);
      setStep(2);
      toast.success('Inspeção criada! Adicione fotos.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar inspeção');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return toast.error('Adicione pelo menos uma foto');
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      await api.post(`/inspecoes/${inspecaoId}/midias`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${files.length} arquivo(s) enviado(s)!`);
      navigate(`/tecnico/analise/${inspecaoId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao enviar arquivos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Nova Inspeção</h1>
        <p className="mt-1 text-sm text-navy-500">Preencha os dados e envie fotos para análise</p>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-4">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= s ? 'bg-amber-500 text-navy-900' : 'bg-navy-200 text-navy-500'}`}>
              {step > s ? <FiCheck size={16} /> : s}
            </div>
            <span className={`text-sm font-medium ${step >= s ? 'text-navy-900' : 'text-navy-400'}`}>{s === 1 ? 'Dados' : 'Fotos'}</span>
            {s < 2 && <div className="ml-2 h-px w-12 bg-navy-200" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          {/* CNPJ Auto-fill */}
          <div className="card p-4 sm:p-6">
            <h3 className="mb-4 text-lg font-bold text-navy-900">Consulta CNPJ</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  className="input-field pl-11"
                  maxLength={18}
                />
              </div>
              <button
                onClick={() => handleCnpjLookup(cnpj)}
                disabled={cnpjLoading}
                className="btn-primary bg-navy-900 text-amber-400"
              >
                {cnpjLoading ? <FiLoader className="animate-spin" size={16} /> : <FiSearch size={16} />}
                Buscar
              </button>
            </div>
            {cnpjData && (
              <div className="mt-4 rounded-xl border border-success-200 bg-success-50 p-4 text-sm">
                <p className="mb-1 font-bold text-success-700">Dados encontrados:</p>
                <p className="text-navy-700">{cnpjData.nome || cnpjData.nomeFantasia}</p>
                {cnpjData.endereco && <p className="text-navy-600">{cnpjData.endereco}</p>}
                {cnpjData.cidade && <p className="text-navy-600">{cnpjData.cidade} - {cnpjData.estado}</p>}
                {cnpjData.telefone && <p className="text-navy-600">Tel: {cnpjData.telefone}</p>}
              </div>
            )}
          </div>

          {/* Empresa */}
          <div className="card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">Empresa</h3>
              <button onClick={() => setNovaEmpresa(!novaEmpresa)} className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                {novaEmpresa ? 'Selecionar existente' : 'Criar nova'}
              </button>
            </div>

            {novaEmpresa ? (
              <div className="space-y-3">
                <input className="input-field w-full" placeholder="Nome da empresa" value={cnpjData?.nome || cnpjData?.nomeFantasia || ''} onChange={(e) => setCnpjData({ ...cnpjData, nome: e.target.value })} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className="input-field" placeholder="CNPJ" value={cnpj} readOnly />
                  <input className="input-field" placeholder="Telefone" value={cnpjData?.telefone || ''} onChange={(e) => setCnpjData({ ...cnpjData, telefone: e.target.value })} />
                </div>
                <input className="input-field w-full" placeholder="Endereço" value={cnpjData?.endereco || ''} onChange={(e) => setCnpjData({ ...cnpjData, endereco: e.target.value })} />
                <button onClick={handleCreateEmpresa} className="btn-primary bg-success-600"><FiCheck size={16} /> Criar Empresa</button>
              </div>
            ) : (
              <select className="input-field w-full" value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setSetorId(''); }}>
                <option value="">Selecione a empresa...</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            )}
          </div>

          {/* Setor */}
          <div className="card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">Setor</h3>
              {empresaId && <button onClick={() => setNovoSetor(!novoSetor)} className="text-sm font-semibold text-amber-600 hover:text-amber-700">{novoSetor ? 'Selecionar existente' : 'Criar novo'}</button>}
            </div>

            {!empresaId ? (
              <p className="text-sm text-navy-400">Selecione uma empresa primeiro</p>
            ) : novoSetor ? (
              <div className="flex gap-3">
                <input className="input-field flex-1" placeholder="Nome do setor" value={novoSetorNome} onChange={(e) => setNovoSetorNome(e.target.value)} />
                <button onClick={handleCreateSetor} className="btn-primary bg-success-600"><FiCheck size={16} /> Criar</button>
              </div>
            ) : (
              <select className="input-field w-full" value={setorId} onChange={(e) => setSetorId(e.target.value)}>
                <option value="">Selecione o setor...</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            )}
          </div>

          <button onClick={handleStartInspection} disabled={!empresaId || !setorId} className="btn-primary w-full py-3 text-base disabled:opacity-50">
            <FiCamera size={18} /> Iniciar Inspeção
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="card p-4 sm:p-6">
            <h3 className="mb-4 text-lg font-bold text-navy-900">Fotos e Vídeos</h3>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-navy-300 p-8 text-navy-500 transition-all hover:border-amber-400 hover:bg-amber-50/50 hover:text-navy-700">
              <FiCamera size={32} />
              <div className="text-center">
                <p className="text-sm font-semibold">Toque para adicionar fotos</p>
                <p className="text-xs text-navy-400">JPG, PNG ou MP4 (máx. 50MB)</p>
              </div>
            </button>
          </div>

          {previews.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h3 className="mb-4 text-sm font-bold text-navy-900">{previews.length} arquivo(s) selecionado(s)</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map((p, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-xl">
                    <img src={p} alt="" className="h-32 w-full object-cover" />
                    <button onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded-full bg-danger-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleUpload} disabled={uploading || files.length === 0} className="btn-primary w-full py-3 text-base disabled:opacity-50">
            {uploading ? <FiLoader className="animate-spin" size={18} /> : <FiUpload size={18} />}
            {uploading ? 'Enviando...' : 'Enviar e Analisar'}
          </button>
        </div>
      )}
    </div>
  );
}
