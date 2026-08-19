import { useEffect, useRef, useState } from 'react';
import { FiBell, FiAlertTriangle, FiHeart, FiBook, FiShield, FiCheckCircle, FiX, FiSettings } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const tipoIcon: Record<string, { icon: React.ReactNode; cor: string }> = {
  epi_vencido: { icon: <FiShield size={16} />, cor: 'bg-danger-100 text-danger-600' },
  epi_proximo: { icon: <FiShield size={16} />, cor: 'bg-amber-100 text-amber-600' },
  aso_vencido: { icon: <FiHeart size={16} />, cor: 'bg-danger-100 text-danger-600' },
  aso_proximo: { icon: <FiHeart size={16} />, cor: 'bg-amber-100 text-amber-600' },
  treinamento_vencido: { icon: <FiBook size={16} />, cor: 'bg-danger-100 text-danger-600' },
  treinamento_proximo: { icon: <FiBook size={16} />, cor: 'bg-amber-100 text-amber-600' },
  geral: { icon: <FiAlertTriangle size={16} />, cor: 'bg-navy-100 text-navy-600' },
};

function rotaDoTipo(tipo?: string): string | null {
  if (!tipo) return null;
  if (tipo.startsWith('epi')) return '/tecnico/epis';
  if (tipo.startsWith('aso')) return '/tecnico/asos';
  if (tipo.startsWith('treinamento')) return '/tecnico/treinamentos';
  return null;
}

export default function NotificationBell() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [naoLidos, setNaoLidos] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = () => {
    api.get('/alertas').then(({ data }) => setAlertas(data)).catch(() => {});
    api.get('/alertas/gerar').then(() => {
      api.get('/alertas').then(({ data }) => setAlertas(data)).catch(() => {});
    }).catch(() => {});
    api.get('/alertas/nao-lidos').then(({ data }) => setNaoLidos(data.count ?? 0)).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => { clearInterval(interval); document.removeEventListener('mousedown', handler); };
  }, []);

  const marcarLido = async (id: string) => {
    await api.put(`/alertas/${id}/lido`).catch(() => {});
    load();
  };

  const resolver = async (id: string) => {
    await api.put(`/alertas/${id}/resolver`).catch(() => {});
    load();
  };

  const abrir = async (alerta: any) => {
    if (!alerta.lido) await marcarLido(alerta.id);
    setOpen(false);
    const r = rotaDoTipo(alerta.tipo);
    if (r) navigate(r);
  };

  const naoLidosList = alertas.filter(a => !a.lido);
  const resolvidos = alertas.filter(a => a.lido && a.resolvido);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { if (!open) load(); setOpen(!open); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-700"
        title="Notificações"
      >
        <FiBell size={18} />
        {naoLidos > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white">
            {naoLidos}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-navy-100 bg-navy-900 px-4 py-3">
            <p className="text-sm font-bold text-white">Notificações</p>
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-navy-900">
              {naoLidos} não lidas
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {naoLidosList.length === 0 && resolvidos.length === 0 && (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-600">
                  <FiCheckCircle size={26} />
                </div>
                <p className="text-sm font-semibold text-navy-700">Tudo em dia!</p>
                <p className="mt-1 text-xs text-navy-400">Nenhuma pendência por enquanto.</p>
              </div>
            )}

            {naoLidosList.map((a: any) => {
              const cfg = tipoIcon[a.tipo] || tipoIcon.geral;
              const rota = rotaDoTipo(a.tipo);
              return (
                <div key={a.id} className="border-b border-navy-50 px-4 py-3 transition-colors hover:bg-navy-50">
                  <button onClick={() => abrir(a)} className="flex w-full items-start gap-3 text-left">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.cor}`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy-900">{a.titulo}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{a.descricao}</p>
                      {a.dataVencimento && (
                        <p className="mt-1 text-[10px] font-semibold text-amber-600">
                          Vence: {new Date(a.dataVencimento).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </button>
                  <div className="mt-2 flex gap-2 pl-11">
                    <button onClick={() => resolver(a.id)} className="rounded-md bg-success-50 px-2 py-1 text-[10px] font-bold text-success-700 hover:bg-success-100">
                      Resolver
                    </button>
                    {rota && (
                      <button onClick={() => { setOpen(false); navigate(rota); }} className="rounded-md bg-navy-50 px-2 py-1 text-[10px] font-bold text-navy-600 hover:bg-navy-100">
                        Ver módulo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {naoLidosList.length > 0 && resolvidos.length > 0 && (
              <div className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-navy-300">
                Resolvidos
              </div>
            )}

            {resolvidos.map((a: any) => {
              const cfg = tipoIcon[a.tipo] || tipoIcon.geral;
              return (
                <div key={a.id} className="border-b border-navy-50 bg-navy-50/50 px-4 py-2.5 opacity-70">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.cor}`}>
                      {cfg.icon}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-xs text-navy-500 line-through">{a.titulo}</p>
                    <FiCheckCircle className="shrink-0 text-success-500" size={14} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-navy-100 p-2">
            <button
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-700"
            >
              <FiSettings size={14} /> Gerenciar alertas nos módulos
              <FiX className="ml-auto" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}