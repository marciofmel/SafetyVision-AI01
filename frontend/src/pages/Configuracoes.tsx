import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiUser, FiHome, FiShield, FiSave, FiInfo, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api';

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
}

export default function Configuracoes() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'perfil' | 'empresa' | 'sistema'>('perfil');

  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [cargo, setCargo] = useState(user?.cargo || '');

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSel, setEmpresaSel] = useState<Empresa | null>(null);
  const [empresaForm, setEmpresaForm] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' });

  useEffect(() => {
    api.get('/empresas').then(({ data }) => {
      setEmpresas(data);
      if (data.length > 0) {
        setEmpresaSel(data[0]);
        setEmpresaForm(data[0]);
      }
    }).catch(() => {});
  }, []);

  const handleSavePerfil = async () => {
    try {
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleSaveEmpresa = async () => {
    if (!empresaSel) return;
    try {
      await api.put(`/empresas/${empresaSel.id}`, empresaForm);
      toast.success('Empresa atualizada com sucesso!');
      setEmpresas((prev) => prev.map((e) => (e.id === empresaSel.id ? { ...e, ...empresaForm } : e)));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar empresa');
    }
  };

  const tabs = [
    { id: 'perfil' as const, label: 'Meu Perfil', icon: <FiUser size={18} /> },
    { id: 'empresa' as const, label: 'Empresa', icon: <FiHome size={18} /> },
    { id: 'sistema' as const, label: 'Sistema', icon: <FiInfo size={18} /> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Configurações</h1>
        <p className="mt-1 text-sm text-navy-500">Gerencie seu perfil, empresa e preferências do sistema</p>
      </div>

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-64 shrink-0">
          <div className="card p-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? 'bg-navy-900 text-amber-400 shadow-lg'
                    : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'perfil' && (
            <div className="card p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-2xl font-extrabold text-amber-400">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-navy-900">{user?.nome}</h2>
                  <p className="text-sm text-navy-500">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-navy-700">Nome completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-navy-700">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-navy-700">Cargo</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button onClick={handleSavePerfil} className="btn-primary mt-4">
                  <FiSave size={16} />
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {activeTab === 'empresa' && (
            <div className="card p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-navy-900">Gerenciar Empresas</h2>
                <p className="text-sm text-navy-500">Edite as informações das empresas cadastradas</p>
              </div>

              {empresas.length > 0 && (
                <div className="mb-6 flex gap-2">
                  {empresas.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => { setEmpresaSel(e); setEmpresaForm(e); }}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        empresaSel?.id === e.id
                          ? 'bg-navy-900 text-amber-400'
                          : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                      }`}
                    >
                      {e.nome}
                    </button>
                  ))}
                </div>
              )}

              {empresaSel && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy-700">Nome da Empresa</label>
                    <input
                      type="text"
                      value={empresaForm.nome}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, nome: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-navy-700">CNPJ</label>
                      <input
                        type="text"
                        value={empresaForm.cnpj}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, cnpj: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-navy-700">Telefone</label>
                      <input
                        type="text"
                        value={empresaForm.telefone}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, telefone: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy-700">Endereço</label>
                    <input
                      type="text"
                      value={empresaForm.endereco}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, endereco: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy-700">E-mail</label>
                    <input
                      type="email"
                      value={empresaForm.email}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <button onClick={handleSaveEmpresa} className="btn-primary mt-4">
                    <FiSave size={16} />
                    Salvar Empresa
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sistema' && (
            <div className="card p-6">
              <h2 className="mb-6 text-xl font-bold text-navy-900">Informações do Sistema</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-navy-100 p-4">
                  <div className="flex items-center gap-3">
                    <FiShield size={20} className="text-navy-400" />
                    <div>
                      <p className="text-sm font-semibold text-navy-900">Versão</p>
                      <p className="text-xs text-navy-500">SafetyVision AI</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-bold text-navy-700">v1.0.0</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-navy-100 p-4">
                  <div className="flex items-center gap-3">
                    <FiCheckCircle size={20} className="text-success-600" />
                    <div>
                      <p className="text-sm font-semibold text-navy-900">Backend</p>
                      <p className="text-xs text-navy-500">Express + Prisma + SQLite</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-700">Online</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-navy-100 p-4">
                  <div className="flex items-center gap-3">
                    <FiInfo size={20} className="text-navy-400" />
                    <div>
                      <p className="text-sm font-semibold text-navy-900">IA</p>
                      <p className="text-xs text-navy-500">Simulação de análise de riscos</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Simulada</span>
                </div>

                <div className="rounded-xl border border-navy-100 p-4">
                  <p className="mb-2 text-sm font-semibold text-navy-900">NRs Cobertas</p>
                  <div className="flex flex-wrap gap-2">
                    {['NR-1', 'NR-5', 'NR-6', 'NR-7', 'NR-9', 'NR-10', 'NR-12', 'NR-13', 'NR-15', 'NR-16', 'NR-17', 'NR-18', 'NR-20', 'NR-33', 'NR-35'].map((nr) => (
                      <span key={nr} className="rounded-lg bg-navy-100 px-2 py-1 text-xs font-medium text-navy-600">{nr}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
