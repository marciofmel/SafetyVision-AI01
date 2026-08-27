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

  const getPDFBlob = async (): Promise<Blob> => {
    const token = localStorage.getItem('sv_token');
    const response = await fetch(`/api/relatorios/${id}/gerar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Erro ao gerar PDF');
    return await response.blob();
  };

  const shareWhatsApp = async () => {
    setSharing(true);
    try {
      const blob = await getPDFBlob();
      const file = new File([blob], `relatorio-${inspecao.empresa?.nome || 'inspecao'}.pdf`, { type: 'application/pdf' });
      const texto = `Relatório de Inspeção SST - ${inspecao.empresa?.nome || ''} - Nota: ${inspecao.notaConformidade ?? '---'}/100`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Relatório SafetyVision', text: texto, files: [file] });
      } else {
        // Fallback: baixar PDF e abrir WhatsApp com texto
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${inspecao.empresa?.nome || 'inspecao'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF baixado! Anexe no WhatsApp.');
        window.open(`https://wa.me/?text=${encodeURIComponent(texto + '\n\n📄 PDF baixado. Anexe-o na conversa.')}`, '_blank');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Erro ao compartilhar');
      }
    } finally {
      setSharing(false);
    }
  };

  const shareEmail = async () => {
    setSharing(true);
    try {
      const blob = await getPDFBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${inspecao.empresa?.nome || 'inspecao'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const assunto = encodeURIComponent(`Relatório de Inspeção - ${inspecao.empresa?.nome || '---'} - ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`);
      const corpo = encodeURIComponent(
        `Prezado(a),\n\n` +
        `Segue em anexo o Relatório de Inspeção de Segurança do Trabalho.\n\n` +
        `Dados da Inspeção:\n` +
        `• Empresa: ${inspecao.empresa?.nome || '---'}\n` +
        `• Setor: ${inspecao.setor?.nome || '---'}\n` +
        `• Nota de Conformidade: ${inspecao.notaConformidade ?? '---'}/100\n` +
        `• Riscos Identificados: ${inspecao.riscos?.length || 0}\n` +
        `• EPIs Ausentes: ${inspecao.epiViolacoes?.filter((e: any) => e.status === 'ausente').length || 0}\n` +
        `• Fotos Analisadas: ${inspecao.midias?.length || 0}\n` +
        `• Data: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}\n\n` +
        `O PDF está anexado a este email.\n\n` +
        `Att,\n${inspecao.usuario?.nome || 'Técnico SafetyVision'}\nSafetyVision AI`
      );
      toast.success('PDF baixado! Anexe no email.');
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${assunto}&body=${corpo}`, '_blank');
    } catch (err) {
      toast.error('Erro ao preparar email');
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    api.get(`/inspecoes/${id}`).then(({ data }) => {
      setInspecao(data);
      setLoading(false);
    }).catch(() => {
      toast.error('Erro ao carregar inspeção');
      setLoading(false);
    });
  }, [id]);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await getPDFBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${inspecao.empresa?.nome || id?.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF baixado e salvo na plataforma!');
    } catch (err) {
      toast.error('Erro ao baixar relatório');
    } finally {
      setDownloading(false);
    }
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
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20">
            <FiCheckCircle className="text-amber-400" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Relatório Pronto!</h1>
          <p className="mt-2 text-navy-300">Sua inspeção foi analisada com sucesso</p>
        </div>

        {/* Content */}
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

          <button onClick={downloadPDF} disabled={downloading} className="btn-primary w-full py-4 text-base disabled:opacity-50">
            {downloading ? <FiLoader className="animate-spin" size={18} /> : <FiDownload size={18} />}
            {downloading ? 'Baixando...' : 'Baixar Relatório PDF'}
          </button>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={shareWhatsApp}
              disabled={sharing}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 py-3 text-sm font-bold text-green-700 transition-all hover:bg-green-100 disabled:opacity-50"
            >
              {sharing ? <FiLoader className="animate-spin" size={16} /> : <FiShare2 size={16} />}
              {sharing ? 'Preparando...' : 'Enviar PDF WhatsApp'}
            </button>
            <button
              onClick={shareEmail}
              disabled={sharing}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100 disabled:opacity-50"
            >
              {sharing ? <FiLoader className="animate-spin" size={16} /> : <FiShare2 size={16} />}
              {sharing ? 'Preparando...' : 'Enviar PDF Email'}
            </button>
          </div>

          <button
            onClick={() => {
              setShowDetails(!showDetails);
              setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy-200 bg-navy-50 py-3 text-sm font-bold text-navy-700 transition-all hover:bg-navy-100"
          >
            {showDetails ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            {showDetails ? 'Fechar Detalhes' : 'Examinar Relatório'}
          </button>

          {showDetails && (
            <div ref={detailsRef} className="mt-6 border-t border-navy-100 pt-6">
              <h2 className="mb-4 text-lg font-extrabold text-navy-900">Detalhes Completos da Inspeção</h2>

              {/* Informações gerais */}
              <div className="mb-4 rounded-xl bg-navy-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><FiFileText className="text-navy-400" /><span className="text-navy-500">Empresa:</span> <span className="font-bold text-navy-900">{inspecao.empresa?.nome || '---'}</span></div>
                  <div className="flex items-center gap-2"><FiMapPin className="text-navy-400" /><span className="text-navy-500">Setor:</span> <span className="font-bold text-navy-900">{inspecao.setor?.nome || '---'}</span></div>
                  <div className="flex items-center gap-2"><FiClock className="text-navy-400" /><span className="text-navy-500">Início:</span> <span className="font-bold text-navy-900">{inspecao.dataInicio ? new Date(inspecao.dataInicio).toLocaleString('pt-BR') : '---'}</span></div>
                  <div className="flex items-center gap-2"><FiClock className="text-navy-400" /><span className="text-navy-500">Fim:</span> <span className="font-bold text-navy-900">{inspecao.dataFim ? new Date(inspecao.dataFim).toLocaleString('pt-BR') : '---'}</span></div>
                  {inspecao.observacoes && (
                    <div className="col-span-2 mt-2 rounded-lg bg-white p-3 border border-navy-100">
                      <p className="text-xs font-bold text-navy-400 mb-1">Observações</p>
                      <p className="text-sm text-navy-700">{inspecao.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Riscos */}
              {inspecao.riscos?.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-danger-700">
                    <FiAlertTriangle size={16} /> Riscos Identificados ({inspecao.riscos.length})
                  </h3>
                  <div className="space-y-2">
                    {inspecao.riscos.map((r: any) => (
                      <div key={r.id} className="rounded-xl border border-navy-100 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-navy-900 break-words">{r.categoria}</p>
                            <p className="mt-1 text-xs text-navy-600 break-words">{r.descricao}</p>
                            {r.localIdentificado && <p className="mt-1 text-xs text-navy-400">Local: {r.localIdentificado}</p>}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r.gravidade === 'critica' ? 'bg-red-100 text-red-700' :
                            r.gravidade === 'alta' ? 'bg-orange-100 text-orange-700' :
                            r.gravidade === 'media' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {r.gravidade}
                          </span>
                        </div>
                        {r.medidasPreventivas && <p className="mt-2 text-xs text-navy-500 break-words"><strong>Prevenção:</strong> {r.medidasPreventivas}</p>}
                        {r.medidasCorretivas && <p className="mt-1 text-xs text-navy-500 break-words"><strong>Correção:</strong> {r.medidasCorretivas}</p>}
                        {r.nrsRelacionadas && <p className="mt-1 text-[10px] font-bold text-amber-600">NRs: {r.nrsRelacionadas}</p>}
                        {r.imagemUrl && (
                          <img src={r.imagemUrl} alt={r.categoria} className="mt-2 max-h-40 rounded-lg object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EPIs */}
              {inspecao.epiViolacoes?.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-700">
                    <FiShield size={16} /> Violações de EPI ({inspecao.epiViolacoes.length})
                  </h3>
                  <div className="space-y-2">
                    {inspecao.epiViolacoes.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${e.status === 'ausente' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                          <FiShield size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-navy-900 break-words">{e.epiNome}</p>
                          <p className="text-xs text-navy-500">Status: {e.status === 'ausente' ? 'Ausente' : e.status === 'danificado' ? 'Danificado' : 'Incorreto'}</p>
                          {e.descricao && <p className="text-xs text-navy-400 break-words">{e.descricao}</p>}
                        </div>
                        {e.imagemUrl && <img src={e.imagemUrl} alt={e.epiNome} className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              {inspecao.checklistRespostas?.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-700">
                    <FiCheckCircle size={16} /> Respostas do Checklist ({inspecao.checklistRespostas.length})
                  </h3>
                  <div className="space-y-1">
                    {inspecao.checklistRespostas.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg bg-white border border-navy-100 px-3 py-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${c.conformidade === 'conforme' ? 'bg-success-500' : 'bg-danger-500'}`}>
                          {c.conformidade === 'conforme' ? 'C' : 'NC'}
                        </span>
                        <span className="text-xs text-navy-700 break-words flex-1">{c.item?.texto || 'Item'}</span>
                        {c.observacao && <span className="text-[10px] text-navy-400 shrink-0">({c.observacao})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mídias */}
              {inspecao.midias?.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-700">
                    <FiImage size={16} /> Fotos e Vídeos ({inspecao.midias.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {inspecao.midias.map((m: any) => (
                      <div key={m.id} className="group relative overflow-hidden rounded-xl border border-navy-100">
                        {m.tipo === 'video' ? (
                          <video src={m.url} className="aspect-square w-full object-cover" controls preload="metadata" />
                        ) : (
                          <img src={m.url} alt={m.nome} className="aspect-square w-full object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="w-full p-2 text-[10px] font-bold text-white truncate">{m.nome}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nota final */}
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
