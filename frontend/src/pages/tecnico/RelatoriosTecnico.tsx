import { useEffect, useState } from 'react';
import { FiDownload, FiTrash2, FiFileText, FiCalendar, FiHash, FiShare2, FiLoader } from 'react-icons/fi';
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
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/relatorios').then(({ data }) => {
      setRelatorios(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getToken = () => localStorage.getItem('sv_token') || '';
  const pdfCache = new Map<string, Blob>();

  const getPdfBlob = async (id: string): Promise<Blob | null> => {
    if (pdfCache.has(id)) return pdfCache.get(id)!;
    try {
      const res = await fetch(`/api/relatorios/${id}/arquivo`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      pdfCache.set(id, blob);
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.nomeArquivo || `relatorio-${r.empresaNome}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF baixado!', { id: `dl-${r.id}` });
    setActionId(null);
  };

  const excluir = async (r: Relatorio) => {
    if (!confirm('Excluir este relatório?')) return;
    await api.delete(`/relatorios/${r.id}`);
    setRelatorios(prev => prev.filter(x => x.id !== r.id));
  };

  const compartilharWhatsApp = async (r: Relatorio) => {
    const texto = `Relatório SST - ${r.empresaNome} - Nota: ${r.notaConformidade ?? '---'}/100`;
    const waLink = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    const win = window.open('', '_blank');
    if (win) { try { win.document.write('<p style="font-family:sans-serif;padding:20px">Abrindo WhatsApp...</p>'); } catch {} }
    setActionId(`${r.id}-wa`);
    toast.loading('Preparando PDF...', { id: `wa-${r.id}` });
    const blob = await getPdfBlob(r.id);
    if (!blob) {
      if (win) win.close();
      toast.error('Erro ao obter PDF', { id: `wa-${r.id}` });
      setActionId(null);
      return;
    }
    const file = new File([blob], r.nomeArquivo || `relatorio-${r.empresaNome}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: 'Relatório SafetyVision', text: texto, files: [file] });
        if (win) win.close();
        toast.success('PDF compartilhado com sucesso!', { id: `wa-${r.id}` });
        setActionId(null);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') { if (win) win.close(); toast.dismiss(`wa-${r.id}`); setActionId(null); return; }
      }
    }
    const pdfUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = r.nomeArquivo || `relatorio-${r.empresaNome}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(pdfUrl);
    if (win) win.location.href = waLink;
    else window.open(waLink, '_blank');
    toast.success('PDF baixado! Arraste para o WhatsApp no PC.', { id: `wa-${r.id}`, duration: 6000 });
    setActionId(null);
  };

  const compartilharEmail = async (r: Relatorio) => {
    const assunto = encodeURIComponent(`Relatório SST - ${r.empresaNome}`);
    const corpo = encodeURIComponent(`Prezado(a),\n\nSegue o relatório em anexo.\n\nEmpresa: ${r.empresaNome}\nSetor: ${r.setorNome}\nNota: ${r.notaConformidade ?? '---'}/100\n\nAtt,\nSafetyVision AI`);
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&su=${assunto}&body=${corpo}`;
    const win = window.open('', '_blank');
    if (win) { try { win.document.write('<p style="font-family:sans-serif;padding:20px">Abrindo Gmail...</p>'); } catch {} }
    setActionId(`${r.id}-em`);
    toast.loading('Preparando PDF...', { id: `em-${r.id}` });
    const blob = await getPdfBlob(r.id);
    if (!blob) {
      if (win) win.close();
      toast.error('Erro ao obter PDF', { id: `em-${r.id}` });
      setActionId(null);
      return;
    }
    const file = new File([blob], r.nomeArquivo || `relatorio-${r.empresaNome}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: 'Relatório SafetyVision', text: `Relatório SST - ${r.empresaNome}`, files: [file] });
        if (win) win.close();
        toast.success('PDF compartilhado com sucesso!', { id: `em-${r.id}` });
        setActionId(null);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') { if (win) win.close(); toast.dismiss(`em-${r.id}`); setActionId(null); return; }
      }
    }
    const pdfUrl2 = URL.createObjectURL(blob);
    const a2 = document.createElement('a');
    a2.href = pdfUrl2;
    a2.download = r.nomeArquivo || `relatorio-${r.empresaNome}.pdf`;
    document.body.appendChild(a2);
    a2.click();
    document.body.removeChild(a2);
    URL.revokeObjectURL(pdfUrl2);
    if (win) win.location.href = gmailLink;
    else window.open(gmailLink, '_blank');
    toast.success('PDF baixado! Anexe no Gmail no PC.', { id: `em-${r.id}`, duration: 6000 });
    setActionId(null);
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
                <span className={`mr-2 rounded-lg px-3 py-1 text-sm font-bold ${
                  (r.notaConformidade ?? 0) >= 70 ? 'bg-green-50 text-green-600' :
                  (r.notaConformidade ?? 0) >= 40 ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {r.notaConformidade ?? '---'}/100
                </span>

                <button
                  onClick={() => baixar(r)}
                  disabled={isLoading(r.id, 'dl')}
                  className="rounded-lg border border-navy-200 p-2 text-navy-500 transition-all hover:bg-navy-50 disabled:opacity-50"
                  title="Baixar PDF"
                >
                  {isLoading(r.id, 'dl') ? <FiLoader size={16} className="animate-spin" /> : <FiDownload size={16} />}
                </button>
                <button
                  onClick={() => compartilharWhatsApp(r)}
                  disabled={isLoading(r.id, 'wa')}
                  className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-600 transition-all hover:bg-green-100 disabled:opacity-50"
                  title="WhatsApp"
                >
                  {isLoading(r.id, 'wa') ? <FiLoader size={16} className="animate-spin" /> : <FiShare2 size={16} />}
                </button>
                <button
                  onClick={() => compartilharEmail(r)}
                  disabled={isLoading(r.id, 'em')}
                  className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 transition-all hover:bg-blue-100 disabled:opacity-50"
                  title="Email"
                >
                  {isLoading(r.id, 'em') ? <FiLoader size={16} className="animate-spin" /> : <FiFileText size={16} />}
                </button>
                <button onClick={() => excluir(r)} className="rounded-lg border border-red-200 p-2 text-red-400 transition-all hover:bg-red-50 hover:text-red-600" title="Excluir">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}