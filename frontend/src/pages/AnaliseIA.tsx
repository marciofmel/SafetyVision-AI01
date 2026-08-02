import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiShield, FiCheck, FiX, FiFileText, FiLoader, FiRefreshCw } from 'react-icons/fi';
import api from '../api';
import toast from 'react-hot-toast';

export default function AnaliseIA() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');

  const analisar = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/analise/${id}/analisar`);
      setResultado(data);
      toast.success('Análise concluída!');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro na análise';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) analisar();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-navy-200 border-t-amber-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FiLoader className="animate-pulse text-navy-400" size={24} />
          </div>
        </div>
        <p className="mt-6 text-lg font-bold text-navy-900">Analisando com IA...</p>
        <p className="mt-1 text-sm text-navy-400">Processando fotos e identificando riscos</p>
        <div className="mt-4 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-100">
          <FiAlertTriangle className="text-danger-600" size={32} />
        </div>
        <p className="mt-4 text-lg font-bold text-navy-900">Erro na Análise</p>
        <p className="mt-1 text-sm text-navy-500">{error}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={analisar} className="btn-primary">
            <FiRefreshCw size={16} /> Tentar Novamente
          </button>
          <button onClick={() => navigate('/tecnico')} className="rounded-xl border-2 border-navy-200 px-6 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!resultado) return null;

  const gravidadeColor: Record<string, string> = {
    crítica: 'bg-danger-100 text-danger-700 border-danger-200',
    alta: 'bg-orange-100 text-orange-700 border-orange-200',
    média: 'bg-amber-100 text-amber-700 border-amber-200',
    baixa: 'bg-success-100 text-success-700 border-success-200',
  };

  const gravidadeIcon: Record<string, string> = {
    crítica: '🔴',
    alta: '🟠',
    média: '🟡',
    baixa: '🟢',
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Resultado da Análise</h1>
        <p className="mt-1 text-sm text-navy-500">Análise automática por inteligência artificial</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Fotos/Vídeos', value: resultado.totalMidias, color: 'bg-navy-900 text-amber-400' },
          { label: 'Riscos', value: resultado.riscosEncontrados, color: 'bg-danger-600 text-white' },
          { label: 'EPIs Ausentes', value: resultado.epiViolacoes, color: 'bg-amber-500 text-navy-900' },
          { label: 'Nota', value: `${resultado.notaConformidade}/100`, color: resultado.notaConformidade >= 70 ? 'bg-success-600 text-white' : resultado.notaConformidade >= 40 ? 'bg-amber-500 text-navy-900' : 'bg-danger-600 text-white' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl p-5 text-center shadow-lg`}>
            <p className="text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-sm opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* EPIs */}
      {resultado.epiViolacoesList?.length > 0 && (
        <div className="card mb-6 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-amber-400">
              <FiShield size={18} />
            </div>
            <h2 className="text-lg font-bold text-navy-900">Análise de EPIs</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {resultado.epiViolacoesList.map((epi: any, i: number) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl border-2 p-3 ${
                  epi.status === 'ausente'
                    ? 'border-danger-200 bg-danger-50'
                    : 'border-success-200 bg-success-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    epi.status === 'ausente' ? 'bg-danger-500 text-white' : 'bg-success-500 text-white'
                  }`}>
                    {epi.status === 'ausente' ? <FiX size={14} /> : <FiCheck size={14} />}
                  </div>
                  <span className="text-sm font-semibold text-navy-900">{epi.epiNome}</span>
                </div>
                <span className="text-xs font-bold text-navy-400">{(epi.confianca * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riscos */}
      {resultado.riscos?.length > 0 && (
        <div className="card mb-6 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-600 text-white">
              <FiAlertTriangle size={18} />
            </div>
            <h2 className="text-lg font-bold text-navy-900">Riscos Identificados</h2>
          </div>
          <div className="space-y-4">
            {resultado.riscos.map((risco: any, i: number) => (
              <div key={i} className="rounded-xl border-2 border-navy-100 p-5 transition-all hover:border-amber-200">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{gravidadeIcon[risco.gravidade] || '⚪'}</span>
                    <h3 className="font-bold text-navy-900">{risco.descricao}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${gravidadeColor[risco.gravidade] || ''}`}>
                    {risco.gravidade.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  {[
                    { label: 'Categoria', value: risco.categoria },
                    { label: 'Confiança', value: `${(risco.confianca * 100).toFixed(0)}%` },
                    { label: 'Consequências', value: risco.consequencias },
                    { label: 'NRs', value: risco.nrsRelacionadas },
                    { label: 'Prevenção', value: risco.medidasPreventivas },
                    { label: 'Correção', value: risco.medidasCorretivas },
                  ].map((field) => (
                    <div key={field.label}>
                      <p className="text-xs font-bold text-navy-400">{field.label}</p>
                      <p className="text-navy-700">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => navigate(`/tecnico/relatorio/${id}`)} className="btn-primary w-full py-4 text-base">
        <FiFileText size={18} />
        Gerar Relatório PDF
      </button>
    </div>
  );
}
