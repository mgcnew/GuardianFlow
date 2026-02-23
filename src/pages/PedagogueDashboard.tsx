import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { PedagogicalAgenda } from '../components/dashboard/PedagogicalAgenda';
import { PedagogicalEntryModal } from '../components/dashboard/PedagogicalEntryModal';
import { SchoolReportModal } from '../components/dashboard/SchoolReportModal';
import { SchoolMeetingModal } from '../components/dashboard/SchoolMeetingModal';
import { ExtracurricularModal } from '../components/dashboard/ExtracurricularModal';
import { AcademicEvolutionReportModal } from '../components/dashboard/AcademicEvolutionReportModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export function PedagogueDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'summary' | 'students' | 'history' | 'agenda' | 'academic'>('summary');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
    const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: pedagogueData, isLoading, isError } = useQuery({
        queryKey: ['pedagogueDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            const [
                { data: children },
                { data: recentEntries },
                { data: schoolEvents },
                { data: schoolReports },
                { data: schoolMeetings },
                { data: extracurricular }
            ] = await Promise.all([
                supabase
                    .from('children')
                    .select('id, full_name, schooling, pedagogue_indications, status')
                    .eq('organization_id', profile.organization_id),
                supabase
                    .from('child_entries')
                    .select('*, children(full_name)')
                    .eq('organization_id', profile.organization_id)
                    .eq('type', 'pedagogical')
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('calendar_events')
                    .select('*, children(full_name)')
                    .eq('organization_id', profile.organization_id)
                    .eq('type', 'school')
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(5),
                supabase
                    .from('school_reports')
                    .select('*, children(full_name)')
                    .eq('organization_id', profile.organization_id),
                supabase
                    .from('school_meetings')
                    .select('*, children(full_name)')
                    .eq('organization_id', profile.organization_id),
                supabase
                    .from('extracurricular_activities')
                    .select('*, children(full_name)')
                    .eq('organization_id', profile.organization_id)
            ]);

            return {
                stats: {
                    totalChildren: children?.length || 0,
                    inSchool: children?.filter(c => c.schooling && !c.schooling.toLowerCase().includes('não')).length || 0,
                    recentActivities: recentEntries?.length || 0,
                    eventsThisWeek: schoolEvents?.length || 0
                },
                allChildren: children || [],
                recentEntries: recentEntries || [],
                schoolEvents: schoolEvents || [],
                schoolReports: schoolReports || [],
                schoolMeetings: schoolMeetings || [],
                extracurricular: extracurricular || [],
                criticalCases: children?.filter(c => c.pedagogue_indications).slice(0, 5) || []
            };
        },
        enabled: !!profile?.organization_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const filteredChildren = pedagogueData?.allChildren.filter(child =>
        child.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            {[1, 2, 3, 4].map(i => (
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
                <p className="text-sm max-w-md mx-auto mb-4">Não foi possível carregar o painel pedagógico. Por favor, tente novamente mais tarde.</p>
                <button onClick={() => window.location.reload()} className="h-10 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-sm active:scale-95">Tentar Novamente</button>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Fluxo Pedagógico</h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Acompanhamento escolar e desenvolvimento educacional.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                        {[
                            { id: 'summary', icon: 'dashboard', label: 'Início' },
                            { id: 'academic', icon: 'auto_stories', label: 'Painel Escolar' },
                            { id: 'students', icon: 'school', label: 'Alunos' },
                            { id: 'history', icon: 'history', label: 'Histórico' },
                            { id: 'agenda', icon: 'calendar_month', label: 'Agenda' }
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
                        onClick={() => { setSelectedChildId(undefined); setIsModalOpen(true); }}
                        className="flex-1 sm:flex-none h-12 px-5 bg-primary text-white text-sm font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        <span className="whitespace-nowrap">Novo Registro</span>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'summary' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            icon="school"
                            title="Em Escolarização"
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
                            title="Agenda da Semana"
                            value={pedagogueData?.stats.eventsThisWeek || 0}
                            variant="warning"
                            subValue="Próximos compromissos"
                        />
                        <StatCard
                            icon="stars"
                            title="Engajamento Geral"
                            value="88%"
                            variant="default"
                            subValue="Meta educacional"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Recent Activities */}
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">history</span>
                                Atividade Educacional Recente
                            </h2>

                            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
                                {pedagogueData?.recentEntries.length === 0 ? (
                                    <div className="p-12 text-center text-text-secondary">Nenhum registro recente.</div>
                                ) : (
                                    <div className="divide-y divide-border-light dark:divide-gray-800">
                                        {pedagogueData?.recentEntries.map((entry: any) => (
                                            <div key={entry.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-text-main dark:text-white uppercase text-xs">{entry.children?.full_name}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary">
                                                            {entry.metadata?.category === 'tutoring' ? 'Reforço' :
                                                                entry.metadata?.category === 'school_visit' ? 'Escola' :
                                                                    entry.metadata?.category === 'evaluation' ? 'Avaliação' : 'Lúdico'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase">
                                                        {format(new Date(entry.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-text-main dark:text-gray-100">{entry.title}</h4>
                                                <p className="text-sm text-text-secondary dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                                                    {entry.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800">
                                    <button onClick={() => setActiveTab('history')} className="text-primary text-sm font-bold hover:underline">Ver todo histórico</button>
                                </div>
                            </div>
                        </div>

                        {/* Side Widgets */}
                        <div className="space-y-6">
                            {/* Next School Events */}
                            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="font-bold text-text-main dark:text-white text-sm">Próximos Escolares</h3>
                                    <button onClick={() => setActiveTab('agenda')} className="text-xs text-primary font-bold hover:underline">Ver Agenda</button>
                                </div>
                                <div className="p-4 space-y-3">
                                    {pedagogueData?.schoolEvents.length === 0 ? (
                                        <p className="text-xs text-text-secondary text-center py-4 italic">Nenhum evento agendado.</p>
                                    ) : (
                                        pedagogueData?.schoolEvents.map((event: any) => (
                                            <div key={event.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="size-10 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-sm font-extrabold">{format(new Date(event.start_time), 'dd')}</span>
                                                    <span className="text-[9px] font-bold uppercase">{format(new Date(event.start_time), 'MMM', { locale: ptBR })}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-text-main dark:text-white truncate">{event.children?.full_name}</p>
                                                    <p className="text-[10px] text-text-secondary dark:text-gray-500 truncate">{event.title}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Warning Widget */}
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl">
                                <h3 className="font-black text-amber-800 dark:text-amber-400 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                                    Atenção Pedagógica
                                </h3>
                                <div className="space-y-2">
                                    {pedagogueData?.criticalCases.length === 0 ? (
                                        <p className="text-[10px] text-amber-700 italic px-1">Nenhuma pendência crítica.</p>
                                    ) : (
                                        pedagogueData?.criticalCases.map((child: any) => (
                                            <div key={child.id} className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/30">
                                                <span className="text-xs font-bold text-text-main dark:text-white truncate">{child.full_name}</span>
                                                <span className="text-[9px] text-white bg-amber-500 px-1.5 py-0.5 rounded-md font-black uppercase">Monitorar</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'students' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-border-light dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Buscar aluno..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button className="h-10 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm">Todos os Anos</button>
                            <button className="h-10 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm">Escolarizados</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredChildren?.map((child: any) => (
                            <div key={child.id} className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl p-5 hover:border-primary/50 transition-all group cursor-pointer shadow-sm hover:shadow-lg">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-14 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-xl font-bold ring-2 ring-green-50 dark:ring-green-900/20">
                                        {child.full_name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-text-main dark:text-white truncate group-hover:text-primary transition-colors">{child.full_name}</h3>
                                        <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">{child.schooling || 'Série não informada'}</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-3 border-t border-gray-50 dark:border-gray-800/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-text-secondary uppercase">Acompanhamento</span>
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                                            child.pedagogue_indications ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                        )}>
                                            {child.pedagogue_indications ? 'Atenção' : 'Regular'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedChildId(child.id); setIsModalOpen(true); }}
                                        className="w-full h-10 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95 shadow-sm"
                                    >
                                        Registrar progresso
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'academic' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Selector - Sidebar of this tab */}
                        <div className="md:col-span-1 space-y-4">
                            <h3 className="text-xs font-black uppercase text-text-secondary tracking-widest px-2">Selecionar Aluno</h3>
                            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl p-2 space-y-1">
                                {pedagogueData?.allChildren.slice(0, 10).map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => setSelectedChildId(child.id)}
                                        className={clsx(
                                            "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all",
                                            selectedChildId === child.id
                                                ? "bg-primary/10 text-primary"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-text-secondary"
                                        )}
                                    >
                                        <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-xs">
                                            {child.full_name[0]}
                                        </div>
                                        <span className="text-xs font-bold truncate">{child.full_name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Details View */}
                        <div className="md:col-span-3 space-y-6">
                            {!selectedChildId ? (
                                <div className="h-[400px] bg-gray-50/50 dark:bg-gray-900/30 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
                                    <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">school</span>
                                    <h3 className="text-xl font-extrabold text-text-main dark:text-gray-100">Painel de Acompanhamento Acadêmico</h3>
                                    <p className="text-sm text-text-secondary max-w-sm mt-2">Selecione um aluno à esquerda para visualizar notas, reuniões e evolução pedagógica.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Selected Child Header */}
                                    <div className="flex items-center justify-between bg-white dark:bg-surface-dark p-6 rounded-3xl border border-border-light dark:border-gray-800 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
                                                {pedagogueData?.allChildren.find(c => c.id === selectedChildId)?.full_name[0]}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-text-main dark:text-white">
                                                    {pedagogueData?.allChildren.find(c => c.id === selectedChildId)?.full_name}
                                                </h2>
                                                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mt-1">
                                                    {pedagogueData?.allChildren.find(c => c.id === selectedChildId)?.schooling || 'Série não informada'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsEvolutionModalOpen(true)}
                                            className="h-10 px-4 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:brightness-110 transition-all shadow-sm active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-sm">print</span>
                                            Relatório de Evolução
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Grades Section */}
                                        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
                                            <div className="p-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                                                <h3 className="font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">analytics</span>
                                                    Boletim Acadêmico
                                                </h3>
                                                <button
                                                    onClick={() => setIsReportModalOpen(true)}
                                                    className="size-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-lg">add</span>
                                                </button>
                                            </div>
                                            <div className="p-5">
                                                <div className="space-y-3">
                                                    {pedagogueData?.schoolReports.filter((r: any) => r.child_id === selectedChildId).length === 0 ? (
                                                        <p className="text-xs text-text-secondary italic text-center py-8">Nenhuma nota registrada.</p>
                                                    ) : (
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="text-text-secondary uppercase font-black tracking-widest border-b border-gray-50 dark:border-gray-800">
                                                                    <th className="pb-2">Disciplina</th>
                                                                    <th className="pb-2">Período</th>
                                                                    <th className="pb-2">Nota</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                                {pedagogueData?.schoolReports
                                                                    .filter((r: any) => r.child_id === selectedChildId)
                                                                    .map((report: any) => (
                                                                        <tr key={report.id} className="group">
                                                                            <td className="py-3 font-bold">{report.subject}</td>
                                                                            <td className="py-3 text-text-secondary">{report.period}</td>
                                                                            <td className="py-3">
                                                                                <span className={clsx(
                                                                                    "font-black px-2 py-1 rounded-lg",
                                                                                    report.grade >= 7 ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-red-600 bg-red-50 dark:bg-red-900/20"
                                                                                )}>
                                                                                    {report.grade}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Extracurricular Section */}
                                        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
                                            <div className="p-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                                                <h3 className="font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">star</span>
                                                    Atividades Extra
                                                </h3>
                                                <button
                                                    onClick={() => setIsExtraModalOpen(true)}
                                                    className="size-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-lg">add</span>
                                                </button>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                {pedagogueData?.extracurricular.filter((a: any) => a.child_id === selectedChildId).length === 0 ? (
                                                    <p className="text-xs text-text-secondary italic text-center py-8">Nenhuma atividade registrada.</p>
                                                ) : (
                                                    pedagogueData?.extracurricular
                                                        .filter((a: any) => a.child_id === selectedChildId)
                                                        .map((activity: any) => (
                                                            <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                                                                <div className="size-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center shadow-sm">
                                                                    <span className="material-symbols-outlined text-primary">
                                                                        {activity.category === 'esporte' ? 'sports_soccer' :
                                                                            activity.category === 'arte' ? 'palette' :
                                                                                activity.category === 'musica' ? 'music_note' : 'school'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black uppercase text-text-main dark:text-white truncate">{activity.name}</p>
                                                                    <p className="text-[10px] text-text-secondary font-bold">{activity.schedule}</p>
                                                                </div>
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-100 dark:bg-green-900/30 text-green-700">Ativo</span>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* School Meetings History */}
                                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="p-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">groups</span>
                                                Atas de Reuniões e Contato Escolar
                                            </h3>
                                            <button
                                                onClick={() => setIsMeetingModalOpen(true)}
                                                className="h-9 px-4 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
                                            >
                                                Nova Ata
                                            </button>
                                        </div>
                                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {pedagogueData?.schoolMeetings.filter((m: any) => m.child_id === selectedChildId).length === 0 ? (
                                                <p className="text-xs text-text-secondary italic text-center py-12">Nenhuma reunião registrada para este aluno.</p>
                                            ) : (
                                                pedagogueData?.schoolMeetings
                                                    .filter((m: any) => m.child_id === selectedChildId)
                                                    .map((meeting: any) => (
                                                        <div key={meeting.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">{format(new Date(meeting.meeting_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                                                                    <p className="text-xs font-bold text-text-main mt-1">Participantes: {meeting.participants}</p>
                                                                </div>
                                                                <span className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-[18px]">article</span>
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-text-secondary dark:text-gray-400 leading-relaxed italic">
                                                                "{meeting.summary}"
                                                            </p>
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="p-6 border-b border-border-light dark:border-gray-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-text-main dark:text-white">Linha do Tempo Pedagógica</h2>
                        <button className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                            <span className="material-symbols-outlined text-sm">download</span>
                            Exportar Histórico
                        </button>
                    </div>
                    <div className="divide-y divide-border-light dark:divide-gray-800">
                        {pedagogueData?.recentEntries.map((entry: any) => (
                            <div key={entry.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                                    <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-[10px] font-black uppercase">
                                        {entry.children?.full_name}
                                    </span>
                                    <span className="text-xs font-bold text-text-secondary dark:text-gray-400">
                                        {format(new Date(entry.created_at), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-400">
                                        {entry.metadata?.category === 'tutoring' ? 'Reforço' :
                                            entry.metadata?.category === 'school_visit' ? 'Escola' :
                                                entry.metadata?.category === 'evaluation' ? 'Avaliação' :
                                                    entry.metadata?.category === 'recreational' ? 'Lúdico' : 'Atividade'}
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-text-main dark:text-white mb-2">{entry.title}</h4>
                                <p className="text-sm text-text-secondary dark:text-gray-400 leading-relaxed max-w-4xl">
                                    {entry.content}
                                </p>
                                {entry.metadata?.engagement && (
                                    <div className="mt-4 flex items-center gap-4 text-xs font-bold text-text-secondary">
                                        <div className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm text-primary">analytics</span>
                                            Participação: {entry.metadata.engagement}/5
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'agenda' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PedagogicalAgenda />
                </div>
            )}

            <PedagogicalEntryModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedChildId(undefined); }}
                initialChildId={selectedChildId}
            />

            <SchoolReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                initialChildId={selectedChildId}
                childrenList={pedagogueData?.allChildren || []}
            />

            <SchoolMeetingModal
                isOpen={isMeetingModalOpen}
                onClose={() => setIsMeetingModalOpen(false)}
                initialChildId={selectedChildId}
                childrenList={pedagogueData?.allChildren || []}
            />

            <ExtracurricularModal
                isOpen={isExtraModalOpen}
                onClose={() => setIsExtraModalOpen(false)}
                initialChildId={selectedChildId}
                childrenList={pedagogueData?.allChildren || []}
            />

            <AcademicEvolutionReportModal
                isOpen={isEvolutionModalOpen}
                onClose={() => setIsEvolutionModalOpen(false)}
                child={pedagogueData?.allChildren.find(c => c.id === selectedChildId)}
                reports={pedagogueData?.schoolReports.filter((r: any) => r.child_id === selectedChildId) || []}
                meetings={pedagogueData?.schoolMeetings.filter((m: any) => m.child_id === selectedChildId) || []}
                activities={pedagogueData?.extracurricular.filter((a: any) => a.child_id === selectedChildId) || []}
            />
        </div>
    );
}
