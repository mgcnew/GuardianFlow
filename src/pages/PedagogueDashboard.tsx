import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { PedagogicalAgenda } from '../components/dashboard/PedagogicalAgenda';
import { PedagogicalEntryModal } from '../components/dashboard/PedagogicalEntryModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export function PedagogueDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'summary' | 'students' | 'history' | 'agenda'>('summary');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: pedagogueData, isLoading } = useQuery({
        queryKey: ['pedagogueDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            const { data: children } = await supabase
                .from('children')
                .select('id, full_name, schooling, pedagogue_indications, status')
                .eq('organization_id', profile.organization_id);

            const { data: recentEntries } = await supabase
                .from('child_entries')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'pedagogical')
                .order('created_at', { ascending: false })
                .limit(10);

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
                allChildren: children || [],
                recentEntries: recentEntries || [],
                schoolEvents: schoolEvents || [],
                criticalCases: children?.filter(c => c.pedagogue_indications).slice(0, 5) || []
            };
        },
        enabled: !!profile?.organization_id
    });

    const filteredChildren = pedagogueData?.allChildren.filter(child =>
        child.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando painel pedagógico...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Fluxo Pedagógico</h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Acompanhamento escolar e desenvolvimento educacional.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        {[
                            { id: 'summary', icon: 'dashboard', label: 'Início' },
                            { id: 'students', icon: 'school', label: 'Alunos' },
                            { id: 'history', icon: 'history', label: 'Histórico' },
                            { id: 'agenda', icon: 'calendar_month', label: 'Agenda' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-surface-dark text-primary shadow-sm"
                                        : "text-text-secondary hover:text-text-main dark:text-gray-400"
                                )}
                            >
                                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => { setSelectedChildId(undefined); setIsModalOpen(true); }}
                        className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        Novo Registro
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'summary' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
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
                            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-text-secondary">Todos os Anos</button>
                            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-text-secondary">Escolarizados</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredChildren?.map((child: any) => (
                            <div key={child.id} className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl p-5 hover:border-primary/50 transition-all group cursor-pointer shadow-sm hover:shadow-lg">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-14 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center text-xl font-bold ring-2 ring-green-50">
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
                                            child.pedagogue_indications ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                                        )}>
                                            {child.pedagogue_indications ? 'Atenção' : 'Regular'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedChildId(child.id); setIsModalOpen(true); }}
                                        className="w-full py-2.5 bg-primary/5 text-primary text-[10px] font-black uppercase rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95"
                                    >
                                        Registrar progresso
                                    </button>
                                </div>
                            </div>
                        ))}
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
                                    <span className="text-xs font-bold text-text-secondary">
                                        {format(new Date(entry.created_at), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-text-secondary">
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
        </div>
    );
}
