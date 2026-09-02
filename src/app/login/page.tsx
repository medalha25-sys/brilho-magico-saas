"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, AlertCircle, Calendar, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

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

      router.push('/admin/dashboard');
    } catch {
      setError("Ocorreu um erro ao tentar fazer login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="/logo.jpg" 
            alt="Brilho Mágico Logo" 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover shadow-lg border-2 border-emerald-500/30"
          />
        </div>
        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
          Brilho Mágico
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Studio Automotivo & Estética Veicular
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* BANNER EM DESTAQUE: CLIENTES NÃO PRECISAM DE LOGIN */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-green-500/10 to-teal-500/15 border-2 border-emerald-500/40 text-center shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase tracking-wide">
            <Sparkles size={16} />
            <span>Você é um Cliente?</span>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-3.5">
            Para agendar a lavagem do seu carro ou moto, <strong>você não precisa de login nem senha</strong>!
          </p>
          <Link
            href="/agendar/brilho-magico"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all active:scale-95"
          >
            <Calendar size={16} />
            <span>Agendar Minha Lavagem Agora</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* ÁREA DE LOGIN DA EQUIPE */}
        <div className="bg-white dark:bg-gray-900 py-6 px-4 sm:px-8 shadow-sm rounded-3xl border border-gray-150 dark:border-gray-800">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Acesso da Equipe</h2>
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              Gestão
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-800 dark:text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                E-mail de Acesso
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm"
                  placeholder="ex: claudio@admin.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                Senha
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-sm text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-98"
              >
                {loading ? 'Acessando...' : 'Entrar no Painel Admin'}
              </button>
            </div>
          </form>

          <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-3">
            <p className="text-[11px] text-center text-gray-400 mb-2">
              Selecione o usuário para preencher o e-mail:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('claudio2017hnd@gmail.com');
                  setPassword('');
                  setError(null);
                  document.getElementById('password')?.focus();
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <span className="font-bold">Claudio Junior</span>
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('monalizarodrigueshnd@gmail.com');
                  setPassword('');
                  setError(null);
                  document.getElementById('password')?.focus();
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <span className="font-bold">Monaliza</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Gerente</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Criado por Kryon Systems */}
      <footer className="mt-8 text-center text-[10px] text-gray-400 dark:text-gray-600 flex flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-1.5">
          <span>Criado por</span>
          <a
            href="https://www.kryonsystems.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-gray-600 dark:text-gray-400 hover:text-emerald-500 tracking-wider transition-colors hover:underline"
          >
            KRYON SYSTEMS
          </a>
        </div>
        <span className="text-[9px] text-gray-400/80 dark:text-gray-700 font-medium">v1.0.0</span>
      </footer>
    </div>
  );
}
