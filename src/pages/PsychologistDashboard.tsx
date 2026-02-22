import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { PsychologistAgenda } from '../components/dashboard/PsychologistAgenda';
import { PsychologicalEntryModal } from '../components/dashboard/PsychologicalEntryModal';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PsychologistDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'summary' | 'patients' | 'history' | 'agenda' | 'analysis'>('summary');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRisk, setFilterRisk] = useState('all');

    const { data: psychData, isLoading, isError } = useQuery({
        queryKey: ['psychDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            // Fetch all required data in parallel
            const [
                { data: children },
                { data: recentEntries },
                { data: appointments }
            ] = await Promise.all([
                supabase
                    .from('children')
                    .select('id, full_name, psychological_status, psychologist_indications')
                    .eq('organization_id', profile.organization_id),
                supabase
                    .from('child_entries')
                    .select('*, children(full_name)')
                    .eq('organization_id', profile.organization_id)
                    .eq('type', 'psychological')
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('calendar_events')
                    .select('*, children(full_name)')
                    .eq('organization_id', profile.organization_id)
                    .eq('type', 'medical') // Mapping medical to clinical/psychological for now
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(5)
            ]);

            return {
                stats: {
                    totalChildren: children?.length || 0,
                    attentionNeeded: children?.filter(c => c.psychological_status?.toLowerCase().includes('urgente') || c.psychological_status?.toLowerCase().includes('atenção')).length || 0,
                    recentEvolutions: recentEntries?.length || 0,
                    appointmentsToday: appointments?.filter(a => new Date(a.start_time).toDateString() === new Date().toDateString()).length || 0
                },
                allChildren: children || [],
                recentEntries: recentEntries || [],
                appointments: appointments || [],
                criticalChildren: children?.filter(c => c.psychological_status).slice(0, 5) || []
            };
        },
        enabled: !!profile?.organization_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const filteredChildren = psychData?.allChildren.filter(child => {
        const matchesSearch = child.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        const hasRisk = child.psychological_status?.toLowerCase().includes('urgente') || child.psychological_status?.toLowerCase().includes('atenção');
        const matchesRisk = filterRisk === 'all' || (filterRisk === 'urgent' && hasRisk);
        return matchesSearch && matchesRisk;
    });

    if (isLoading) {
        return (
            <div className="space-y-6 w-full animate-pulse pb-24 md:pb-8">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="w-64 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl mb-2"></div>
                        <div className="w-96 h-4 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="w-24 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                            ))}
                        </div>
                        <div className="w-40 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                    </div>
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-white/50 dark:bg-surface-dark/50 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5"></div>
                    ))}
                </div>

                {/* Main Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 h-[400px] bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                    <div className="space-y-6">
                        <div className="h-[200px] bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                        <div className="h-[180px] bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-4xl mb-4">error</span>
                <h3 className="text-xl font-bold mb-2">Erro ao carregar dados</h3>
                <p className="text-sm max-w-md mx-auto mb-4">Não foi possível carregar o painel clínico. Por favor, tente novamente mais tarde.</p>
                <button onClick={() => window.location.reload()} className="h-10 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-sm active:scale-95">Tentar Novamente</button>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Fluxo Clínico (Psicologia)</h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Área de trabalho do profissional de psicologia.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                        {[
                            { id: 'summary', icon: 'dashboard', label: 'Início' },
                            { id: 'patients', icon: 'group', label: 'Pacientes' },
                            { id: 'history', icon: 'history', label: 'Histórico' },
                            { id: 'agenda', icon: 'calendar_month', label: 'Agenda' },
                            { id: 'analysis', icon: 'monitoring', label: 'Análise' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-surface-dark text-primary shadow-sm"
                                        : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                                )}
                            >
                                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => { setSelectedChildId(undefined); setIsEntryModalOpen(true); }}
                        className="flex-1 sm:flex-none h-12 px-5 bg-primary text-white text-sm font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">clinical_notes</span>
                        <span className="whitespace-nowrap">Registrar Evolução</span>
                    </button>
                </div>
            </div>

            {activeTab === 'summary' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            icon="psychology"
                            title="Em Acompanhamento"
                            value={psychData?.stats.totalChildren || 0}
                            subValue="Total de pacientes ativos"
                        />
                        <StatCard
                            icon="priority_high"
                            title="Casos Críticos"
                            value={psychData?.stats.attentionNeeded || 0}
                            variant={psychData?.stats.attentionNeeded && psychData.stats.attentionNeeded > 0 ? "danger" : "default"}
                            subValue="Exigem intervenção imediata"
                        />
                        <StatCard
                            icon="monitoring"
                            title="Registros no Mês"
                            value={psychData?.stats.recentEvolutions || 0}
                            subValue="Progresso clínico documentado"
                        />
                        <StatCard
                            icon="event"
                            title="Hoje"
                            value={psychData?.stats.appointmentsToday || 0}
                            variant="warning"
                            subValue="Sessões agendadas"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Recent Evolutions */}
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">history</span>
                                Atividade Clínica Recente
                            </h2>

                            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                {psychData?.recentEntries.length === 0 ? (
                                    <div className="p-12 text-center text-text-secondary">Nenhum registro recente.</div>
                                ) : (
                                    <div className="divide-y divide-border-light dark:divide-gray-800">
                                        {psychData?.recentEntries.map((entry: any) => (
                                            <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-text-main dark:text-white uppercase text-xs">{entry.children?.full_name}</span>
                                                        <span className={clsx(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                            entry.urgency === 'high' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                                                                entry.urgency === 'medium' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" :
                                                                    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                        )}>
                                                            {entry.urgency === 'high' ? 'Crítico' : entry.urgency === 'medium' ? 'Atenção' : 'Normal'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase">
                                                        {format(new Date(entry.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2 leading-relaxed italic">
                                                    "{entry.content}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Side Widgets */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="font-bold text-text-main dark:text-white text-sm">Próximas Sessões</h3>
                                    <button onClick={() => setActiveTab('agenda')} className="text-xs text-primary font-bold hover:underline">Ver Agenda</button>
                                </div>
                                <div className="p-4 space-y-3">
                                    {psychData?.appointments.length === 0 ? (
                                        <p className="text-xs text-text-secondary text-center py-4 italic">Nenhum agendamento ativo.</p>
                                    ) : (
                                        psychData?.appointments.map((app: any) => (
                                            <div key={app.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent">
                                                <div className="size-10 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-[10px] font-bold uppercase">{format(new Date(app.start_time), 'MMM', { locale: ptBR })}</span>
                                                    <span className="text-sm font-extrabold leading-none">{format(new Date(app.start_time), 'dd')}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-text-main dark:text-white truncate">{app.children?.full_name}</p>
                                                    <p className="text-[10px] text-text-secondary dark:text-gray-500 font-mono">{format(new Date(app.start_time), 'HH:mm')}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl">
                                <h3 className="font-black text-orange-800 dark:text-orange-400 text-[10px] uppercase tracking-widest mb-3">Casos Críticos</h3>
                                <div className="space-y-2">
                                    {psychData?.criticalChildren.length === 0 ? (
                                        <p className="text-[10px] text-orange-700 italic">Nenhum caso de alta prioridade.</p>
                                    ) : (
                                        psychData?.criticalChildren.map((child: any) => (
                                            <div key={child.id} className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-orange-100 dark:border-orange-900/30">
                                                <span className="text-xs font-bold text-text-main dark:text-white truncate">{child.full_name}</span>
                                                <span className="text-[9px] text-white bg-red-500 px-1.5 py-0.5 rounded-md font-black uppercase">Crítico</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'patients' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-dark p-4 rounded-2xl border border-border-light dark:border-gray-800 shadow-sm">
                        <div className="relative w-full md:w-96">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por nome do acolhido..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select
                                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl text-sm"
                                value={filterRisk}
                                onChange={(e) => setFilterRisk(e.target.value)}
                            >
                                <option value="all">Todos os riscos</option>
                                <option value="urgent">Apenas Críticos</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredChildren?.map((child: any) => (
                            <div key={child.id} className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl p-5 hover:border-primary/50 transition-all group cursor-pointer shadow-sm hover:shadow-lg">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary font-bold text-xl ring-2 ring-primary/5 dark:ring-primary/10">
                                        {child.full_name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-text-main dark:text-white truncate group-hover:text-primary transition-colors">{child.full_name}</h3>
                                        <p className="text-xs text-text-secondary dark:text-gray-400 truncate mt-0.5">Paciente Clínico</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-2 border-y border-gray-50 dark:border-gray-800/50">
                                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Status Psicológico</span>
                                        <span className={clsx(
                                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                            child.psychological_status?.toLowerCase().includes('urgente') ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                                                child.psychological_status?.toLowerCase().includes('atenção') ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                        )}>
                                            {child.psychological_status || 'Estável'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setSelectedChildId(child.id); setIsEntryModalOpen(true); }}
                                            className="h-10 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-xl hover:bg-primary transition-all hover:text-white active:scale-95 shadow-sm"
                                        >
                                            Registrar Evolução
                                        </button>
                                        <button
                                            onClick={() => { setSelectedChildId(child.id); setActiveTab('analysis'); }}
                                            className="h-10 bg-gray-100 dark:bg-gray-800 text-text-secondary text-[10px] font-black uppercase rounded-xl hover:bg-gray-200 transition-all dark:hover:bg-gray-700 active:scale-95 shadow-sm"
                                        >
                                            Ver Evolução
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border-light dark:border-gray-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-text-main dark:text-white">Relatório Cronológico de Evoluções</h2>
                        <button className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                            <span className="material-symbols-outlined text-sm">print</span>
                            Imprimir Tudo
                        </button>
                    </div>
                    <div className="divide-y divide-border-light dark:divide-gray-800">
                        {psychData?.recentEntries.map((entry: any) => (
                            <div key={entry.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase">
                                        {entry.children?.full_name}
                                    </span>
                                    <span className="text-xs font-bold text-text-secondary">
                                        {format(new Date(entry.created_at), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
                                        entry.urgency === 'high' ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400" :
                                            entry.urgency === 'medium' ? "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 text-orange-600 dark:text-orange-400" : "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400"
                                    )}>
                                        {entry.urgency}
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-text-main dark:text-white mb-2">{entry.title}</h4>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-text-secondary dark:text-gray-400">
                                    {entry.content}
                                </div>
                                {entry.metadata && (
                                    <div className="mt-4 flex flex-wrap gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-border-light dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-primary">mood</span>
                                            <span className="text-xs font-bold">Humor: {entry.metadata.mood}/5</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-blue-500">bedtime</span>
                                            <span className="text-xs font-bold capitalize">Sono: {entry.metadata.sleep}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-orange-500">restaurant</span>
                                            <span className="text-xs font-bold capitalize">Apetite: {entry.metadata.appetite}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'analysis' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-text-main dark:text-white mb-6">Gráfico de Evolução de Paciente</h3>
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-900/50">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">monitoring</span>
                            <p className="text-sm text-text-secondary text-center px-12">
                                Selecione um paciente para visualizar o gráfico de evolução de humor e estabilidade clínica.
                            </p>
                            <select
                                className="mt-4 px-4 py-2 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={selectedChildId}
                                onChange={(e) => setSelectedChildId(e.target.value)}
                            >
                                <option value="">Escolha o acolhido...</option>
                                {psychData?.allChildren.map(child => (
                                    <option key={child.id} value={child.id}>{child.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-text-main dark:text-white mb-6">Resumo de Indicadores Clínicos</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Estabilidade Emocional', value: '75%', color: 'bg-green-500' },
                                { label: 'Engajamento Terapêutico', value: '60%', color: 'bg-blue-500' },
                                { label: 'Índice de Risco Social', value: '25%', color: 'bg-red-500' }
                            ].map((indicator, idx) => (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                        <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">{indicator.label}</span>
                                        <span className="text-xs font-bold text-text-main dark:text-white">{indicator.value}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className={clsx("h-full transition-all duration-1000", indicator.color)} style={{ width: indicator.value }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'agenda' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PsychologistAgenda />
                </div>
            )}

            <PsychologicalEntryModal
                isOpen={isEntryModalOpen}
                onClose={() => { setIsEntryModalOpen(false); setSelectedChildId(undefined); }}
                initialChildId={selectedChildId}
            />
        </div>
    );
}
