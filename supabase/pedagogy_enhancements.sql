-- Migração para Melhorias Pedagógicas
-- Copie e cole este código no SQL Editor do seu projeto Supabase

-- Academic reports (boletim)
CREATE TABLE IF NOT EXISTS public.school_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    child_id uuid REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    subject text NOT NULL,
    period text NOT NULL, -- e.g., '1º Bimestre', '2º Bimestre'
    grade numeric NOT NULL,
    year integer NOT NULL,
    frequency numeric, -- percentage
    teacher_name text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- School meetings
CREATE TABLE IF NOT EXISTS public.school_meetings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    child_id uuid REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES public.profiles(id) NOT NULL,
    meeting_date timestamp with time zone NOT NULL,
    participants text,
    summary text NOT NULL,
    decisions text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Extracurricular activities
CREATE TABLE IF NOT EXISTS public.extracurricular_activities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    child_id uuid REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    category text CHECK (category IN ('esporte', 'arte', 'musica', 'informatica', 'idiomas', 'outro')) NOT NULL,
    schedule text, -- e.g., 'Segundas e Quartas 14:00'
    status text CHECK (status IN ('active', 'completed', 'dropped')) DEFAULT 'active',
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.school_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurricular_activities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view school_reports in their org." ON public.school_reports
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin');

CREATE POLICY "Users insert school_reports in their org." ON public.school_reports
    FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users view school_meetings in their org." ON public.school_meetings
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin');

CREATE POLICY "Users insert school_meetings in their org." ON public.school_meetings
    FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users view extracurricular in their org." ON public.extracurricular_activities
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin');

CREATE POLICY "Users insert extracurricular in their org." ON public.extracurricular_activities
    FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
