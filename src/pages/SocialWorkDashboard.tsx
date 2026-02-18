import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { SocialWorkEntryModal } from '../components/dashboard/SocialWorkEntryModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export function SocialWorkDashboard() {
    const { profile } = useAuth();
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState<string | undefined>();

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['socialWorkDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            // Fetch summary stats for social work
            const { data: children } = await supabase
                .from('children')
                .select('id, full_name, status')
                .eq('organization_id', profile.organization_id);

            const { data: recentEntries } = await supabase
                .from('child_entries')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'social_work')
                .order('created_at', { ascending: false })
                .limit(10);

            return {
                stats: {
                    totalChildren: children?.length || 0,
                    pendingProcesses: children?.filter(c => c.status === 'urgent').length || 0,
                    recentEntries: recentEntries?.length || 0,
                    urgentCases: children?.filter(c => c.status === 'urgent').length || 0
                },
                recentEntries: recentEntries || [],
                allChildren: children || []
            };
        },
        enabled: !!profile?.organization_id
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando painel social...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Serviço Social</h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Gestão de casos, processos e acompanhamento familiar.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-lg">description</span>
                        Relatórios
                    </button>
                    <button
                        onClick={() => { setSelectedChildId(undefined); setIsEntryModalOpen(true); }}
                        className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Novo Atendimento
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="diversity_3"
                    title="Total Acolhidos"
                    value={dashboardData?.stats.totalChildren || 0}
                    variant="default"
                />
                <StatCard
                    icon="gavel"
                    title="Processos Urgentes"
                    value={dashboardData?.stats.urgentCases || 0}
                    variant={dashboardData?.stats.urgentCases && dashboardData.stats.urgentCases > 0 ? 'danger' : 'default'}
                />
                <StatCard
                    icon="history"
                    title="Atendimentos (Mês)"
                    value={dashboardData?.stats.recentEntries || 0}
                    variant="default"
                />
                <StatCard
                    icon="contact_support"
                    title="Prazos Ativos"
                    value="0"
                    variant="warning"
                />
            </div>

            {/* Recent Entries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">history</span>
                            Últimos Atendimentos Sociais
                        </h2>
                    </div>
                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                        {dashboardData?.recentEntries.length === 0 ? (
                            <p className="text-center text-text-secondary py-12">Nenhum atendimento registrado.</p>
                        ) : (
                            <div className="divide-y divide-border-light dark:divide-gray-800">
                                {dashboardData?.recentEntries.map((entry: any) => (
                                    <div key={entry.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-text-main dark:text-white uppercase text-xs">{entry.children?.full_name}</span>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                    entry.urgency === 'high' ? "bg-red-100 text-red-700" :
                                                        entry.urgency === 'medium' ? "bg-orange-100 text-orange-700" :
                                                            "bg-blue-100 text-blue-700"
                                                )}>
                                                    {entry.urgency === 'high' ? 'Urgente' : entry.urgency === 'medium' ? 'Atenção' : 'Normal'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase">
                                                {format(new Date(entry.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-text-main dark:text-gray-100 mb-1">{entry.title}</h4>
                                        <p className="text-sm text-text-secondary dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                                            {entry.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800">
                            <button className="text-primary text-sm font-bold hover:underline">Ver todo histórico social</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden h-fit">
                    <div className="px-6 py-5 border-b border-border-light dark:border-gray-800">
                        <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">feed</span>
                            Notas Rápidas
                        </h2>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-text-secondary mb-4">Mantenha aqui lembretes sobre prazos judiciais ou visitas de rede.</p>
                        <div className="space-y-3">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase mb-1">Dica</p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Todos os atendimentos registrados aqui também ficam disponíveis no histórico individual de cada acolhido.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SocialWorkEntryModal
                isOpen={isEntryModalOpen}
                onClose={() => { setIsEntryModalOpen(false); setSelectedChildId(undefined); }}
                initialChildId={selectedChildId}
            />
        </div>
    );
}
