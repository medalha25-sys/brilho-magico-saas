"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, Clock, Car } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  vehicle_type: 'CARRO' | 'MOTO';
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export default function ServicosPage() {
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Estados do Modal
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState<'CARRO' | 'MOTO'>('CARRO');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Carrega Tenant ID do usuário logado
  const getTenantId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
          return profile.tenant_id;
        }
      }
      return null;
    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
      return null;
    }
  };

  // Carrega os serviços do banco
  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error("Erro ao carregar serviços:", error.message);
      } else if (data) {
        setServices(data.map(s => ({
          id: s.id,
          name: s.name,
          vehicle_type: s.vehicle_type,
          price: Number(s.price),
          duration_minutes: s.duration_minutes,
          is_active: s.is_active
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      await getTenantId();
      await loadServices();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abre modal para cadastrar novo
  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setVehicleType('CARRO');
    setPrice('');
    setDuration('');
    setIsActive(true);
    setModalError(null);
    setIsOpen(true);
  };

  // Abre modal para editar existente
  const handleOpenEdit = (service: Service) => {
    setEditId(service.id);
    setName(service.name);
    setVehicleType(service.vehicle_type);
    setPrice(String(service.price));
    setDuration(String(service.duration_minutes));
    setIsActive(service.is_active);
    setModalError(null);
    setIsOpen(true);
  };

  // Salva no Supabase (cria ou atualiza)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !duration) {
      setModalError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const activeTenantId = tenantId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    setSubmitting(true);
    setModalError(null);

    const serviceData = {
      tenant_id: activeTenantId,
      name: name.trim(),
      vehicle_type: vehicleType,
      price: parseFloat(price),
      duration_minutes: parseInt(duration),
      is_active: isActive
    };

    try {
      if (editId) {
        // Atualização
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editId);

        if (error) {
          setModalError(error.message);
        } else {
          setServices(prev => prev.map(s => s.id === editId ? { ...s, ...serviceData, price: Number(price), duration_minutes: Number(duration) } : s));
          setIsOpen(false);
        }
      } else {
        // Criação
        const { data, error } = await supabase
          .from('services')
          .insert(serviceData)
          .select()
          .single();

        if (error) {
          setModalError(error.message);
        } else if (data) {
          setServices(prev => [...prev, {
            id: data.id,
            name: data.name,
            vehicle_type: data.vehicle_type,
            price: Number(data.price),
            duration_minutes: data.duration_minutes,
            is_active: data.is_active
          }]);
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
      setModalError("Ocorreu um erro ao salvar o serviço.");
    } finally {
      setSubmitting(false);
    }
  };

  // Alterna o status ativo/inativo
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) {
        alert("Erro ao alterar status: " + error.message);
      } else {
        setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Deleta o serviço definitivamente
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente deletar este serviço? Isso pode impactar agendamentos antigos.")) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) {
        // Se der erro de chave estrangeira, oferece desativar em vez de excluir
        if (error.code === '23503') {
          if (window.confirm("Este serviço possui agendamentos vinculados e não pode ser excluído definitivamente. Deseja apenas desativá-lo para que não apareça para novos clientes?")) {
            await toggleActive(id, true);
          }
        } else {
          alert("Erro ao excluir: " + error.message);
        }
      } else {
        setServices(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Serviços</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure os tipos de lavagens, preços e durações oferecidas.</p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors"
        >
          <Plus size={16} /> Adicionar Serviço
        </button>
      </div>

      {/* Grid de Serviços */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Carregando serviços...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
          <Sparkles className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhum serviço cadastrado</p>
          <p className="text-xs text-gray-500 mt-1">Cadastre seu primeiro serviço clicando no botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div 
              key={service.id} 
              className={`p-6 rounded-2xl bg-white dark:bg-gray-950 border transition-all duration-200 flex flex-col justify-between ${
                service.is_active 
                  ? 'border-gray-100 dark:border-gray-850 hover:shadow-md' 
                  : 'border-gray-200 dark:border-gray-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  {/* Tipo de Veículo */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                    service.vehicle_type === 'CARRO' 
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' 
                      : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400'
                  }`}>
                    <Car size={10} /> {service.vehicle_type}
                  </span>

                  {/* Status Toggler */}
                  <button
                    onClick={() => toggleActive(service.id, service.is_active)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      service.is_active 
                        ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 hover:bg-green-100' 
                        : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100'
                    }`}
                  >
                    {service.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 text-left">{service.name}</h3>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-6">
                  <span className="flex items-center gap-1"><Clock size={14} /> {service.duration_minutes} min</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">R$ {service.price.toFixed(2)}</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-50 dark:border-gray-900 pt-4">
                <button
                  onClick={() => handleOpenEdit(service)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
                  title="Deletar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editId ? 'Editar Serviço' : 'Adicionar Novo Serviço'}
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
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nome do Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lavagem de Motor, Polimento Comercial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Tipo de Veículo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tipo de Veículo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVehicleType('CARRO')}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-colors ${
                      vehicleType === 'CARRO' 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-450' 
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    🚗 Carro
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleType('MOTO')}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-colors ${
                      vehicleType === 'MOTO' 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-450' 
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    🏍️ Moto
                  </button>
                </div>
              </div>

              {/* Preço e Duração */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 80.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Duração (Minutos)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 60"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status Ativo Toggle */}
              {editId && (
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-900 pt-4 mt-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Serviço está ativo?</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isActive 
                        ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400' 
                        : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isActive ? 'Sim (Ativo)' : 'Não (Inativo)'}
                  </button>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6">
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  {submitting ? 'Salvando...' : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
