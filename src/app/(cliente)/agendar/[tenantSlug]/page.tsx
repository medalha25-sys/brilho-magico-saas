"use client";

import React, { useState, use } from 'react';
import { Calendar, Car, Bike, Clock, Check, User, Phone, Tag, MessageSquare, ArrowLeft } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  vehicleType: 'CARRO' | 'MOTO';
}

const SERVICES_MOCK: Service[] = [
  { id: '1', name: 'Ducha Simples', price: 40.00, duration: 40, vehicleType: 'CARRO' },
  { id: '2', name: 'Lavagem Completa', price: 80.00, duration: 60, vehicleType: 'CARRO' },
  { id: '3', name: 'Higienização Interna', price: 150.00, duration: 120, vehicleType: 'CARRO' },
  { id: '4', name: 'Ducha Simples', price: 30.00, duration: 30, vehicleType: 'MOTO' },
  { id: '5', name: 'Lavagem Completa', price: 50.00, duration: 50, vehicleType: 'MOTO' },
];

const TIME_SLOTS_MOCK = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];

export default function BookingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !customerName || !customerPhone) return;

    setLoading(true);
    // Simula salvamento no banco de dados por 1.5s
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1500);
  };

  const filteredServices = SERVICES_MOCK.filter(s => s.vehicleType === vehicleType);

  // Formata o texto para enviar no WhatsApp
  const getWhatsAppMessage = (num: string) => {
    const text = `Olá! Gostaria de confirmar meu agendamento na Brilho Mágico.
    
*Detalhes do Agendamento:*
- *Cliente:* ${customerName}
- *Veículo:* ${vehicleType === 'CARRO' ? 'Carro' : 'Moto'} (${vehiclePlate || 'Não informada'})
- *Serviço:* ${selectedService?.name}
- *Data/Hora:* ${selectedDate} às ${selectedTime}
- *Valor:* R$ ${selectedService?.price.toFixed(2)}`;

    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };

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

        {/* Passo 2: Formulário de Detalhes e Horário */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <header className="flex items-center gap-4 mb-6">
              <button 
                type="button"
                onClick={handleBackStep}
                className="p-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Quase lá!</h1>
                <p className="text-xs text-neutral-400">Complete as informações para agendar</p>
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

            {/* Data e Hora */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selecione o Dia</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selecione o Horário</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS_MOCK.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-3 border rounded-xl text-center text-xs font-semibold transition-all ${
                        selectedTime === time
                          ? 'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dados Pessoais */}
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
                    placeholder="Placa do Veículo (Opcional)"
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
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-2xl transition-colors duration-200 flex justify-center items-center gap-2"
            >
              {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
            </button>
          </form>
        )}

        {/* Passo 3: Tela Final de Sucesso com Atalhos de WhatsApp */}
        {step === 3 && (
          <div className="text-center py-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
              <Check size={36} />
            </div>

            <h1 className="text-2xl font-bold text-white">Agendamento Realizado!</h1>
            <p className="text-green-500 text-xs font-semibold tracking-wider uppercase mt-1">Brilho Mágico agradece</p>
            
            <p className="text-neutral-400 text-sm mt-4 px-2 leading-relaxed">
              Tudo pronto! Seu agendamento foi registrado com sucesso. 
              Para confirmar ou tirar dúvidas, clique em um dos números abaixo para iniciar a conversa no WhatsApp:
            </p>

            {/* Links de WhatsApp dos administradores */}
            <div className="mt-8 space-y-3 w-full">
              <a
                href={getWhatsAppMessage('5538999200580')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-2xl text-left transition-all duration-200"
              >
                <div>
                  <p className="text-xs text-neutral-500">Atendimento Principal</p>
                  <p className="font-bold text-sm text-white">Falar com Claudio</p>
                  <p className="text-[10px] text-green-500 font-semibold uppercase mt-0.5">Admin</p>
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
                  <p className="font-bold text-sm text-white">Falar com Monaliza</p>
                  <p className="text-[10px] text-green-500 font-semibold uppercase mt-0.5">Gerente Geral</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-600/10 text-green-500 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
              </a>
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
              className="mt-8 text-sm text-neutral-500 hover:text-neutral-300 font-medium transition-colors"
            >
              Fazer novo agendamento
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
