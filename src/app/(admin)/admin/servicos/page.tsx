"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, Edit2, ShieldAlert, Sparkles, Clock } from 'lucide-react';
import { DurationUnit, durationToMinutes, minutesToDuration, formatDurationDisplay } from '@/utils/duration';

interface Service {
  id: string;
  name: string;
  vehicle_type: 'CARRO' | 'MOTO';
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

// ─── Card de Serviço ────────────────────────────────────────────────────────
function ServiceCard({
  service,
  onEdit,
  onDelete,
  onToggle,
}: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, current: boolean) => void;
}) {
  return (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-gray-950 border transition-all duration-200 flex flex-col justify-between ${
        service.is_active
          ? 'border-gray-100 dark:border-gray-800 hover:shadow-md'
          : 'border-gray-200 dark:border-gray-900 opacity-60'
      }`}
    >
      <div>
        {/* Status badge */}
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => onToggle(service.id, service.is_active)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              service.is_active
                ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 hover:bg-green-100'
                : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100'
            }`}
          >
            {service.is_active ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        <h3 className="font-bold text-base text-gray-900 dark:text-white mb-3 text-left leading-snug">
          {service.name}
        </h3>

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-6">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {formatDurationDisplay(service.duration_minutes, true)}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            R$ {service.price.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-50 dark:border-gray-900 pt-4">
        <button
          onClick={() => onEdit(service)}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
          title="Editar"
        >
          <Edit2 size={15} />
        </button>
        <button
          onClick={() => onDelete(service.id)}
          className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
          title="Deletar"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Página Principal ───────────────────────────────────────────────────────
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
  const [durationValue, setDurationValue] = useState('30');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('MINUTOS');
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Carrega Tenant ID do usuario logado
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

  // Carrega os servicos do banco
  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error("Erro ao carregar servicos:", error.message);
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
    setDurationValue('30');
    setDurationUnit('MINUTOS');
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
    const { value, unit } = minutesToDuration(service.duration_minutes);
    setDurationValue(String(value));
    setDurationUnit(unit);
    setIsActive(service.is_active);
    setModalError(null);
    setIsOpen(true);
  };

  // Salva no Supabase (cria ou atualiza)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedDurationValue = parseFloat(durationValue);
    if (!name || !price) {
      setModalError("Por favor, preencha todos os campos obrigatorios.");
      return;
    }
    if (isNaN(parsedDurationValue) || parsedDurationValue <= 0) {
      setModalError("A duracao deve ser um valor positivo maior que zero.");
      return;
    }
    if (!tenantId) {
      setModalError("Identificador da organizacao nao encontrado. Por favor, recarregue a pagina.");
      return;
    }

    const computedMinutes = durationToMinutes(parsedDurationValue, durationUnit);
    if (computedMinutes <= 0) {
      setModalError("A duracao calculada deve ser maior que zero minutos.");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    const serviceData = {
      tenant_id: tenantId,
      name: name.trim(),
      vehicle_type: vehicleType,
      price: parseFloat(price),
      duration_minutes: computedMinutes,
      is_active: isActive
    };

    try {
      if (editId) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editId);

        if (error) {
          setModalError(error.message);
        } else {
          setServices(prev => prev.map(s => s.id === editId ? { ...s, ...serviceData } : s));
          setIsOpen(false);
        }
      } else {
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
      setModalError("Ocorreu um erro ao salvar o servico.");
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

  // Deleta o servico definitivamente
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente deletar este servico? Isso pode impactar agendamentos antigos.")) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') {
          if (window.confirm("Este servico possui agendamentos vinculados e nao pode ser excluido definitivamente. Deseja apenas desativa-lo para que nao apareca para novos clientes?")) {
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

  // Derived lists — filtradas no cliente, sem nova query ao banco
  const carros = services.filter(s => s.vehicle_type === 'CARRO');
  const motos  = services.filter(s => s.vehicle_type === 'MOTO');

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Servicos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Configure os tipos de lavagens, precos e duracoes oferecidas.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors"
        >
          <Plus size={16} /> Adicionar Servico
        </button>
      </div>

      {/* ── Conteudo principal ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Carregando servicos...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
          <Sparkles className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhum servico cadastrado</p>
          <p className="text-xs text-gray-500 mt-1">Cadastre seu primeiro servico clicando no botao acima.</p>
        </div>
      ) : (
        <div className="space-y-12">

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECAO 1 — LAVAGENS PARA CARROS                           */}
          {/* ══════════════════════════════════════════════════════════ */}
          <section>
            {/* Cabecalho */}
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-blue-100 dark:border-blue-900/40">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-lg flex-shrink-0">
                🚗
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  Lavagens para Carros
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Servicos disponíveis para automoveis
                </p>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-bold flex-shrink-0">
                {carros.length} {carros.length === 1 ? 'servico' : 'servicos'}
              </span>
            </div>

            {/* Grid de carros */}
            {carros.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-600">
                Nenhum servico de carro cadastrado ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {carros.map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onToggle={toggleActive}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECAO 2 — LAVAGENS PARA MOTOS                            */}
          {/* ══════════════════════════════════════════════════════════ */}
          <section>
            {/* Cabecalho */}
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-purple-100 dark:border-purple-900/40">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-lg flex-shrink-0">
                🏍️
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  Lavagens para Motos
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Servicos disponíveis para motocicletas
                </p>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-xs font-bold flex-shrink-0">
                {motos.length} {motos.length === 1 ? 'servico' : 'servicos'}
              </span>
            </div>

            {/* Grid de motos */}
            {motos.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-600">
                Nenhum servico de moto cadastrado ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {motos.map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onToggle={toggleActive}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      )}

      {/* ── Modal de Cadastro/Edicao ────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editId ? 'Editar Servico' : 'Adicionar Novo Servico'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500"
              >
                ✕
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
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nome do Servico</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lavagem de Motor, Polimento Comercial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Tipo de Veiculo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tipo de Veiculo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVehicleType('CARRO')}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-colors ${
                      vehicleType === 'CARRO'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
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
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    🏍️ Moto
                  </button>
                </div>
              </div>

              {/* Preco */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Preco (R$)</label>
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

              {/* Duracao: [ valor ] [ unidade ] */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Duracao
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="Ex: 30"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="MINUTOS">Minutos</option>
                    <option value="HORAS">Horas</option>
                    <option value="DIAS">Dias</option>
                  </select>
                </div>
                {durationValue && parseFloat(durationValue) > 0 && (
                  <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                    = {durationToMinutes(parseFloat(durationValue), durationUnit)} minutos armazenados no banco
                  </p>
                )}
              </div>

              {/* Status Ativo Toggle */}
              {editId && (
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-900 pt-4 mt-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Servico esta ativo?</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isActive ? 'Sim (Ativo)' : 'Nao (Inativo)'}
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
                  {submitting ? 'Salvando...' : 'Salvar Servico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
