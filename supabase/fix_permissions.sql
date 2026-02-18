-- ==============================================================================
-- SAAS PERMISSION FIX
-- Objective: Ensure saas_admin ONLY manages organizations/subscriptions
-- but CANNOT see internal data (children, logs, profiles) of other organizations.
-- ==============================================================================

-- 1. Remove the "or saas_admin see all" policies from internal tables
DROP POLICY IF EXISTS "Users view children in their org or saas_admin see all." ON public.children;
DROP POLICY IF EXISTS "Users view profiles in their org or saas_admin see all." ON public.profiles;

-- 1.5 Fix Foreign Key for easier frontend joins (logs -> profiles)
-- This allows .select('*, profiles(full_name)') to work
ALTER TABLE public.logs 
DROP CONSTRAINT IF EXISTS logs_staff_id_fkey,
ADD CONSTRAINT logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id);

-- 2. Restore strict organization isolation for Children
CREATE POLICY "Users can view children in their organization." ON public.children
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- 3. Restore strict organization isolation for Profiles
CREATE POLICY "Users can view profiles in their organization." ON public.profiles
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- 4. Ensure Logs show only own organization (no saas_admin bypass)
DROP POLICY IF EXISTS "Users can view logs in their organization." ON public.logs;
CREATE POLICY "Users can view logs in their organization." ON public.logs
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- 5. Organizations Table: saas_admin STILL NEEDS TO SEE ALL ORGS (to list them in Admin Panel)
-- This policy stays as is (or ensures it exists correctly)
DROP POLICY IF EXISTS "Users can view their own organization or saas_admin see all." ON public.organizations;
CREATE POLICY "Users view own org or saas_admin see all." ON public.organizations
    FOR SELECT USING (
        id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
        OR 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin'
    );
