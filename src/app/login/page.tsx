"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Car, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message === "Invalid login credentials" 
          ? "E-mail ou senha incorretos." 
          : loginError.message);
        setLoading(false);
        return;
      }

      // Redireciona para o painel se logar com sucesso
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError("Ocorreu um erro ao tentar fazer login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="/logo.jpg" 
            alt="Brilho Mágico Logo" 
            className="w-32 h-32 rounded-2xl object-cover shadow-md border border-gray-200 dark:border-gray-800"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Brilho Mágico
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Studio Automotivo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-950 py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100 dark:border-gray-800">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="ex: claudio@admin.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
              Entrar como (Atalho):
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmail('claudio2017hnd@gmail.com');
                  setPassword('');
                  setError(null);
                  document.getElementById('password')?.focus();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <span>Claudio Junior</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase mt-0.5">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('monalizarodrigueshnd@gmail.com');
                  setPassword('');
                  setError(null);
                  document.getElementById('password')?.focus();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <span>Monaliza</span>
                <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold uppercase mt-0.5">Gerente Geral</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-505 mt-3">
              Senha padrão de teste: 123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
