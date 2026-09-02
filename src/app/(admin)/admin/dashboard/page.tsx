"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Users, Clock, ArrowRight, Share2, Check, Car, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_plate: string;
  scheduled_at: string;
  total_price: number;
  status: string;
  services?: {
    name: string;
    duration_minutes: number;
  };
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  // Níveis de acesso para faturamento
  const [revenueVisible, setRevenueVisible] = useState(false);

  // States para estatísticas
  const [scheduledToday, setScheduledToday] = useState(0);
  const [washingNow, setWashingNow] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);
  const [tenantSlug, setTenantSlug] = useState('brilho-magico');
  const [tenantName, setTenantName] = useState('Brilho Mágico');
  const [copiedLink, setCopiedLink] = useState(false);

  // Lista de próximos agendamentos
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  const handleRevealRevenue = () => {
    const password = prompt("Digite a senha do Administrador para ver o faturamento:");
    if (password === '123456') {
      setRevenueVisible(true);
    } else if (password !== null) {
      alert("Senha incorreta!");
    }
  };

  const handleShareStore = async () => {
    const url = `https://brilho-magico-saas.vercel.app/agendar/${tenantSlug || 'wash-express'}`;
    const text = `🚗 Agende a lavagem do seu carro ou moto na ${tenantName || 'Brilho Mágico'} 100% online sem filas:\n👉 ${url}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${tenantName || 'Brilho Mágico'} - Agendamento Online`,
          text: text,
          url: url
        });
      } catch (err) {
        console.log(err);
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Pega o profile e tenant
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.role === 'ADMIN') {
          setRevenueVisible(true);
        } else {
          setRevenueVisible(false); // Reseta para segurança caso troque de conta
        }
      }

      if (profile?.tenant_id) {
        const tenantId = profile.tenant_id;

        // Pega dados da loja
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug, name')
          .eq('id', tenantId)
          .single();

        if (tenant) {
          setTenantSlug(tenant.slug || 'wash-express');
          setTenantName(tenant.name || 'Brilho Mágico');
        }

        // 1. Busca TODOS os agendamentos do tenant
        const { data: allAppointments } = await supabase
          .from('appointments')
          .select('*, services(name, duration_minutes)')
          .eq('tenant_id', tenantId);

        if (allAppointments) {
          const appointmentsList = allAppointments as unknown as Appointment[];

          // Obter data de hoje em formato AAAA-MM-DD local
          const todayStr = new Date().toLocaleDateString('en-US'); // MM/DD/YYYY

          // Filtra agendamentos de hoje
          const todayApps = appointmentsList.filter(app => {
            const appDateStr = new Date(app.scheduled_at).toLocaleDateString('en-US');
            return appDateStr === todayStr;
          });

          // Agendados hoje
          setScheduledToday(todayApps.length);

          // Veículos lavando no box agora
          const inProgress = appointmentsList.filter(app => app.status === 'EM_ANDAMENTO').length;
          setWashingNow(inProgress);

          // Faturamento hoje (soma dos que não estão cancelados)
          const todayRev = todayApps
            .filter(app => app.status !== 'CANCELADO')
            .reduce((sum, app) => sum + Number(app.total_price), 0);
          setRevenueToday(todayRev);

          // Total de clientes únicos (números de telefone únicos)
          const uniquePhones = new Set(appointmentsList.map(app => app.customer_phone));
          setTotalCustomers(uniquePhones.size);

          // Próximos agendamentos (ordenados por horário, a partir de agora)
          const nowTime = new Date().getTime();
          const upcoming = appointmentsList
            .filter(app => new Date(app.scheduled_at).getTime() >= nowTime && app.status !== 'CANCELADO')
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .slice(0, 5);
          setUpcomingAppointments(upcoming);
        }

        // 2. Busca os serviços do tenant para calcular o tempo médio cadastrado
        const { data: servicesData } = await supabase
          .from('services')
          .select('duration_minutes')
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        if (servicesData && servicesData.length > 0) {
          const totalMin = servicesData.reduce((sum, s) => sum + s.duration_minutes, 0);
          setAvgDuration(Math.round(totalMin / servicesData.length));
        } else {
          setAvgDuration(0);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateLabel = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Acompanhe os resultados reais do seu lava-rápido hoje.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleShareStore}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-colors"
            title="Compartilhar link de agendamento com clientes"
          >
            {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
            <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar Link'}</span>
          </button>

          <button
            onClick={loadDashboardData}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-150 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            🔄 Atualizar Painel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Buscando dados em tempo real...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Agendados Hoje */}
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Agendados Hoje</h3>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{scheduledToday}</p>
              <span className="text-gray-400 text-xs font-medium">Lavagens hoje</span>
            </div>

            {/* No Box / Lavando Agora */}
            <div className={`bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border text-left transition-all ${
              washingNow > 0 
                ? 'border-cyan-500/40 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                : 'border-gray-100 dark:border-gray-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">No Box / Lavando</h3>
                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                  <Car className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{washingNow}</p>
                {washingNow > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 animate-pulse">
                    <Sparkles size={10} className="animate-spin" /> Em andamento
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-xs font-medium">Veículos no pátio agora</span>
            </div>
            
            {/* Faturamento Hoje */}
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Faturamento Hoje</h3>
                  <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                
                {revenueVisible ? (
                  <>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {revenueToday.toFixed(2)}</p>
                    <span className="text-gray-450 text-xs font-medium mt-1 block">Confirmados e Pendentes</span>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white filter blur-md select-none">R$ 999.99</p>
                    <button
                      onClick={handleRevealRevenue}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-colors border border-gray-150 dark:border-gray-700"
                    >
                      🔑 Revelar Faturamento
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Total de Clientes */}
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total de Clientes</h3>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalCustomers}</p>
              <span className="text-gray-400 text-xs font-medium">Clientes únicos cadastrados</span>
            </div>
          </div>

          {/* Próximos Agendamentos */}
          <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Próximos Agendamentos</h2>
              <Link href="/admin/agendamentos" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p className="font-semibold text-sm">Nenhum agendamento futuro</p>
                <p className="text-xs text-gray-400 mt-0.5">Todos os agendamentos passados ou nenhum cadastrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-850">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Veículo / Placa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Serviço</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Horário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                    {upcomingAppointments.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                          <div>{app.customer_name}</div>
                          <div className="text-xs text-gray-400 font-normal">{app.customer_phone}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono font-semibold">
                          {app.vehicle_plate}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {app.services?.name || 'Lavagem'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {formatDateLabel(app.scheduled_at)} às {formatTime(app.scheduled_at)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {app.status === 'EM_ANDAMENTO' ? (
                            <span className="px-2.5 py-1 rounded-full font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 animate-pulse">
                              🔵 Lavando
                            </span>
                          ) : app.status === 'CONFIRMADO' ? (
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-green-50 dark:bg-green-950/30 text-green-750 dark:text-green-400">
                              Confirmado
                            </span>
                          ) : app.status === 'FINALIZADO' ? (
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-750 dark:text-blue-400">
                              Finalizado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-yellow-50 dark:bg-yellow-950/30 text-yellow-750 dark:text-yellow-400">
                              {app.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
