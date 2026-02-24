import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function useLogger() {
    const { user, profile } = useAuth();

    const logAction = async (action: string, entityType: string, entityId?: string, details?: any) => {
        if (!user || !profile?.organization_id) return;

        try {
            await supabase.from('activity_logs').insert({
                user_id: user.id,
                organization_id: profile.organization_id,
                action,
                entity_type: entityType,
                entity_id: entityId,
                details: details || {}
            });
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    };

    return { logAction };
}
