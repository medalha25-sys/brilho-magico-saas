import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AdminLayoutClient from '@/components/AdminLayoutClient';

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
    <AdminLayoutClient
      userName={userName}
      userRole={userRole}
      initial={initial}
    >
      {children}
    </AdminLayoutClient>
  );
}
