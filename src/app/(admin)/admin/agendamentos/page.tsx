"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Calendar, Phone, Tag, Trash2, Clock, CheckCircle2, XCircle, Search, Printer } from 'lucide-react';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_cpf?: string | null;
  vehicle_plate: string;
  scheduled_at: string;
  total_price: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'FINALIZADO' | 'CANCELADO';
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [printApp, setPrintApp] = useState<Appointment | null>(null);

  // Carrega os agendamentos e dados da empresa do Supabase
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

      // Busca dados do tenant para o cabeçalho do cupom
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profile?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name, phone, address, cnpj')
            .eq('id', profile.tenant_id)
            .single();

          if (tenant) {
            setTenantInfo(tenant);
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

  // Atualiza o status do agendamento
  const updateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        alert("Erro ao atualizar status: " + error.message);
      } else {
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
      console.error(err);
    }
  };

  // Dispara a impressão do Cupom Térmico (OS)
  const handlePrintOS = (app: Appointment) => {
    setPrintApp(app);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filtra agendamentos por nome, celular, placa, cpf ou serviço e status
  const filteredAppointments = appointments.filter(app => {
    const query = filter.toLowerCase();
    const matchesSearch = 
      app.customer_name.toLowerCase().includes(query) ||
      app.customer_phone.includes(query) ||
      (app.customer_cpf && app.customer_cpf.includes(query)) ||
      app.vehicle_plate.toLowerCase().includes(query) ||
      (app.services?.name || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'TODOS' || app.status === statusFilter;

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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie e imprima a ordem de serviço do seu lava-rápido.</p>
        </div>
        
        <button
          onClick={loadAppointments}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-150 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          🔄 Atualizar Tabela
        </button>
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
            <p className="text-xs mt-1">Nenhum registro corresponde aos filtros aplicados.</p>
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
                        <div className="flex items-center gap-2 mt-0.5">
                          <a 
                            href={`https://wa.me/${app.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium hover:underline"
                          >
                            <Phone size={10} /> {app.customer_phone}
                          </a>
                          {app.customer_cpf && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-450 px-1.5 py-0.5 rounded font-mono font-bold" title="CPF para nota fiscal">
                              CPF: {app.customer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Veículo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs font-semibold">
                        <Tag size={12} /> {app.vehicle_plate.toUpperCase()}
                      </div>
                    </td>
                    {/* Serviço */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-350">{app.services?.name || 'Lavagem'}</span>
                    </td>
                    {/* Horário */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{formatDateTime(app.scheduled_at)}</span>
                    </td>
                    {/* Preço */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">R$ {Number(app.total_price).toFixed(2)}</span>
                    </td>
                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    {/* Ações */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botão Imprimir OS (Cupom Fiscal) */}
                        <button
                          onClick={() => handlePrintOS(app)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                          title="Imprimir Ordem de Serviço (Cupom Térmico)"
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
                            title="Finalizar Serviço"
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
    </div>
  );
}
