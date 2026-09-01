"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Users, 
  Phone, 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  FileText, 
  Car, 
  MessageCircle, 
  X, 
  ShieldAlert,
  Gift,
  Award,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  cpf?: string | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  notes?: string | null;
  points?: number;
  created_at: string;
}

export default function ClientesPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('GERENTE');

  // Estados do Modal de Cadastro / Edição
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [notes, setNotes] = useState('');
  const [points, setPoints] = useState<number>(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados do Modal de Resgate de Fidelidade
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // Modal de Regras de Fidelidade
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Carrega clientes do Supabase
  const loadCustomers = async () => {
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
        setUserRole(profile.role || 'GERENTE');
      }

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
          setCustomers(customData.map(c => ({ ...c, points: c.points || 0 })));
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
                points: 0,
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
    setPoints(0);
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
    setPoints(c.points || 0);
    setModalError(null);
    setIsOpen(true);
  };

  // Abre modal de Resgate de Prêmios
  const handleOpenRedeem = (c: Customer) => {
    setSelectedCustomer(c);
    setRedeemSuccess(null);
    setIsRedeemOpen(true);
  };

  // Executa o Resgate de Prêmio ou Ajuste de Pontos
  const handleRedeemAction = async (cost: number, prizeName: string) => {
    if (!selectedCustomer) return;
    if (userRole !== 'ADMIN' && userRole !== 'GERENTE') {
      alert("Apenas Administradores e Gerentes podem realizar o resgate de brindes.");
      return;
    }

    const currentPts = Number(selectedCustomer.points || 0);
    if (currentPts < cost) {
      alert(`Pontos insuficientes! O cliente possui ${currentPts} pontos e precisa de ${cost} pontos.`);
      return;
    }

    const newPoints = currentPts - cost;

    try {
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id);

      // Atualiza estado local
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, points: newPoints } : c));
      setSelectedCustomer(prev => prev ? { ...prev, points: newPoints } : null);
      setRedeemSuccess(`🎉 ${prizeName} resgatado com sucesso! Saldo atualizado para ${newPoints} pontos.`);
    } catch (err) {
      console.error(err);
      alert("Erro ao realizar o resgate.");
    }
  };

  // Ajuste manual rápido de pontos (+1 ou -1)
  const handleManualPointAdjust = async (delta: number) => {
    if (!selectedCustomer) return;
    const currentPts = Number(selectedCustomer.points || 0);
    const newPoints = Math.max(0, currentPts + delta);

    try {
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id);

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, points: newPoints } : c));
      setSelectedCustomer(prev => prev ? { ...prev, points: newPoints } : null);
    } catch (err) {
      console.error(err);
    }
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
      notes: notes || null,
      points: Number(points || 0)
    };

    try {
      if (editId) {
        const { error: updErr } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editId);

        if (updErr) {
          console.warn("Aviso ao atualizar tabela:", updErr.message);
        }

        setCustomers(prev => prev.map(c => c.id === editId ? { ...c, ...payload } : c));
        setIsOpen(false);
      } else {
        const { data: newCust, error: insErr } = await supabase
          .from('customers')
          .insert(payload)
          .select()
          .single();

        if (insErr) {
          console.warn("Aviso ao inserir tabela:", insErr.message);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Clientes & Cartão Fidelidade</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Consulte a base de clientes, pontos acumulados e realize o resgate de brindes.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRulesOpen(true)}
            className="px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <Info size={16} className="text-blue-500" /> Regras de Pontos
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors"
          >
            <Plus size={16} /> Cadastrar Cliente
          </button>
        </div>
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Placa / Veículo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pontos Fidelidade</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resgate & Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850 bg-white dark:bg-gray-950">
                {filteredCustomers.map((c) => {
                  const pts = c.points || 0;
                  const canRedeemWash = pts >= 20;
                  const canRedeemDucha = pts >= 10;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                      {/* Nome */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">{c.name}</span>
                          {c.cpf && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              CPF: {c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                            </span>
                          )}
                        </div>
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

                      {/* Pontos de Fidelidade */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            canRedeemWash
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                              : canRedeemDucha
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            <Award size={13} />
                            {pts} {pts === 1 ? 'ponto' : 'pontos'}
                          </span>

                          {canRedeemWash && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded">
                              ✨ Lavagem Grátis!
                            </span>
                          )}
                          {!canRedeemWash && canRedeemDucha && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                              🚿 Ducha Grátis!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botão Resgatar Prêmio */}
                          <button
                            onClick={() => handleOpenRedeem(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs transition-colors border border-amber-500/30"
                            title="Resgatar Prêmio de Fidelidade"
                          >
                            <Gift size={13} /> Resgatar
                          </button>

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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Resgate de Prêmios */}
      {isRedeemOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Gift size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Resgate de Fidelidade</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cliente: {selectedCustomer.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRedeemOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Saldo de Pontos */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Saldo Atual do Cliente:</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Award size={18} /> {selectedCustomer.points || 0} pts
              </span>
            </div>

            {redeemSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-green-600" />
                <span>{redeemSuccess}</span>
              </div>
            )}

            {/* Opções de Resgate */}
            <div className="space-y-3 mb-6">
              {/* Opção 1: Ducha Simples (10 pts) */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900/60">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900 dark:text-white">
                    <span>🚿 Ducha Simples de Brinde</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Custo: 10 Pontos</p>
                </div>
                <button
                  type="button"
                  disabled={Number(selectedCustomer.points || 0) < 10}
                  onClick={() => handleRedeemAction(10, 'Ducha Simples de Brinde')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Resgatar
                </button>
              </div>

              {/* Opção 2: Lavagem Completa (20 pts) */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900/60">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900 dark:text-white">
                    <span>✨ Lavagem Completa de Brinde</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Custo: 20 Pontos</p>
                </div>
                <button
                  type="button"
                  disabled={Number(selectedCustomer.points || 0) < 20}
                  onClick={() => handleRedeemAction(20, 'Lavagem Completa de Brinde')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Resgatar
                </button>
              </div>
            </div>

            {/* Ajuste Manual Rápido */}
            <div className="border-t border-gray-150 dark:border-gray-800 pt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Ajuste Manual:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleManualPointAdjust(-1)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300"
                  title="Diminuir 1 ponto"
                >
                  -1 pt
                </button>
                <button
                  type="button"
                  onClick={() => handleManualPointAdjust(1)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-xs font-bold text-blue-600 dark:text-blue-400"
                  title="Adicionar 1 ponto"
                >
                  +1 pt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Regras de Fidelidade */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Sparkles size={20} />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Programa de Fidelidade</h2>
              </div>
              <button 
                onClick={() => setIsRulesOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                <p className="font-bold text-blue-900 dark:text-blue-300 mb-1">⭐ Como os clientes ganham pontos?</p>
                <p>A cada lavagem concluída (quando marcada como <strong>FINALIZADO</strong> na tela de Agendamentos), o cliente ganha <strong>+1 ponto</strong> automaticamente associado ao seu número de WhatsApp.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-900 dark:text-white">🎁 Tabela de Prêmios:</p>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800">
                  <span>🚿 <strong>Ducha Simples de Brinde</strong></span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">10 Pontos</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800">
                  <span>✨ <strong>Lavagem Completa de Brinde</strong></span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">20 Pontos</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                <p className="font-bold text-emerald-900 dark:text-emerald-300 mb-0.5">⏳ Validade dos Pontos:</p>
                <p>Os pontos <strong>NÃO expiram</strong>. O cliente pode acumular no seu próprio ritmo.</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900">
                <p className="font-bold text-purple-900 dark:text-purple-300 mb-0.5">🔒 Segurança:</p>
                <p>Apenas administradores e gerentes autenticados possuem autorização para resgatar os prêmios na tela de Clientes.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRulesOpen(false)}
              className="mt-6 w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl text-xs hover:opacity-90 transition-opacity"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

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

              {/* Pontos Iniciais / Ajuste */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Pontos de Fidelidade</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={points}
                    onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
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
