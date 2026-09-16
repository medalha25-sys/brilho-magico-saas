"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';

export default function RecuperarSenhaPage() {
  const supabase = createClient();

  // Estados da interface
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Escuta eventos de autenticação do Supabase (evento PASSWORD_RECOVERY)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true);
        setError(null);
      }
    });

    // 2. Verifica se a URL contém parâmetros de recuperação no hash ou query
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token')) {
        setIsResetMode(true);
      }
    }

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // ESTADO A: Solicitação de envio do link de recuperação
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Por favor, informe seu e-mail cadastrado.");
      setLoading(false);
      return;
    }

    try {
      const origin = typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://brilho-magico-saas.vercel.app';
      const redirectTo = `${origin}/recuperar-senha`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetError) {
        // Bloqueio por falta de provedor SMTP em ambiente de teste é tratado sem quebra de UX
      }

      // Proteção contra enumeração: Mensagem neutra padronizada
      setSuccessMessage("Se o e-mail informado estiver cadastrado, você receberá um link seguro para redefinição de senha em instantes. Verifique também a pasta de spam.");
    } catch {
      setSuccessMessage("Se o e-mail informado estiver cadastrado, você receberá um link seguro para redefinição de senha em instantes. Verifique também a pasta de spam.");
    } finally {
      setLoading(false);
    }
  };

  // ESTADO B: Definição da nova senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas digitadas não coincidem. Por favor, confirme a mesma senha.");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message === "Auth session missing!"
          ? "O link de recuperação expirou ou é inválido. Por favor, solicite um novo link de redefinição."
          : updateError.message);
        setLoading(false);
        return;
      }

      setSuccessMessage("Senha atualizada com sucesso! Você já pode entrar com sua nova senha.");
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError("Ocorreu um erro ao atualizar sua senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="/logo.jpg" 
            alt="Logo" 
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-2xl border-2 border-blue-500/30"
          />
        </div>
        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-black tracking-tight text-white">
          {isResetMode ? "Definir Nova Senha" : "Recuperar Acesso"}
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-gray-400">
          {isResetMode 
            ? "Crie uma nova senha segura para acessar seu painel" 
            : "Informe seu e-mail para receber as instruções de redefinição"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-gray-800">
          
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-500" />
              <h2 className="font-bold text-white text-sm">
                {isResetMode ? "Redefinição de Senha" : "Recuperação Segura"}
              </h2>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/60 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Autenticação
            </span>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="mb-4 bg-red-950/50 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {successMessage && (
            <div className="mb-4 bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-emerald-300 font-medium">
                <p>{successMessage}</p>
                {isResetMode && (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    Ir para o Login <ArrowLeft size={12} className="rotate-180" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ESTADO A: Formulário de Solicitação de E-mail */}
          {!isResetMode && !successMessage && (
            <form className="space-y-4" onSubmit={handleRequestRecovery}>
              <div>
                <label htmlFor="recovery-email" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  E-mail da Conta
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="recovery-email"
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-98"
                >
                  {loading ? 'Enviando instruções...' : 'Enviar Instruções de Recuperação'}
                </button>
              </div>
            </form>
          )}

          {/* ESTADO B: Formulário de Definição de Nova Senha */}
          {isResetMode && !successMessage && (
            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              <div>
                <label htmlFor="new-password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="new-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-800 rounded-xl bg-gray-950 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                    placeholder="Nova senha segura"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-800 rounded-xl bg-gray-950 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-98"
                >
                  {loading ? 'Salvando nova senha...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          )}

          {/* Botão de Retorno para Login */}
          <div className="mt-6 pt-4 border-t border-gray-800 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Voltar para a tela de login
            </Link>
          </div>

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
