-- Operacional / Manutenção

-- Tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    task_type text CHECK (task_type IN ('preventive', 'corrective')) NOT NULL,
    status text CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    location text,
    scheduled_date timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    assigned_to uuid REFERENCES public.profiles(id),
    materials_used jsonb DEFAULT '[]', -- Array format: [{"item_id": "...", "name": "...", "quantity": 1}]
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Task photos
CREATE TABLE IF NOT EXISTS public.maintenance_photos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE NOT NULL,
    photo_url text NOT NULL,
    photo_type text CHECK (photo_type IN ('before', 'after')) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_photos ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_tasks
CREATE POLICY "Users can view maintenance tasks in their organization." ON public.maintenance_tasks
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR public.is_saas_admin());

CREATE POLICY "Users can insert maintenance tasks in their organization." ON public.maintenance_tasks
    FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update maintenance tasks in their organization." ON public.maintenance_tasks
    FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for maintenance_photos
CREATE POLICY "Users can view maintenance photos in their organization." ON public.maintenance_photos
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.maintenance_tasks t
        WHERE t.id = maintenance_photos.task_id
        AND t.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    ) OR public.is_saas_admin());

CREATE POLICY "Users can insert maintenance photos in their organization." ON public.maintenance_photos
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.maintenance_tasks t
        WHERE t.id = maintenance_photos.task_id
        AND t.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    ));

-- Create storage bucket for maintenance photos
-- This may fail if already exists or permissions, but good to have
-- insert into storage.buckets (id, name, public) values ('maintenance-photos', 'maintenance-photos', true) on conflict (id) do nothing;
