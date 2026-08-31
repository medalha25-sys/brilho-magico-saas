"use client";

import React, { useState, useEffect, use } from 'react';
import { Calendar, Car, Bike, Clock, Check, User, Phone, Tag, MessageSquare, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  vehicleType: 'CARRO' | 'MOTO';
}

const TIME_SLOTS_MOCK = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];

export default function BookingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vehicleType, setVehicleType] = useState<'CARRO' | 'MOTO' | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Dados do Agendamento
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados dinâmicos do Supabase
  const [services, setServices] = useState<Service[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ [key: string]: string[] }>({}); // key: 'yyyy-mm-dd', value: ['08:00', '09:30']
  const [loadingData, setLoadingData] = useState(true);

  // 1. Carrega dados dinâmicos do Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        // Busca o lava-rápido pelo slug (ex: wash-express)
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();
        
        if (!tenantData) {
          console.warn("Lava-rápido não cadastrado. Usando serviços padrão de teste.");
          setServices([
            { id: '1', name: 'Ducha Simples', price: 40.00, duration: 40, vehicleType: 'CARRO' },
            { id: '2', name: 'Lavagem Completa', price: 80.00, duration: 60, vehicleType: 'CARRO' },
            { id: '3', name: 'Higienização Interna', price: 150.00, duration: 120, vehicleType: 'CARRO' },
            { id: '4', name: 'Ducha Simples', price: 30.00, duration: 30, vehicleType: 'MOTO' },
            { id: '5', name: 'Lavagem Completa', price: 50.00, duration: 50, vehicleType: 'MOTO' },
          ]);
          setLoadingData(false);
          return;
        }

        // Busca os serviços ativos desse lava-rápido
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('is_active', true);

        if (servicesData && servicesData.length > 0) {
          setServices(servicesData.map(s => ({
            id: s.id,
            name: s.name,
            price: Number(s.price),
            duration: s.duration_minutes,
            vehicleType: s.vehicle_type
          })));
        } else {
          // Fallback se não cadastrou serviços no banco ainda
          setServices([
            { id: '1', name: 'Ducha Simples', price: 40.00, duration: 40, vehicleType: 'CARRO' },
            { id: '2', name: 'Lavagem Completa', price: 80.00, duration: 60, vehicleType: 'CARRO' },
            { id: '3', name: 'Higienização Interna', price: 150.00, duration: 120, vehicleType: 'CARRO' },
            { id: '4', name: 'Ducha Simples', price: 30.00, duration: 30, vehicleType: 'MOTO' },
            { id: '5', name: 'Lavagem Completa', price: 50.00, duration: 50, vehicleType: 'MOTO' },
          ]);
        }

        // Busca agendamentos dos próximos 7 dias para mapear horários bloqueados
        const todayStr = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('scheduled_at')
          .eq('tenant_id', tenantData.id)
          .gte('scheduled_at', todayStr)
          .lte('scheduled_at', nextWeekStr);

        if (appointmentsData) {
          const booked: { [key: string]: string[] } = {};
          appointmentsData.forEach((app) => {
            const dateObj = new Date(app.scheduled_at);
            // Corrige para o timezone local do Brasil
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}-${mm}-${dd}`;
            
            const hh = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            const timeKey = `${hh}:${min}`;

            if (!booked[dateKey]) {
              booked[dateKey] = [];
            }
            booked[dateKey].push(timeKey);
          });
          setBookedSlots(booked);
        }
      } catch (err) {
        console.error("Erro ao carregar banco de dados:", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [tenantSlug]);

  const handleVehicleSelect = (type: 'CARRO' | 'MOTO') => {
    setVehicleType(type);
    setSelectedService(null);
  };

  const handleNextStep = () => {
    if (selectedService) {
      setStep(2);
    }
  };

  const handleBackStep = () => {
    setStep(1);
  };

  // 2. Envia o agendamento real para o banco de dados Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !customerName || !customerPhone || !selectedService) return;

    setLoading(true);

    try {
      // Pega o ID do Tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      if (!tenantData) {
        console.warn("Lava-rápido não encontrado. Agendando em modo de teste.");
        setLoading(false);
        setStep(3);
        return;
      }

      // Combina a data (yyyy-mm-dd) e a hora (hh:mm)
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hour, minute] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(year, month - 1, day, hour, minute).toISOString();

      // Salva na tabela appointments
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          tenant_id: tenantData.id,
          service_id: selectedService.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          vehicle_plate: vehiclePlate,
          scheduled_at: scheduledAt,
          total_price: selectedService.price,
          status: 'PENDENTE'
        });

      if (insertError) {
        alert("Erro ao salvar: " + insertError.message);
        setLoading(false);
        return;
      }

      // Atualiza os horários ocupados localmente sem recarregar a página toda
      const updatedBooked = { ...bookedSlots };
      if (!updatedBooked[selectedDate]) {
        updatedBooked[selectedDate] = [];
      }
      updatedBooked[selectedDate].push(selectedTime);
      setBookedSlots(updatedBooked);

      setLoading(false);
      setStep(3);
    } catch {
      alert("Erro de conexão ao realizar agendamento.");
      setLoading(false);
    }
  };

  // 3. Monta o link para chamar o WhatsApp pré-formatado
  const getWhatsAppMessage = (num: string) => {
    const formattedDate = selectedDate.split('-').reverse().join('/');
    const text = `Olá! Gostaria de confirmar meu agendamento na Brilho Mágico.
    
*Detalhes do Agendamento:*
- *Cliente:* ${customerName}
- *Veículo:* ${vehicleType === 'CARRO' ? '🚗 Carro' : '🏍️ Moto'} (${vehiclePlate.toUpperCase()})
- *Serviço:* ${selectedService?.name}
- *Data/Hora:* ${formattedDate} às ${selectedTime}
- *Valor:* R$ ${selectedService?.price.toFixed(2)}`;

    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };

  // 4. Lógica do Calendário Semanal
  const getNext7Days = () => {
    const days = [];
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      days.push({
        dateStr,
        dayNumber: date.getDate(),
        weekday: weekdays[date.getDay()],
        isSunday: date.getDay() === 0
      });
    }
    return days;
  };

  const isDayFullyBooked = (dateStr: string) => {
    const booked = bookedSlots[dateStr] || [];
    return booked.length >= TIME_SLOTS_MOCK.length;
  };

  const filteredServices = services.filter(s => s.vehicleType === vehicleType);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-neutral-900 rounded-3xl border border-neutral-800 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        
        {/* Passo 1: Seleção de Veículo e Serviço */}
        {step === 1 && (
          <div>
            {/* Header com Identidade Visual Brilho Mágico */}
            <header className="text-center mb-8 flex flex-col items-center">
              <img 
                src="/logo.jpg" 
                alt="Brilho Mágico Logo" 
                className="w-24 h-24 rounded-2xl object-cover mb-4 border border-neutral-800"
              />
              <h1 className="text-2xl font-bold text-white tracking-wide">
                Brilho Mágico
              </h1>
              <p className="text-green-500 text-xs font-semibold tracking-widest uppercase mt-1">
                Studio Automotivo
              </p>
              <p className="text-neutral-400 text-sm mt-2">
                Agende sua lavagem em poucos toques
              </p>
            </header>

            {/* 1. Escolha do Veículo */}
            <section className="mb-8">
              <h2 className="text-xs font-bold text-neutral-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-[10px]">1</span>
                Qual o seu veículo?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleVehicleSelect('CARRO')}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-200 ${
                    vehicleType === 'CARRO'
                      ? 'border-green-500 bg-green-500/5 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <Car size={36} className="mb-2" />
                  <span className="font-semibold text-sm">Carro</span>
                </button>
                <button
                  onClick={() => handleVehicleSelect('MOTO')}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-200 ${
                    vehicleType === 'MOTO'
                      ? 'border-green-500 bg-green-500/5 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <Bike size={36} className="mb-2" />
                  <span className="font-semibold text-sm">Moto</span>
                </button>
              </div>
            </section>

            {/* 2. Escolha do Serviço */}
            {vehicleType && (
              <section className="mb-8">
                <h2 className="text-xs font-bold text-neutral-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-[10px]">2</span>
                  Escolha o serviço para {vehicleType.toLowerCase()}
                </h2>
                {loadingData ? (
                  <div className="text-center py-4 text-xs text-neutral-500">Carregando serviços...</div>
                ) : (
                  <div className="space-y-3">
                    {filteredServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-all duration-200 ${
                          selectedService?.id === service.id
                            ? 'border-green-500 bg-green-500/5 text-white shadow-[0_0_15px_rgba(34,197,94,0.05)]'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-white">{service.name}</h3>
                            {selectedService?.id === service.id && (
                              <Check size={14} className="text-green-500" />
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            Aproximadamente {service.duration} min
                          </p>
                        </div>
                        <span className="font-bold text-sm text-green-500">
                          R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Botão de Próximo Passo */}
            {selectedService && (
              <button 
                onClick={handleNextStep}
                className="w-full bg-green-600 hover:bg-green-500 text-neutral-950 font-bold py-4 rounded-2xl shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-200 flex justify-center items-center gap-2"
              >
                <Calendar size={20} />
                Ver Horários Disponíveis
              </button>
            )}
          </div>
        )}

        {/* Passo 2: Formulário com Calendário Semanal Dinâmico */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <header className="flex items-center gap-4 mb-6">
              <button 
                type="button"
                onClick={handleBackStep}
                className="p-2 rounded-lg bg-neutral-850 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Quase lá!</h1>
                <p className="text-xs text-neutral-400">Selecione o horário e insira seus dados</p>
              </div>
            </header>

            {/* Serviço Selecionado Info */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-2xl p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Serviço Selecionado</p>
                <p className="font-bold text-sm text-white mt-0.5">{selectedService?.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{selectedService?.duration} minutos de duração</p>
              </div>
              <span className="font-bold text-base text-green-500">
                R$ {selectedService?.price.toFixed(2)}
              </span>
            </div>

            {/* Calendário Semanal Dinâmico */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selecione o Dia</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {getNext7Days().map((day) => {
                    const fullyBooked = isDayFullyBooked(day.dateStr);
                    const isSelected = selectedDate === day.dateStr;
                    const isSunday = day.isSunday;

                    let btnClasses = "border-neutral-855 bg-neutral-950 text-neutral-400 hover:border-neutral-700";
                    if (isSelected) {
                      btnClasses = "border-green-500 bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.15)]";
                    } else if (isSunday) {
                      btnClasses = "border-neutral-900/60 bg-neutral-950/40 text-neutral-700 cursor-not-allowed";
                    } else if (fullyBooked) {
                      btnClasses = "border-red-500/20 bg-red-500/5 text-red-500 cursor-not-allowed";
                    }

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        disabled={isSunday || fullyBooked}
                        onClick={() => {
                          setSelectedDate(day.dateStr);
                          setSelectedTime(''); // Reseta o horário selecionado
                        }}
                        className={`flex flex-col items-center justify-center min-w-[62px] py-2 px-1 rounded-xl border transition-all duration-200 ${btnClasses}`}
                      >
                        <span className="text-[9px] uppercase font-bold tracking-wider">{day.weekday}</span>
                        <span className="text-sm font-bold mt-0.5">{day.dayNumber}</span>
                        {fullyBooked && !isSunday && (
                          <span className="text-[7px] text-red-500 font-bold uppercase mt-1">Lotado</span>
                        )}
                        {isSunday && (
                          <span className="text-[7px] text-neutral-600 font-bold uppercase mt-1">Fechado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid de Horários */}
              {selectedDate && (
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selecione o Horário</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS_MOCK.map((time) => {
                      const isBooked = (bookedSlots[selectedDate] || []).includes(time);
                      const isSelected = selectedTime === time;

                      let timeClasses = "border-neutral-855 bg-neutral-950 text-neutral-400 hover:border-neutral-700";
                      if (isSelected) {
                        timeClasses = "border-green-500 bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.15)]";
                      } else if (isBooked) {
                        timeClasses = "border-red-500/15 bg-neutral-950 text-red-500/50 cursor-not-allowed line-through";
                      }

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-2 border rounded-xl text-center text-xs font-bold transition-all duration-200 ${timeClasses}`}
                        >
                          {time}
                          {isBooked && <span className="block text-[7px] text-red-500/60 mt-0.5">Ocupado</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dados Pessoais Obrigatórios */}
            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Seus Dados</h3>
              
              <div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Seu Nome Completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-neutral-500" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Seu Celular / WhatsApp"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Placa do Veículo"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedTime || !selectedDate}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-2xl transition-colors duration-200 flex justify-center items-center gap-2 shadow-lg shadow-green-500/10"
            >
              {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
            </button>
          </form>
        )}

        {/* Passo 3: Tela Final de Sucesso com Atalhos de WhatsApp & Mapa */}
        {step === 3 && (
          <div className="text-center py-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
              <Check size={36} />
            </div>

            <h1 className="text-2xl font-bold text-white">Agendamento Realizado!</h1>
            <p className="text-green-500 text-xs font-semibold tracking-wider uppercase mt-1">Brilho Mágico agradece</p>
            
            <p className="text-neutral-400 text-sm mt-4 px-2 leading-relaxed">
              Tudo pronto! Seu agendamento foi registrado com sucesso.
            </p>

            {/* Como chegar / Localização Google Maps */}
            <div className="mt-8 border-t border-neutral-800 pt-6 w-full text-left">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                📍 Como chegar até nós
              </h3>
              <p className="text-[11px] text-neutral-400 mb-4 leading-relaxed">
                Avenida Florips Crispim, N 644 - Bairro Novo Panorama, Salinas - MG
              </p>
              
              {/* Iframe embutido estilizado em Modo Escuro */}
              <div className="w-full h-40 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 mb-3 shadow-inner">
                <iframe
                  title="Brilho Mágico Localização"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
                  src="https://maps.google.com/maps?q=Avenida%20Florips%20Crispim,%20644%20Novo%20Panorama,%20Salinas%20MG&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Botão de rota direta por aplicativo */}
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Avenida+Florips+Crispim,+644+-+Novo+Panorama,+Salinas+-+MG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center py-3 bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-[11px] font-semibold text-white tracking-wide transition-colors duration-200 gap-1.5"
              >
                🗺️ Abrir Rota no Google Maps (GPS)
              </a>
            </div>

            {/* Links de WhatsApp dos administradores */}
            <div className="mt-8 border-t border-neutral-800 pt-6 w-full text-left">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                💬 Confirmar Agendamento / Contato
              </h3>
              <p className="text-[11px] text-neutral-400 mb-4 leading-relaxed">
                Clique em um dos números abaixo para iniciar a conversa no WhatsApp:
              </p>
              <div className="space-y-3">
                <a
                  href={getWhatsAppMessage('5538999200580')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-2xl text-left transition-all duration-200"
                >
                  <div>
                    <p className="text-xs text-neutral-500">Atendimento Principal</p>
                    <p className="font-bold text-sm text-white mt-0.5">Falar com Claudio</p>
                    <p className="text-[10px] text-green-500 font-semibold uppercase mt-1">Admin</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-600/10 text-green-500 flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                </a>

                <a
                  href={getWhatsAppMessage('5538998853463')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-2xl text-left transition-all duration-200"
                >
                  <div>
                    <p className="text-xs text-neutral-500">Gerência de Operações</p>
                    <p className="font-bold text-sm text-white mt-0.5">Falar com Monaliza</p>
                    <p className="text-[10px] text-green-500 font-semibold uppercase mt-1">Gerente Geral</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-600/10 text-green-500 flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                </a>
              </div>
            </div>

            <button 
              onClick={() => {
                setStep(1);
                setVehicleType(null);
                setSelectedService(null);
                setSelectedDate('');
                setSelectedTime('');
                setCustomerName('');
                setCustomerPhone('');
                setVehiclePlate('');
              }}
              className="mt-8 text-xs text-neutral-500 hover:text-neutral-300 font-medium transition-colors"
            >
              Fazer novo agendamento
            </button>
          </div>
        )}

      </div>

      {/* Footer com Endereço do Lava Rápido */}
      <footer className="mt-6 text-center text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
        <p className="font-semibold text-neutral-400">📍 Endereço:</p>
        <p>Avenida Florips Crispim, N 644 - Bairro Novo Panorama</p>
        <p>Salinas - MG</p>
      </footer>
    </div>
  );
}
