"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  DollarSign, 
  TrendingUp, 
  Car, 
  Printer, 
  Download, 
  Search, 
  FileText, 
  BarChart3,
  Award,
  Tag,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

interface AppointmentTransaction {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_cpf?: string | null;
  vehicle_plate: string;
  scheduled_at: string;
  total_price: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  services?: {
    name: string;
    price: number;
    duration_minutes?: number;
    vehicle_type?: string;
  };
}

interface TenantInfo {
  name: string;
  phone?: string;
  address?: string;
  cnpj?: string;
}

type PeriodType = 'HOJE' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'CUSTOM';

export default function FinanceiroPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState<AppointmentTransaction[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [revenueVisible, setRevenueVisible] = useState(true);

  // Filtros de Período
  const [period, setPeriod] = useState<PeriodType>('MENSAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  // Carrega todos os agendamentos e transações
  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.role === 'ADMIN') {
          setIsAdmin(true);
          setRevenueVisible(true);
        } else {
          setIsAdmin(false);
          setRevenueVisible(false);
        }
      }

      if (profile?.tenant_id) {
        const tId = profile.tenant_id;

        // Dados da loja
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, phone, address, cnpj')
          .eq('id', tId)
          .single();

        if (tenant) {
          setTenantInfo(tenant);
        }

        // Busca todas as transações de agendamentos
        const { data: appsData } = await supabase
          .from('appointments')
          .select('*, services(name, price, duration_minutes, vehicle_type)')
          .eq('tenant_id', tId)
          .order('scheduled_at', { ascending: false });

        if (appsData) {
          setAllAppointments(appsData as unknown as AppointmentTransaction[]);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar financeiro:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Define os limites de data de acordo com o período selecionado
  const getFilteredTransactions = () => {
    const now = new Date();

    return allAppointments.filter((app) => {
      const appDate = new Date(app.scheduled_at);

      if (period === 'HOJE') {
        const isToday = 
          appDate.getDate() === now.getDate() &&
          appDate.getMonth() === now.getMonth() &&
          appDate.getFullYear() === now.getFullYear();
        return isToday;
      }

      if (period === 'SEMANAL') {
        // Últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return appDate >= sevenDaysAgo;
      }

      if (period === 'MENSAL') {
        // Este mês corrente
        return (
          appDate.getMonth() === now.getMonth() &&
          appDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'ANUAL') {
        // Este ano corrente
        return appDate.getFullYear() === now.getFullYear();
      }

      if (period === 'CUSTOM') {
        if (!startDate && !endDate) return true;
        const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(0);
        const end = endDate ? new Date(endDate + 'T23:59:59') : new Date(8640000000000000);
        return appDate >= start && appDate <= end;
      }

      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Filtragem adicional de busca na tabela
  const searchedTransactions = filteredTransactions.filter(item => {
    const q = tableSearch.toLowerCase();
    return (
      item.customer_name.toLowerCase().includes(q) ||
      item.customer_phone.includes(q) ||
      item.vehicle_plate.toLowerCase().includes(q) ||
      (item.services?.name && item.services.name.toLowerCase().includes(q))
    );
  });

  // Métricas do período (excluindo cancelados)
  const validTransactions = filteredTransactions.filter(t => t.status !== 'CANCELADO');
  const totalRevenue = validTransactions.reduce((sum, t) => sum + Number(t.total_price || 0), 0);
  const totalWashes = validTransactions.length;
  const avgTicket = totalWashes > 0 ? totalRevenue / totalWashes : 0;
  const finalizedWashes = validTransactions.filter(t => t.status === 'FINALIZADO').length;

  // Agrupamento por serviço
  const serviceBreakdown = validTransactions.reduce((acc, t) => {
    const sName = t.services?.name || 'Lavagem Balcão';
    if (!acc[sName]) {
      acc[sName] = { count: 0, total: 0 };
    }
    acc[sName].count += 1;
    acc[sName].total += Number(t.total_price || 0);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const serviceBreakdownList = Object.entries(serviceBreakdown)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);

  const topService = serviceBreakdownList.length > 0 ? serviceBreakdownList[0] : null;

  // Formatações
  const formatMoney = (val: number) => {
    if (!revenueVisible) return 'R$ ••••••';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Exportar para CSV / Excel
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("Não há dados para exportar no período selecionado.");
      return;
    }

    const headers = ["ID", "Data/Hora", "Cliente", "Telefone", "CPF", "Placa", "Serviço", "Valor (R$)", "Status"];
    const rows = filteredTransactions.map(t => [
      t.id,
      formatDateTime(t.scheduled_at),
      `"${t.customer_name}"`,
      `"${t.customer_phone}"`,
      `"${t.customer_cpf || ''}"`,
      `"${t.vehicle_plate}"`,
      `"${t.services?.name || 'Lavagem'}"`,
      Number(t.total_price).toFixed(2),
      t.status
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-financeiro-${period.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir Relatório Oficial Formatado
  const handlePrintReport = () => {
    window.print();
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'HOJE': return 'Hoje';
      case 'SEMANAL': return 'Semanal (Últimos 7 dias)';
      case 'MENSAL': return `Mensal (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`;
      case 'ANUAL': return `Anual (${new Date().getFullYear()})`;
      case 'CUSTOM': return `Personalizado (${startDate || 'Início'} até ${endDate || 'Fim'})`;
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      {/* Estilos específicos para Impressão de Relatório A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-financial-report, #print-financial-report * {
            visibility: visible !important;
          }
          #print-financial-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, sans-serif !important;
            font-size: 12px !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Financeiro & Relatórios</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Gere relatórios semanais, mensais e anuais do faturamento do seu lava-rápido.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors border border-gray-200 dark:border-gray-700"
            title="Exportar dados para planilha Excel / CSV"
          >
            <Download size={15} /> Exportar Excel/CSV
          </button>

          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 transition-all"
            title="Imprimir Relatório Formatado"
          >
            <Printer size={15} /> Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Seletor de Períodos & Filtros */}
      <div className="bg-white dark:bg-gray-950 p-4 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Botões de Período Rápido */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setPeriod('HOJE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              period === 'HOJE'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Hoje
          </button>

          <button
            onClick={() => setPeriod('SEMANAL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              period === 'SEMANAL'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Semanal (7 dias)
          </button>

          <button
            onClick={() => setPeriod('MENSAL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              period === 'MENSAL'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Mensal (Este Mês)
          </button>

          <button
            onClick={() => setPeriod('ANUAL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              period === 'ANUAL'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Anual ({new Date().getFullYear()})
          </button>

          <button
            onClick={() => setPeriod('CUSTOM')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              period === 'CUSTOM'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Personalizado
          </button>
        </div>

        {/* Datas Personalizadas */}
        {period === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Calculando relatório financeiro...</p>
        </div>
      ) : (
        <>
          {/* Cards de Indicadores do Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Card 1: Faturamento Total */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                    Faturamento ({getPeriodLabel()})
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setRevenueVisible(!revenueVisible)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={revenueVisible ? "Ocultar valores (Modo Privacidade)" : "Exibir valores"}
                      >
                        {revenueVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    )}
                    <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {isAdmin ? (
                  revenueVisible ? (
                    <>
                      <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                        {formatMoney(totalRevenue)}
                      </p>
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        Total líquido confirmado e realizado
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-2xl font-bold text-gray-400 filter blur-xs select-none">R$ ••••••</p>
                      <span className="text-[11px] text-gray-400 font-medium">Modo privacidade ativo</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-1 mt-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                      <Lock size={12} /> Acesso Restrito
                    </div>
                    <span>Apenas Administradores têm acesso aos relatórios financeiros.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Quantidade de Lavagens */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                  Total de Lavagens
                </h3>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{totalWashes}</p>
              <span className="text-[11px] text-gray-400 mt-1 block">
                {finalizedWashes} finalizadas / {totalWashes - finalizedWashes} em andamento
              </span>
            </div>

            {/* Card 3: Ticket Médio */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                  Ticket Médio
                </h3>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                {formatMoney(avgTicket)}
              </p>
              <span className="text-[11px] text-gray-400 mt-1 block">Média gasta por veículo</span>
            </div>

            {/* Card 4: Serviço Mais Rentável */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                  Serviço Campeão
                </h3>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                  <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
                {topService ? topService.name : 'Nenhum'}
              </p>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 block">
                {topService ? `${topService.count} lavagens (${formatMoney(topService.total)})` : '-'}
              </span>
            </div>
          </div>

          {/* Gráfico / Distribuição por Serviço */}
          {serviceBreakdownList.length > 0 && (
            <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-8 text-left">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-500" />
                <span>Desempenho por Categoria de Serviço ({getPeriodLabel()})</span>
              </h2>

              <div className="space-y-4">
                {serviceBreakdownList.map((item) => {
                  const percentage = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {item.name} ({item.count} {item.count === 1 ? 'veículo' : 'veículos'})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-[11px] font-mono">
                            {percentage.toFixed(1)}%
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatMoney(item.total)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela de Lançamentos Financeiros */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Detalhamento das Lavagens</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {searchedTransactions.length} registros encontrados no período selecionado
                </p>
              </div>

              {/* Busca na tabela */}
              <div className="relative rounded-xl shadow-sm max-w-xs w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Filtrar por cliente, placa ou serviço..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {searchedTransactions.length === 0 ? (
              <div className="text-center p-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhuma lavagem registrada no período</p>
                <p className="text-xs mt-1">Selecione outro período ou lance novas lavagens no sistema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-850">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data / Hora</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Placa / Veículo</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serviço</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-850 bg-white dark:bg-gray-950">
                    {searchedTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {formatDateTime(t.scheduled_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">{t.customer_name}</span>
                            <span className="text-[11px] text-gray-400">{t.customer_phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs font-semibold">
                            <Tag size={11} />
                            {t.vehicle_plate.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {t.services?.name || 'Lavagem'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white font-mono">
                          {formatMoney(Number(t.total_price))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          {t.status === 'EM_ANDAMENTO' && (
                            <span className="px-2.5 py-1 rounded-full font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 animate-pulse">
                              🔵 Lavando (No Box)
                            </span>
                          )}
                          {t.status === 'FINALIZADO' && (
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-750 dark:text-blue-400">
                              Finalizado
                            </span>
                          )}
                          {t.status === 'CONFIRMADO' && (
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-green-50 dark:bg-green-950/30 text-green-750 dark:text-green-400">
                              Confirmado
                            </span>
                          )}
                          {t.status === 'PENDENTE' && (
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-yellow-50 dark:bg-yellow-950/30 text-yellow-750 dark:text-yellow-400">
                              Pendente
                            </span>
                          )}
                          {t.status === 'CANCELADO' && (
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-red-50 dark:bg-red-950/30 text-red-750 dark:text-red-400">
                              Cancelado
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

      {/* Relatório Formatado para Impressão A4 / PDF */}
      <div id="print-financial-report" className="hidden">
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
                {tenantInfo?.name || 'BRILHO MÁGICO'}
              </h1>
              <p style={{ fontSize: '11px', color: '#444', margin: '2px 0 0 0' }}>
                Studio Automotivo & Lava-Rápido
              </p>
              {tenantInfo?.address && (
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0 0' }}>
                  {tenantInfo.address}
                </p>
              )}
              {tenantInfo?.cnpj && (
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0 0' }}>
                  CNPJ: {tenantInfo.cnpj} | Contato: {tenantInfo?.phone || ''}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                RELATÓRIO FINANCEIRO
              </h2>
              <p style={{ fontSize: '11px', margin: '4px 0 0 0', fontWeight: 'bold' }}>
                Período: {getPeriodLabel()}
              </p>
              <p style={{ fontSize: '9px', color: '#666', margin: '2px 0 0 0' }}>
                Emitido em: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Resumo em Blocos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
          <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Faturamento Bruto</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginTop: '2px' }}>
              R$ {totalRevenue.toFixed(2)}
            </div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Veículos Atendidos</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginTop: '2px' }}>
              {totalWashes} lavagens
            </div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Ticket Médio</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginTop: '2px' }}>
              R$ {avgTicket.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tabela do Relatório Impresso */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '6px', textAlign: 'left' }}>Data/Hora</th>
              <th style={{ padding: '6px', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '6px', textAlign: 'left' }}>Telefone</th>
              <th style={{ padding: '6px', textAlign: 'left' }}>Placa</th>
              <th style={{ padding: '6px', textAlign: 'left' }}>Serviço</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Valor (R$)</th>
              <th style={{ padding: '6px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t, idx) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '5px 6px' }}>{formatDateTime(t.scheduled_at)}</td>
                <td style={{ padding: '5px 6px', fontWeight: 'bold' }}>{t.customer_name}</td>
                <td style={{ padding: '5px 6px' }}>{t.customer_phone}</td>
                <td style={{ padding: '5px 6px', fontFamily: 'monospace' }}>{t.vehicle_plate.toUpperCase()}</td>
                <td style={{ padding: '5px 6px' }}>{t.services?.name || 'Lavagem'}</td>
                <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                  {Number(t.total_price).toFixed(2)}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>{t.status}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold', fontSize: '11px' }}>
              <td colSpan={5} style={{ padding: '8px 6px', textAlign: 'right' }}>TOTAL GERAL:</td>
              <td style={{ padding: '8px 6px', textAlign: 'right' }}>R$ {totalRevenue.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '9px', color: '#666', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          Relatório gerado por Kryon Systems para {tenantInfo?.name || 'Brilho Mágico'}
        </div>
      </div>
    </div>
  );
}
