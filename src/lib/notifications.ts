import { supabase } from './supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'event' | 'resident';

interface CreateNotificationParams {
    organization_id: string;
    user_id?: string | null;
    title: string;
    content: string;
    type: NotificationType;
    link?: string;
    metadata?: any;
}

export async function createNotification({
    organization_id,
    user_id = null,
    title,
    content,
    type = 'info',
    link,
    metadata = {}
}: CreateNotificationParams) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                organization_id,
                user_id,
                title,
                content,
                type,
                link,
                metadata
            });

        if (error) throw error;
    } catch (err) {
        console.error('Error creating notification:', err);
    }
}
