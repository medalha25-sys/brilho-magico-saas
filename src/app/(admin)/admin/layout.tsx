import React from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  Car, 
  Menu,
  MessageSquare
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Se não estiver logado, manda para a tela de login
  if (!user) {
    redirect('/login');
  }

  // Busca as informações do perfil (nome e cargo)
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single();

  const userName = profile?.name || 'Funcionário';
  const userRole = profile?.role || 'GERENTE';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <img src="/logo.jpg" alt="Logo Brilho Mágico" className="w-8 h-8 rounded-lg object-cover mr-2 border border-gray-100 dark:border-gray-800" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">Brilho Mágico</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/dashboard" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:text-blue-700 dark:focus:text-blue-400">
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Dashboard
          </Link>
          <Link href="/admin/agendamentos" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:text-blue-700 dark:focus:text-blue-400">
            <Calendar className="mr-3 h-5 w-5" />
            Agendamentos
          </Link>
          <Link href="/admin/servicos" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:text-blue-700 dark:focus:text-blue-400">
            <Car className="mr-3 h-5 w-5" />
            Serviços
          </Link>
          <Link href="/admin/configuracoes" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:text-blue-700 dark:focus:text-blue-400">
            <Settings className="mr-3 h-5 w-5" />
            Configurações
          </Link>
        </nav>
        
        {/* Botão de Suporte no rodapé da Sidebar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <a
            href="https://wa.me/5538984257511"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors text-left"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400">
              <MessageSquare size={13} className="shrink-0" /> Suporte WhatsApp
            </span>
            <span className="text-[9px] text-gray-450 dark:text-gray-500 font-semibold leading-tight">
              09h às 18h (Seg a Sex)
            </span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center md:hidden">
            <Menu className="h-6 w-6 text-gray-500 dark:text-gray-400" />
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
