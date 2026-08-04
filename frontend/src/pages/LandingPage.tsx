import { useNavigate } from 'react-router-dom';
import { FiShield, FiUserPlus, FiLogIn, FiCheck, FiZap, FiFileText } from 'react-icons/fi';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950">
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <FiShield className="text-amber-400" size={22} />
          </div>
          <span className="text-xl font-bold text-white">Safety<span className="text-amber-400">Vision</span> AI</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/tecnico/login')} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition">
            Entrar
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            Inspeções de Segurança<br />
            <span className="text-amber-400">Inteligentes com IA</span>
          </h1>
          <p className="text-lg md:text-xl text-navy-300 max-w-2xl mx-auto mb-10">
            Tire fotos do local de trabalho. Nossa IA analisa automaticamente e identifica riscos, violações de EPI e gera relatórios profissionais em segundos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/tecnico/cadastro')}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 text-lg font-bold text-navy-950 hover:bg-amber-400 transition shadow-lg shadow-amber-500/25"
            >
              <FiUserPlus size={20} />
              Criar Conta Grátis
            </button>
            <button
              onClick={() => navigate('/tecnico/login')}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 px-8 py-4 text-lg font-medium text-white hover:bg-white/10 transition"
            >
              <FiLogIn size={20} />
              Já tenho conta
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            { icon: <FiZap className="text-amber-400" size={28} />, title: 'Análise com IA', desc: 'GPT-4o analisa cada foto e identifica automaticamente todos os riscos e violações de EPI' },
            { icon: <FiFileText className="text-amber-400" size={28} />, title: 'Relatórios PDF', desc: 'Relatórios profissionais com imagens anotadas, detalhes dos riscos e plano de ação' },
            { icon: <FiShield className="text-amber-400" size={28} />, title: 'Conformidade NR', desc: 'Verificação automática contra todas as Normas Regulamentadoras de Segurança' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-navy-300 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Como funciona</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { step: '1', label: 'Cadastre-se' },
              { step: '2', label: 'Crie empresa/setor' },
              { step: '3', label: 'Tire fotos' },
              { step: '4', label: 'IA analisa' },
              { step: '5', label: 'Gere PDF' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-navy-950 font-bold text-lg">{s.step}</div>
                <span className="text-sm text-navy-300">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center border-t border-white/10 pt-8 mt-16">
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-6">
            {[
              { value: '99%', label: 'Precisão da IA' },
              { value: '<5s', label: 'Tempo de Análise' },
              { value: '100%', label: 'Gratuito' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-amber-400">{s.value}</p>
                <p className="text-sm text-navy-400">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-navy-500 text-sm">SafetyVision AI — Segurança do Trabalho com Inteligência Artificial</p>
        </div>
      </main>
    </div>
  );
}
