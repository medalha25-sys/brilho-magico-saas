import React from 'react';
import { Calendar, Car, Bike } from 'lucide-react';

export default async function BookingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  // O tenantSlug identifica qual lava-rápido está sendo acessado (ex: /agendar/wash-express)
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            {tenantSlug.replace('-', ' ')}
          </h1>
          <p className="text-gray-500 text-sm">Agende sua lavagem em poucos toques</p>
        </header>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
            1. Qual o seu veículo?
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center p-4 border-2 border-blue-500 bg-blue-50 rounded-xl text-blue-700">
              <Car size={32} className="mb-2" />
              <span className="font-medium">Carro</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 hover:border-blue-500 rounded-xl text-gray-600 transition-colors">
              <Bike size={32} className="mb-2" />
              <span className="font-medium">Moto</span>
            </button>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
            2. Escolha o Serviço
          </h2>
          <div className="space-y-3">
            <div className="p-4 border border-gray-200 rounded-xl flex justify-between items-center hover:border-blue-500 cursor-pointer transition-colors">
              <div>
                <h3 className="font-medium text-gray-900">Ducha Simples</h3>
                <p className="text-sm text-gray-500">Aproximadamente 40 min</p>
              </div>
              <span className="font-bold text-blue-600">R$ 40,00</span>
            </div>
            {/* Mais serviços entrarão aqui */}
          </div>
        </section>

        <button className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex justify-center items-center gap-2">
          <Calendar size={20} />
          Ver Horários Disponíveis
        </button>
      </div>
    </div>
  );
}
