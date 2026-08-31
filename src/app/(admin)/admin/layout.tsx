import React from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  Car, 
  Menu
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
            <div className="flex flex-col text-left hidden sm:block">
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
        <footer className="py-3 text-center text-[10px] text-gray-450 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-center gap-1.5 shrink-0">
          <span>Criado por</span>
          <span className="font-bold text-gray-600 dark:text-gray-400 tracking-wider">KRYON SYSTEMS</span>
        </footer>
      </main>
    </div>
  );
}
