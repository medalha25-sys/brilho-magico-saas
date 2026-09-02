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
  Tag,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Receipt,
  Wallet,
  PieChart,
  Layers,
  ArrowUpCircle,
  ArrowDownCircle,
  X
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

export interface ExpenseItem {
  id: string;
  tenant_id?: string;
  description: string;
  category: 'PRODUTOS' | 'ESTRUTURA' | 'EQUIPE' | 'MANUTENCAO' | 'MARKETING' | 'OUTROS';
  amount: number;
  payment_method: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO' | 'OUTROS';
  expense_date: string; // YYYY-MM-DD
  notes?: string;
  created_at?: string;
}

interface TenantInfo {
  name: string;
  phone?: string;
  address?: string;
  cnpj?: string;
}

type PeriodType = 'HOJE' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'CUSTOM';
type TabType = 'DRE' | 'RECEITAS' | 'DESPESAS';

export const EXPENSE_CATEGORIES = {
  PRODUTOS: { label: 'Produtos & Insumos', icon: '🧪', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-500/20' },
  ESTRUTURA: { label: 'Contas & Estrutura', icon: '💡', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-500/20' },
  EQUIPE: { label: 'Mão de Obra / Equipe', icon: '👷', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-500/20' },
  MANUTENCAO: { label: 'Manutenção Equip.', icon: '🛠️', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-500/20' },
  MARKETING: { label: 'Marketing & Brindes', icon: '📣', color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 border-pink-500/20' },
  OUTROS: { label: 'Outras Despesas', icon: '📦', color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-gray-500/20' },
};

const DEFAULT_EXPENSES_SEED: ExpenseItem[] = [
  {
    id: 'exp-1',
    description: 'Galão 5L Shampoo Automotivo Neutro V-Floc Vonixx',
    category: 'PRODUTOS',
    amount: 149.90,
    payment_method: 'PIX',
    expense_date: new Date().toISOString().split('T')[0],
    notes: 'Insumo para lavagens'
  },
  {
    id: 'exp-2',
    description: 'Conta de Água COPASA / SAAE',
    category: 'ESTRUTURA',
    amount: 280.00,
    payment_method: 'BOLETO',
    expense_date: new Date().toISOString().split('T')[0],
    notes: 'Consumo mensal de água'
  },
  {
    id: 'exp-3',
    description: 'Pretinho Pneus Concentrado 5L + 10 Panos Microfibra',
    category: 'PRODUTOS',
    amount: 110.00,
    payment_method: 'CARTAO_CREDITO',
    expense_date: new Date().toISOString().split('T')[0],
    notes: 'Finalização e acabamento'
  }
];

export default function FinanceiroPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('DRE');
  const [allAppointments, setAllAppointments] = useState<AppointmentTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [revenueVisible, setRevenueVisible] = useState(true);

  // Filtros de Período
  const [period, setPeriod] = useState<PeriodType>('MENSAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('TODAS');

  // Modal de Nova Despesa
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseItem['category']>('PRODUTOS');
  const [expAmount, setExpAmount] = useState<number | string>('');
  const [expPaymentMethod, setExpPaymentMethod] = useState<ExpenseItem['payment_method']>('PIX');
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');

  // Carrega todos os agendamentos, despesas e dados
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
        setTenantId(tId);

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

        // Carrega Despesas (do Supabase ou localStorage com persistência)
        try {
          const { data: dbExpenses, error: expErr } = await supabase
            .from('expenses')
            .select('*')
            .eq('tenant_id', tId)
            .order('expense_date', { ascending: false });

          if (!expErr && dbExpenses && dbExpenses.length > 0) {
            setExpenses(dbExpenses as ExpenseItem[]);
          } else {
            // Fallback localStorage
            const localSaved = localStorage.getItem(`brilho_magico_expenses_${tId}`);
            if (localSaved) {
              setExpenses(JSON.parse(localSaved));
            } else {
              setExpenses(DEFAULT_EXPENSES_SEED);
              localStorage.setItem(`brilho_magico_expenses_${tId}`, JSON.stringify(DEFAULT_EXPENSES_SEED));
            }
          }
        } catch {
          const localSaved = localStorage.getItem(`brilho_magico_expenses_${tId}`);
          if (localSaved) {
            setExpenses(JSON.parse(localSaved));
          } else {
            setExpenses(DEFAULT_EXPENSES_SEED);
          }
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

  // Salva nova despesa
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription || !expAmount) {
      alert("Preencha a descrição e o valor da despesa.");
      return;
    }

    const numericAmount = parseFloat(String(expAmount).replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Informe um valor válido maior que zero.");
      return;
    }

    const newExp: ExpenseItem = {
      id: 'exp_' + Date.now(),
      tenant_id: tenantId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      description: expDescription.trim(),
      category: expCategory,
      amount: numericAmount,
      payment_method: expPaymentMethod,
      expense_date: expDate || new Date().toISOString().split('T')[0],
      notes: expNotes.trim() || undefined,
      created_at: new Date().toISOString()
    };

    // Atualiza estado local
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    if (tenantId) {
      localStorage.setItem(`brilho_magico_expenses_${tenantId}`, JSON.stringify(updated));
    }

    // Tenta persistir no Supabase se existir
    try {
      await supabase.from('expenses').insert({
        tenant_id: newExp.tenant_id,
        description: newExp.description,
        category: newExp.category,
        amount: newExp.amount,
        payment_method: newExp.payment_method,
        expense_date: newExp.expense_date,
        notes: newExp.notes
      });
    } catch {
      // continua com local storage
    }

    // Limpa formulário
    setExpDescription('');
    setExpAmount('');
    setExpNotes('');
    setIsNewExpenseOpen(false);
  };

  // Exclui despesa
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento de despesa?")) return;

    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    if (tenantId) {
      localStorage.setItem(`brilho_magico_expenses_${tenantId}`, JSON.stringify(updated));
    }

    try {
      await supabase.from('expenses').delete().eq('id', id);
    } catch {
      // local sync
    }
  };

  // Filtra receitas pelo período
  const getFilteredTransactions = () => {
    const now = new Date();

    return allAppointments.filter((app) => {
      const appDate = new Date(app.scheduled_at);

      if (period === 'HOJE') {
        return (
          appDate.getDate() === now.getDate() &&
          appDate.getMonth() === now.getMonth() &&
          appDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'SEMANAL') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return appDate >= sevenDaysAgo;
      }

      if (period === 'MENSAL') {
        return (
          appDate.getMonth() === now.getMonth() &&
          appDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'ANUAL') {
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

  // Filtra despesas pelo período
  const getFilteredExpenses = () => {
    const now = new Date();

    return expenses.filter((exp) => {
      const [year, month, day] = exp.expense_date.split('-').map(Number);
      const expDate = new Date(year, (month || 1) - 1, day || 1);

      if (period === 'HOJE') {
        return (
          expDate.getDate() === now.getDate() &&
          expDate.getMonth() === now.getMonth() &&
          expDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'SEMANAL') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return expDate >= sevenDaysAgo;
      }

      if (period === 'MENSAL') {
        return (
          expDate.getMonth() === now.getMonth() &&
          expDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'ANUAL') {
        return expDate.getFullYear() === now.getFullYear();
      }

      if (period === 'CUSTOM') {
        if (!startDate && !endDate) return true;
        const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(0);
        const end = endDate ? new Date(endDate + 'T23:59:59') : new Date(8640000000000000);
        return expDate >= start && expDate <= end;
      }

      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  const filteredExpenses = getFilteredExpenses();

  // Busca na tabela de receitas
  const searchedTransactions = filteredTransactions.filter(item => {
    const q = tableSearch.toLowerCase();
    return (
      item.customer_name.toLowerCase().includes(q) ||
      item.customer_phone.includes(q) ||
      item.vehicle_plate.toLowerCase().includes(q) ||
      (item.services?.name && item.services.name.toLowerCase().includes(q))
    );
  });

  // Busca na tabela de despesas
  const searchedExpenses = filteredExpenses.filter(item => {
    const q = expenseSearch.toLowerCase();
    const matchText = item.description.toLowerCase().includes(q) || (item.notes && item.notes.toLowerCase().includes(q));
    const matchCat = selectedExpenseCategory === 'TODAS' || item.category === selectedExpenseCategory;
    return matchText && matchCat;
  });

  // Métricas de Receitas (excluindo cancelados)
  const validTransactions = filteredTransactions.filter(t => t.status !== 'CANCELADO');
  const totalRevenue = validTransactions.reduce((sum, t) => sum + Number(t.total_price || 0), 0);
  const totalWashes = validTransactions.length;
  const avgTicket = totalWashes > 0 ? totalRevenue / totalWashes : 0;
  const finalizedWashes = validTransactions.filter(t => t.status === 'FINALIZADO').length;

  // Métricas de Despesas
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Lucro Líquido Real & Margem
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Agrupamento de Receita por Serviço
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

  // Agrupamento de Despesas por Categoria
  const expenseBreakdown = filteredExpenses.reduce((acc, e) => {
    const cat = e.category || 'OUTROS';
    if (!acc[cat]) {
      acc[cat] = { count: 0, total: 0 };
    }
    acc[cat].count += 1;
    acc[cat].total += Number(e.amount || 0);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const expenseBreakdownList = Object.entries(expenseBreakdown)
    .map(([cat, data]) => ({
      category: cat as ExpenseItem['category'],
      meta: EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES] || EXPENSE_CATEGORIES.OUTROS,
      ...data
    }))
    .sort((a, b) => b.total - a.total);

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

  const formatDateShort = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = ["Tipo", "Data", "Descrição/Cliente", "Detalhe/Placa", "Categoria/Serviço", "Valor (R$)", "Forma Pagamento / Status"];
    
    const revenueRows = filteredTransactions.map(t => [
      "RECEITA (Lavagem)",
      formatDateTime(t.scheduled_at),
      `"${t.customer_name}"`,
      `"${t.vehicle_plate}"`,
      `"${t.services?.name || 'Lavagem'}"`,
      Number(t.total_price).toFixed(2),
      t.status
    ]);

    const expenseRows = filteredExpenses.map(e => [
      "DESPESA (Saída)",
      formatDateShort(e.expense_date),
      `"${e.description}"`,
      `"${e.notes || ''}"`,
      `"${EXPENSE_CATEGORIES[e.category]?.label || e.category}"`,
      `-${Number(e.amount).toFixed(2)}`,
      e.payment_method
    ]);

    const allRows = [...revenueRows, ...expenseRows];
    const csvContent = "\uFEFF" + [headers.join(";"), ...allRows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-financeiro-completo-${period.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            font-size: 11px !important;
          }
          @page {
            size: A4;
            margin: 8mm;
          }
        }
      `}</style>

      {/* Header com Ações Globais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Financeiro & DRE</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold">
              Completo
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Controle de faturamento, despesas operacionais e cálculo de lucro líquido real.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsNewExpenseOpen(true)}
            className="px-4 py-2.5 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-red-600/15 transition-all active:scale-95"
          >
            <Plus size={16} /> Nova Despesa
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors border border-gray-200 dark:border-gray-700"
            title="Exportar dados para planilha Excel / CSV"
          >
            <Download size={15} /> Exportar
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 transition-all"
            title="Imprimir Relatório DRE Formatado"
          >
            <Printer size={15} /> Imprimir DRE
          </button>
        </div>
      </div>

      {/* Seletor de Períodos & Filtros */}
      <div className="bg-white dark:bg-gray-950 p-4 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Botões de Período Rápido */}
        <div className="flex flex-wrap gap-1.5">
          {(['HOJE', 'SEMANAL', 'MENSAL', 'ANUAL', 'CUSTOM'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {p === 'HOJE' && 'Hoje'}
              {p === 'SEMANAL' && 'Semanal (7 dias)'}
              {p === 'MENSAL' && 'Mensal (Este Mês)'}
              {p === 'ANUAL' && `Anual (${new Date().getFullYear()})`}
              {p === 'CUSTOM' && 'Personalizado'}
            </button>
          ))}
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
          <p className="text-sm font-medium">Calculando balanço e DRE financeiro...</p>
        </div>
      ) : (
        <>
          {/* 4 Cards de Indicadores Financeiros (Receitas, Despesas, Lucro Líquido e Volume) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Card 1: Faturamento Bruto (Entradas) */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm p-5 border border-gray-150 dark:border-gray-800 text-left flex flex-col justify-between min-h-[130px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpCircle size={14} className="text-emerald-500" /> Entradas (Bruto)
                  </h3>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setRevenueVisible(!revenueVisible)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={revenueVisible ? "Ocultar valores (Modo Privacidade)" : "Exibir valores"}
                      >
                        {revenueVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {isAdmin ? (
                  revenueVisible ? (
                    <>
                      <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                        {formatMoney(totalRevenue)}
                      </p>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
                        {validTransactions.length} lavagens no período
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-2xl font-bold text-gray-400 filter blur-xs select-none">R$ ••••••</p>
                      <span className="text-[11px] text-gray-400 font-medium">Modo privacidade ativo</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                    <Lock size={12} /> Acesso Restrito
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Total de Despesas (Saídas) */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm p-5 border border-gray-150 dark:border-gray-800 text-left flex flex-col justify-between min-h-[130px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownCircle size={14} className="text-red-500" /> Despesas (Saídas)
                  </h3>
                  <div className="p-1.5 bg-red-50 dark:bg-red-950/40 rounded-lg text-red-600 dark:text-red-400">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>

                {isAdmin ? (
                  revenueVisible ? (
                    <>
                      <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 mt-1">
                        {formatMoney(totalExpenses)}
                      </p>
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        {filteredExpenses.length} lançamentos de custos
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-2xl font-bold text-gray-400 filter blur-xs select-none">R$ ••••••</p>
                      <span className="text-[11px] text-gray-400 font-medium">Modo privacidade ativo</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                    <Lock size={12} /> Acesso Restrito
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Lucro Líquido Real (Entradas - Saídas) */}
            <div className={`rounded-2xl shadow-sm p-5 border text-left flex flex-col justify-between min-h-[130px] transition-all ${
              netProfit >= 0
                ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
                : 'bg-red-500/5 dark:bg-red-950/20 border-red-500/30'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet size={14} className={netProfit >= 0 ? "text-emerald-500" : "text-red-500"} /> Lucro Líquido Real
                  </h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    profitMargin >= 50
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                      : profitMargin > 0
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                      : 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                  }`}>
                    {profitMargin.toFixed(1)}% margem
                  </span>
                </div>

                {isAdmin ? (
                  revenueVisible ? (
                    <>
                      <p className={`text-2xl sm:text-3xl font-black mt-1 ${
                        netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatMoney(netProfit)}
                      </p>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
                        Saldo em caixa no período
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-2xl font-bold text-gray-400 filter blur-xs select-none">R$ ••••••</p>
                      <span className="text-[11px] text-gray-400 font-medium">Modo privacidade ativo</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                    <Lock size={12} /> Acesso Restrito
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Ticket Médio & Volume */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm p-5 border border-gray-150 dark:border-gray-800 text-left flex flex-col justify-between min-h-[130px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-purple-500" /> Ticket Médio
                  </h3>
                  <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600 dark:text-purple-400">
                    <Car className="h-4 w-4" />
                  </div>
                </div>

                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                  {formatMoney(avgTicket)}
                </p>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  {totalWashes} veículos ({finalizedWashes} finalizados)
                </span>
              </div>
            </div>
          </div>

          {/* Navegação entre Abas: DRE, Receitas (Lavagens) e Despesas */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-800 mb-6 gap-2">
            <button
              onClick={() => setActiveTab('DRE')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'DRE'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <PieChart size={15} /> Visão Geral & DRE
            </button>

            <button
              onClick={() => setActiveTab('RECEITAS')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'RECEITAS'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <ArrowUpCircle size={15} /> Entradas / Lavagens ({validTransactions.length})
            </button>

            <button
              onClick={() => setActiveTab('DESPESAS')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'DESPESAS'
                  ? 'border-red-600 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <ArrowDownCircle size={15} /> Despesas / Saídas ({filteredExpenses.length})
            </button>
          </div>

          {/* CONTEÚDO DA ABA 1: VISÃO GERAL & DRE */}
          {activeTab === 'DRE' && (
            <div className="space-y-6">
              {/* Demonstrativo DRE Estruturado */}
              <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm text-left">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-850">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers size={18} className="text-blue-500" />
                    <span>Demonstrativo do Resultado do Exercício (DRE) — {getPeriodLabel()}</span>
                  </h2>
                  <span className="text-xs font-mono font-bold text-gray-400">Valores Líquidos</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Linha 1: Receita Bruta */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 font-semibold">
                    <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <ArrowUpCircle size={16} /> (+) Receita Bruta de Lavagens
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                      {formatMoney(totalRevenue)}
                    </span>
                  </div>

                  {/* Linha 2: Despesas com Produtos */}
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span>🧪</span> (-) Produtos, Shampoos & Insumos Químicos
                    </span>
                    <span className="font-bold font-mono text-red-600 dark:text-red-400">
                      {formatMoney(expenseBreakdown.PRODUTOS?.total || 0)}
                    </span>
                  </div>

                  {/* Linha 3: Despesas com Contas e Estrutura */}
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span>💡</span> (-) Contas Fixas (Água, Energia, Aluguel)
                    </span>
                    <span className="font-bold font-mono text-red-600 dark:text-red-400">
                      {formatMoney(expenseBreakdown.ESTRUTURA?.total || 0)}
                    </span>
                  </div>

                  {/* Linha 4: Despesas com Equipe e Manutenção */}
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span>👷</span> (-) Equipe, Manutenção & Outros
                    </span>
                    <span className="font-bold font-mono text-red-600 dark:text-red-400">
                      {formatMoney((expenseBreakdown.EQUIPE?.total || 0) + (expenseBreakdown.MANUTENCAO?.total || 0) + (expenseBreakdown.MARKETING?.total || 0) + (expenseBreakdown.OUTROS?.total || 0))}
                    </span>
                  </div>

                  {/* Linha 5: Total de Deduções */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 font-semibold border-t border-gray-200 dark:border-gray-800">
                    <span className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <ArrowDownCircle size={16} /> (=) Total de Custos & Despesas
                    </span>
                    <span className="text-sm font-bold font-mono text-red-700 dark:text-red-400">
                      - {formatMoney(totalExpenses)}
                    </span>
                  </div>

                  {/* Linha 6: Resultado Líquido Final */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border font-bold text-sm ${
                    netProfit >= 0
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Wallet size={18} />
                      <span>(=) LUCRO LÍQUIDO OPERACIONAL</span>
                      <span className="text-xs font-normal opacity-80">({profitMargin.toFixed(1)}% de margem)</span>
                    </div>
                    <span className="text-base font-black font-mono">
                      {formatMoney(netProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid com 2 Gráficos de Barras: Serviços x Categorias de Despesas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico 1: Receita por Serviço */}
                <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm text-left">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-500" />
                    <span>Faturamento por Tipo de Lavagem</span>
                  </h3>

                  {serviceBreakdownList.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhuma lavagem no período</p>
                  ) : (
                    <div className="space-y-3.5">
                      {serviceBreakdownList.map((item) => {
                        const pct = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                        return (
                          <div key={item.name} className="space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-800 dark:text-gray-200">
                                {item.name} ({item.count} un)
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-[11px] font-mono">{pct.toFixed(1)}%</span>
                                <span className="font-bold text-gray-900 dark:text-white">{formatMoney(item.total)}</span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Gráfico 2: Despesas por Categoria */}
                <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm text-left">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Receipt size={16} className="text-red-500" />
                    <span>Destino dos Gastos (Por Categoria)</span>
                  </h3>

                  {expenseBreakdownList.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhuma despesa lançada no período</p>
                  ) : (
                    <div className="space-y-3.5">
                      {expenseBreakdownList.map((item) => {
                        const pct = totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0;
                        return (
                          <div key={item.category} className="space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                <span>{item.meta.icon}</span> {item.meta.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-[11px] font-mono">{pct.toFixed(1)}%</span>
                                <span className="font-bold text-red-600 dark:text-red-400">{formatMoney(item.total)}</span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA 2: ENTRADAS / LAVAGENS */}
          {activeTab === 'RECEITAS' && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-150 dark:border-gray-800 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Detalhamento das Lavagens</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {searchedTransactions.length} registros no período selecionado
                  </p>
                </div>

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
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhuma lavagem registrada</p>
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
          )}

          {/* CONTEÚDO DA ABA 3: DESPESAS / SAÍDAS */}
          {activeTab === 'DESPESAS' && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-150 dark:border-gray-800 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Lançamentos de Despesas</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {searchedExpenses.length} despesas encontradas no período selecionado
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Filtro por Categoria */}
                  <select
                    value={selectedExpenseCategory}
                    onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="TODAS">Todas as Categorias</option>
                    <option value="PRODUTOS">🧪 Produtos & Insumos</option>
                    <option value="ESTRUTURA">💡 Contas & Estrutura</option>
                    <option value="EQUIPE">👷 Mão de Obra / Equipe</option>
                    <option value="MANUTENCAO">🛠️ Manutenção Equip.</option>
                    <option value="MARKETING">📣 Marketing & Brindes</option>
                    <option value="OUTROS">📦 Outras Despesas</option>
                  </select>

                  {/* Busca textual */}
                  <div className="relative rounded-xl shadow-sm max-w-xs w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por descrição..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={() => setIsNewExpenseOpen(true)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
              </div>

              {searchedExpenses.length === 0 ? (
                <div className="text-center p-12 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhuma despesa registrada no período</p>
                  <button
                    onClick={() => setIsNewExpenseOpen(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    + Lançar Primeira Despesa
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-850">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descrição / Detalhe</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pagamento</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-850 bg-white dark:bg-gray-950">
                      {searchedExpenses.map((e) => {
                        const meta = EXPENSE_CATEGORIES[e.category] || EXPENSE_CATEGORIES.OUTROS;
                        return (
                          <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {formatDateShort(e.expense_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.color}`}>
                                <span>{meta.icon}</span> {meta.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-800 dark:text-gray-200">
                              <div className="font-semibold">{e.description}</div>
                              {e.notes && <div className="text-[11px] text-gray-400 mt-0.5">{e.notes}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-600 dark:text-gray-400">
                              {e.payment_method}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-red-600 dark:text-red-400 font-mono">
                              - {formatMoney(Number(e.amount))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                              <button
                                onClick={() => handleDeleteExpense(e.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title="Excluir lançamento de despesa"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Lançar Nova Despesa */}
      {isNewExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500">
                  <ArrowDownCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Lançar Nova Despesa</h3>
                  <p className="text-xs text-gray-400">Registre custos e saídas de caixa do lava-rápido</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewExpenseOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Galão 5L Shampoo Automotivo, Conta de Luz, Diária Ajudante..."
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseItem['category'])}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
                  >
                    <option value="PRODUTOS">🧪 Produtos & Insumos</option>
                    <option value="ESTRUTURA">💡 Contas & Estrutura (Água/Luz)</option>
                    <option value="EQUIPE">👷 Mão de Obra / Equipe</option>
                    <option value="MANUTENCAO">🛠️ Manutenção de Equipamentos</option>
                    <option value="MARKETING">📣 Marketing & Divulgação</option>
                    <option value="OUTROS">📦 Outras Despesas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Valor da Despesa (R$) *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min={0.01}
                      required
                      placeholder="0,00"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value as ExpenseItem['payment_method'])}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="OUTROS">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Fornecedor / Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fornecedor Vonixx Distribuidora, Nota Fiscal 123..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-150 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Relatório Formatado para Impressão A4 / PDF (DRE Completo) */}
      <div id="print-financial-report" className="hidden">
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
                {tenantInfo?.name || 'BRILHO MÁGICO'}
              </h1>
              <p style={{ fontSize: '11px', color: '#444', margin: '2px 0 0 0' }}>
                Demonstrativo de Resultado do Exercício & Financeiro
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
                DRE & RELATÓRIO OFICIAL
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

        {/* Resumo Executivo em Blocos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '15px' }}>
          <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>(+) Faturamento Bruto</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#059669', marginTop: '2px' }}>
              R$ {totalRevenue.toFixed(2)}
            </div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>(-) Despesas Totais</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#dc2626', marginTop: '2px' }}>
              R$ {totalExpenses.toFixed(2)}
            </div>
          </div>
          <div style={{ border: '2px solid #000', padding: '8px', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
            <div style={{ fontSize: '9px', color: '#111', fontWeight: 'bold', textTransform: 'uppercase' }}>(=) Lucro Líquido Real</div>
            <div style={{ fontSize: '16px', fontWeight: 'black', color: netProfit >= 0 ? '#059669' : '#dc2626', marginTop: '2px' }}>
              R$ {netProfit.toFixed(2)}
            </div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>Margem de Lucro</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#000', marginTop: '2px' }}>
              {profitMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Resumo de DRE */}
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          1. Demonstrativo Financeiro Sintético
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '15px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>(+) Receita Total de Lavagens Realizadas ({totalWashes} un)</td>
              <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>R$ {totalRevenue.toFixed(2)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '4px 6px' }}>(-) Produtos Químicos, Shampoos & Insumos</td>
              <td style={{ padding: '4px 6px', textAlign: 'right', color: '#dc2626' }}>- R$ {(expenseBreakdown.PRODUTOS?.total || 0).toFixed(2)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '4px 6px' }}>(-) Contas Fixas (Água, Luz, Estrutura)</td>
              <td style={{ padding: '4px 6px', textAlign: 'right', color: '#dc2626' }}>- R$ {(expenseBreakdown.ESTRUTURA?.total || 0).toFixed(2)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '4px 6px' }}>(-) Mão de Obra, Equipe & Outros</td>
              <td style={{ padding: '4px 6px', textAlign: 'right', color: '#dc2626' }}>- R$ {((expenseBreakdown.EQUIPE?.total || 0) + (expenseBreakdown.MANUTENCAO?.total || 0) + (expenseBreakdown.MARKETING?.total || 0) + (expenseBreakdown.OUTROS?.total || 0)).toFixed(2)}</td>
            </tr>
            <tr style={{ borderTop: '2px solid #000', backgroundColor: '#f3f4f6', fontWeight: 'bold', fontSize: '11px' }}>
              <td style={{ padding: '6px' }}>(=) LUCRO LÍQUIDO FINAL</td>
              <td style={{ padding: '6px', textAlign: 'right' }}>R$ {netProfit.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabela de Despesas */}
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          2. Relação de Despesas do Período
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '4px 6px', textAlign: 'left' }}>Data</th>
              <th style={{ padding: '4px 6px', textAlign: 'left' }}>Categoria</th>
              <th style={{ padding: '4px 6px', textAlign: 'left' }}>Descrição</th>
              <th style={{ padding: '4px 6px', textAlign: 'left' }}>Pagamento</th>
              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((e, idx) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '4px 6px' }}>{formatDateShort(e.expense_date)}</td>
                <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>{EXPENSE_CATEGORIES[e.category]?.label || e.category}</td>
                <td style={{ padding: '4px 6px' }}>{e.description}</td>
                <td style={{ padding: '4px 6px' }}>{e.payment_method}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                  - {Number(e.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '9px', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          Relatório DRE emitido pelo sistema Brilho Mágico SaaS via Kryon Systems
        </div>
      </div>
    </div>
  );
}
