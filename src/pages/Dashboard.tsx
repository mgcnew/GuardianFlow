import { useQuery } from '@tanstack/react-query';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { StaffList, AgendaWidget } from '../components/dashboard/Widgets';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
    const { user, profile } = useAuth();

    const { data: dashboardData, isLoading, isError, error } = useQuery({
        queryKey: ['dashboardData', user?.id, profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile?.organization_id) {
                console.log('Skipping dashboard fetch: user or org_id missing', { user: !!user, orgId: profile?.organization_id });
                return null;
            }

            console.log('QueryFn: Starting fetch for org:', profile.organization_id);

            try {
                // Fetch stats - EXPLICITLY filter by organization_id
                const { data: children, error: cErr } = await supabase
                    .from('children')
                    .select('status')
                    .eq('organization_id', profile.organization_id);

                if (cErr) throw cErr;

                // Fetch logs - EXPLICITLY filter by organization_id
                const { data: logs, error: lErr } = await supabase
                    .from('logs')
                    .select('*, children(full_name), profiles(full_name)')
                    .eq('organization_id', profile.organization_id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (lErr) throw lErr;

                // Fetch staff - EXPLICITLY filter by organization_id
                const { data: profiles, error: pErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('organization_id', profile.organization_id)
                    .limit(5);

                if (pErr) throw pErr;

                return {
                    stats: {
                        totalChildren: children?.length || 0,
                        activeChildren: children?.filter(c => c.status === 'active').length || 0,
                        urgentChildren: children?.filter(c => c.status === 'urgent').length || 0,
                        capacity: 16
                    },
                    logs: logs || [],
                    staff: profiles || []
                };
            } catch (err) {
                console.error('Dashboard Fetch Error:', err);
                throw err;
            }
        },
        enabled: !!user,
        retry: false, // Don't retry so we see the error immediately
        staleTime: 1000 * 60,
    });

    const isProfileLoading = !profile && !!user;

    if (isLoading || isProfileLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando dados reais...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 bg-white dark:bg-surface-dark rounded-2xl border border-red-100 dark:border-red-900/30 text-center shadow-sm">
                <span className="material-symbols-outlined text-red-500 text-5xl mb-4">warning</span>
                <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Ops! Algo deu errado</h3>
                <p className="text-text-secondary dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Não conseguimos carregar os dados do seu dashboard. Verifique sua conexão ou se as tabelas foram criadas no Supabase.
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-6 text-xs text-red-700 dark:text-red-300 font-mono break-all">
                    {(error as any)?.message || 'Erro desconhecido'}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (!dashboardData) return null;

    const { stats, logs, staff } = dashboardData;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="group"
                    title="Total de Acolhidos"
                    value={stats.totalChildren}
                    subValue={`Ativos: ${stats.activeChildren}`}
                    variant="default"
                />
                <StatCard
                    icon="pill"
                    title="Medicamentos Próximos"
                    value="0"
                    subValue="Nenhum para agora"
                    variant="warning"
                />
                <StatCard
                    icon="gavel"
                    title="Alertas Judiciais"
                    value={stats.urgentChildren}
                    subValue={`${stats.urgentChildren} Casos urgentes`}
                    variant={stats.urgentChildren > 0 ? 'danger' : 'default'}
                />
                <StatCard
                    icon="bed"
                    title="Vagas Disponíveis"
                    value={Math.max(0, stats.capacity - stats.totalChildren)}
                    subValue={`Capacidade: ${stats.capacity}`}
                    variant="default"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ActivityFeed logs={logs} />
                <div className="flex flex-col gap-6">
                    <StaffList staff={staff} />
                    <AgendaWidget />
                </div>
            </div>
        </div>
    );
}
