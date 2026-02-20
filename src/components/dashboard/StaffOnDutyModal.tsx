import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';

interface StaffOnDutyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface StaffMemberStatus {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    status: 'online' | 'offline';
    location_status: 'in_house' | 'absent';
    current_event?: {
        title: string;
        location: string | null;
        end_time: string;
    };
    last_active?: string;
}

export function StaffOnDutyModal({ isOpen, onClose }: StaffOnDutyModalProps) {
    const { profile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: staffMembers, isLoading } = useQuery({
        queryKey: ['staff-on-duty', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];

            const now = new Date();
            const nowISO = now.toISOString();

            // 1. Fetch all active profiles
            const { data: profiles, error: pErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('full_name');

            if (pErr) throw pErr;

            // 2. Fetch active calendar events for these profiles
            // We look for events that are happening RIGHT NOW
            const { data: activeEvents, error: eErr } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .lte('start_time', nowISO)
                .gte('end_time', nowISO); // Current events

            if (eErr) throw eErr;

            // 3. Fetch recent logs to determine "Online" status (last 15 mins)
            const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
            const { data: recentLogs, error: lErr } = await supabase
                .from('logs')
                .select('author_id, created_at')
                .eq('organization_id', profile.organization_id)
                .gte('created_at', fifteenMinutesAgo);

            if (lErr) throw lErr;

            // Map logs to a set of active user IDs
            const onlineUserIds = new Set(recentLogs?.map(log => log.author_id) || []);

            // 4. Combine data
            return profiles.map(member => {
                // Find if member has a current event
                // We filter events where professional_id matches OR created_by matches (if professional_id is null, maybe fallback? But best is strictly professional_id)
                // Assuming professional_id is the link.
                const currentEvent = activeEvents?.find(e => e.professional_id === member.id);

                // Determine location status
                // If there is an event happening now, and it's NOT an internal task, assume they are "Absent" or at that location
                // If the event type is 'medical', 'court', 'external', etc.
                const isAbsent = !!currentEvent && currentEvent.type !== 'internal_task' && currentEvent.type !== 'shift';

                return {
                    id: member.id,
                    full_name: member.full_name,
                    avatar_url: member.avatar_url,
                    role: member.role,
                    status: onlineUserIds.has(member.id) ? 'online' : 'offline',
                    location_status: isAbsent ? 'absent' : 'in_house',
                    current_event: isAbsent && currentEvent ? {
                        title: currentEvent.title,
                        location: currentEvent.location,
                        end_time: currentEvent.end_time
                    } : undefined,
                    last_active: undefined
                } as unknown as StaffMemberStatus;
            });
        },
        enabled: isOpen && !!profile?.organization_id,
        refetchInterval: 60000 // Refresh every minute while open
    });

    const filteredStaff = useMemo(() => {
        if (!staffMembers) return [];
        return staffMembers.filter(member =>
            member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [staffMembers, searchTerm]);

    const onlineCount = staffMembers?.filter(s => s.status === 'online').length || 0;
    const inHouseCount = staffMembers?.filter(s => s.location_status === 'in_house').length || 0;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                <span className="material-symbols-outlined text-xl">badge</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-text-main dark:text-white leading-none">Equipe de Plantão</h2>
                                <p className="text-xs text-text-secondary dark:text-gray-400 font-medium mt-1">Status em tempo real</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 mt-4">
                        <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3 shadow-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <div>
                                <p className="text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Online</p>
                                <p className="text-lg font-black text-text-main dark:text-white leading-none">{onlineCount}</p>
                            </div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3 shadow-sm">
                            <div className="size-2.5 rounded-full bg-blue-500"></div>
                            <div>
                                <p className="text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Na Casa</p>
                                <p className="text-lg font-black text-text-main dark:text-white leading-none">{inHouseCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar profissional..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 dark:bg-gray-900/10">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-medium">Carregando equipe...</span>
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
                            <p className="text-sm">Nenhum profissional encontrado.</p>
                        </div>
                    ) : (
                        filteredStaff.map(member => (
                            <div key={member.id} className="group bg-white dark:bg-surface-dark p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                                <div className="relative shrink-0">
                                    <div
                                        className="size-11 rounded-full bg-cover bg-center bg-no-repeat ring-2 ring-gray-100 dark:ring-gray-700"
                                        style={{ backgroundImage: `url("${member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random`}")` }}
                                    ></div>
                                    <div className={clsx(
                                        "absolute bottom-0 right-0 size-3.5 border-2 border-white dark:border-surface-dark rounded-full",
                                        member.status === 'online' ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                    )} title={member.status === 'online' ? "Online" : "Offline"}></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-text-main dark:text-white truncate pr-2">{member.full_name}</h3>
                                        {member.location_status === 'in_house' ? (
                                            <span className="shrink-0 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-blue-100 dark:border-blue-900/30">
                                                Na Casa
                                            </span>
                                        ) : (
                                            <span className="shrink-0 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-amber-100 dark:border-amber-900/30">
                                                Ausente
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-text-secondary dark:text-gray-400 mb-2">{member.role === 'org_admin' ? 'Administrador' : member.role === 'educator' ? 'Educador(a)' : member.role === 'pedagogue' ? 'Pedagogo(a)' : member.role}</p>

                                    {/* Location / Event Info */}
                                    {member.location_status === 'absent' && member.current_event ? (
                                        <div className="mt-2 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg border border-amber-100 dark:border-amber-900/20">
                                            <div className="flex items-start gap-1.5">
                                                <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5">event_busy</span>
                                                <div>
                                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-200 line-clamp-1">{member.current_event.title}</p>
                                                    {member.current_event.location && (
                                                        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">location_on</span>
                                                            {member.current_event.location}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                                                        Retorno previsto: {format(parseISO(member.current_event.end_time), "HH:mm")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-text-secondary dark:text-gray-500">
                                            <span className="material-symbols-outlined text-sm">domain</span>
                                            <span>Disponível na unidade</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
