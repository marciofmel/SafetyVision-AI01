import { useState } from 'react';
import { FiSearch, FiAlertTriangle, FiExternalLink, FiCalendar, FiCheckCircle } from 'react-icons/fi';

interface NR {
  numero: string;
  nome: string;
  descricao: string;
  status: 'atualizada' | 'nova' | 'reestruturada';
  dataRevogacao?: string;
  dataAprovacao?: string;
  temas: string[];
}

const nrs: NR[] = [
  {
    numero: 'NR-1',
    nome: 'Disposições Gerais e Gestão de Segurança e Saúde no Trabalho',
    descricao: 'Estabelece as disposições gerais, os princípios e as diretrizes para a gestão da segurança e saúde no trabalho em todas as empresas e atividades.',
    status: 'reestruturada',
    dataAprovacao: '21/01/2019',
    temas: ['Gestão de SST', 'CIPA', 'Plano de Trabalho', 'Comunicação'],
  },
  {
    numero: 'NR-2',
    nome: ' Inspeção Prévia',
    descricao: 'Fica revogada. As disposições estão contempladas na NR-1.',
    status: 'atualizada',
    dataRevogacao: '21/01/2019',
    temas: ['Revogada'],
  },
  {
    numero: 'NR-5',
    nome: 'Comissão Interna de Prevenção de Acidentes (CIPA)',
    descricao: 'Define a obrigatoriedade de constituição da CIPA nas empresas, com base no grau de risco e número de empregados.',
    status: 'atualizada',
    dataAprovacao: '21/01/2019',
    temas: ['CIPA', 'Eleição', 'Atribuições', 'Reuniões'],
  },
  {
    numero: 'NR-6',
    nome: 'Equipamentos de Proteção Individual (EPI)',
    descricao: 'Dispõe sobre a obrigatoriedade de fornecimento, uso, conservação e higienização dos EPIs pelos empregadores.',
    status: 'atualizada',
    dataAprovacao: '09/12/2001',
    temas: ['EPI', 'CA', 'Fornecimento', 'Capacitação'],
  },
  {
    numero: 'NR-7',
    nome: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)',
    descricao: 'Estabelece a obrigatoriedade de elaboração e implementação do PCMSO por parte dos empregadores.',
    status: 'atualizada',
    dataAprovacao: '09/12/2001',
    temas: ['PCMSO', 'ASO', 'Exames', 'Médico do Trabalho'],
  },
  {
    numero: 'NR-9',
    nome: 'Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos',
    descricao: 'Dispõe sobre a avaliação e o controle das exposições ocupacionais a agentes físicos, químicos e biológicos.',
    status: 'atualizada',
    dataAprovacao: '18/06/2019',
    temas: ['PGR', 'Agentes Químicos', 'Agentes Físicos', 'PPRA/PGR'],
  },
  {
    numero: 'NR-10',
    nome: ' Segurança em Instalações e Serviços em Eletricidade',
    descricao: 'Dispõe sobre os requisitos de segurança para instalações e serviços em eletricidade.',
    status: 'atualizada',
    dataAprovacao: '18/06/2019',
    temas: ['Eletricidade', 'NR-10 Capacitação', 'Barreiras', 'Aterramento'],
  },
  {
    numero: 'NR-12',
    nome: ' Segurança no Trabalho em Máquinas e Equipamentos',
    descricao: 'Dispõe sobre os requisitos de segurança no trabalho em máquinas e equipamentos.',
    status: 'atualizada',
    dataAprovacao: '08/06/2021',
    temas: ['Máquinas', 'Equipamentos', 'SIFPs', 'Proteções Coletivas'],
  },
  {
    numero: 'NR-13',
    nome: ' Inspeção de Caldeiras, Vasos de Pressão e Tubulações',
    descricao: 'Dispõe sobre os procedimentos para a inspeção e segurança de caldeiras, vasos de pressão e tubulações.',
    status: 'atualizada',
    dataAprovacao: '15/03/2021',
    temas: ['Caldeiras', 'Vasos de Pressão', 'Tubulações', 'Inspeção Técnica'],
  },
  {
    numero: 'NR-15',
    nome: ' Atividades e Operações Insalubres',
    descricao: 'Dispõe sobre a identificação, reconhecimento, avaliação e controle das exposições a agentes nocivos.',
    status: 'atualizada',
    dataAprovacao: '09/12/2014',
    temas: ['Insalubridade', 'Agentes Nocivos', 'Laudo Técnico', 'Graus'],
  },
  {
    numero: 'NR-16',
    nome: ' Atividades e Operações Perigosas',
    descricao: 'Dispõe sobre as atividades e operações perigosas com inflamáveis, explosivos, radiações ionizantes e substâncias tóxicas.',
    status: 'atualizada',
    dataAprovacao: '09/12/2014',
    temas: ['Periculosidade', 'Inflamáveis', 'Explosivos', 'Radiações'],
  },
  {
    numero: 'NR-17',
    nome: ' Ergonomia',
    descricao: 'Estabelece os requisitos ergonômicos para o trabalho, abordando o levantamento, transporte e descarga de materiais.',
    status: 'atualizada',
    dataAprovacao: '09/12/2020',
    temas: ['Ergonomia', 'Postura', 'Mobiliário', 'Jornada de Trabalho'],
  },
  {
    numero: 'NR-18',
    nome: ' Controle das Condições e Meio Ambiente de Trabalho na Indústria da Construção',
    descricao: 'Dispõe sobre as condições e o meio ambiente de trabalho na indústria da construção.',
    status: 'atualizada',
    dataAprovacao: '08/06/2021',
    temas: ['Construção Civil', 'Telhados', 'Escadas', ' andaimes'],
  },
  {
    numero: 'NR-20',
    nome: ' Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis',
    descricao: 'Dispõe sobre os requisitos de segurança e saúde no trabalho com inflamáveis e combustíveis.',
    status: 'atualizada',
    dataAprovacao: '18/06/2019',
    temas: ['Inflamáveis', 'Combustíveis', 'Armazenamento', 'Transporte'],
  },
  {
    numero: 'NR-33',
    nome: ' Segurança e Saúde no Trabalho em Espaços Confinados',
    descricao: 'Dispõe sobre os requisitos de segurança e saúde no trabalho em espaços confinados.',
    status: 'atualizada',
    dataAprovacao: '18/06/2019',
    temas: ['Espaços Confinados', 'Autorização', 'Ventilação', 'Resgate'],
  },
  {
    numero: 'NR-35',
    nome: ' Segurança no Trabalho em Altura',
    descricao: 'Dispõe sobre os requisitos de segurança para o trabalho em altura.',
    status: 'atualizada',
    dataAprovacao: '18/06/2019',
    temas: ['Trabalho em Altura', 'NR-35 Capacitação', 'Pontos Ancoragem', 'EPI Queda'],
  },
];

