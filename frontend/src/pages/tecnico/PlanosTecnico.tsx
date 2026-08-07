import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiStar, FiZap, FiAward } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api';

interface Plano {
  id: string; nome: string; descricao?: string; preco: number; periodo: string;
  limiteEmpresas: number; limiteInspecoes: number; limiteUsuarios: number;
  features?: string;
}

interface MinhaAssinatura {
  id: string; status: string; dataInicio: string; dataFim?: string;
  plano: Plano;
}

const icons: Record<string, any> = { Gratuito: <FiStar size={24} />, Pro: <FiZap size={24} />, Enterprise: <FiAward size={24} /> };

export default function PlanosTecnico() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [assinatura, setAssinatura] = useState<MinhaAssinatura | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [p, a] = await Promise.all([api.get('/planos'), api.get('/planos/meu')]);
      setPlanos(p.data);
      setAssinatura(a.data);
    } catch {}
  };

  const handleAssinar = async (planoId: string) => {
    if (!confirm('Confirmar assinatura?')) return;
    setLoading(true);
    try {
      await api.post('/planos/assinar', { planoId });
      toast.success('Assinatura ativada!');
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  const handleCancelar = async () => {
    if (!confirm('Cancelar assinatura?')) return;
    setLoading(true);
    try {
      await api.post('/planos/cancelar');
      toast.success('Assinatura cancelada!');
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setLoading(false); }
  };

  const getCor = (nome: string) => {
    if (nome === 'Gratuito') return 'from-navy-100 to-navy-50 border-navy-200';
    if (nome === 'Pro') return 'from-amber-500 to-amber-400 border-amber-500';
    return 'from-navy-900 to-navy-800 border-navy-900';
  };

  const getTextCor = (nome: string) => {
    if (nome === 'Pro') return 'text-navy-900';
    if (nome === 'Enterprise') return 'text-white';
    return 'text-navy-900';
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-navy-900">Planos</h1>
        <p className="mt-2 text-navy-500">Escolha o plano ideal para sua empresa</p>
        {assinatura && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success-100 px-4 py-2 text-sm font-semibold text-success-700">
            <FiCheck size={16} /> Plano {assinatura.plano.nome} ativo
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {planos.map(p => {
          const isCurrent = assinatura?.plano?.id === p.id && assinatura?.status === 'ativo';
          return (
            <div key={p.id} className={`rounded-2xl border-2 bg-gradient-to-b ${getCor(p.nome)} p-6 flex flex-col ${p.nome === 'Pro' ? 'scale-105 shadow-2xl' : 'shadow-lg'}`}>
              <div className={`mb-4 flex items-center gap-2 ${getTextCor(p.nome)}`}>
                <div className={`rounded-xl p-2 ${p.nome === 'Enterprise' ? 'bg-amber-500 text-navy-900' : p.nome === 'Pro' ? 'bg-navy-900 text-amber-400' : 'bg-navy-200 text-navy-700'}`}>
                  {icons[p.nome] || <FiStar size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">{p.nome}</h3>
                  {p.nome === 'Pro' && <span className="text-[10px] font-bold uppercase text-amber-700">Mais popular</span>}
                </div>
              </div>
              <p className={`mb-4 text-sm ${getTextCor(p.nome)} opacity-70`}>{p.descricao}</p>
              <div className={`mb-6 text-center ${getTextCor(p.nome)}`}>
                <span className="text-4xl font-extrabold">{p.preco === 0 ? 'Grátis' : `R$ ${p.preco}`}</span>
                {p.preco > 0 && <span className="text-sm opacity-70">/{p.periodo === 'mensal' ? 'mês' : 'ano'}</span>}
              </div>
              <ul className="mb-6 flex-1 space-y-2">
                <li className={`flex items-center gap-2 text-sm ${getTextCor(p.nome)}`}><FiCheck size={14} className="text-success-500" /> {p.limiteEmpresas === 999 ? 'Empresas ilimitadas' : `${p.limiteEmpresas} empresa(s)`}</li>
                <li className={`flex items-center gap-2 text-sm ${getTextCor(p.nome)}`}><FiCheck size={14} className="text-success-500" /> {p.limiteInspecoes === 9999 ? 'Inspeções ilimitadas' : `${p.limiteInspecoes} inspeções/mês`}</li>
                <li className={`flex items-center gap-2 text-sm ${getTextCor(p.nome)}`}><FiCheck size={14} className="text-success-500" /> {p.limiteUsuarios === 999 ? 'Usuários ilimitados' : `${p.limiteUsuarios} usuário(s)`}</li>
                {p.features && p.features.split(',').map((f, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${getTextCor(p.nome)}`}><FiCheck size={14} className="text-success-500" /> {f.trim()}</li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="rounded-xl bg-success-100 py-3 text-center text-sm font-bold text-success-700">
                  <FiCheck size={16} className="mr-1 inline" /> Plano Atual
                </div>
              ) : (
                <button onClick={() => handleAssinar(p.id)} disabled={loading} className={`rounded-xl py-3 text-sm font-bold transition-all ${p.nome === 'Pro' ? 'bg-navy-900 text-amber-400 hover:bg-navy-800' : p.nome === 'Enterprise' ? 'bg-amber-500 text-navy-900 hover:bg-amber-400' : 'bg-navy-200 text-navy-700 hover:bg-navy-300'}`}>
                  {p.preco === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {assinatura && (
        <div className="mt-8 text-center">
          <button onClick={handleCancelar} disabled={loading} className="text-sm text-danger-500 hover:text-danger-700 underline">
            Cancelar assinatura
          </button>
        </div>
      )}
    </div>
  );
}
