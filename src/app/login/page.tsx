"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push('/admin/dashboard');
      }
    });
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (loginError) {
        setError(loginError.message === "Invalid login credentials" 
          ? "E-mail ou senha incorretos." 
          : loginError.message);
        setLoading(false);
        return;
      }

      window.location.href = '/admin/dashboard';
    } catch {
      setError("Ocorreu um erro ao tentar fazer login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white">
      {/* Manifest específico para o Admin quando instalado a partir do login */}
      <link rel="manifest" href="/manifest-admin.json" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="/logo.jpg" 
            alt="Brilho Mágico Logo" 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover shadow-2xl border-2 border-blue-500/30"
          />
        </div>
        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-black tracking-tight text-white">
          Painel de Gestão
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-gray-400">
          Brilho Mágico • Studio Automotivo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-800">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-500" />
              <h2 className="font-bold text-white text-sm">Acesso Restrito</h2>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/60 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Administração
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-800 rounded-xl bg-gray-950 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  placeholder="seu-email@gestao.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-800 rounded-xl bg-gray-950 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-98"
              >
                {loading ? 'Validando Acesso...' : 'Entrar no Painel'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer Criado por Kryon Systems */}
      <footer className="mt-10 text-center text-[10px] text-gray-600 flex flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-1.5">
          <span>Criado por</span>
          <a
            href="https://www.kryonsystems.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-gray-500 hover:text-blue-400 tracking-wider transition-colors hover:underline"
          >
            KRYON SYSTEMS
          </a>
        </div>
        <span className="text-[9px] text-gray-700 font-medium">v1.0.0</span>
      </footer>
    </div>
  );
}
