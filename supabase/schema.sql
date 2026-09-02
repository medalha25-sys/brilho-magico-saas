-- Habilita a extensão para gerar UUIDs automaticamente
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Tabela de Tenants (Os Lava-Rápidos cadastrados no seu SaaS)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  cnpj TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1. Tabela de Perfis de Usuários (Extensão do auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'ADMIN', -- 'ADMIN', 'GERENTE', 'LAVADOR'
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Serviços (Tabela de preços customizada de cada Lava-Rápido)
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- 'CARRO' ou 'MOTO'
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Clientes (Base cadastral de clientes)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cpf TEXT,
  vehicle_plate TEXT,
  vehicle_model TEXT,
  notes TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Agendamentos (Onde ocorre a transação/reserva)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_cpf TEXT,
  vehicle_plate TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'CONFIRMADO', 'FINALIZADO', 'CANCELADO'
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Feedbacks & Avaliações dos Clientes
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  comment TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Índices de Busca
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_tenant ON feedbacks(tenant_id);

-- 7. Função de Trigger Blindada para Criação Automática de Usuário
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, tenant_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Administrador'), 
    COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),
    CASE 
      WHEN (new.raw_user_meta_data->>'tenant_id') IS NOT NULL 
           AND (new.raw_user_meta_data->>'tenant_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN (new.raw_user_meta_data->>'tenant_id')::uuid 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role);
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Blindagem total: Garante que a criação do usuário no Supabase Auth NUNCA falhe
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recriação Segura da Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Habilitar RLS com Políticas de Segurança Abertas para Criação de Tenant & Perfil
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Políticas Permissivas para Tenants e Profiles
DROP POLICY IF EXISTS "Permitir leitura publica de tenants por slug" ON tenants;
CREATE POLICY "Permitir leitura publica de tenants por slug" ON tenants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir cadastro de novos tenants" ON tenants;
CREATE POLICY "Permitir cadastro de novos tenants" ON tenants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir donos atualizarem seu tenant" ON tenants;
CREATE POLICY "Permitir donos atualizarem seu tenant" ON tenants FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Permitir leitura de profiles autenticados" ON profiles;
CREATE POLICY "Permitir leitura de profiles autenticados" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir criacao e edicao do proprio profile" ON profiles;
CREATE POLICY "Permitir criacao e edicao do proprio profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas para Serviços, Clientes e Agendamentos
DROP POLICY IF EXISTS "Permitir leitura publica de servicos ativos" ON services;
CREATE POLICY "Permitir leitura publica de servicos ativos" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de servicos" ON services;
CREATE POLICY "Permitir gerenciamento de servicos" ON services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir criacao e leitura de clientes" ON customers;
CREATE POLICY "Permitir criacao e leitura de clientes" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir criacao e leitura de agendamentos" ON appointments;
CREATE POLICY "Permitir criacao e leitura de agendamentos" ON appointments FOR ALL USING (true) WITH CHECK (true);
