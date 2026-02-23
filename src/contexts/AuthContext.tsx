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
    permissions: Record<string, boolean>;
    loading: boolean;
    signOut: () => Promise<void>;
    hasRole: (roles: Role[]) => boolean;
    canAccess: (module: string, action: string) => boolean;
    refreshOrganization: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    organization: null,
    permissions: {},
    loading: true,
    signOut: async () => { },
    hasRole: () => false,
    canAccess: () => false,
    refreshOrganization: async () => { },
    refreshProfile: async () => { },
    refreshPermissions: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [organization, setOrganization] = useState<Database['public']['Tables']['organizations']['Row'] | null>(null);
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string, email?: string) => {
        let profileFetched = false;
        try {
            console.log('[Auth] Fetching profile data for:', userId);

            // Fetch profile with timeout
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile timeout')), 4000)
            );

            const result = await Promise.race([profilePromise, timeoutPromise]) as any;

            if (result.error) throw result.error;
            const profileData = result.data;
            if (!profileData) throw new Error('Profile not found');

            const currentProfile = profileData as Profile;
            setProfile(currentProfile);
            profileFetched = true;

            // Persistent Cache for the profile
            localStorage.setItem(`profile_${userId}`, JSON.stringify(currentProfile));
            console.log('[Auth] Profile loaded and cached:', currentProfile.role);

            // Fetch Organization and Permissions in parallel
            if (currentProfile.organization_id) {
                const orgPromise = supabase.from('organizations').select('*').eq('id', currentProfile.organization_id).single();
                const permPromise = supabase.from('role_permissions')
                    .select('module, action, enabled')
                    .eq('organization_id', currentProfile.organization_id)
                    .eq('role', currentProfile.role);

                const [orgResult, permResult] = await Promise.all([
                    Promise.race([orgPromise, new Promise(r => setTimeout(() => r({ data: null }), 3000))]) as any,
                    Promise.race([permPromise, new Promise(r => setTimeout(() => r({ data: null }), 3000))]) as any
                ]);

                if (orgResult?.data) setOrganization(orgResult.data);

                if (permResult?.data) {
                    const permMap: Record<string, boolean> = {};
                    permResult.data.forEach((p: any) => {
                        permMap[`${p.module}:${p.action}`] = p.enabled;
                    });
                    setPermissions(permMap);
                    localStorage.setItem(`perms_${userId}`, JSON.stringify(permMap));
                    console.log('[Auth] All data loaded successfully');
                }
            }
        } catch (error: any) {
            console.error('[Auth] Data fetch failed:', error.message);

            // Try cache fallback for permissions
            const cachedPerms = localStorage.getItem(`perms_${userId}`);
            if (cachedPerms) {
                try {
                    setPermissions(JSON.parse(cachedPerms));
                    console.log('[Auth] Loaded permissions from cache fallback');
                } catch (e) { /* ignore */ }
            }

            // DO NOT use fallback if we already have a profile or a cached one
            const cachedProfile = localStorage.getItem(`profile_${userId}`);
            if (!profileFetched && !profile && !cachedProfile) {
                console.log('[Auth] Using default fallback profile (No cache found)');
                setProfile({
                    id: userId,
                    full_name: email?.split('@')[0] || 'Usuário',
                    role: 'operational',
                    organization_id: null,
                    created_at: new Date().toISOString()
                } as Profile);
            } else if (cachedProfile && !profile) {
                try {
                    setProfile(JSON.parse(cachedProfile));
                    console.log('[Auth] Restored profile from cache due to fetch failure');
                } catch (e) { /* ignore */ }
            }
        }
    };

    const lastSessionId = React.useRef<string | null>(null);


    useEffect(() => {
        let mounted = true;

        const handleAuthChange = async (newSession: Session | null) => {
            if (!mounted) return;

            const sessionId = newSession?.access_token || 'unsigned-out';
            if (sessionId === lastSessionId.current && profile !== null) {
                console.log('[Auth] Ignoring redundant session change');
                return;
            }
            lastSessionId.current = sessionId;

            console.log('[Auth] State change triggered', {
                event: !!newSession ? 'SIGNED_IN' : 'SIGNED_OUT',
                userId: newSession?.user?.id
            });

            try {
                if (newSession?.user) {
                    setSession(newSession);
                    setUser(newSession.user);

                    // Optimistic profile and permissions loading from cache
                    const cachedProfile = localStorage.getItem(`profile_${newSession.user.id}`);
                    const cachedPerms = localStorage.getItem(`perms_${newSession.user.id}`);

                    if (cachedProfile) {
                        try {
                            const p = JSON.parse(cachedProfile);
                            setProfile(p);
                            console.log('[Auth] Optimistic profile load:', p.role);
                        } catch (e) { /* ignore */ }
                    }

                    if (cachedPerms) {
                        try {
                            setPermissions(JSON.parse(cachedPerms));
                        } catch (e) { /* ignore */ }
                    }

                    console.log('[Auth] Refreshing profile from server for:', newSession.user.id);
                    await fetchProfile(newSession.user.id, newSession.user.email);
                    console.log('[Auth] Profile refresh complete');
                } else {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setOrganization(null);
                    lastSessionId.current = 'unsigned-out';
                }
            } catch (error) {
                console.error('[Auth] Error in handleAuthChange:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                    console.log('[Auth] Loading state set to false');
                }
            }
        };

        const initialize = async () => {
            console.log('[Auth] Initializing...');
            // Safety timeout: ensure loading is ALWAYS false after 6 seconds maximum
            const safetyTimeout = setTimeout(() => {
                if (mounted && loading) {
                    console.warn('[Auth] Initialization safety timeout hit');
                    setLoading(false);
                }
            }, 6000);

            try {
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                await handleAuthChange(initialSession);
            } catch (error) {
                console.error('[Auth] Initialization error:', error);
                if (mounted) setLoading(false);
            } finally {
                clearTimeout(safetyTimeout);
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return;
            console.log('[Auth] Supabase Event:', event);

            if (event === 'SIGNED_OUT') {
                lastSessionId.current = 'unsigned-out';
                setSession(null);
                setUser(null);
                setProfile(null);
                setOrganization(null);
                setLoading(false);
            } else {
                await handleAuthChange(newSession);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        if (user) {
            localStorage.removeItem(`perms_${user.id}`);
            localStorage.removeItem(`profile_${user.id}`);
        }
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



    const refreshOrganization = async () => {
        const orgId = profile?.organization_id || organization?.id;
        if (!orgId) return;

        try {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', orgId)
                .single();
            if (orgData) {
                setOrganization(orgData);
            }
        } catch (error) {
            console.error('Error refreshing organization:', error);
        }
    };

    const refreshProfile = async () => {
        if (!user) return;
        try {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileData) {
                setProfile(profileData as Profile);
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    };

    const refreshPermissions = async () => {
        if (!profile?.organization_id) return;
        const { data } = await supabase.from('role_permissions')
            .select('module, action, enabled')
            .eq('organization_id', profile.organization_id)
            .eq('role', profile.role);

        if (data) {
            const permMap: Record<string, boolean> = {};
            data.forEach(p => {
                permMap[`${p.module}:${p.action}`] = p.enabled;
            });
            setPermissions(permMap);
        }
    };

    const canAccess = (module: string, action: string) => {
        if (!profile) return false;
        // Admins always have access
        if (['saas_admin', 'org_admin', 'admin'].includes(profile.role)) return true;

        return permissions[`${module}:${action}`] || false;
    };

    return (
        <AuthContext.Provider value={{
            user, session, profile, organization, permissions, loading,
            signOut, hasRole, canAccess,
            refreshOrganization, refreshProfile, refreshPermissions
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export type { Role, Profile };
