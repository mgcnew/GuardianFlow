import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Notification {
    id: string;
    organization_id: string;
    user_id: string | null;
    title: string;
    content: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'event' | 'resident';
    link: string | null;
    is_read: boolean;
    created_at: string;
    metadata: any;
}

export function useNotifications() {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!profile?.organization_id) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .or(`user_id.eq.${profile.id},user_id.is.null`)
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.is_read).length || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!profile?.organization_id) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('organization_id', profile.organization_id)
                .or(`user_id.eq.${profile.id},user_id.is.null`)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        if (!profile?.organization_id) return;

        // Set up real-time subscription
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `organization_id=eq.${profile.organization_id}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    // Only add if it's for this user or broadcast
                    if (!newNotif.user_id || newNotif.user_id === profile.id) {
                        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
                        setUnreadCount(prev => prev + 1);

                        // Optional: Browser Notification API
                        if (Notification.permission === 'granted') {
                            new Notification(newNotif.title, {
                                body: newNotif.content,
                                icon: '/pwa-192x192.png' // Adjust to project's icon
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
}
