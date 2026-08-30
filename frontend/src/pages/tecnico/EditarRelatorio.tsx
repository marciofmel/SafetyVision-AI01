import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiLoader } from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

export default function EditarRelatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspecao, setInspecao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    api.get(`/inspecoes/${id}`).then(({ data }) => {
      setInspecao(data);
      setForm({
        observacoes: data.observacoes || '',
        notaConformidade: data.notaConformidade ?? '',
        objetivo: data.objetivo || '',
        escopo: data.escopo || '',
        limitacoes: data.limitacoes || '',
        metodologia: data.metodologia || '',
      });
      setLoading(false);
    }).catch(() => {
      toast.error('Erro ao carregar inspeção');
      setLoading(false);
    });
  }, [id]);

  const salvar = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/inspecoes/${id}`, {
        observacoes: form.observacoes,
        notaConformidade: parseFloat(form.notaConformidade) || null,
        objetivo: form.objetivo,
        escopo: form.escopo,
        limitacoes: form.limitacoes,
        metodologia: form.metodologia,
      });
      setInspecao(data);
      toast.success('Relatório atualizado!');
      navigate(`/tecnico/relatorio/${id}`);
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FiLoader className="animate-spin text-amber-500" size={40} />
      </div>
    );
  }

  if (!inspecao) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-navy-500">Inspeção não encontrada</p>
        <button onClick={() => navigate(-1)} className="mt-4 btn-primary">Voltar</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-navy-500 hover:text-navy-700">
        <FiArrowLeft size={14} /> Voltar
      </button>

      <div className="card p-8">
        <h1 className="text-2xl font-bold text-navy-900">Editar Relatório</h1>
        <p className="mt-1 text-sm text-navy-400">Revise cada detalhe antes de baixar</p>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl bg-navy-50 p-4">
            <h3 className="text-sm font-bold text-navy-700">Dados da Inspeção</h3>
            <p className="mt-1 text-sm text-navy-600">Empresa: <span className="font-bold text-navy-900">{inspecao.empresa?.nome}</span></p>
            <p className="text-sm text-navy-600">Setor: <span className="font-bold text-navy-900">{inspecao.setor?.nome}</span></p>
            <p className="text-sm text-navy-600">Nota: <span className="font-bold text-navy-900">{inspecao.notaConformidade ?? '---'}/100</span></p>
          </div>

          <div>
            <label className="text-xs font-bold text-navy-500">Objetivo</label>
            <textarea value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-navy-200 p-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-navy-500">Escopo</label>
            <textarea value={form.escopo} onChange={e => setForm({ ...form, escopo: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-navy-200 p-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-navy-500">Limitações</label>
            <textarea value={form.limitacoes} onChange={e => setForm({ ...form, limitacoes: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-navy-200 p-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-navy-500">Metodologia</label>
            <textarea value={form.metodologia} onChange={e => setForm({ ...form, metodologia: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-navy-200 p-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-navy-500">Observações Gerais</label>
            <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-navy-200 p-3 text-sm" placeholder="Observações..." />
          </div>
          <div>
            <label className="text-xs font-bold text-navy-500">Nota de Conformidade (0-100)</label>
            <input value={form.notaConformidade} onChange={e => setForm({ ...form, notaConformidade: e.target.value })} type="number" min="0" max="100" className="mt-1 w-full rounded-xl border border-navy-200 p-3 text-sm" />
          </div>

          {inspecao.riscos?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-navy-700">Riscos Identificados ({inspecao.riscos.length})</h3>
              <div className="mt-2 space-y-2">
                {inspecao.riscos.map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-navy-100 p-3">
                    <p className="text-sm font-bold text-navy-900">{r.categoria}</p>
                    <p className="text-xs text-navy-600">{r.descricao}</p>
                    <p className="mt-1 text-xs text-navy-400">Gravidade: {r.gravidade} | Local: {r.localIdentificado}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inspecao.midias?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-navy-700">Fotos e Vídeos ({inspecao.midias.length})</h3>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {inspecao.midias.map((m: any) => (
                  <div key={m.id} className="overflow-hidden rounded-xl border border-navy-100">
                    {m.tipo === 'video' ? <video src={m.url} className="aspect-square w-full object-cover" controls /> : <img src={m.url} alt={m.nome} className="aspect-square w-full object-cover" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={salvar} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">
              {saving ? <FiLoader className="animate-spin" size={16} /> : <FiSave size={16} />}
              {saving ? 'Salvando...' : 'Salvar e Voltar'}
            </button>
            <button onClick={() => navigate(`/tecnico/relatorio/${id}`)} className="flex-1 rounded-xl border border-navy-200 bg-white py-3 text-sm font-bold text-navy-600">Cancelar</button>
          </div>

          <button onClick={() => navigate(`/tecnico/relatorio/${id}`)} className="w-full rounded-xl bg-navy-900 py-3 text-sm font-bold text-white hover:bg-navy-800">
            Baixar e Compartilhar a partir daqui
          </button>
        </div>
      </div>
    </div>
  );
}
