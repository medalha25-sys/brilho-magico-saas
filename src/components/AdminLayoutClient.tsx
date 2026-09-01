"use client";

import React, { useState } from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  Car, 
  Users,
  Menu,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Agendamentos', href: '/admin/agendamentos', icon: Calendar },
    { label: 'Clientes', href: '/admin/clientes', icon: Users },
    { label: 'Serviços', href: '/admin/servicos', icon: Car },
    { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
  ];

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

        {/* Botão de Suporte no Rodapé da Sidebar */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex justify-center">
          <a
            href="https://wa.me/5538984257511"
            target="_blank"
            rel="noopener noreferrer"
            title="Suporte: 09h às 18h (Seg a Sex)"
            className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold transition-all ${
              collapsed ? 'p-2 justify-center' : 'w-full justify-center'
            }`}
          >
            <MessageSquare size={13} className="shrink-0 text-green-600 dark:text-green-400" />
            {!collapsed && (
              <span className="text-[11px] font-bold">Suporte (09h às 18h)</span>
            )}
          </a>
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

            {/* Toggle de recolher Sidebar no Desktop (atalho rápido no header) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              <span>{collapsed ? 'Expandir' : 'Recolher'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-4 ml-auto">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {initial}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{userName}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium capitalize">{userRole.toLowerCase()}</span>
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
    </div>
  );
}
