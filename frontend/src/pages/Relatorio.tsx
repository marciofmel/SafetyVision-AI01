import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiDownload, FiArrowLeft, FiCheckCircle, FiShield, FiAlertTriangle, FiLoader, FiShare2, FiEye, FiEyeOff, FiImage, FiFileText, FiClock, FiMapPin } from 'react-icons/fi';
import api from '../api';
import toast from 'react-hot-toast';

export default function Relatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspecao, setInspecao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sharing, setSharing] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const pdfCacheRef = useRef<Blob | null>(null);

  const getToken = () => localStorage.getItem('sv_token') || '';

  const getPdfBlob = async (): Promise<Blob | null> => {
    if (pdfCacheRef.current) return pdfCacheRef.current;
    try {
      const response = await fetch(`/api/relatorio/${id}/relatorio`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (blob.type !== 'application/pdf' || blob.size === 0) return null;
      pdfCacheRef.current = blob;
      return blob;
    } catch (err: any) {
      console.error('Erro ao obter PDF:', err);
      return null;
    }
  };

  const createPdfFile = (blob: Blob): File => {
    const baseName = `Relatorio_Inspecao_SST_${inspecao?.empresa?.nome || id?.slice(0, 8)}.pdf`;
    const fileName = baseName.endsWith('.pdf') ? baseName : `${baseName}.pdf`;
    return new File([blob], fileName, { type: 'application/pdf' });
  };

  useEffect(() => {
    api.get(`/inspecoes/${id}`).then(({ data }) => {
      setInspecao(data);
      setLoading(false);
      fetch(`/api/relatorio/${id}/relatorio`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(res => res.ok ? res.blob() : null)
        .then(blob => { if (blob && blob.type === 'application/pdf' && blob.size > 0) pdfCacheRef.current = blob; })
        .catch(() => {});
    }).catch(() => {
      toast.error('Erro ao carregar inspeção');
      setLoading(false);
    });
  }, [id]);

  const baixarPDF = async () => {
    setDownloading(true);
    toast.loading('Baixando PDF...', { id: 'download' });
    const blob = await getPdfBlob();
    if (!blob) {
      toast.error('Erro ao baixar relatório', { id: 'download' });
      setDownloading(false);
      return;
    }
    const file = createPdfFile(blob);
    if (file.type !== 'application/pdf' || file.size === 0 || !file.name.endsWith('.pdf')) {
      toast.error('PDF inválido', { id: 'download' });
      setDownloading(false);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF baixado!', { id: 'download' });
    setDownloading(false);
  };

  const compartilharPDF = async () => {
    setSharing(true);
    toast.loading('Preparando PDF...', { id: 'share-pdf' });
    const blob = await getPdfBlob();
    if (!blob) {
      toast.error('Erro ao obter PDF', { id: 'share-pdf' });
      setSharing(false);
      return;
    }
    const pdfFile = createPdfFile(blob);
    if (pdfFile.type !== 'application/pdf' || pdfFile.size === 0 || !pdfFile.name.endsWith('.pdf')) {
      toast.error('PDF inválido', { id: 'share-pdf' });
      setSharing(false);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ files: [pdfFile], title: 'Relatório de Inspeção SST', text: 'Relatório de Inspeção SST' });
        toast.success('PDF compartilhado!', { id: 'share-pdf' });
        setSharing(false);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') { toast.dismiss('share-pdf'); setSharing(false); return; }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF baixado — seu dispositivo não permite compartilhar direto', { id: 'share-pdf', duration: 5000 });
    setSharing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <FiLoader className="animate-spin text-amber-500" size={40} />
          <p className="mt-4 text-navy-500">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (!inspecao) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-navy-500">Inspeção não encontrada</p>
        <button onClick={() => navigate('/tecnico')} className="mt-4 btn-primary">Voltar</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-navy-500 hover:text-navy-700">
        <FiArrowLeft size={14} /> Voltar
      </button>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20">
            <FiCheckCircle className="text-amber-400" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Relatório Pronto!</h1>
          <p className="mt-2 text-navy-300">Sua inspeção foi analisada com sucesso</p>
        </div>

        <div className="p-8">
          <div className="mb-6 grid grid-cols-2 gap-4">
            {[
              { label: 'Empresa', value: inspecao.empresa?.nome || '---' },
              { label: 'Setor', value: inspecao.setor?.nome || '---' },
              { label: 'Nota', value: `${inspecao.notaConformidade ?? '---'}/100` },
              { label: 'Riscos', value: `${inspecao.riscos?.length || 0} encontrados` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-navy-50 p-4">
                <p className="text-xs font-bold text-navy-400">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border-2 border-navy-100 p-4 text-center">
              <FiShield className="mx-auto mb-2 text-navy-400" size={24} />
              <p className="text-2xl font-extrabold text-navy-900">{inspecao.epiViolacoes?.filter((e: any) => e.status === 'ausente').length || 0}</p>
              <p className="text-xs text-navy-400">EPIs Ausentes</p>
            </div>
            <div className="rounded-xl border-2 border-navy-100 p-4 text-center">
              <FiAlertTriangle className="mx-auto mb-2 text-danger-500" size={24} />
              <p className="text-2xl font-extrabold text-navy-900">{inspecao.riscos?.length || 0}</p>
              <p className="text-xs text-navy-400">Riscos Encontrados</p>
            </div>
            <div className="rounded-xl border-2 border-navy-100 p-4 text-center">
              <FiCheckCircle className="mx-auto mb-2 text-success-500" size={24} />
              <p className="text-2xl font-extrabold text-navy-900">{inspecao.midias?.length || 0}</p>
              <p className="text-xs text-navy-400">Fotos Analisadas</p>
            </div>
          </div>

          <button onClick={() => navigate(`/tecnico/relatorio/${id}/editar`)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100">
            ✏️ Editar Relatório (página completa)
          </button>

          <button onClick={baixarPDF} disabled={downloading} className="btn-primary w-full py-4 text-base disabled:opacity-50">
            {downloading ? <FiLoader className="animate-spin" size={18} /> : <FiDownload size={18} />}
            {downloading ? 'Baixando...' : '⬇️ Baixar PDF'}
          </button>

          <button onClick={compartilharPDF} disabled={sharing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 text-base font-bold text-white hover:bg-purple-700 disabled:opacity-50">
            {sharing ? <FiLoader className="animate-spin" size={18} /> : <FiShare2 size={18} />}
            📤 Compartilhar PDF
          </button>

          <button onClick={() => { setShowDetails(!showDetails); setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy-200 bg-navy-50 py-3 text-sm font-bold text-navy-700 hover:bg-navy-100">
            {showDetails ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            {showDetails ? 'Fechar Detalhes' : 'Examinar Relatório'}
          </button>

          {showDetails && (
            <div ref={detailsRef} className="mt-6 border-t border-navy-100 pt-6">
              <h2 className="mb-4 text-lg font-extrabold text-navy-900">Detalhes Completos da Inspeção</h2>
              <div className="mb-4 rounded-xl bg-navy-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><FiFileText className="text-navy-400" /><span className="text-navy-500">Empresa:</span> <span className="font-bold text-navy-900">{inspecao.empresa?.nome || '---'}</span></div>
                  <div className="flex items-center gap-2"><FiMapPin className="text-navy-400" /><span className="text-navy-500">Setor:</span> <span className="font-bold text-navy-900">{inspecao.setor?.nome || '---'}</span></div>
                  <div className="flex items-center gap-2"><FiClock className="text-navy-400" /><span className="text-navy-500">Início:</span> <span className="font-bold text-navy-900">{inspecao.dataInicio ? new Date(inspecao.dataInicio).toLocaleString('pt-BR') : '---'}</span></div>
                  <div className="flex items-center gap-2"><FiClock className="text-navy-400" /><span className="text-navy-500">Fim:</span> <span className="font-bold text-navy-900">{inspecao.dataFim ? new Date(inspecao.dataFim).toLocaleString('pt-BR') : '---'}</span></div>
                </div>
              </div>
              {inspecao.riscos?.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-danger-700"><FiAlertTriangle size={16} /> Riscos Identificados ({inspecao.riscos.length})</h3>
                  <div className="space-y-2">
                    {inspecao.riscos.map((r: any) => (
                      <div key={r.id} className="rounded-xl border border-navy-100 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-navy-900 break-words">{r.categoria}</p>
                            <p className="mt-1 text-xs text-navy-600 break-words">{r.descricao}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.gravidade === 'critica' ? 'bg-red-100 text-red-700' : r.gravidade === 'alta' ? 'bg-orange-100 text-orange-700' : r.gravidade === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{r.gravidade}</span>
                        </div>
                        {r.imagemUrl && <img src={r.imagemUrl} alt={r.categoria} className="mt-2 max-h-40 rounded-lg object-cover" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inspecao.midias?.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-700"><FiImage size={16} /> Fotos e Vídeos ({inspecao.midias.length})</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {inspecao.midias.map((m: any) => (
                      <div key={m.id} className="group relative overflow-hidden rounded-xl border border-navy-100">
                        {m.tipo === 'video' ? <video src={m.url} className="aspect-square w-full object-cover" controls preload="metadata" /> : <img src={m.url} alt={m.nome} className="aspect-square w-full object-cover" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-gradient-to-r from-navy-900 to-navy-800 p-4 text-center">
                <p className="text-xs font-bold text-navy-300">Nota de Conformidade</p>
                <p className="mt-1 text-4xl font-extrabold text-white">{inspecao.notaConformidade ?? '---'}<span className="text-lg text-navy-300">/100</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
