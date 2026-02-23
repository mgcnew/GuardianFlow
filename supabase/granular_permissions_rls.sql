-- ==============================================================================
-- GRANULAR PERMISSIONS RLS POLICIES
-- Objective: Implement fine-grained access control based on the role_permissions table.
-- ==============================================================================

-- 1. Helper function to check if the user is SaaS Admin (if not already defined)
-- Note: has_permission already handles this, but some policies might want direct check.

-- 2. Update has_permission to be even more robust (ensure it handles roles correctly)
CREATE OR REPLACE FUNCTION public.has_permission(p_module text, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_user_role text;
    v_user_org_id UUID;
    v_is_enabled boolean;
BEGIN
    -- Use helper functions to break infinite recursion if called from profile policies
    v_user_role := public.get_my_role();
    v_user_org_id := public.get_auth_org_id();

    -- SaaS Admin and Org Admins/Admins have full bypass for actions
    IF v_user_role IN ('saas_admin', 'org_admin', 'admin') THEN
        RETURN true;
    END IF;

    -- Check specific permission in the role_permissions table
    SELECT enabled INTO v_is_enabled
    FROM public.role_permissions
    WHERE organization_id = v_user_org_id
      AND role = v_user_role
      AND module = p_module
      AND action = p_action;

    RETURN COALESCE(v_is_enabled, false);
END;
$function$;

-- 3. APPLY POLICIES TO TABLES

-- ------------------------------------------------------------------------------
-- CHILDREN
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "children_select_policy" ON public.children;
CREATE POLICY "children_select_policy" ON public.children
    FOR SELECT USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
        AND public.has_permission('children', 'view')
    );

DROP POLICY IF EXISTS "children_insert_policy" ON public.children;
CREATE POLICY "children_insert_policy" ON public.children
    FOR INSERT WITH CHECK (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
        AND public.has_permission('children', 'create')
    );

DROP POLICY IF EXISTS "children_update_policy" ON public.children;
CREATE POLICY "children_update_policy" ON public.children
    FOR UPDATE USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
        AND public.has_permission('children', 'edit')
    );

DROP POLICY IF EXISTS "children_delete_policy" ON public.children;
CREATE POLICY "children_delete_policy" ON public.children
    FOR DELETE USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
        AND public.has_permission('children', 'delete')
    );

-- ------------------------------------------------------------------------------
-- LOGS (Shift / Health / General)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view logs in their organization." ON public.logs;
CREATE POLICY "logs_select_policy" ON public.logs
    FOR SELECT USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
        AND (
            (category = 'health' AND public.has_permission('health', 'view')) OR
            (category != 'health' AND public.has_permission('logbook', 'view')) OR
            public.has_permission('children', 'view') -- Fallback
        )
    );

-- ------------------------------------------------------------------------------
-- CHILD ENTRIES (Technical notes: Psych, Pedagogy, Social Work)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view child_entries in their org." ON public.child_entries;
CREATE POLICY "child_entries_select_policy" ON public.child_entries
    FOR SELECT USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
        AND (
            (type = 'psychological' AND public.has_permission('psychology', 'view')) OR
            (type = 'pedagogical' AND public.has_permission('pedagogy', 'view')) OR
            (type = 'social_work' AND public.has_permission('social', 'view')) OR
            (type = 'diary' AND public.has_permission('logbook', 'view'))
        )
    );

-- ------------------------------------------------------------------------------
-- FINANCIAL TRANSACTIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view financial transactions in their organization." ON public.financial_transactions;
CREATE POLICY "financial_select_policy" ON public.financial_transactions
    FOR SELECT USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
        AND public.has_permission('finance', 'view')
    );

-- ------------------------------------------------------------------------------
-- INVENTORY
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view inventory in their organization." ON public.inventory_items;
CREATE POLICY "inventory_select_policy" ON public.inventory_items
    FOR SELECT USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
        AND public.has_permission('inventory', 'view')
    );

-- ------------------------------------------------------------------------------
-- MAINTENANCE / OPERATIONAL
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view maintenance tasks in their organization." ON public.maintenance_tasks;
CREATE POLICY "operational_select_policy" ON public.maintenance_tasks
    FOR SELECT USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
        AND public.has_permission('operational', 'view')
    );

-- ------------------------------------------------------------------------------
-- CALENDAR / AGENDA
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view calendar events in their organization." ON public.calendar_events;
CREATE POLICY "agenda_select_policy" ON public.calendar_events
    FOR SELECT USING (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
        AND public.has_permission('agenda', 'view')
    );

-- ==============================================================================
-- DEFAULT PERMISSIONS SEEDING FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_permissions(p_org_id UUID)
 RETURNS void
 LANGUAGE plpgsql
 AS $$
 BEGIN
    -- EDUCATORS
    INSERT INTO public.role_permissions (organization_id, role, module, action, enabled)
    VALUES 
        (p_org_id, 'educator', 'children', 'view', true),
        (p_org_id, 'educator', 'logbook', 'view', true),
        (p_org_id, 'educator', 'logbook', 'create', true),
        (p_org_id, 'educator', 'agenda', 'view', true),
        (p_org_id, 'educator', 'health', 'view', true),
        (p_org_id, 'educator', 'health', 'administer', true)
    ON CONFLICT (organization_id, role, module, action) DO NOTHING;

    -- PEDAGOGUES
    INSERT INTO public.role_permissions (organization_id, role, module, action, enabled)
    VALUES 
        (p_org_id, 'pedagogue', 'children', 'view', true),
        (p_org_id, 'pedagogue', 'pedagogy', 'view', true),
        (p_org_id, 'pedagogue', 'pedagogy', 'create', true),
        (p_org_id, 'pedagogue', 'agenda', 'view', true),
        (p_org_id, 'pedagogue', 'agenda', 'create', true)
    ON CONFLICT (organization_id, role, module, action) DO NOTHING;

    -- TECHNICIANS (Psychologists / Social Workers)
    INSERT INTO public.role_permissions (organization_id, role, module, action, enabled)
    VALUES 
        (p_org_id, 'technician', 'children', 'view', true),
        (p_org_id, 'technician', 'psychology', 'view', true),
        (p_org_id, 'technician', 'psychology', 'create', true),
        (p_org_id, 'technician', 'social', 'view', true),
        (p_org_id, 'technician', 'social', 'create', true),
        (p_org_id, 'technician', 'agenda', 'view', true),
        (p_org_id, 'technician', 'agenda', 'create', true)
    ON CONFLICT (organization_id, role, module, action) DO NOTHING;

    -- OPERATIONAL
    INSERT INTO public.role_permissions (organization_id, role, module, action, enabled)
    VALUES 
        (p_org_id, 'operational', 'operational', 'view', true),
        (p_org_id, 'operational', 'operational', 'manage', true),
        (p_org_id, 'operational', 'inventory', 'view', true)
    ON CONFLICT (organization_id, role, module, action) DO NOTHING;
 END;
 $$;

-- 4. PROFILES (Fixing infinite recursion)
DROP POLICY IF EXISTS "profiles_select_org" ON public.profiles;
CREATE POLICY "profiles_select_org" ON public.profiles
    FOR SELECT USING (
        organization_id = public.get_auth_org_id() 
        OR 
        public.get_my_role() = 'saas_admin'
        OR
        id = auth.uid()
    );

