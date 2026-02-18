import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Role = 'saas_admin' | 'admin' | 'technical' | 'educator' | 'operational' | 'pedagogue' | 'technician' | 'org_admin';

interface Profile extends Omit<Database['public']['Tables']['profiles']['Row'], 'role'> {
    role: Role;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    organization: Database['public']['Tables']['organizations']['Row'] | null;
    loading: boolean;
    signOut: () => Promise<void>;
    hasRole: (roles: Role[]) => boolean;
    switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    organization: null,
    loading: true,
    signOut: async () => { },
    hasRole: () => false,
    switchRole: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [organization, setOrganization] = useState<Database['public']['Tables']['organizations']['Row'] | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string, email?: string) => {
        // Set a provisional profile immediately if we don't have one
        // so the UI can unblock right away
        setProfile(prev => prev || ({
            id: userId,
            full_name: email?.split('@')[0] || 'Usuário',
            role: 'operational' as Role, // Fallback role
            organization_id: null,
            created_at: new Date().toISOString()
        } as Profile));

        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!profileError && profileData) {
                setProfile(profileData as Profile);
                if (profileData.organization_id) {
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', profileData.organization_id)
                        .single();
                    if (orgData) setOrganization(orgData);
                }
            }
        } catch (error) {
            console.error('Background profile fetch error:', error);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (mounted) {
                    if (initialSession?.user) {
                        setSession(initialSession);
                        setUser(initialSession.user);
                        // Start fetching in background, don't necessarily await if we want speed
                        fetchProfile(initialSession.user.id, initialSession.user.email);
                    } else {
                        setUser(null);
                        setSession(null);
                        setProfile(null);
                        setOrganization(null);
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (!mounted) return;

            if (_event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setProfile(null);
                setOrganization(null);
                setLoading(false);
            } else if (newSession?.user) {
                setSession(newSession);
                setUser(newSession.user);
                fetchProfile(newSession.user.id, newSession.user.email);
                setLoading(false);
            } else {
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const hasRole = (roles: Role[]) => {
        if (!profile) return false;
        // Map DB roles to frontend logic if necessary, or just use raw strings
        // Here we can simply check if the user's role is in the allowed list
        // We might want to normalize 'technician' -> 'technical' if logic depends on it
        // Or just allow both
        return roles.includes(profile.role);
    };

    const switchRole = (newRole: Role) => {
        if (profile) {
            setProfile({ ...profile, role: newRole });
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, organization, loading, signOut, hasRole, switchRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export type { Role, Profile };
