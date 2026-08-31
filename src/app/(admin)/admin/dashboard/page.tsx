"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Users, Clock, ArrowRight } from 'lucide-react';
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
  
  // States para estatísticas
  const [scheduledToday, setScheduledToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);

  // Lista de próximos agendamentos
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Pega o profile e tenant
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profile?.tenant_id) {
        const tenantId = profile.tenant_id;

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
        
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-150 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          🔄 Atualizar Painel
        </button>
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
            
            {/* Faturamento Hoje */}
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Faturamento Hoje</h3>
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {revenueToday.toFixed(2)}</p>
              <span className="text-gray-405 text-xs font-medium">Confirmados e Pendentes</span>
            </div>

            {/* Novos Clientes */}
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

            {/* Tempo Médio */}
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Duração Média</h3>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgDuration}m</p>
              <span className="text-gray-400 text-xs font-medium">Tempo médio de serviços</span>
            </div>
          </div>

          {/* Tabela de Próximos Agendamentos */}
          <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Próximos Agendamentos</h2>
              <Link 
                href="/admin/agendamentos" 
                className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
            
            {upcomingAppointments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhum agendamento futuro</p>
                <p className="text-xs mt-1">Todos os agendamentos passados ou nenhum cadastrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Cliente</th>
                      <th className="px-6 py-4 font-semibold">Veículo / Placa</th>
                      <th className="px-6 py-4 font-semibold">Serviço</th>
                      <th className="px-6 py-4 font-semibold">Horário</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {upcomingAppointments.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900 dark:text-white">{app.customer_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{app.customer_phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-gray-150 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs font-semibold">
                            {app.vehicle_plate.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-350 text-sm font-semibold">{app.services?.name || 'Lavagem'}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white text-sm font-medium">
                          {formatDateLabel(app.scheduled_at)} às {formatTime(app.scheduled_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            app.status === 'CONFIRMADO'
                              ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                              : 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-750 dark:text-yellow-400'
                          }`}>
                            {app.status === 'CONFIRMADO' ? 'Confirmado' : 'Pendente'}
                          </span>
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
