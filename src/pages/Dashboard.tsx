import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { StaffList, AgendaWidget } from '../components/dashboard/Widgets';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export function Dashboard() {
    const { user, profile, signOut } = useAuth();
    const [showMedSummary, setShowMedSummary] = useState(false);
    const [showJudicialSummary, setShowJudicialSummary] = useState(false);

    const { data: dashboardData, isLoading, isError, error } = useQuery({
        queryKey: ['dashboardData', user?.id, profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile?.organization_id) {
                console.log('Skipping dashboard fetch: user or org_id missing', { user: !!user, orgId: profile?.organization_id });
                return null;
            }

            console.log('QueryFn: Starting fetch for org:', profile.organization_id);

            try {
                // Run all queries in parallel for vastly improved performance waterfall
                const [
                    { data: children, error: cErr },
                    { data: meds, error: mErr },
                    { data: logs, error: lErr },
                    { data: profiles, error: pErr },
                    { data: orgData }
                ] = await Promise.all([
                    // Fetch children
                    supabase.from('children')
                        .select('id, full_name, status, judicial_process')
                        .eq('organization_id', profile.organization_id),
                    // Fetch all active medications
                    supabase.from('medications')
                        .select('*, children(full_name)')
                        .eq('organization_id', profile.organization_id),
                    // Fetch logs (Activity feed)
                    supabase.from('logs')
                        .select('*, children(full_name), profiles(full_name)')
                        .eq('organization_id', profile.organization_id)
                        .order('created_at', { ascending: false })
                        .limit(5),
                    // Fetch staff
                    supabase.from('profiles')
                        .select('*')
                        .eq('organization_id', profile.organization_id)
                        .limit(5),
                    // Fetch organization details (for capacity etc)
                    supabase.from('organizations')
                        .select('*')
                        .eq('id', profile.organization_id)
                        .single()
                ]);

                if (cErr) throw cErr;
                if (mErr) throw mErr;
                if (lErr) throw lErr;
                if (pErr) throw pErr;

                const activeMeds = meds?.filter(m => !m.end_date || new Date(m.end_date) >= new Date())
                    .map(m => ({
                        ...m,
                        next_dose: m.last_administration && m.frequency_interval
                            ? new Date(new Date(m.last_administration).getTime() + (m.frequency_interval * 60 * 60 * 1000))
                            : null
                    }))
                    .sort((a, b) => {
                        if (!a.next_dose) return 1;
                        if (!b.next_dose) return -1;
                        return a.next_dose.getTime() - b.next_dose.getTime();
                    }) || [];
                const judicialOrders = children?.filter(c => c.judicial_process && c.judicial_process.trim() !== '') || [];

                return {
                    stats: {
                        totalChildren: children?.length || 0,
                        activeChildren: children?.filter(c => c.status === 'active').length || 0,
                        urgentChildren: children?.filter(c => c.status === 'urgent').length || 0,
                        judicialCount: judicialOrders.length,
                        medsCount: activeMeds.length,
                        capacity: (orgData as any)?.capacity || 16
                    },
                    activeMeds,
                    judicialOrders,
                    logs: logs || [],
                    staff: profiles || []
                };
            } catch (err) {
                console.error('Dashboard Fetch Error:', err);
                throw err;
            }
        },
        enabled: !!user,
        retry: false,
        staleTime: 1000 * 60,
    });

    const isProfileLoading = !profile && !!user;

    if (isLoading || isProfileLoading) {
        return (
            <div className="space-y-4 sm:space-y-6 w-full animate-pulse">
                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-[110px] sm:h-32 bg-white/50 dark:bg-surface-dark/50 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between p-4 sm:p-5">
                            <div className="flex justify-between items-start">
                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700/50"></div>
                            </div>
                            <div>
                                <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700/50 rounded-full mb-2"></div>
                                <div className="w-1/3 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 h-[450px] bg-white/50 dark:bg-surface-dark/50 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                    <div className="flex flex-col gap-6">
                        <div className="h-[200px] bg-white/50 dark:bg-surface-dark/50 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                        <div className="h-[200px] bg-white/50 dark:bg-surface-dark/50 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Handle case where profile exists but organization is not set
    if (profile && !profile.organization_id) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-primary">analytics</span>
                </div>
                <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Bem-vindo ao GuardianFlow!</h3>
                <p className="text-text-secondary dark:text-gray-400 max-w-md mb-8">
                    Sua conta ainda não está vinculada a uma unidade de acolhimento.
                    Entre em contato com o administrador ou aguarde o convite.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
                    >
                        Verificar novamente
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-text-main dark:text-white rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                        Sair
                    </button>
                </div>
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

    const { stats, logs, staff, activeMeds, judicialOrders } = dashboardData;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                    icon="group"
                    title="Total de Acolhidos"
                    value={stats.totalChildren}
                    subValue={`Ativos: ${stats.activeChildren}`}
                    variant="info"
                />
                <StatCard
                    icon="pill"
                    title="Próxima Medicação"
                    value={stats.medsCount > 0 && activeMeds[0].next_dose ? format(activeMeds[0].next_dose, 'HH:mm') : stats.medsCount}
                    subValue={stats.medsCount > 0 ? (activeMeds[0].next_dose ? `${activeMeds[0].name} (${activeMeds[0].children?.full_name?.split(' ')[0]})` : `${activeMeds[0].name}`) : "Nenhuma ativa"}
                    variant="warning"
                    onInfoClick={() => setShowMedSummary(true)}
                />
                <StatCard
                    icon="gavel"
                    title="Ordens Judiciais"
                    value={stats.judicialCount}
                    subValue={`${stats.judicialCount} Processos ativos`}
                    variant="danger"
                    onInfoClick={() => setShowJudicialSummary(true)}
                />
                <StatCard
                    icon="bed"
                    title="Vagas Disponíveis"
                    value={Math.max(0, stats.capacity - stats.totalChildren)}
                    subValue={`Capacidade: ${stats.capacity}`}
                    variant="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <ActivityFeed logs={logs} />
                <div className="flex flex-col gap-6">
                    <StaffList staff={staff} />
                    <AgendaWidget />
                </div>
            </div>

            {/* Modals Summary */}
            {showMedSummary && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowMedSummary(false)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-primary/5">
                            <h3 className="font-black text-primary dark:text-blue-400 uppercase tracking-widest text-xs flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">pill</span>
                                Resumo de Medicamentos
                            </h3>
                            <button onClick={() => setShowMedSummary(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                            {activeMeds.length === 0 ? (
                                <p className="text-center py-8 text-text-secondary dark:text-gray-500 font-medium">Nenhum medicamento ativo registrado.</p>
                            ) : (
                                activeMeds.map((m: any) => (
                                    <div key={m.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-start justify-between mb-1">
                                            <p className="text-xs font-black text-text-main dark:text-white uppercase tracking-tight">{m.children?.full_name}</p>
                                            {m.next_dose && (
                                                <span className={clsx(
                                                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                                                    m.next_dose.getTime() < new Date().getTime() ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-100 text-blue-600"
                                                )}>
                                                    {m.next_dose.getTime() < new Date().getTime() ? 'Atrasado' : 'Próximo'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-primary dark:text-blue-400">{m.name}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-text-secondary dark:text-gray-400 uppercase">
                                                    {m.next_dose ? format(m.next_dose, "HH:mm 'de' dd/MM", { locale: ptBR }) : m.frequency}
                                                </p>
                                            </div>
                                        </div>
                                        {m.instructions && <p className="text-[10px] text-text-secondary dark:text-gray-400 mt-1 italic">{m.instructions}</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showJudicialSummary && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowJudicialSummary(false)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-red-500/5">
                            <h3 className="font-black text-red-600 dark:text-red-400 uppercase tracking-widest text-xs flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">gavel</span>
                                Ordens Judiciais Ativas
                            </h3>
                            <button onClick={() => setShowJudicialSummary(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                            {judicialOrders.length === 0 ? (
                                <p className="text-center py-8 text-text-secondary dark:text-gray-500 font-medium">Nenhuma ordem judicial ativa registrada.</p>
                            ) : (
                                judicialOrders.map((c: any) => (
                                    <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">{c.full_name}</p>
                                            <p className="text-xs font-mono text-primary/70 dark:text-blue-400/70">{c.judicial_process}</p>
                                        </div>
                                        {c.status === 'urgent' && (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                                                <span className="material-symbols-outlined text-sm">priority_high</span> Urgente
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
