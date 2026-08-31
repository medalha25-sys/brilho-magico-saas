-- Habilita a extensão para gerar UUIDs automaticamente (caso não esteja ativa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Tabela de Perfis de Usuários (Extensão do auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'GERENTE', -- 'ADMIN' ou 'GERENTE'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1. Tabela de Tenants (Os Lava-Rápidos cadastrados no seu SaaS)
CREATE TABLE tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id), -- Vincula ao usuário autenticado no Supabase
  slug TEXT UNIQUE NOT NULL, -- Usado na URL pública (ex: 'wash-express')
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Serviços (Tabela de preços customizada de cada Lava-Rápido)
CREATE TABLE services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- Ex: 'Ducha Simples', 'Higienização Interna'
  vehicle_type TEXT NOT NULL, -- 'CARRO' ou 'MOTO'
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL, -- Essencial para bloquear a agenda corretamente
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Agendamentos (Onde ocorre a transação/reserva)
CREATE TABLE appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  vehicle_plate TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'NA_FILA', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'
  total_price DECIMAL(10,2) NOT NULL, -- Salvar o preço no momento do agendamento evita que mudanças futuras na tabela de serviços alterem o histórico financeiro
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Criação de Índices para otimizar as buscas no banco
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_at);

-- 5. Função Triggers para Auto-criar Profile ao Registrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'GERENTE'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