const statusColors = {
  atualizada: 'bg-success-100 text-success-700',
  nova: 'bg-navy-900 text-amber-400',
  reestruturada: 'bg-amber-100 text-amber-700',
};

const statusLabels = {
  atualizada: 'Atualizada',
  nova: 'Nova',
  reestruturada: 'Reestruturada',
};

export default function NRsAtualizadas() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string>('todas');

  const filtradas = nrs.filter((nr) => {
    const matchBusca =
      nr.numero.toLowerCase().includes(busca.toLowerCase()) ||
      nr.nome.toLowerCase().includes(busca.toLowerCase()) ||
      nr.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      nr.temas.some((t) => t.toLowerCase().includes(busca.toLowerCase()));
    const matchFiltro = filtro === 'todas' || nr.status === filtro;
    return matchBusca && matchFiltro;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">NRs Atualizadas</h1>
        <p className="mt-1 text-sm text-navy-500">Normas Regulamentadoras de Segurança e Saúde no Trabalho</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-2xl font-extrabold text-navy-900">{nrs.length}</p>
          <p className="text-xs text-navy-500">Total de NRs</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-extrabold text-success-600">{nrs.filter((n) => n.status === 'atualizada').length}</p>
          <p className="text-xs text-navy-500">Atualizadas</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-extrabold text-amber-600">{nrs.filter((n) => n.status === 'reestruturada').length}</p>
          <p className="text-xs text-navy-500">Reestruturadas</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-extrabold text-navy-900">{nrs.filter((n) => n.status === 'nova').length}</p>
          <p className="text-xs text-navy-500">Novas</p>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              type="text"
              placeholder="Buscar por NR, nome, tema..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'todas', label: 'Todas' },
              { value: 'atualizada', label: 'Atualizadas' },
              { value: 'reestruturada', label: 'Reestruturadas' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  filtro === f.value
                    ? 'bg-navy-900 text-amber-400'
                    : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de NRs */}
      <div className="space-y-4">
        {filtradas.length === 0 ? (
          <div className="card p-12 text-center">
            <FiAlertTriangle className="mx-auto mb-4 text-navy-300" size={48} />
            <p className="text-lg font-bold text-navy-900">Nenhuma NR encontrada</p>
            <p className="text-sm text-navy-500">Tente outro termo de busca</p>
          </div>
        ) : (
          filtradas.map((nr) => (
            <div key={nr.numero} className="card overflow-hidden transition-all hover:shadow-lg">
              <div className="flex items-start gap-4 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-lg font-extrabold text-amber-400">
                  {nr.numero.replace('NR-', '')}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-navy-900">
                      {nr.numero} — {nr.nome}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[nr.status]}`}>
                      {statusLabels[nr.status]}
                    </span>
                  </div>
                  <p className="mb-3 text-sm text-navy-600">{nr.descricao}</p>
                  <div className="flex flex-wrap gap-2">
                    {nr.temas.map((tema) => (
                      <span key={tema} className="rounded-lg bg-navy-100 px-3 py-1 text-xs font-medium text-navy-600">
                        {tema}
                      </span>
                    ))}
                  </div>
                  {(nr.dataAprovacao || nr.dataRevogacao) && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-navy-400">
                      {nr.dataAprovacao && (
                        <span className="flex items-center gap-1">
                          <FiCalendar size={12} /> Aprovação: {nr.dataAprovacao}
                        </span>
                      )}
                      {nr.dataRevogacao && (
                        <span className="flex items-center gap-1 text-danger-600">
                          <FiAlertTriangle size={12} /> Revogada em: {nr.dataRevogacao}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
