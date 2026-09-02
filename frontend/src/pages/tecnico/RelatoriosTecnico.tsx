import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiTrash2, FiFileText, FiCalendar, FiHash, FiShare2, FiLoader, FiEye, FiSend, FiMessageCircle, FiMail, FiLink, FiX, FiClipboard } from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

interface Relatorio {
  id: string;
  inspecaoId: string;
  empresaNome: string;
  setorNome: string;
  notaConformidade: number | null;
  totalRiscos: number;
  nomeArquivo: string;
  tamanhoBytes: number;
  createdAt: string;
}

export default function RelatoriosTecnico() {
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [enviarRelatorio, setEnviarRelatorio] = useState<Relatorio | null>(null);
  const pdfCacheRef = useRef<Map<string, Blob>>(new Map());

  useEffect(() => {
    api.get('/relatorios').then(({ data }) => {
      setRelatorios(data);
      setLoading(false);
      data.forEach((r: Relatorio) => {
        fetch(`/api/relatorios/${r.id}/arquivo`, { headers: { Authorization: `Bearer ${localStorage.getItem('sv_token') || ''}` } })
          .then(res => res.ok ? res.blob() : null)
          .then(blob => { if (blob && blob.type === 'application/pdf' && blob.size > 0) pdfCacheRef.current.set(r.id, blob); })
          .catch(() => {});
      });
    }).catch(() => setLoading(false));
  }, []);

  const getPdfBlob = async (id: string): Promise<Blob | null> => {
    if (pdfCacheRef.current.has(id)) return pdfCacheRef.current.get(id)!;
    try {
      const res = await fetch(`/api/relatorios/${id}/arquivo`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('sv_token') || ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.type !== 'application/pdf' || blob.size === 0) return null;
      pdfCacheRef.current.set(id, blob);
      return blob;
    } catch (err: any) {
      console.error('Erro ao obter PDF:', err);
      return null;
    }
  };

  const baixar = async (r: Relatorio) => {
    setActionId(`${r.id}-dl`);
    toast.loading('Baixando PDF...', { id: `dl-${r.id}` });
    const blob = await getPdfBlob(r.id);
    if (!blob) {
      toast.error('Erro ao obter PDF', { id: `dl-${r.id}` });
      setActionId(null);
      return;
    }
    const fileName = r.nomeArquivo?.endsWith('.pdf') ? r.nomeArquivo : `Relatorio_SST_${r.empresaNome}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF baixado!', { id: `dl-${r.id}` });
    setActionId(null);
  };

  const compartilhar = async (r: Relatorio) => {
    setActionId(`${r.id}-share`);
    toast.loading('Preparando PDF...', { id: `share-${r.id}` });
    const blob = await getPdfBlob(r.id);
    if (!blob || blob.type !== 'application/pdf' || blob.size === 0) {
      toast.error('PDF inválido', { id: `share-${r.id}` });
      setActionId(null);
      return;
    }
    const fileName = r.nomeArquivo?.endsWith('.pdf') ? r.nomeArquivo : `Relatorio_SST_${r.empresaNome}.pdf`;
    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
    if (pdfFile.type !== 'application/pdf' || pdfFile.size === 0 || !pdfFile.name.endsWith('.pdf')) {
      toast.error('Arquivo PDF inválido', { id: `share-${r.id}` });
      setActionId(null);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ files: [pdfFile], title: 'Relatório SafetyVision', text: `Relatório SST - ${r.empresaNome}` });
        toast.success('PDF compartilhado!', { id: `share-${r.id}` });
        setActionId(null);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') { toast.dismiss(`share-${r.id}`); setActionId(null); return; }
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
    toast.success('PDF baixado — seu dispositivo não permite compartilhar direto', { id: `share-${r.id}`, duration: 5000 });
    setActionId(null);
  };

  const excluir = async (r: Relatorio) => {
    if (!confirm('Excluir este relatório?')) return;
    await api.delete(`/relatorios/${r.id}`);
    setRelatorios(prev => prev.filter(x => x.id !== r.id));
  };

  const getLinkPublico = (r: Relatorio) => {
    const base = window.location.origin;
    return `${base}/api/publico/${r.id}/pdf`;
  };

  const montarMensagem = (r: Relatorio) => {
    const nota = r.notaConformidade ?? 0;
    const link = getLinkPublico(r);
    return `Olá! Segue o relatório de segurança do trabalho (SafetyVision) da empresa ${r.empresaNome}.\n\n📊 Nota de conformidade: ${nota}/100\n📋 Riscos identificados: ${r.totalRiscos}\n📅 Gerado em: ${new Date(r.createdAt).toLocaleDateString('pt-BR')}\n\n📎 Baixe o relatório completo: ${link}`;
  };

  const enviarWhatsApp = (r: Relatorio) => {
    const texto = encodeURIComponent(montarMensagem(r));
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  const enviarEmail = (r: Relatorio) => {
    const subject = encodeURIComponent(`Relatório de Segurança - ${r.empresaNome} (SafetyVision)`);
    const body = encodeURIComponent(montarMensagem(r));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copiarLink = async (r: Relatorio) => {
    try {
      await navigator.clipboard.writeText(getLinkPublico(r));
      toast.success('Link copiado! Cole no WhatsApp ou e-mail.', { id: `link-${r.id}` });
    } catch {
      toast.error('Não foi possível copiar o link', { id: `link-${r.id}` });
    }
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isLoading = (id: string, type: string) => actionId === `${id}-${type}`;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-900">Relatórios</h1>
        <p className="text-sm text-navy-400">Todos os relatórios gerados</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-navy-400">Carregando...</div>
      ) : relatorios.length === 0 ? (
        <div className="py-20 text-center">
          <FiFileText size={48} className="mx-auto mb-4 text-navy-200" />
          <p className="text-navy-400">Nenhum relatório gerado ainda</p>
          <p className="mt-1 text-sm text-navy-300">Gere um relatório a partir de uma inspeção</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relatorios.map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-navy-100 bg-white p-4 transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                  <FiFileText size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy-800">{r.empresaNome}</h3>
                  <div className="flex items-center gap-3 text-xs text-navy-400">
                    <span>{r.setorNome}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><FiCalendar size={12} />{new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><FiHash size={12} />{r.totalRiscos} riscos</span>
                    <span>•</span>
                    <span>{formatarTamanho(r.tamanhoBytes)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`mr-2 rounded-lg px-3 py-1 text-sm font-bold ${(r.notaConformidade ?? 0) >= 70 ? 'bg-green-50 text-green-600' : (r.notaConformidade ?? 0) >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                  {r.notaConformidade ?? '---'}/100
                </span>

                <button onClick={() => navigate(`/tecnico/relatorio/${r.inspecaoId}`)} className="rounded-lg border border-navy-200 p-2 text-navy-500 hover:bg-navy-50 disabled:opacity-50" title="Ver Relatório">
                  <FiEye size={16} />
                </button>
                <button onClick={() => baixar(r)} disabled={isLoading(r.id, 'dl')} className="rounded-lg border border-navy-200 p-2 text-navy-500 hover:bg-navy-50 disabled:opacity-50" title="Baixar PDF">
                  {isLoading(r.id, 'dl') ? <FiLoader size={16} className="animate-spin" /> : <FiDownload size={16} />}
                </button>
                <button onClick={() => compartilhar(r)} disabled={isLoading(r.id, 'share')} className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700 disabled:opacity-50" title="Compartilhar">
                  {isLoading(r.id, 'share') ? <FiLoader size={16} className="animate-spin" /> : <FiShare2 size={16} />}
                </button>
                <button onClick={() => setEnviarRelatorio(r)} className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700" title="Enviar via WhatsApp ou E-mail">
                  <FiSend size={16} />
                </button>
                <button onClick={() => excluir(r)} className="rounded-lg border border-red-200 p-2 text-red-400 hover:bg-red-50 hover:text-red-600" title="Excluir">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {enviarRelatorio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEnviarRelatorio(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-navy-900">Enviar relatório</h3>
                <p className="text-sm text-navy-400">{enviarRelatorio.empresaNome}</p>
              </div>
              <button onClick={() => setEnviarRelatorio(null)} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50" title="Fechar">
                <FiX size={20} />
              </button>
            </div>

            <p className="mb-4 rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
              O PDF fica disponível na plataforma. Escolha como deseja enviar:
            </p>

            <div className="space-y-3">
              <button onClick={() => { enviarWhatsApp(enviarRelatorio); setEnviarRelatorio(null); }} className="flex w-full items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-left transition hover:bg-green-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white">
                  <FiMessageCircle size={22} />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Enviar via WhatsApp</p>
                  <p className="text-xs text-green-600">Abre o WhatsApp com a mensagem e o link do relatório prontos</p>
                </div>
              </button>

              <button onClick={() => { enviarEmail(enviarRelatorio); setEnviarRelatorio(null); }} className="flex w-full items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:bg-blue-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white">
                  <FiMail size={22} />
                </div>
                <div>
                  <p className="font-semibold text-blue-800">Enviar via E-mail</p>
                  <p className="text-xs text-blue-600">Abre seu e-mail com a mensagem e o link do relatório prontos</p>
                </div>
              </button>

              <button onClick={() => copiarLink(enviarRelatorio)} className="flex w-full items-center gap-4 rounded-xl border border-navy-200 bg-navy-50 p-4 text-left transition hover:bg-navy-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-600 text-white">
                  <FiClipboard size={22} />
                </div>
                <div>
                  <p className="font-semibold text-navy-800">Copiar link do PDF</p>
                  <p className="text-xs text-navy-500">Copia o link direto do relatório para colar onde quiser</p>
                </div>
              </button>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs text-navy-400">
              <FiLink size={12} /> Link do relatório: {getLinkPublico(enviarRelatorio)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
