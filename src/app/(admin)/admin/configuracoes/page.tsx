"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Building2, Users, Shield, Plus, Trash2, Check, X, Info, Phone, MapPin, FileText, Image as ImageIcon } from 'lucide-react';

interface Collaborator {
  id: string;
  name: string;
  role: string;
  created_at: string;
}

interface CompanyDetails {
  name: string;
  phone: string;
  address: string;
  cnpj: string;
  logo_url: string;
}

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'EMPRESA' | 'COLABORADORES'>('EMPRESA');
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Estado dos Dados da Empresa
  const [company, setCompany] = useState<CompanyDetails>({
    name: '',
    phone: '',
    address: '',
    cnpj: '',
    logo_url: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySuccess, setCompanySuccess] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Estado dos Colaboradores
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  
  // Estado do Modal de Colaborador
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [collabName, setCollabName] = useState('');
  const [collabEmail, setCollabEmail] = useState('');
  const [collabPassword, setCollabPassword] = useState('');
  const [collabRole, setCollabRole] = useState<'GERENTE' | 'FUNCIONARIO'>('FUNCIONARIO');
  const [collabError, setCollabError] = useState<string | null>(null);
  const [submittingCollab, setSubmittingCollab] = useState(false);

  // Carrega as informações iniciais
  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca o profile do usuário logado para obter o tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);

        // 1. Busca dados da empresa (tenant)
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, phone, address, cnpj, logo_url')
          .eq('id', profile.tenant_id)
          .single();

        if (tenantData) {
          setCompany({
            name: tenantData.name || '',
            phone: tenantData.phone || '',
            address: tenantData.address || '',
            cnpj: tenantData.cnpj || '',
            logo_url: tenantData.logo_url || ''
          });
        }

        // 2. Busca lista de colaboradores
        await loadCollaborators(profile.tenant_id);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de configurações:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCollaborators = async (tId: string) => {
    try {
      setLoadingCollabs(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, created_at')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Erro ao carregar colaboradores:", error.message);
      } else if (data) {
        setCollaborators(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCollabs(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva os dados da empresa no Supabase
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSavingCompany(true);
    setCompanyError(null);
    setCompanySuccess(false);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: company.name,
          phone: company.phone,
          address: company.address,
          cnpj: company.cnpj,
          logo_url: company.logo_url
        })
        .eq('id', tenantId);

      if (error) {
        setCompanyError(error.message);
      } else {
        setCompanySuccess(true);
        setTimeout(() => setCompanySuccess(false), 3000);
      }
    } catch {
      setCompanyError("Erro de conexão ao salvar.");
    } finally {
      setSavingCompany(false);
    }
  };

  // Cadastra um novo colaborador
  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabName || !collabEmail || !collabPassword || !tenantId) {
      setCollabError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSubmittingCollab(true);
    setCollabError(null);

    try {
      // Registra a conta no Supabase Auth com metadados do profile
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: collabEmail,
        password: collabPassword,
        options: {
          data: {
            full_name: collabName,
            role: collabRole,
            tenant_id: tenantId
          }
        }
      });

      if (signUpError) {
        setCollabError(signUpError.message);
      } else if (data.user) {
        // Se a confirmação de e-mail estiver desabilitada, o profile é inserido via trigger instantaneamente.
        // Adicionamos ele no estado local imediatamente para feedback visual rápido.
        const newCollab: Collaborator = {
          id: data.user.id,
          name: collabName,
          role: collabRole,
          created_at: new Date().toISOString()
        };
        setCollaborators(prev => [...prev, newCollab]);
        
        // Limpa formulário e fecha modal
        setCollabName('');
        setCollabEmail('');
        setCollabPassword('');
        setCollabRole('FUNCIONARIO');
        setIsCollabOpen(false);
        alert("Colaborador cadastrado com sucesso! Um e-mail de confirmação foi enviado se a validação estiver ativa.");
      }
    } catch {
      setCollabError("Ocorreu um erro ao cadastrar o colaborador.");
    } finally {
      setSubmittingCollab(false);
    }
  };

  // Remove um colaborador do banco
  const handleDeleteCollaborator = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o colaborador "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        alert("Erro ao remover colaborador: " + error.message);
      } else {
        setCollaborators(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure os dados institucionais da empresa e gerencie colaboradores.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-255 dark:border-gray-800 mb-8">
        <button
          onClick={() => setActiveTab('EMPRESA')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-semibold text-sm transition-colors ${
            activeTab === 'EMPRESA'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Building2 size={16} /> Dados da Empresa
        </button>
        <button
          onClick={() => setActiveTab('COLABORADORES')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-semibold text-sm transition-colors ${
            activeTab === 'COLABORADORES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Users size={16} /> Colaboradores / Funcionários
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Carregando configurações...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DADOS DA EMPRESA */}
          {activeTab === 'EMPRESA' && (
            <div className="max-w-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">
              <form onSubmit={handleSaveCompany} className="space-y-6 text-left">
                {companyError && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-400">
                    ⚠️ Erro ao salvar: {companyError}
                  </div>
                )}
                {companySuccess && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-955/20 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-400 flex items-center gap-2">
                    <Check size={14} /> Dados atualizados com sucesso!
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nome da Empresa (Nome Fantasia)</label>
                    <input
                      type="text"
                      required
                      value={company.name}
                      onChange={(e) => setCompany(prev => ({ ...prev, name: e.target.value }))}
                      className="block w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* CNPJ */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">CNPJ</label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: 00.000.000/0001-00"
                        value={company.cnpj}
                        onChange={(e) => setCompany(prev => ({ ...prev, cnpj: e.target.value }))}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Endereço Completo</label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={company.address}
                        onChange={(e) => setCompany(prev => ({ ...prev, address: e.target.value }))}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">WhatsApp / Celular de Contato</label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: 5538999999999"
                        value={company.phone}
                        onChange={(e) => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">URL da Imagem do Logotipo</label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: https://dominio.com/logo.png"
                        value={company.logo_url}
                        onChange={(e) => setCompany(prev => ({ ...prev, logo_url: e.target.value }))}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview da Logo */}
                {company.logo_url && (
                  <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-4">
                    <img 
                      src={company.logo_url} 
                      alt="Logo Preview" 
                      className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-gray-850 bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.jpg';
                      }}
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Visualização do Logotipo</p>
                      <p className="text-[10px] text-gray-400">Esta imagem aparecerá na tela pública do cliente.</p>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={savingCompany}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors"
                  >
                    {savingCompany ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: COLABORADORES */}
          {activeTab === 'COLABORADORES' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lista de Colaboradores</h2>
                <button
                  onClick={() => {
                    setCollabName('');
                    setCollabEmail('');
                    setCollabPassword('');
                    setCollabRole('FUNCIONARIO');
                    setCollabError(null);
                    setIsCollabOpen(true);
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors"
                >
                  <Plus size={16} /> Cadastrar Colaborador
                </button>
              </div>

              {/* Tabela de Colaboradores */}
              <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {loadingCollabs ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-xs">Buscando colaboradores...</p>
                  </div>
                ) : collaborators.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-sm">Nenhum funcionário cadastrado</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-850">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cargo / Nível</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data de Cadastro</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-850 bg-white dark:bg-gray-950">
                      {collaborators.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-semibold text-gray-900 dark:text-white">
                            {c.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-left">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              c.role === 'ADMIN'
                                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}>
                              <Shield size={10} /> {c.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-left text-xs text-gray-500 dark:text-gray-400">
                            {new Date(c.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button
                              onClick={() => handleDeleteCollaborator(c.id, c.name)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Remover Acesso"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Cadastro de Colaborador */}
      {isCollabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cadastrar Novo Colaborador</h2>
              <button 
                onClick={() => setIsCollabOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {collabError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-400 flex items-center gap-2">
                <Info size={14} className="shrink-0" />
                <span>{collabError}</span>
              </div>
            )}

            <form onSubmit={handleAddCollaborator} className="space-y-4 text-left">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={collabName}
                  onChange={(e) => setCollabName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: joao@gmail.com"
                  value={collabEmail}
                  onChange={(e) => setCollabEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Senha Provisória</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={collabPassword}
                  onChange={(e) => setCollabPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Cargo / Nível */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nível de Permissão (Cargo)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCollabRole('GERENTE')}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-colors ${
                      collabRole === 'GERENTE' 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-450' 
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    💼 Gerente
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollabRole('FUNCIONARIO')}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-colors ${
                      collabRole === 'FUNCIONARIO' 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-450' 
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    🛠️ Funcionário
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsCollabOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCollab}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  {submittingCollab ? 'Cadastrando...' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
