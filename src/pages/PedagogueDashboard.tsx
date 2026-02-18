import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PedagogueDashboard() {
    const { profile } = useAuth();

    const { data: pedagogueData, isLoading } = useQuery({
        queryKey: ['pedagogueDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            // Fetch summary stats
            const { data: children } = await supabase
                .from('children')
                .select('id, full_name, schooling, pedagogue_indications')
                .eq('organization_id', profile.organization_id);

            const { data: recentEntries } = await supabase
                .from('child_entries')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'pedagogical')
                .order('created_at', { ascending: false })
                .limit(5);

            const { data: schoolEvents } = await supabase
                .from('calendar_events')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'school')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(5);

            return {
                stats: {
                    totalChildren: children?.length || 0,
                    inSchool: children?.filter(c => c.schooling && !c.schooling.toLowerCase().includes('não')).length || 0,
                    recentActivities: recentEntries?.length || 0,
                    eventsThisWeek: schoolEvents?.length || 0
                },
                recentEntries: recentEntries || [],
                schoolEvents: schoolEvents || [],
                schoolingOverview: children?.slice(0, 5) || []
            };
        },
        enabled: !!profile?.organization_id
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando painel pedagógico...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Painel de Pedagogia</h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Acompanhamento escolar e desenvolvimento pedagógico.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-lg">school</span>
                        Frequência Escolar
                    </button>
                    <button className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-lg">add</span>
                        Nova Atividade
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="backpack"
                    title="Total Escolarizados"
                    value={pedagogueData?.stats.inSchool || 0}
                    subValue={`De ${pedagogueData?.stats.totalChildren} acolhidos`}
                />
                <StatCard
                    icon="assignment"
                    title="Atividades (Mês)"
                    value={pedagogueData?.stats.recentActivities || 0}
                    subValue="Registros pedagógicos"
                />
                <StatCard
                    icon="event_note"
                    title="Eventos Escolares"
                    value={pedagogueData?.stats.eventsThisWeek || 0}
                    variant="warning"
                    subValue="Próximos compromissos"
                />
                <StatCard
                    icon="trending_up"
                    title="Metas Atingidas"
                    value="85%"
                    variant="default"
                    subValue="Progresso geral"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Pedagogical Entries */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">menu_book</span>
                            Últimos Registros Pedagógicos
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                        {pedagogueData?.recentEntries.length === 0 ? (
                            <div className="p-12 text-center">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">assignment_turned_in</span>
                                <p className="text-text-secondary">Nenhum registro pedagógico recente.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-light dark:divide-gray-800">
                                {pedagogueData?.recentEntries.map((entry: any) => (
                                    <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-text-main dark:text-white">{entry.children?.full_name}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                                                    Desenvolvimento
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
                            <button className="text-primary text-sm font-bold hover:underline">Ver todos os registros</button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-6">
                    {/* School Calendar */}
                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-border-light dark:border-gray-800">
                            <h3 className="font-bold text-text-main dark:text-white flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                                Agenda Escolar
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {pedagogueData?.schoolEvents.length === 0 ? (
                                <p className="text-xs text-text-secondary text-center py-4">Sem eventos escolares agendados.</p>
                            ) : (
                                pedagogueData?.schoolEvents.map((event: any) => (
                                    <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-border-light dark:hover:border-gray-700">
                                        <div className="flex flex-col items-center justify-center size-10 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                                            <span className="text-sm font-extrabold leading-none">{format(new Date(event.start_time), 'dd')}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-text-main dark:text-white truncate">{event.children?.full_name}</p>
                                            <p className="text-[10px] text-text-secondary dark:text-gray-500">{event.title}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Schooling List */}
                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                            <h3 className="font-bold text-text-main dark:text-white flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-primary text-lg">school</span>
                                Nível Escolar
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {pedagogueData?.schoolingOverview.map((child: any) => (
                                <div key={child.id} className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-text-main dark:text-white truncate">{child.full_name}</span>
                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {child.schooling || 'Não informado'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
