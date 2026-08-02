import { FiShield } from 'react-icons/fi';

const nrs = [
  { nome: 'NR-1', titulo: 'Disposições Gerais e Gestão da Segurança e Saúde no Trabalho', versao: 'Atualização em 2025', desc: 'Estabelece as disposições gerais e a gestão da segurança e saúde no trabalho em todas as atividades econômicas.' },
  { nome: 'NR-2', titulo: 'Inspeção Prévia', versao: 'Vigente', desc: 'Exige inspeção prévia dos locais de trabalho antes da início das atividades.' },
  { nome: 'NR-3', titulo: 'Comunicação', versao: 'Vigente', desc: 'Estabelece os procedimentos para comunicação entre empregados e empregadores.' },
  { nome: 'NR-4', titulo: 'Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho', versao: 'Atualização em 2025', desc: 'Dispõe sobre a organização e o funcionamento dos Serviços Especializados em Engenharia de Segurança e Medicina do Trabalho (SESMT).' },
  { nome: 'NR-5', titulo: 'Comissão Interna de Prevenção de Acidentes (CIPA)', versao: 'Atualização em 2025', desc: 'Regulamenta a constituição e o funcionamento da CIPA.' },
  { nome: 'NR-6', titulo: 'Equipamento de Proteção Individual (EPI)', versao: 'Vigente', desc: 'Dispõe sobre o fornecimento, uso, guarda e conservação do EPI.' },
  { nome: 'NR-7', titulo: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)', versao: 'Vigente', desc: 'Estabelece a obrigatoriedade da elaboração e implementação do PCMSO.' },
  { nome: 'NR-8', titulo: 'Edificações', versao: 'Vigente', desc: 'Dispõe sobre as condições de segurança nas edificações.' },
  { nome: 'NR-9', titulo: 'Programa de Prevenção de Riscos Ambientais (PPRA)', versao: 'Vigente', desc: 'Dispõe sobre a obrigatoriedade da elaboração e implementação do PPRA.' },
  { nome: 'NR-10', titulo: 'Segurança em Instalações e Serviços em Eletricidade', versao: 'Atualização em 2025', desc: 'Dispõe sobre a segurança nas instalações e serviços em eletricidade.' },
  { nome: 'NR-11', titulo: 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais', versao: 'Vigente', desc: 'Dispõe sobre o transporte, movimentação, armazenagem e manuseio de materiais.' },
  { nome: 'NR-12', titulo: 'Segurança no Trabalho em Máquinas e Equipamentos', versao: 'Atualização em 2025', desc: 'Dispõe sobre a segurança no trabalho em máquinas e equipamentos.' },
  { nome: 'NR-13', titulo: 'Caldeiras, Vasos de Pressão e Tubulações', versao: 'Vigente', desc: 'Dispõe sobre a segurança no trabalho em caldeiras, vasos de pressão e tubulações.' },
  { nome: 'NR-14', titulo: 'Fornos', versao: 'Vigente', desc: 'Dispõe sobre a segurança no trabalho em fornos.' },
  { nome: 'NR-15', titulo: 'Atividades e Operações Insalubres', versao: 'Vigente', desc: 'Dispõe sobre as atividades e operações insalubres.' },
  { nome: 'NR-16', titulo: 'Atividades e Operações Perigosas', versao: 'Vigente', desc: 'Dispõe sobre as atividades e operações perigosas.' },
  { nome: 'NR-17', titulo: 'Ergonomia', versao: 'Atualização em 2025', desc: 'Dispõe sobre a ergonomia no trabalho.' },
  { nome: 'NR-18', titulo: 'Controle e Condições Ambientais do Trabalho na Indústria da Construção', versao: 'Vigente', desc: 'Dispõe sobre o controle e as condições ambientais do trabalho na indústria da construção.' },
  { nome: 'NR-19', titulo: 'Explosivos', versao: 'Vigente', desc: 'Dispõe sobre a segurança no trabalho com explosivos.' },
  { nome: 'NR-20', titulo: 'Segurança e Saúde no Trabalho com Líquidos e Gases Inflamáveis e Combustíveis', versao: 'Atualização em 2025', desc: 'Dispõe sobre a segurança e saúde no trabalho com líquidos e gases inflamáveis e combustíveis.' },
  { nome: 'NR-21', titulo: 'Trabalho a Céu Aberto', versao: 'Vigente', desc: 'Dispõe sobre a segurança no trabalho a céu aberto.' },
  { nome: 'NR-22', titulo: 'Segurança e Saúde no Trabalho em Mineração de Superfície', versao: 'Vigente', desc: 'Dispõe sobre a segurança e saúde no trabalho em mineração de superfície.' },
  { nome: 'NR-23', titulo: 'Proteção contra Incêndios', versao: 'Vigente', desc: 'Dispõe sobre a proteção contra incêndios.' },
  { nome: 'NR-24', titulo: 'Condições e Meio Ambiente de Trabalho na Indústria da Construção', versao: 'Vigente', desc: 'Dispõe sobre as condições e o meio ambiente de trabalho na indústria da construção.' },
  { nome: 'NR-25', titulo: 'Resíduos Sólidos', versao: 'Vigente', desc: 'Dispõe sobre a destinação dos resíduos sólidos.' },
  { nome: 'NR-26', titulo: 'Sinalização de Segurança', versao: 'Vigente', desc: 'Dispõe sobre a sinalização de segurança.' },
  { nome: 'NR-27', titulo: 'Registro Profissional do Técnico de Segurança do Trabalho', versao: 'Vigente', desc: 'Dispõe sobre o registro profissional do Técnico de Segurança do Trabalho.' },
  { nome: 'NR-28', titulo: 'Multas', versao: 'Vigente', desc: 'Dispõe sobre a aplicação de multas.' },
  { nome: 'NR-29', titulo: 'Segurança e Saúde no Trabalho Aquaviário', versao: 'Vigente', desc: 'Dispõe sobre a segurança e saúde no trabalho aquaviário.' },
  { nome: 'NR-30', titulo: 'Segurança e Saúde no Trabalho em Doca e Outras Operações Portuárias', versao: 'Vigente', desc: 'Dispõe sobre a segurança e saúde no trabalho em docas e outras operações portuárias.' },
  { nome: 'NR-31', titulo: 'Segurança e Saúde no Trabalho na Agricultura, Pecuária, Silvicultura, Exploração Florestal e Aquicultura', versao: 'Atualização em 2025', desc: 'Dispõe sobre a segurança e saúde no trabalho na agricultura, pecuária, silvicultura, exploração florestal e aquicultura.' },
  { nome: 'NR-32', titulo: 'Segurança e Saúde no Trabalho em Serviços de Saúde', versao: 'Vigente', desc: 'Dispõe sobre a segurança e saúde no trabalho em serviços de saúde.' },
  { nome: 'NR-33', titulo: 'Segurança e Saúde nos Trabalhos em Espaços Confinados', versao: 'Atualização em 2025', desc: 'Dispõe sobre a segurança e saúde nos trabalhos em espaços confinados.' },
  { nome: 'NR-34', titulo: 'Condições e Meio Ambiente de Trabalho na Indústria da Construção, Reparo Navais e Offshore', versao: 'Vigente', desc: 'Dispõe sobre as condições e o meio ambiente de trabalho na indústria da construção, reparo naval e offshore.' },
  { nome: 'NR-35', titulo: 'Trabalho em Altura', versao: 'Atualização em 2025', desc: 'Dispõe sobre o trabalho em altura.' },
  { nome: 'NR-36', titulo: 'Segurança e Saúde no Trabalho em Plataformas de Petróleo e Gás', versao: 'Vigente', desc: 'Dispõe sobre a segurança e saúde no trabalho em plataformas de petróleo e gás.' },
  { nome: 'NR-37', titulo: 'Segurança e Saúde em Canteiros de Obras', versao: 'Vigente', desc: 'Dispõe sobre a segurança e saúde em canteiros de obras.' },
  { nome: 'NR-38', titulo: 'Segurança e Saúde no Trabalho em Atividades de Limpeza e Outras Atividades em Altura', versao: 'Vigente', desc: 'Dispõe sobre a segurança e saúde no trabalho em atividades de limpeza e outras atividades em altura.' },
];

export default function NRTecnico() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Normas Regulamentadoras</h1>
        <p className="mt-1 text-sm text-navy-500">Lista completa das NRs para consulta do técnico</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nrs.map((nr) => (
          <div key={nr.nome} className="card p-5 transition-all hover:shadow-lg">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100">
                <FiShield className="text-navy-600" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-900">{nr.nome}</h3>
                <p className="text-[10px] font-medium uppercase text-amber-500">{nr.versao}</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-navy-700">{nr.titulo}</p>
            <p className="mt-1 text-xs text-navy-400 line-clamp-3">{nr.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
