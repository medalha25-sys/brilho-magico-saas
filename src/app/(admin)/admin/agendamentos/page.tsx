"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Calendar, 
  Phone, 
  Tag, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Printer, 
  Plus, 
  X, 
  User, 
  Car, 
  DollarSign, 
  FileText,
  Sparkles,
  MessageCircle
} from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  vehicle_type?: string;
}

interface Appointment {
  id: string;
  tenant_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_cpf?: string | null;
  vehicle_plate: string;
  scheduled_at: string;
  total_price: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'FINALIZADO' | 'CANCELADO';
  notes?: string | null;
  payment_method?: string | null;
  services?: {
    name: string;
    price: number;
    duration_minutes?: number;
  };
}

interface TenantInfo {
  name: string;
  phone?: string;
  address?: string;
  cnpj?: string;
}

export default function AgendamentosPage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [printApp, setPrintApp] = useState<Appointment | null>(null);
  const [readyAppModal, setReadyAppModal] = useState<Appointment | null>(null);

  // Helper para gerar o link do WhatsApp para avisar que o veículo está pronto ou confirmar
  const getWhatsAppMessageUrl = (app: Appointment, type: 'READY' | 'CONFIRM') => {
    const rawPhone = (app.customer_phone || '').replace(/\D/g, '');
    if (!rawPhone) return '#';

    const serviceName = app.services?.name || 'Lavagem';
    const plate = app.vehicle_plate ? app.vehicle_plate.toUpperCase() : '';
    const name = app.customer_name ? app.customer_name.trim() : 'Cliente';
    const companyName = tenantInfo?.name || 'Brilho Mágico';

    let text = '';
    if (type === 'READY') {
      text = `🎉 *Olá, ${name}!* Seu veículo *${plate}* está *PRONTO, LIMPO E CHEIROSO* te esperando na *${companyName}*! 🚗✨\n\n` +
             `• *Serviço Realizado:* ${serviceName}\n` +
             `• *Valor:* R$ ${Number(app.total_price).toFixed(2)}\n\n` +
             `Já pode vir fazer a retirada quando desejar! Agradecemos muito a sua preferência. ⭐`;
    } else {
      const dateStr = formatDateTime(app.scheduled_at);
      text = `🚗 *Olá, ${name}!* Confirmamos o agendamento do seu veículo *${plate}* na *${companyName}*:\n\n` +
             `• *Serviço:* ${serviceName}\n` +
             `• *Data/Horário:* ${dateStr}\n` +
             `• *Valor:* R$ ${Number(app.total_price).toFixed(2)}\n\n` +
             `Qualquer dúvida estamos à disposição!`;
    }

    return `https://wa.me/55${rawPhone}?text=${encodeURIComponent(text)}`;
  };

  // Estados do Modal "Lançar Nova Lavagem" (Entrada no Balcão)
  const [isNewWashOpen, setIsNewWashOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customPrice, setCustomPrice] = useState<number | string>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [initialStatus, setInitialStatus] = useState<'CONFIRMADO' | 'FINALIZADO' | 'PENDENTE'>('CONFIRMADO');
  const [submittingWash, setSubmittingWash] = useState(false);
  const [washError, setWashError] = useState<string | null>(null);

  // Helper para obter a data e hora atual no formato YYYY-MM-DDTHH:mm
  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Carrega os agendamentos, serviços e dados da empresa do Supabase
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*, services(name, price, duration_minutes)')
        .order('scheduled_at', { ascending: false });

      if (error) {
        console.error("Erro ao carregar agendamentos:", error.message);
      } else if (data) {
        setAppointments(data as unknown as Appointment[]);
      }

      // Busca dados do usuário, tenant e serviços ativos
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profile?.tenant_id) {
          const tId = profile.tenant_id;
          setTenantId(tId);

          // Busca dados da empresa
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name, phone, address, cnpj')
            .eq('id', tId)
            .single();

          if (tenant) {
            setTenantInfo(tenant);
          }

          // Busca serviços para o formulário de lançamento
          const { data: servicesData } = await supabase
            .from('services')
            .select('*')
            .eq('tenant_id', tId)
            .eq('is_active', true)
            .order('name', { ascending: true });

          if (servicesData) {
            setServices(servicesData);
          }
        }
      }
    } catch (err) {
      console.error("Erro de rede:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abre o modal de nova lavagem
  const handleOpenNewWash = () => {
    setCustomerName('');
    setCustomerPhone('');
    setVehiclePlate('');
    setCustomerCpf('');
    setSelectedServiceId(services.length > 0 ? services[0].id : '');
    setCustomPrice(services.length > 0 ? services[0].price : 40.00);
    setScheduledAt(getCurrentLocalDateTime());
    setInitialStatus('CONFIRMADO');
    setWashError(null);
    setIsNewWashOpen(true);
  };

  // Ao selecionar um serviço diferente no modal
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const s = services.find(item => item.id === serviceId);
    if (s) {
      setCustomPrice(s.price);
    }
  };

  // Auto-completar dados do cliente ao digitar o WhatsApp
  const handlePhoneBlur = async () => {
    const cleanDigits = customerPhone.replace(/\D/g, '');
    if (cleanDigits.length >= 10 && tenantId) {
      try {
        const { data: customerList } = await supabase
          .from('customers')
          .select('name, phone, vehicle_plate, cpf')
          .eq('tenant_id', tenantId);

        const matched = (customerList || []).find(c => {
          const cClean = (c.phone || '').replace(/\D/g, '');
          return cClean === cleanDigits || (cleanDigits.length >= 10 && cClean.endsWith(cleanDigits.slice(-10)));
        });

        if (matched) {
          if (!customerName && matched.name) setCustomerName(matched.name);
          if (!vehiclePlate && matched.vehicle_plate) setVehiclePlate(matched.vehicle_plate);
          if (!customerCpf && matched.cpf) setCustomerCpf(matched.cpf);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Submissão do lançamento de lavagem
  const handleCreateWash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !vehiclePlate || !tenantId) {
      setWashError("Por favor, preencha o Nome, Telefone e Placa do veículo.");
      return;
    }

    setSubmittingWash(true);
    setWashError(null);

    try {
      const cleanPhone = customerPhone.trim();
      const cleanPlate = vehiclePlate.toUpperCase().trim();
      const cleanCpf = customerCpf ? customerCpf.replace(/\D/g, '') : null;
      const scheduledIso = new Date(scheduledAt || Date.now()).toISOString();
      const finalPrice = Number(customPrice) || 0;

      // 1. Cria ou atualiza o cliente na tabela customers
      try {
        const { data: customerList } = await supabase
          .from('customers')
          .select('id, phone')
          .eq('tenant_id', tenantId);

        const matched = (customerList || []).find(c => {
          const cClean = (c.phone || '').replace(/\D/g, '');
          const cleanD = cleanPhone.replace(/\D/g, '');
          return cClean === cleanD || (cleanD.length >= 10 && cClean.endsWith(cleanD.slice(-10)));
        });

        if (matched) {
          await supabase
            .from('customers')
            .update({
              name: customerName,
              vehicle_plate: cleanPlate,
              cpf: cleanCpf
            })
            .eq('id', matched.id);
        } else {
          await supabase
            .from('customers')
            .insert({
              tenant_id: tenantId,
              name: customerName,
              phone: cleanPhone,
              vehicle_plate: cleanPlate,
              cpf: cleanCpf
            });
        }
      } catch (custErr) {
        console.warn("Aviso ao salvar cliente:", custErr);
      }

      // 2. Insere na tabela appointments
      const { data: newApp, error: appErr } = await supabase
        .from('appointments')
        .insert({
          tenant_id: tenantId,
          service_id: selectedServiceId || services[0]?.id,
          customer_name: customerName,
          customer_phone: cleanPhone,
          vehicle_plate: cleanPlate,
          customer_cpf: cleanCpf,
          scheduled_at: scheduledIso,
          total_price: finalPrice,
          status: initialStatus
        })
        .select('*, services(name, price, duration_minutes)')
        .single();

      if (appErr) {
        setWashError("Erro ao lançar lavagem: " + appErr.message);
        setSubmittingWash(false);
        return;
      }

      if (newApp) {
        const fullNewApp = newApp as unknown as Appointment;
        setAppointments(prev => [fullNewApp, ...prev]);
        setIsNewWashOpen(false);
      }
    } catch {
      setWashError("Erro de conexão ao lançar a lavagem.");
    } finally {
      setSubmittingWash(false);
    }
  };

  // Atualiza o status do agendamento
  const updateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      const targetApp = appointments.find(a => a.id === id);

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        alert("Erro ao atualizar status: " + error.message);
      } else {
        // Se o agendamento foi finalizado, garante que o cliente está cadastrado na tabela de clientes
        if (newStatus === 'FINALIZADO' && targetApp) {
          try {
            const rawPhone = targetApp.customer_phone.trim();
            const cleanDigits = rawPhone.replace(/\D/g, '');
            const activeTenantId = targetApp.tenant_id || tenantId;

            if (activeTenantId) {
              const { data: customerList } = await supabase
                .from('customers')
                .select('id, name, phone');

              const matchedCustomer = (customerList || []).find(c => {
                const cDigits = (c.phone || '').replace(/\D/g, '');
                return (
                  c.phone === rawPhone ||
                  cDigits === cleanDigits ||
                  (cleanDigits.length >= 10 && cDigits.endsWith(cleanDigits.slice(-10)))
                );
              });

              if (!matchedCustomer) {
                await supabase
                  .from('customers')
                  .insert({
                    tenant_id: activeTenantId,
                    name: targetApp.customer_name,
                    phone: rawPhone,
                    vehicle_plate: targetApp.vehicle_plate || null
                  });
              }
            }
          } catch (pErr) {
            console.warn("Aviso ao sincronizar cliente:", pErr);
          }
        }

        // Se o agendamento foi finalizado, abre a janelinha para avisar o cliente no WhatsApp
        if (newStatus === 'FINALIZADO' && targetApp) {
          setReadyAppModal({ ...targetApp, status: 'FINALIZADO' });
        }

        // Atualiza o estado localmente
        setAppointments(prev =>
          prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Exclui um agendamento
  const deleteAppointment = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este agendamento?")) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) {
        alert("Erro ao excluir: " + error.message);
      } else {
        setAppointments(prev => prev.filter(app => app.id !== id));
      }
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  // Dispara a impressão térmica da Ordem de Serviço (80mm)
  const handlePrintReceipt = (app: Appointment) => {
    setPrintApp(app);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filtragem
  const filteredAppointments = appointments.filter((app) => {
    const query = filter.toLowerCase();
    const matchesSearch =
      app.customer_name.toLowerCase().includes(query) ||
      app.customer_phone.includes(query) ||
      app.vehicle_plate.toLowerCase().includes(query) ||
      (app.customer_cpf && app.customer_cpf.includes(query)) ||
      (app.services?.name && app.services.name.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === 'TODOS' ? true : app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 dark:bg-yellow-950/30 text-yellow-750 dark:text-yellow-400">
            <Clock size={12} /> Pendente
          </span>
        );
      case 'CONFIRMADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-950/30 text-green-750 dark:text-green-400">
            <CheckCircle2 size={12} /> Confirmado
          </span>
        );
      case 'FINALIZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-750 dark:text-blue-400">
            <CheckCircle2 size={12} /> Finalizado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-750 dark:text-red-400">
            <XCircle size={12} /> Cancelado
          </span>
        );
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      {/* Estilos específicos para Impressora Térmica 80mm / 58mm */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-receipt, #print-receipt * {
            visibility: visible !important;
          }
          #print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            padding: 2mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>

      {/* Header com Botões de Ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agendamentos & Lavagens</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Lance lavagens de balcão na chegada dos veículos ou gerencie os agendamentos online.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNewWash}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-md shadow-blue-500/15 transition-all active:scale-95"
          >
            <Plus size={17} /> Lançar Nova Lavagem
          </button>

          <button
            onClick={loadAppointments}
            className="px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-gray-150 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Recarregar tabela"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Barra de Busca */}
        <div className="relative rounded-xl shadow-sm md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente, telefone, CPF, placa ou serviço..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-550 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Filtro de Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        >
          <option value="TODOS">Todos os Status</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="CONFIRMADO">Confirmados</option>
          <option value="FINALIZADO">Finalizados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>

      {/* Tabela de Agendamentos */}
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Buscando agendamentos no banco...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhum agendamento encontrado</p>
            <p className="text-xs mt-1">Lance uma nova lavagem clicando no botão acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-850">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Veículo / Placa</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serviço</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Horário</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Preço</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850 bg-white dark:bg-gray-950">
                {filteredAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                    {/* Cliente */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">{app.customer_name}</span>
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                          <Phone size={12} />
                          <span>{app.customer_phone}</span>
                        </div>
                        {app.customer_cpf && (
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                            CPF: {app.customer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Placa */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs font-semibold">
                        <Tag size={12} />
                        {app.vehicle_plate.toUpperCase()}
                      </div>
                    </td>

                    {/* Serviço */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-gray-200">
                        {app.services?.name || 'Serviço Personalizado'}
                      </span>
                    </td>

                    {/* Horário */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(app.scheduled_at)}
                    </td>

                    {/* Preço e Forma de Pagamento */}
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        R$ {Number(app.total_price).toFixed(2)}
                      </div>
                      {app.notes && (app.notes.includes('[PAGAMENTO:') || app.notes.includes('PIX') || app.notes.includes('Dinheiro') || app.notes.includes('Cartão')) ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mt-1">
                          {app.notes.includes('Dinheiro') ? '💵 Dinheiro' : app.notes.includes('Crédito') ? '💳 Crédito' : app.notes.includes('Débito') ? '💳 Débito' : '🟢 PIX'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mt-1">
                          🟢 PIX
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botão de WhatsApp: Avisar que o carro está pronto ou mensagem */}
                        <a
                          href={getWhatsAppMessageUrl(app, app.status === 'FINALIZADO' ? 'READY' : 'CONFIRM')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                            app.status === 'FINALIZADO'
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 ring-1 ring-emerald-500/30'
                              : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20'
                          }`}
                          title={app.status === 'FINALIZADO' ? "Avisar no WhatsApp: Veículo Pronto para Retirada! 🚗✨" : "Conversar no WhatsApp"}
                        >
                          <MessageCircle size={16} />
                        </a>

                        {/* Botão Imprimir Ordem de Serviço (Cupom 80mm) */}
                        <button
                          onClick={() => handlePrintReceipt(app)}
                          className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors"
                          title="Imprimir Cupom / Ordem de Serviço"
                        >
                          <Printer size={16} />
                        </button>

                        {app.status === 'PENDENTE' && (
                          <button
                            onClick={() => updateStatus(app.id, 'CONFIRMADO')}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
                            title="Confirmar Agendamento"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {app.status !== 'FINALIZADO' && app.status !== 'CANCELADO' && (
                          <button
                            onClick={() => updateStatus(app.id, 'FINALIZADO')}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                            title="Finalizar Serviço (+1 ponto de fidelidade)"
                          >
                            <CheckCircle2 size={16} className="text-blue-500" />
                          </button>
                        )}
                        {app.status !== 'CANCELADO' && (
                          <button
                            onClick={() => updateStatus(app.id, 'CANCELADO')}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Cancelar Agendamento"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteAppointment(app.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Excluir Permanente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Lançar Nova Lavagem (Entrada de Veículo / Balcão) */}
      {isNewWashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <Car size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lançar Nova Lavagem</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Entrada de veículo presencial / balcão</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewWashOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {washError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-400">
                {washError}
              </div>
            )}

            <form onSubmit={handleCreateWash} className="space-y-4 text-left">
              {/* WhatsApp e Nome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    WhatsApp / Celular *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: 38999999999"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onBlur={handlePhoneBlur}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">Preencha para auto-completar</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Nome do Cliente *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Nome do cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Placa e CPF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Placa do Veículo *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: ABC1D23"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    CPF na Nota (Opcional)
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="Apenas números"
                      value={customerCpf}
                      onChange={(e) => setCustomerCpf(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Serviço e Valor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Serviço a Realizar *
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (R$ {Number(s.price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Valor Cobrado (R$) *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Data/Hora e Status Inicial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Data e Horário
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Status da Lavagem
                  </label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as 'CONFIRMADO' | 'FINALIZADO' | 'PENDENTE')}
                    className="block w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  >
                    <option value="CONFIRMADO">🟡 Confirmado (Na Fila / Lavando)</option>
                    <option value="FINALIZADO">🟢 Finalizado (Concluído & Pago)</option>
                    <option value="PENDENTE">⚪ Pendente</option>
                  </select>
                </div>
              </div>

              {initialStatus === 'FINALIZADO' && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-500 shrink-0" />
                  <span>Esta lavagem creditará <strong>+1 ponto de fidelidade</strong> automaticamente para o cliente.</span>
                </div>
              )}

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsNewWashOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingWash}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 transition-all"
                >
                  {submittingWash ? 'Lançando...' : 'Lançar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Via de Impressão Térmica (Ordem de Serviço - 80mm / 58mm) */}
      {printApp && (
        <div id="print-receipt" className="hidden">
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
            {tenantInfo?.name || 'BRILHO MÁGICO'}
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Studio Automotivo
          </div>
          {tenantInfo?.address && (
            <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '2px' }}>
              {tenantInfo.address}
            </div>
          )}
          {tenantInfo?.cnpj && (
            <div style={{ textAlign: 'center', fontSize: '9px' }}>
              CNPJ: {tenantInfo.cnpj}
            </div>
          )}
          {tenantInfo?.phone && (
            <div style={{ textAlign: 'center', fontSize: '9px' }}>
              Contato: {tenantInfo.phone}
            </div>
          )}

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>
          
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>
            ORDEM DE SERVIÇO (OS)
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            <div><strong>Nº OS:</strong> #{printApp.id.substring(0, 8).toUpperCase()}</div>
            <div><strong>Data/Hora:</strong> {formatDateTime(printApp.scheduled_at)}</div>
            <div><strong>Status:</strong> {printApp.status}</div>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>

          <div style={{ fontSize: '10px' }}>
            <div><strong>CLIENTE:</strong> {printApp.customer_name}</div>
            <div><strong>TELEFONE:</strong> {printApp.customer_phone}</div>
            <div><strong>PLACA:</strong> {printApp.vehicle_plate.toUpperCase()}</div>
            {printApp.customer_cpf && (
              <div><strong>CPF NA NOTA:</strong> {printApp.customer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</div>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>

          <div style={{ fontSize: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>DESCRIÇÃO</span>
              <span>VALOR</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span>{printApp.services?.name || 'Lavagem'}</span>
              <span>R$ {Number(printApp.total_price).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px' }}>
            <span>TOTAL A PAGAR:</span>
            <span>R$ {Number(printApp.total_price).toFixed(2)}</span>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

          <div style={{ textAlign: 'center', fontSize: '9px', textTransform: 'uppercase' }}>
            Agradecemos a preferência!
          </div>
          <div style={{ textAlign: 'center', fontSize: '8px', color: '#555', marginTop: '4px' }}>
            Kryon Systems - v1.0.0
          </div>
        </div>
      )}

      {/* Modal: Veículo Pronto para Retirada (Avisar Cliente no WhatsApp) */}
      {readyAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Lavagem Finalizada! 🎉</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Veículo pronto para retirada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadyAppModal(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-bold text-gray-900 dark:text-white">{readyAppModal.customer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">WhatsApp:</span>
                <span className="font-bold text-green-600 dark:text-green-400 font-mono">{readyAppModal.customer_phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Veículo / Placa:</span>
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white">
                  {readyAppModal.vehicle_plate.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Serviço:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{readyAppModal.services?.name || 'Lavagem'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
                <span className="text-gray-500 font-semibold">Valor Total:</span>
                <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">R$ {Number(readyAppModal.total_price).toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
              Deseja enviar uma mensagem no WhatsApp avisando o cliente que o carro já está limpo e disponível para retirada?
            </p>

            <div className="flex flex-col gap-2">
              <a
                href={getWhatsAppMessageUrl(readyAppModal, 'READY')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setReadyAppModal(null)}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-95 text-center"
              >
                <MessageCircle size={18} />
                <span>Avisar no WhatsApp (Carro Pronto 🚗✨)</span>
              </a>

              <button
                type="button"
                onClick={() => setReadyAppModal(null)}
                className="w-full py-2.5 px-4 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                Agora não / Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
