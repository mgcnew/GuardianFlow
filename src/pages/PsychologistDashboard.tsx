import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PsychologistDashboard() {
    const { profile } = useAuth();

    const { data: psychData, isLoading } = useQuery({
        queryKey: ['psychDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            // Fetch summary stats
            const { data: children } = await supabase
                .from('children')
                .select('id, full_name, psychological_status, psychologist_indications')
                .eq('organization_id', profile.organization_id);

            const { data: recentEntries } = await supabase
                .from('child_entries')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'psychological')
                .order('created_at', { ascending: false })
                .limit(5);

            const { data: appointments } = await supabase
                .from('calendar_events')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'medical') // Mapping medical to clinical/psychological for now
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(5);

            return {
                stats: {
                    totalChildren: children?.length || 0,
                    attentionNeeded: children?.filter(c => c.psychological_status?.toLowerCase().includes('urgente') || c.psychological_status?.toLowerCase().includes('atenção')).length || 0,
                    recentEvolutions: recentEntries?.length || 0,
                    appointmentsToday: appointments?.filter(a => new Date(a.start_time).toDateString() === new Date().toDateString()).length || 0
                },
                recentEntries: recentEntries || [],
                appointments: appointments || [],
                criticalChildren: children?.filter(c => c.psychological_status).slice(0, 5) || []
            };
        },
        enabled: !!profile?.organization_id
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando painel clínico...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-400">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Painel de Psicologia</h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Gestão clínica e acompanhamento psicológico.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-lg">description</span>
                        Relatórios
                    </button>
                    <button className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-lg">add</span>
                        Nova Evolução
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="psychology"
                    title="Acompanhamentos"
                    value={psychData?.stats.totalChildren || 0}
                    subValue="Total de acolhidos"
                />
                <StatCard
                    icon="warning"
                    title="Atenção Necessária"
                    value={psychData?.stats.attentionNeeded || 0}
                    variant={psychData?.stats.attentionNeeded && psychData.stats.attentionNeeded > 0 ? "danger" : "default"}
                    subValue="Casos prioritários"
                />
                <StatCard
                    icon="history_edu"
                    title="Evoluções (Mês)"
                    value={psychData?.stats.recentEvolutions || 0}
                    subValue="Registros realizados"
                />
                <StatCard
                    icon="event"
                    title="Agendados Hoje"
                    value={psychData?.stats.appointmentsToday || 0}
                    variant="warning"
                    subValue="Sessões clínicas"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Evolutions */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">history</span>
                            Últimas Evoluções Clínicas
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                        {psychData?.recentEntries.length === 0 ? (
                            <div className="p-12 text-center">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">history_edu</span>
                                <p className="text-text-secondary">Nenhuma evolução registrada recentemente.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-light dark:divide-gray-800">
                                {psychData?.recentEntries.map((entry: any) => (
                                    <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-text-main dark:text-white">{entry.children?.full_name}</span>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    entry.urgency === 'high' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                                )}>
                                                    {entry.urgency === 'high' ? 'Urgente' : 'Normal'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-text-secondary dark:text-gray-500">
                                                {format(new Date(entry.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2">
                                            {entry.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800">
                            <button className="text-primary text-sm font-bold hover:underline">Ver todas as evoluções</button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-6">
                    {/* Next Appointments */}
                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-border-light dark:border-gray-800">
                            <h3 className="font-bold text-text-main dark:text-white flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-primary text-lg">event</span>
                                Próximos Atendimentos
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {psychData?.appointments.length === 0 ? (
                                <p className="text-xs text-text-secondary text-center py-4">Sem agendamentos próximos.</p>
                            ) : (
                                psychData?.appointments.map((app: any) => (
                                    <div key={app.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-border-light dark:hover:border-gray-700">
                                        <div className="flex flex-col items-center justify-center size-10 rounded-lg bg-primary/10 text-primary shrink-0">
                                            <span className="text-[10px] font-bold uppercase">{format(new Date(app.start_time), 'MMM', { locale: ptBR })}</span>
                                            <span className="text-sm font-extrabold leading-none">{format(new Date(app.start_time), 'dd')}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-text-main dark:text-white truncate">{app.children?.full_name}</p>
                                            <p className="text-[10px] text-text-secondary dark:text-gray-500">{format(new Date(app.start_time), 'HH:mm')} - {app.title}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Critical Cases */}
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl">
                        <h3 className="font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2 text-sm mb-3">
                            <span className="material-symbols-outlined text-lg font-variation-fill">report</span>
                            Casos sob Observação
                        </h3>
                        <div className="space-y-2">
                            {psychData?.criticalChildren.map((child: any) => (
                                <div key={child.id} className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-orange-100 dark:border-orange-900/30">
                                    <span className="text-xs font-bold text-text-main dark:text-white truncate">{child.full_name}</span>
                                    <span className="text-[10px] text-orange-600 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">Observar</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
