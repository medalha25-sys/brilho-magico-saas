"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Users, Phone, Tag, Plus, Edit2, Trash2, Search, FileText, Car, MessageCircle, X, ShieldAlert } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  cpf?: string | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  notes?: string | null;
  created_at: string;
}

export default function ClientesPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Estados do Modal de Cadastro / Edição
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Carrega clientes do Supabase (com sincronização de agendamentos)
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profile?.tenant_id) {
        const tId = profile.tenant_id;
        setTenantId(tId);

        // 1. Tenta buscar da tabela oficial de customers
        const { data: customData, error: customErr } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tId)
          .order('name', { ascending: true });

        if (!customErr && customData && customData.length > 0) {
          setCustomers(customData);
          setLoading(false);
          return;
        }

        // 2. Se a tabela customers estiver vazia ou não criada, agrega clientes únicos dos agendamentos
        const { data: appData } = await supabase
          .from('appointments')
          .select('id, customer_name, customer_phone, customer_cpf, vehicle_plate, created_at')
          .eq('tenant_id', tId)
          .order('created_at', { ascending: false });

        if (appData && appData.length > 0) {
          const map = new Map<string, Customer>();
          appData.forEach(app => {
            const key = app.customer_phone.replace(/\D/g, '') || app.customer_name;
            if (!map.has(key)) {
              map.set(key, {
                id: app.id,
                name: app.customer_name,
                phone: app.customer_phone,
                cpf: app.customer_cpf || null,
                vehicle_plate: app.vehicle_plate || null,
                vehicle_model: null,
                notes: null,
                created_at: app.created_at
              });
            }
          });
          setCustomers(Array.from(map.values()));
        } else {
          setCustomers([]);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abre modal para cadastrar novo
  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setPhone('');
    setCpf('');
    setVehiclePlate('');
    setVehicleModel('');
    setNotes('');
    setModalError(null);
    setIsOpen(true);
  };

  // Abre modal para editar existente
  const handleOpenEdit = (c: Customer) => {
    setEditId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setCpf(c.cpf || '');
    setVehiclePlate(c.vehicle_plate || '');
    setVehicleModel(c.vehicle_model || '');
    setNotes(c.notes || '');
    setModalError(null);
    setIsOpen(true);
  };

  // Salva no Supabase (criação ou edição)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !tenantId) {
      setModalError("Nome e Telefone/WhatsApp são obrigatórios.");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    const payload = {
      tenant_id: tenantId,
      name,
      phone,
      cpf: cpf ? cpf.replace(/\D/g, '') : null,
      vehicle_plate: vehiclePlate ? vehiclePlate.toUpperCase().trim() : null,
      vehicle_model: vehicleModel || null,
      notes: notes || null
    };

    try {
      if (editId) {
        // Tenta atualizar na tabela customers
        const { error: updErr } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editId);

        if (updErr) {
          // Se a tabela ainda não existir, atualiza no estado local
          console.warn("Aviso ao atualizar tabela:", updErr.message);
        }

        setCustomers(prev => prev.map(c => c.id === editId ? { ...c, ...payload } : c));
        setIsOpen(false);
      } else {
        // Criação
        const { data: newCust, error: insErr } = await supabase
          .from('customers')
          .insert(payload)
          .select()
          .single();

        if (insErr) {
          console.warn("Aviso ao inserir tabela:", insErr.message);
          // Fallback adicionando ao estado local
          const localNew: Customer = {
            id: 'temp-' + Date.now(),
            ...payload,
            created_at: new Date().toISOString()
          };
          setCustomers(prev => [localNew, ...prev]);
        } else if (newCust) {
          setCustomers(prev => [newCust, ...prev]);
        }
        setIsOpen(false);
      }
    } catch {
      setModalError("Erro de conexão ao salvar o cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  // Exclui o cliente
  const handleDelete = async (id: string, clientName: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o cliente "${clientName}"?`)) return;

    try {
      await supabase.from('customers').delete().eq('id', id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  // Filtra clientes por nome, celular, placa ou cpf
  const filteredCustomers = customers.filter(c => {
    const query = filter.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.cpf && c.cpf.includes(query)) ||
      (c.vehicle_plate && c.vehicle_plate.toLowerCase().includes(query)) ||
      (c.vehicle_model && c.vehicle_model.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Cadastre, consulte e gerencie a base de clientes do seu lava-rápido.</p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors"
        >
          <Plus size={16} /> Cadastrar Cliente
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="mb-6">
        <div className="relative rounded-xl shadow-sm max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, WhatsApp, CPF, placa ou modelo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-550 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Carregando clientes...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhum cliente encontrado</p>
            <p className="text-xs mt-1">Cadastre novos clientes clicando no botão acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-850">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">WhatsApp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CPF</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Veículo / Placa</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observações</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850 bg-white dark:bg-gray-950">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                    {/* Nome */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{c.name}</div>
                    </td>

                    {/* WhatsApp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold hover:underline"
                      >
                        <MessageCircle size={14} /> {c.phone}
                      </a>
                    </td>

                    {/* CPF */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.cpf ? (
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-300">
                          {c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>

                    {/* Veículo / Placa */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 text-left">
                        {c.vehicle_plate && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs font-semibold w-max">
                            <Tag size={11} /> {c.vehicle_plate}
                          </div>
                        )}
                        {c.vehicle_model && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Car size={11} /> {c.vehicle_model}
                          </span>
                        )}
                        {!c.vehicle_plate && !c.vehicle_model && (
                          <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </div>
                    </td>

                    {/* Observações */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs">
                        {c.notes || '-'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Editar Cliente"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Excluir Cliente"
                        >
                          <Trash2 size={15} />
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

      {/* Modal de Cadastro / Edição de Cliente */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Ferreira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">WhatsApp / Celular *</label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 38999999999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">CPF (Opcional)</label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Apenas números"
                      maxLength={11}
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Placa */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Placa do Veículo</label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: ABC1D23"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Modelo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Modelo do Veículo</label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Car className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: Honda Civic Preto"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Observações ou Preferências</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cliente prefere cera líquida, cuidado com rodas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  {submitting ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
