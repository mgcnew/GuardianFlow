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

    const fetchProfile = async (userId: string) => {
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            if (profileData) {
                setProfile(profileData);

                if (profileData.organization_id) {
                    const { data: orgData, error: orgError } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', profileData.organization_id)
                        .single();

                    if (!orgError && orgData) {
                        setOrganization(orgData);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching profile/org:', error);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
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
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export type { Role, Profile };
