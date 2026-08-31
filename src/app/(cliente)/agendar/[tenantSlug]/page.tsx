"use client";

import React, { useState, use } from 'react';
import { Calendar, Car, Bike, Clock, Check } from 'lucide-react';

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

export default function BookingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const [vehicleType, setVehicleType] = useState<'CARRO' | 'MOTO' | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleVehicleSelect = (type: 'CARRO' | 'MOTO') => {
    setVehicleType(type);
    setSelectedService(null); // Reset service when changing vehicle
  };

  const filteredServices = SERVICES_MOCK.filter(s => s.vehicleType === vehicleType);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-neutral-900 rounded-3xl border border-neutral-800 shadow-2xl p-6 sm:p-8">
        
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

        {/* 2. Escolha do Serviço (Exibe apenas após selecionar veículo) */}
        {vehicleType && (
          <section className="mb-8 animate-fadeIn">
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

        {/* Botão de Agendar (Exibe apenas após selecionar serviço) */}
        {selectedService && (
          <button className="w-full bg-green-600 hover:bg-green-500 text-neutral-950 font-bold py-4 rounded-2xl shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-200 flex justify-center items-center gap-2 animate-fadeIn">
            <Calendar size={20} />
            Ver Horários Disponíveis
          </button>
        )}

      </div>
    </div>
  );
}
