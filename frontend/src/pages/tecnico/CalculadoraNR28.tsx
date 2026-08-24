import { useState } from 'react';
import { FiDollarSign, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

export default function CalculadoraNR28() {
  const [gravidade, setGravidade] = useState('');
  const [tipo, setTipo] = useState('');
  const [cnpjrural, setCnpjrural] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const [nr, setNr] = useState('');
  const [nrGravidade, setNrGravidade] = useState('');
  const [resultadoNr, setResultadoNr] = useState<any>(null);

  const calcular = async () => {
    if (!gravidade || !tipo) return toast.error('Selecione gravidade e tipo');
    try {
      const { data } = await api.post('/multas/calcular', { gravidade, tipo, empresaCnpjrural: cnpjrural });
      setResultado(data);
    } catch {
      toast.error('Erro ao calcular');
    }
  };

  const calcularNr = async () => {
    if (!nr || !nrGravidade) return toast.error('Selecione NR e gravidade');
    try {
      const { data } = await api.post('/multas/calcular-nr', { nr, gravidade: nrGravidade });
      setResultadoNr(data);
    } catch {
      toast.error('Erro ao calcular');
    }
  };

  const gravidadeColors: Record<string, string> = {
    leve: 'bg-success-100 text-success-700 border-success-200',
    media: 'bg-amber-100 text-amber-700 border-amber-200',
    grave: 'bg-orange-100 text-orange-700 border-orange-200',
    gravissima: 'bg-danger-100 text-danger-700 border-danger-200',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Calculadora NR-28</h1>
        <p className="mt-1 text-sm text-navy-500">Calcule multas por descumprimento das Normas Regulamentadoras</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cálculo Geral */}
        <div className="card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-amber-400">
              <FiDollarSign size={20} />
            </div>
            <div>
              <h2 className="font-bold text-navy-900">Cálculo Geral</h2>
              <p className="text-xs text-navy-400">Multa por gravidade e tipo de infração</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-navy-700">Gravidade *</label>
              <div className="grid grid-cols-2 gap-2">
                {['leve', 'media', 'grave', 'gravissima'].map(g => (
                  <button
                    key={g}
                    onClick={() => setGravidade(g)}
                    className={`rounded-xl border-2 p-3 text-sm font-semibold transition-all ${
                      gravidade === g
                        ? gravidadeColors[g] + ' border-current'
                        : 'border-navy-200 text-navy-500 hover:border-navy-300'
                    }`}
                  >
                    {g === 'leve' ? 'Leve' : g === 'media' ? 'Média' : g === 'grave' ? 'Grave' : 'Gravíssima'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-navy-700">Tipo de Infração *</label>
              <select className="input-field w-full" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="sem_risco">Sem risco ao trabalhador</option>
                <option value="risco_controle">Com controle de risco</option>
                <option value="risco_epidemiologico">Risco epidemiológico</option>
                <option value="acidente">Com acidente de trabalho</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cnpjrural} onChange={e => setCnpjrural(e.target.checked)} className="h-4 w-4 rounded border-navy-300 text-amber-500" />
              <span className="text-sm text-navy-700">Empresa com CNPJ rural (-50%)</span>
            </label>

            <button onClick={calcular} className="btn-primary w-full py-3">
              <FiDollarSign size={18} /> Calcular Multa
            </button>
          </div>

          {resultado && (
            <div className="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-sm font-semibold text-navy-500">Valor da Multa</p>
              <p className="mt-2 text-4xl font-extrabold text-navy-900">{resultado.valorFormatado}</p>
              <p className="mt-2 text-sm text-navy-500">{resultado.detalhes}</p>
              {resultado.observacao && <p className="mt-1 text-xs text-amber-600">{resultado.observacao}</p>}
            </div>
          )}
        </div>

        {/* Cálculo por NR */}
        <div className="card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-600 text-white">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <h2 className="font-bold text-navy-900">Cálculo por NR Específica</h2>
              <p className="text-xs text-navy-400">Multa item da NR-28</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-navy-700">NR *</label>
              <select className="input-field w-full" value={nr} onChange={e => setNr(e.target.value)}>
                <option value="">Selecione a NR...</option>
                {['NR01','NR04','NR05','NR06','NR07','NR09','NR10','NR12','NR15','NR17','NR20','NR23','NR33','NR35'].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-navy-700">Gravidade *</label>
              <select className="input-field w-full" value={nrGravidade} onChange={e => setNrGravidade(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="leve">Leve (1x)</option>
                <option value="media">Média (2x)</option>
                <option value="grave">Grave (4x)</option>
                <option value="gravissima">Gravíssima (8x)</option>
              </select>
            </div>

            <button onClick={calcularNr} className="btn-primary w-full py-3">
              <FiAlertTriangle size={18} /> Calcular por NR
            </button>
          </div>

          {resultadoNr && (
            <div className="mt-6 rounded-xl border-2 border-danger-200 bg-danger-50 p-6">
              <div className="flex items-center gap-2 mb-3">
                <FiAlertTriangle className="text-danger-600" size={20} />
                <p className="font-bold text-navy-900">{resultadoNr.nr} — {resultadoNr.gravidade.toUpperCase()}</p>
              </div>
              <p className="text-sm text-navy-600 mb-2">{resultadoNr.item}</p>
              <div className="flex items-center justify-between text-sm text-navy-500 mb-1">
                <span>Valor base:</span>
                <span>R$ {resultadoNr.valorBase.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-navy-500 mb-3">
                <span>Multiplicador:</span>
                <span>{resultadoNr.multiplicador}x</span>
              </div>
              <div className="border-t border-danger-200 pt-3">
                <p className="text-sm font-semibold text-navy-500">Valor Final</p>
                <p className="text-3xl font-extrabold text-navy-900">{resultadoNr.valorFormatado}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela Referência */}
      <div className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <FiInfo className="text-navy-400" size={18} />
          <h3 className="font-bold text-navy-900">Tabela de Referência NR-28</h3>
        </div>
        <div className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-200">
                <th className="py-2 px-3 text-left font-semibold text-navy-700">NR</th>
                <th className="py-2 px-3 text-left font-semibold text-navy-700">Item</th>
                <th className="py-2 px-3 text-right font-semibold text-navy-700">Valor Base</th>
              </tr>
            </thead>
            <tbody>
              {[
                { nr: 'NR01', item: '1.5.3 - Programa de Prevenção de Riscos Ambientais', valor: 3000 },
                { nr: 'NR04', item: '4.1 - Serviços Especializados em Engenharia de Segurança', valor: 3000 },
                { nr: 'NR05', item: '5.3 - CIPA', valor: 3000 },
                { nr: 'NR06', item: '6.6.1 - Certificado de Aprovação do EPI', valor: 6000 },
                { nr: 'NR07', item: '7.3 - PCMSO', valor: 3000 },
                { nr: 'NR09', item: '9.1 - Programa de Riscos Ambientais', valor: 3000 },
                { nr: 'NR10', item: '10.1 - Serviços de Eletricidade', valor: 6000 },
                { nr: 'NR12', item: '12.1 - Segurança no Trabalho em Máquinas', valor: 6000 },
                { nr: 'NR15', item: '15.1 - Atividades e Operações Insalubres', valor: 3000 },
                { nr: 'NR17', item: '17.1 - Ergonomia', valor: 3000 },
                { nr: 'NR20', item: '20.1 - Líquidos Inflamáveis', valor: 6000 },
                { nr: 'NR23', item: '23.1 - Proteção contra Incêndios', valor: 3000 },
                { nr: 'NR33', item: '33.1 - Segurança em Espaços Confinados', valor: 6000 },
                { nr: 'NR35', item: '35.1 - Trabalho em Altura', valor: 6000 },
              ].map(r => (
                <tr key={r.nr} className="border-b border-navy-100 hover:bg-navy-50">
                  <td className="py-2 px-3 font-semibold text-navy-900">{r.nr}</td>
                  <td className="break-words py-2 px-3 text-navy-600">{r.item}</td>
                  <td className="whitespace-nowrap py-2 px-3 text-right font-semibold text-navy-900">R$ {r.valor.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
