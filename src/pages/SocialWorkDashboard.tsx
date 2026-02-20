import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { SocialWorkEntryModal } from '../components/dashboard/SocialWorkEntryModal';
import { format, differenceInYears, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

export function SocialWorkDashboard() {
    const { profile } = useAuth();
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
    const [childSearch, setChildSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['socialWorkDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            // 1. Fetch all children with relevant details
            const { data: children } = await supabase
                .from('children')
                .select('id, full_name, photo_url, date_of_birth, status, legal_status, judicial_process, origin_type, admission_date')
                .eq('organization_id', profile.organization_id)
                .order('full_name');

            // 2. Fetch recent social work entries
            const { data: recentEntries } = await supabase
                .from('child_entries')
                .select('*, children(full_name, photo_url)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'social_work')
                .order('created_at', { ascending: false })
                .limit(5);

            // 3. Fetch upcoming appointments/deadlines
            const { data: futureEntries } = await supabase
                .from('child_entries')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'social_work')
                .not('next_appointment', 'is', null)
                .gte('next_appointment', new Date().toISOString())
                .order('next_appointment', { ascending: true })
                .limit(5);

            const totalChildren = children?.length || 0;
            const urgentCases = children?.filter(c => c.status === 'urgent' || c.legal_status === 'destituicao_familiar' || c.legal_status === 'acolhimento_provisorio').length || 0;
            const activeDeadlines = futureEntries?.length || 0;

            return {
                stats: {
                    totalChildren,
                    urgentCases,
                    recentEntriesCount: recentEntries?.length || 0,
                    activeDeadlines
                },
                recentEntries: recentEntries || [],
                allChildren: children || [],
                upcomingAppointments: futureEntries || []
            };
        },
        enabled: !!profile?.organization_id
    });

    const filteredChildren = dashboardData?.allChildren.filter(child => {
        const matchesSearch = child.full_name.toLowerCase().includes(childSearch.toLowerCase()) ||
            child.judicial_process?.toLowerCase().includes(childSearch.toLowerCase());
        const matchesStatus = statusFilter === 'all' || child.legal_status === statusFilter;
        return matchesSearch && matchesStatus;
    }) || [];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando painel social...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-text-main dark:text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-3xl">psychology</span>
                        Serviço Social
                    </h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Gestão de casos, processos judiciais e acompanhamento familiar.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => alert('Módulo de Relatórios Detalhados em desenvolvimento.\n\nEm breve você poderá gerar relatórios em PDF de:\n- Acompanhamento individual\n- PIA (Plano Individual de Atendimento)\n- Relatórios de Audiência')}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-lg">description</span>
                        <span className="whitespace-nowrap">Relatórios</span>
                    </button>
                    <button
                        onClick={() => { setSelectedChildId(undefined); setIsEntryModalOpen(true); }}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span className="whitespace-nowrap">Novo Atendimento</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                    icon="diversity_3"
                    title="Total Acolhidos"
                    value={dashboardData?.stats.totalChildren || 0}
                    variant="default"
                />
                <StatCard
                    icon="gavel"
                    title="Processos Críticos"
                    value={dashboardData?.stats.urgentCases || 0}
                    variant={dashboardData?.stats.urgentCases && dashboardData.stats.urgentCases > 0 ? 'danger' : 'default'}
                />
                <StatCard
                    icon="event_note"
                    title="Prazos / Agendas"
                    value={dashboardData?.stats.activeDeadlines || 0}
                    variant="warning"
                />
                <StatCard
                    icon="history"
                    title="Atendimentos (Mês)"
                    value={dashboardData?.stats.recentEntriesCount || 0}
                    variant="default"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column: Children List / Case Management */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="px-6 py-5 border-b border-border-light dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">folder_shared</span>
                                Gestão de Casos
                            </h2>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou processo..."
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-amber-500/50 focus:bg-white dark:focus:bg-black transition-all"
                                        value={childSearch}
                                        onChange={(e) => setChildSearch(e.target.value)}
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-amber-500/50"
                                >
                                    <option value="all">Todos Status</option>
                                    <option value="acolhimento_provisorio">Acolhimento Provisório</option>
                                    <option value="destituicao_familiar">Destituição Familiar</option>
                                    <option value="reintegracao_familiar">Reintegração Familiar</option>
                                    <option value="disponivel_adocao">Disponível para Adoção</option>
                                    <option value="em_processo_adocao">Em Processo de Adoção</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-6 py-4 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Acolhido</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Idade</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Status Legal</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Processo</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {filteredChildren.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-text-secondary dark:text-gray-500 text-sm">
                                                Nenhum acolhido encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredChildren.map((child) => (
                                            <tr key={child.id} className="group hover:bg-amber-50/10 dark:hover:bg-amber-900/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <Link to={`/dashboard/children/${child.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity group/link">
                                                        <img
                                                            src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}&background=random`}
                                                            alt={child.full_name}
                                                            className="size-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-text-main dark:text-white group-hover/link:text-primary transition-colors">
                                                                {child.full_name}
                                                            </p>
                                                            <p className="text-[10px] text-text-secondary dark:text-gray-500">
                                                                Desde {child.admission_date ? format(parseISO(child.admission_date), 'dd/MM/yyyy') : '-'}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-text-secondary dark:text-gray-400">
                                                        {child.date_of_birth ? `${differenceInYears(new Date(), parseISO(child.date_of_birth))} anos` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide",
                                                        child.legal_status === 'destituicao_familiar' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                            child.legal_status === 'acolhimento_provisorio' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                                                child.legal_status === 'reintegracao_familiar' || child.legal_status === 'disponivel_adocao' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                                    )}>
                                                        {child.legal_status === 'destituicao_familiar' ? 'Destituição' :
                                                            child.legal_status === 'acolhimento_provisorio' ? 'Acolhimento' :
                                                                child.legal_status === 'reintegracao_familiar' ? 'Reintegração' :
                                                                    child.legal_status === 'disponivel_adocao' ? 'Adoção' :
                                                                        child.legal_status === 'em_processo_adocao' ? 'Proc. Adoção' :
                                                                            child.legal_status ? child.legal_status.replace(/_/g, ' ') : 'Não definido'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-text-secondary dark:text-gray-500">
                                                        <span className="material-symbols-outlined text-base">gavel</span>
                                                        <span className="text-xs font-mono font-medium">{child.judicial_process || 'S/ Processo'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => { setSelectedChildId(child.id); setIsEntryModalOpen(true); }}
                                                            className="size-8 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-amber-500 hover:text-white text-gray-400 transition-all flex items-center justify-center"
                                                            title="Nova Anotação"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">edit_note</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Schedule & Activity */}
                <div className="space-y-6">
                    {/* Upcoming Deadlines / Appointments */}
                    <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-border-light dark:border-gray-800">
                            <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">event_upcoming</span>
                                Próximos Prazos
                            </h2>
                        </div>
                        <div className="p-2">
                            {dashboardData?.upcomingAppointments.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="size-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="material-symbols-outlined text-gray-400">event_busy</span>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-500 font-medium">Nenhum prazo ou agendamento próximo.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {dashboardData?.upcomingAppointments.map((event: any) => (
                                        <div key={event.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 group">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl px-2.5 py-1.5 hidden sm:flex min-w-[3.5rem]">
                                                    <span className="text-xs font-bold uppercase">{format(parseISO(event.next_appointment), 'MMM', { locale: ptBR })}</span>
                                                    <span className="text-lg font-black leading-none">{format(parseISO(event.next_appointment), 'dd')}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-text-secondary dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">
                                                            Pendente
                                                        </span>
                                                        <span className="text-xs font-medium text-text-secondary dark:text-gray-500 truncate">
                                                            {format(parseISO(event.next_appointment), "EEEE, HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-text-main dark:text-white truncate group-hover:text-red-500 transition-colors">
                                                        {event.title}
                                                    </h4>
                                                    <p className="text-xs text-text-secondary dark:text-gray-500 truncate mt-0.5">
                                                        Referente a: <span className="font-bold">{event.children?.full_name}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800 text-center">
                            <button className="text-xs font-bold text-primary hover:text-primary-dark uppercase tracking-wider transition-colors">
                                Ver Calendário Completo
                            </button>
                        </div>
                    </div>

                    {/* Recent History */}
                    <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-border-light dark:border-gray-800">
                            <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">history</span>
                                Histórico Recente
                            </h2>
                        </div>
                        <div className="divide-y divide-border-light dark:divide-gray-800">
                            {dashboardData?.recentEntries.length === 0 ? (
                                <p className="text-center text-text-secondary py-8 text-sm">Nenhum histórico recente.</p>
                            ) : (
                                dashboardData?.recentEntries.map((entry: any) => (
                                    <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={entry.children?.photo_url || `https://ui-avatars.com/api/?name=${entry.children?.full_name}`}
                                                    className="size-5 rounded-full"
                                                />
                                                <span className="text-xs font-bold text-text-main dark:text-white truncate max-w-[120px]">
                                                    {entry.children?.full_name}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-medium text-text-secondary dark:text-gray-500">
                                                {format(parseISO(entry.created_at), "dd/MM HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-text-main dark:text-gray-200 line-clamp-1">{entry.title}</p>
                                        <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2 mt-1">
                                            {entry.content}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800 text-center">
                            <button className="text-xs font-bold text-primary hover:text-primary-dark uppercase tracking-wider transition-colors">
                                Ver Todo Histórico
                            </button>
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
