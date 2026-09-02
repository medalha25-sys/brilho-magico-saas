"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck,
  Gift
} from 'lucide-react';

export default function CadastroTrialPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [cityState, setCityState] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Auto-generate slug from company name
  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  // Mask phone
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      setPhone(raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim());
    } else {
      setPhone(raw.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim());
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }

    if (!slug || slug.length < 3) {
      setError("O link personalizado da sua empresa deve ter no mínimo 3 caracteres.");
      return;
    }

    try {
      setLoading(true);

      // 1. Verifica se o slug já está em uso
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingTenant) {
        setError(`O link "agendar/${slug}" já está em uso por outro estabelecimento. Por favor, escolha outro nome ou adicione sua cidade (ex: ${slug}-salinas).`);
        setLoading(false);
        return;
      }

      // 2. Cria o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: ownerName.trim(),
            name: ownerName.trim(),
            role: 'ADMIN'
          }
        }
      });

      if (authError) {
        setError(authError.message === "User already registered" 
          ? "Este e-mail já possui uma conta cadastrada. Tente fazer login ou use outro e-mail." 
          : authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setError("Erro ao criar conta de usuário. Tente novamente.");
        setLoading(false);
        return;
      }

      // 3. Cria a empresa (Tenant)
      const cleanPhone = phone.replace(/\D/g, '');
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: companyName.trim(),
          slug: slug.trim().toLowerCase(),
          phone: cleanPhone,
          address: cityState.trim() || undefined,
          owner_id: userId
        })
        .select()
        .single();

      if (tenantError || !tenantData) {
        setError("Erro ao cadastrar a empresa: " + (tenantError?.message || "Tente novamente."));
        setLoading(false);
        return;
      }

      const tenantId = tenantData.id;

      // 4. Cria/Atualiza o Profile do usuário como ADMIN da nova empresa
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: ownerName.trim(),
          role: 'ADMIN',
          tenant_id: tenantId
        });

      // 5. Cadastra Serviços Padrão de Boas-Vindas
      const defaultServices = [
        {
          tenant_id: tenantId,
          name: 'Limpeza Básica & Aspiração',
          vehicle_type: 'CARRO',
          price: 60,
          duration_minutes: 45,
          is_active: true
        },
        {
          tenant_id: tenantId,
          name: 'Lavagem Completa com Cera',
          vehicle_type: 'CARRO',
          price: 90,
          duration_minutes: 60,
          is_active: true
        },
        {
          tenant_id: tenantId,
          name: 'Lavagem Detalhada & Plásticos',
          vehicle_type: 'CARRO',
          price: 160,
          duration_minutes: 90,
          is_active: true
        },
        {
          tenant_id: tenantId,
          name: 'Higienização Interna Completa',
          vehicle_type: 'CARRO',
          price: 280,
          duration_minutes: 180,
          is_active: true
        }
      ];

      try {
        await supabase.from('services').insert(defaultServices);
      } catch {
        // não bloqueia o fluxo caso dê aviso
      }

      // 6. Faz login e redireciona para o Dashboard
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      setSuccess(true);

      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 1500);

    } catch (err) {
      console.error("Erro no cadastro:", err);
      setError("Ocorreu um erro ao processar o cadastro. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Header Superior com Marca Kryon Systems */}
      <header className="border-b border-gray-800/80 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-black text-base shadow-lg shadow-emerald-500/20">
              ⚡
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">KRYON SYSTEMS</span>
              <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block -mt-0.5">
                Plataforma SaaS para Lava-Rápido
              </span>
            </div>
          </div>

          <Link
            href="/login"
            className="text-xs font-bold text-gray-400 hover:text-white transition-colors py-2 px-3.5 rounded-xl border border-gray-800 hover:border-gray-700 bg-gray-900"
          >
            Já sou cliente (Login)
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto px-4 py-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Coluna Esquerda: Apresentação & Benefícios do Teste de 30 Dias */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
            <Gift size={14} className="text-emerald-400" />
            <span>30 Dias de Teste 100% Gratuito</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Transforme a gestão do seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">Lava-Rápido & Estética</span>
          </h1>

          <p className="text-sm text-gray-400 leading-relaxed">
            Cadastre sua empresa em menos de 1 minuto e tenha um sistema completo com agendamento online para clientes, controle de pátio em tempo real, financeiro com DRE e cartão fidelidade.
          </p>

          <div className="space-y-3 pt-2">
            {[
              { title: "Link Exclusivo de Agendamento", desc: "Seus clientes agendam online pelo celular sem fila e sem precisar de senha." },
              { title: "Controle de Box & Fila em Tempo Real", desc: "Acompanhe carros no pátio, no box e avise pelo WhatsApp quando estiver pronto." },
              { title: "Financeiro Completo & Lucro Líquido Real", desc: "Controle entradas, despesas de produtos e veja seu DRE em 1 clique." },
              { title: "Programa de Fidelidade por Pontos", desc: "Incentive clientes a lavarem com frequência e consulte pontos facilmente." },
              { title: "Sem Cartão de Crédito", desc: "Experimente todas as funções grátis por 30 dias sem compromisso." }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-900/60 border border-gray-800/80">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-white">{item.title}</h2>
                  <p className="text-[11px] text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Direita: Formulário de Cadastro */}
        <div className="lg:col-span-7">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

            <div className="mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>Criar Conta de Teste Grátis</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  30 Dias
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Preencha os dados abaixo para ativar o sistema do seu lava-rápido instantaneamente.
              </p>
            </div>

            {error && (
              <div className="mb-5 bg-red-950/60 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-red-300 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {success ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl border border-emerald-500/40 animate-bounce">
                  🎉
                </div>
                <h3 className="text-xl font-black text-white">Empresa Cadastrada com Sucesso!</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Estamos configurando seus serviços e seu link exclusivo de agendamento. Redirecionando para o seu painel...
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Seção 1: Dados do Estabelecimento */}
                <div className="space-y-3.5 pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Building2 size={14} />
                    <span>1. Dados do seu Lava-Rápido</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Nome do Lava-Rápido ou Estética *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lava-Rápido Brilho Mágico, Studio Auto Wash..."
                      value={companyName}
                      onChange={(e) => handleCompanyNameChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-800 bg-gray-950 text-white placeholder-gray-600 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Link de Agendamento dos seus Clientes *
                    </label>
                    <div className="flex items-center rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-mono text-gray-400">
                      <span className="text-gray-500 hidden sm:inline">.../agendar/</span>
                      <input
                        type="text"
                        required
                        placeholder="nome-do-lava-rapido"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="bg-transparent text-emerald-400 font-bold focus:outline-none w-full"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Seus clientes acessarão: <strong>https://brilho-magico-saas.vercel.app/agendar/{slug || 'sua-empresa'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        WhatsApp Comercial *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <input
                          type="tel"
                          required
                          placeholder="(00) 00000-0000"
                          value={phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-800 bg-gray-950 text-white placeholder-gray-600 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        Cidade / Estado (Opcional)
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: Salinas - MG"
                          value={cityState}
                          onChange={(e) => setCityState(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-800 bg-gray-950 text-white placeholder-gray-600 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Dados do Administrador (Login) */}
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                    <ShieldCheck size={14} />
                    <span>2. Dados do Dono / Login de Acesso</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Seu Nome Completo *
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-800 bg-gray-950 text-white placeholder-gray-600 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      E-mail de Login *
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="seu-email@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-800 bg-gray-950 text-white placeholder-gray-600 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        Criar Senha *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <input
                          type="password"
                          required
                          placeholder="Mínimo 6 dígitos"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-800 bg-gray-950 text-white placeholder-gray-600 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        Confirmar Senha *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <input
                          type="password"
                          required
                          placeholder="Repita a senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-800 bg-gray-950 text-white placeholder-gray-600 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Criando seu Sistema...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Começar Meu Teste Grátis de 30 Dias</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-gray-500 mt-2.5">
                    Ao criar sua conta, você concorda com os termos de uso do software Kryon Systems.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Rodapé Oficial Kryon Systems */}
      <footer className="border-t border-gray-900 bg-gray-950 py-6 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Kryon Systems • Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-gray-400">
            <a href="https://www.kryonsystems.com.br/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
              Site Oficial Kryon Systems
            </a>
            <a href="https://app.kryonsystems.com.br/products/lava-rapido" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
              Página do Produto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
