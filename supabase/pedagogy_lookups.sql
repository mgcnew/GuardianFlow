-- Migration to add lookup tables for pedagogy personalization
CREATE TABLE IF NOT EXISTS public.pedagogy_lookup_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'subject', 'extracurricular_category', 'meeting_type'
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, type, value)
);

-- RLS for lookup tables
ALTER TABLE public.pedagogy_lookup_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pedagogy lookup values for their organization"
    ON public.pedagogy_lookup_values FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "SaaS Admins and Pedagogues can manage lookup values"
    ON public.pedagogy_lookup_values FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Insert some default values for a quick start
-- (Optional: would need organization_id, so better to do it via app logic or a trigger on organization creation)
