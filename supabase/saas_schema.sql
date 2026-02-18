-- Database schema update for SaaS functionality

-- Plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price_monthly numeric NOT NULL,
    max_children integer,
    max_users integer,
    features jsonb DEFAULT '[]',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Active subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    plan_id uuid REFERENCES public.plans(id) NOT NULL,
    status text CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')) DEFAULT 'trialing',
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is saas_admin
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'saas_admin'
  );
$$;

-- Policies for plans (publicly readable, only saas_admin can modify)
CREATE POLICY "Public can view plans." ON public.plans
    FOR SELECT USING (true);

CREATE POLICY "Only saas_admin can modify plans." ON public.plans
    FOR ALL USING (public.is_saas_admin());

-- Policies for subscriptions
CREATE POLICY "Orgs can view their own subscription." ON public.subscriptions
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR public.is_saas_admin());

CREATE POLICY "Only saas_admin can manage subscriptions." ON public.subscriptions
    FOR ALL USING (public.is_saas_admin());

-- Update existing table policies to allow saas_admin total visibility
-- Organizations
DROP POLICY IF EXISTS "Users can view their own organization." ON public.organizations;
CREATE POLICY "Users can view their own organization or saas_admin see all." ON public.organizations
    FOR SELECT USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR public.is_saas_admin());

-- Children
DROP POLICY IF EXISTS "Users can view children in their organization." ON public.children;
CREATE POLICY "Users view children in their org or saas_admin see all." ON public.children
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR public.is_saas_admin());

-- Profiles
DROP POLICY IF EXISTS "Users can view profiles in their organization." ON public.profiles;
CREATE POLICY "Users view profiles in their org or saas_admin see all." ON public.profiles
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR public.is_saas_admin());

-- Seed initial plans
INSERT INTO public.plans (name, description, price_monthly, max_children, max_users, features)
VALUES 
('Grátis', 'Ideal para pequenas unidades em início.', 0, 10, 3, '["Gestão Básica", "Relatórios Simples"]'),
('Profissional', 'Para abrigos em crescimento.', 199.90, 50, 15, '["Gestão Completa", "Upload de Fotos", "Prontuário Digital"]'),
('Enterprise', 'Sem limites para sua organização.', 499.90, NULL, NULL, '["Suporte 24/7", "Customização Individual", "Backup em Tempo Real"]')
ON CONFLICT DO NOTHING;
