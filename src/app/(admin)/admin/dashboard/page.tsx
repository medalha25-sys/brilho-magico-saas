import React from 'react';
import { Calendar, DollarSign, Users, Clock } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Acompanhe os resultados do seu lava-rápido hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Agendados Hoje</h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">12</p>
          <span className="text-green-500 text-sm font-medium">+3 desde ontem</span>
        </div>
        
        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Faturamento Hoje</h3>
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg"><DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ 580</p>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Estimado</span>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Novos Clientes</h3>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg"><Users className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">4</p>
          <span className="text-green-500 text-sm font-medium">+2 esta semana</span>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Tempo Médio</h3>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg"><Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">45m</p>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Por lavagem</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Próximos Agendamentos</h2>
          <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Veículo / Placa</th>
                <th className="px-6 py-3 font-medium">Serviço</th>
                <th className="px-6 py-3 font-medium">Horário</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 dark:text-gray-200">Carlos Silva</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">(11) 98765-4321</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900 dark:text-gray-200">Honda Civic</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">ABC-1234</p>
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Lavagem Completa</td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">14:00</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-900">
                    Pendente
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 dark:text-gray-200">Mariana Costa</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">(11) 91234-5678</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900 dark:text-gray-200">Yamaha NMAX</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">XYZ-9876</p>
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">Ducha Simples</td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">15:30</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-500 rounded-full text-xs font-medium border border-green-200 dark:border-green-900">
                    Confirmado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
