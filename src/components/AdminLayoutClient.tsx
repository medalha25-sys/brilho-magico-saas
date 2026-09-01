"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  Car, 
  Users,
  DollarSign,
  Menu,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  X
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminNotificationBell } from '@/components/AdminNotificationBell';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface AdminLayoutClientProps {
  userName: string;
  userRole: string;
  initial: string;
  children: React.ReactNode;
}

export default function AdminLayoutClient({
  userName,
  userRole,
  initial,
  children
}: AdminLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [switchEmail, setSwitchEmail] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Agendamentos', href: '/admin/agendamentos', icon: Calendar },
    { label: 'Clientes', href: '/admin/clientes', icon: Users },
    { label: 'Financeiro', href: '/admin/financeiro', icon: DollarSign },
    { label: 'Serviços', href: '/admin/servicos', icon: Car },
    { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
  ];

  // Função de Sair do Sistema (Logout)
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error("Erro ao sair:", err);
      router.push('/login');
    }
  };

  // Troca rápida para contas padrão da empresa
  const handleQuickSwitch = async (email: string, pass: string) => {
    setSwitchLoading(true);
    setSwitchError(null);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        setSwitchError(error.message);
        setSwitchLoading(false);
        return;
      }

      window.location.href = '/admin/dashboard';
    } catch {
      setSwitchError("Erro ao alternar de usuário.");
      setSwitchLoading(false);
    }
  };

  // Troca personalizada para outro usuário
  const handleCustomSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchLoading(true);
    setSwitchError(null);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email: switchEmail,
        password: switchPassword
      });

      if (error) {
        setSwitchError(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
        setSwitchLoading(false);
        return;
      }

      window.location.href = '/admin/dashboard';
    } catch {
      setSwitchError("Erro ao autenticar novo usuário.");
      setSwitchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200 overflow-x-hidden">
      {/* Overlay para Mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop e Mobile */}
      <aside 
        className={`bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 flex flex-col fixed md:relative inset-y-0 left-0 ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Header da Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src="/logo.jpg" 
              alt="Logo Brilho Mágico" 
              className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-800" 
            />
            {!collapsed && (
              <span className="text-base font-bold text-gray-900 dark:text-white truncate">
                Brilho Mágico
              </span>
            )}
          </div>

          {/* Botão de Fechar no Mobile */}
          <button 
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>

          {/* Botão de Recolher/Expandir no Desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3.5 py-3 text-sm font-semibold rounded-xl transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar: Suporte e Botão de Sair */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 space-y-1">
          {/* Suporte */}
          <a
            href="https://wa.me/5538984257511"
            target="_blank"
            rel="noopener noreferrer"
            title="Suporte: 09h às 18h (Seg a Sex)"
            className={`inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold transition-all ${
              collapsed ? 'p-2 justify-center w-full' : 'w-full justify-center'
            }`}
          >
            <MessageSquare size={13} className="shrink-0 text-green-600 dark:text-green-400" />
            {!collapsed && (
              <span className="text-[11px] font-bold">Suporte (09h às 18h)</span>
            )}
          </a>

          {/* Sair do Sistema */}
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Sair do Sistema" : undefined}
            className={`flex items-center gap-2 py-2 px-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors ${
              collapsed ? 'justify-center w-full' : 'w-full justify-start'
            }`}
          >
            <LogOut size={14} className="shrink-0" />
            {!collapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0 max-w-full">
        {/* Header Superior */}
        <header className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-2">
            {/* Abrir gaveta no Mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Toggle de recolher Sidebar no Desktop */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              <span>{collapsed ? 'Expandir' : 'Recolher'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3.5 ml-auto">
            {/* Central de Notificações com Sirene */}
            <AdminNotificationBell />

            {/* Alternador de Tema Escuro / Claro */}
            <ThemeToggle />

            {/* Menu Dropdown de Perfil & Troca de Usuários */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
                title="Meu Perfil e Troca de Usuário"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {initial}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-tight flex items-center gap-1">
                    {userName}
                    <ChevronDown size={12} className="text-gray-400" />
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium capitalize">
                    {userRole.toLowerCase()}
                  </span>
                </div>
              </button>

              {/* Popover do Usuário */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Cabeçalho do Perfil */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {userName}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-[10px] font-bold mt-0.5">
                          <ShieldCheck size={10} />
                          {userRole === 'ADMIN' ? 'Administrador' : 'Gerente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Trocar de Usuário (Acesso Rápido) */}
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-2 mb-1.5">
                      Trocar de Usuário (Acesso Rápido)
                    </span>

                    {/* Alternar para Claudio Junior */}
                    <button
                      type="button"
                      disabled={switchLoading}
                      onClick={() => handleQuickSwitch('claudio2017hnd@gmail.com', '123456')}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs ${
                        userName.toLowerCase().includes('claudio')
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                          C
                        </div>
                        <div>
                          <p className="font-semibold">Claudio Junior</p>
                          <p className="text-[10px] text-gray-400">Admin</p>
                        </div>
                      </div>
                      {userName.toLowerCase().includes('claudio') && (
                        <UserCheck size={14} className="text-blue-600" />
                      )}
                    </button>

                    {/* Alternar para Monaliza Rodrigues */}
                    <button
                      type="button"
                      disabled={switchLoading}
                      onClick={() => handleQuickSwitch('monalizarodrigueshnd@gmail.com', '123456')}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs ${
                        userName.toLowerCase().includes('monaliza')
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-bold text-[11px] flex items-center justify-center">
                          M
                        </div>
                        <div>
                          <p className="font-semibold">Monaliza Rodrigues</p>
                          <p className="text-[10px] text-gray-400">Gerente</p>
                        </div>
                      </div>
                      {userName.toLowerCase().includes('monaliza') && (
                        <UserCheck size={14} className="text-blue-600" />
                      )}
                    </button>

                    {/* Botão para entrar com outra conta */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setSwitchModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs transition-colors"
                    >
                      <UserPlus size={14} />
                      <span>Entrar com outra conta...</span>
                    </button>
                  </div>

                  {/* Seção: Sair do Sistema */}
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Sair do Sistema (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>

        {/* Footer Criado por Kryon Systems */}
        <footer className="py-3 text-center text-[10px] text-gray-450 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="flex items-center justify-center gap-1.5">
            <span>Criado por</span>
            <a
              href="https://www.kryonsystems.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 tracking-wider transition-colors hover:underline"
            >
              KRYON SYSTEMS
            </a>
          </div>
          <span className="text-[9px] text-gray-400 dark:text-gray-600 font-medium">v1.0.0</span>
        </footer>
      </main>

      {/* Modal de Troca de Usuário (Outra Conta) */}
      {switchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Trocar de Usuário</h3>
                  <p className="text-[11px] text-gray-500">Entre com as credenciais do operador</p>
                </div>
              </div>
              <button 
                onClick={() => setSwitchModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {switchError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{switchError}</span>
              </div>
            )}

            <form onSubmit={handleCustomSwitch} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  E-mail do Usuário
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@brilhomagico.com"
                    value={switchEmail}
                    onChange={(e) => setSwitchEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Senha
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={15} />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSwitchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={switchLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-md shadow-blue-500/20"
                >
                  {switchLoading ? 'Entrando...' : 'Entrar na Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
