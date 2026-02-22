import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SocialWorkEntryModal } from '../components/dashboard/SocialWorkEntryModal';
import { HearingModal } from '../components/social/HearingModal';
import { FamilyVisitModal } from '../components/social/FamilyVisitModal';
import { format, differenceInYears, differenceInDays, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { FamilyReferenceModal } from '../components/social/FamilyReferenceModal';
import { AdoptionProcessModal } from '../components/social/AdoptionProcessModal';
import { PIAManagerModal } from '../components/social/PIAManagerModal';
import { PIADocument } from '../components/documents/PIADocument';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

type DashboardTab = 'overview' | 'cases' | 'hearings' | 'visits' | 'adoption';

const LEGAL_STATUS_MAP: Record<string, { label: string; color: string; darkColor: string }> = {
    destituicao_familiar: { label: 'Destituição', color: 'bg-red-100 text-red-700', darkColor: 'dark:bg-red-900/30 dark:text-red-400' },
    acolhimento_provisorio: { label: 'Acolhimento', color: 'bg-purple-100 text-purple-700', darkColor: 'dark:bg-purple-900/30 dark:text-purple-400' },
    reintegracao_familiar: { label: 'Reintegração', color: 'bg-emerald-100 text-emerald-700', darkColor: 'dark:bg-emerald-900/30 dark:text-emerald-400' },
    disponivel_adocao: { label: 'Disp. Adoção', color: 'bg-pink-100 text-pink-700', darkColor: 'dark:bg-pink-900/30 dark:text-pink-400' },
    em_processo_adocao: { label: 'Em Adoção', color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/30 dark:text-blue-400' },
};

const HEARING_TYPE_MAP: Record<string, string> = {
    reavaliacao: 'Reavaliação', destituicao: 'Destituição', adocao: 'Adoção',
    guarda: 'Guarda', tutela: 'Tutela', other: 'Outra',
};

const REACTION_MAP: Record<string, { label: string; icon: string; color: string }> = {
    positive: { label: 'Positiva', icon: 'sentiment_satisfied', color: 'text-green-500' },
    neutral: { label: 'Neutra', icon: 'sentiment_neutral', color: 'text-gray-400' },
    anxious: { label: 'Ansiosa', icon: 'psychology_alt', color: 'text-amber-500' },
    negative: { label: 'Negativa', icon: 'sentiment_dissatisfied', color: 'text-orange-500' },
    aggressive: { label: 'Agressiva', icon: 'sentiment_very_dissatisfied', color: 'text-red-500' },
};

const RELATIONSHIP_MAP: Record<string, string> = {
    mother: 'Mãe', father: 'Pai', sibling: 'Irmão(ã)', grandparent: 'Avô(ó)', uncle_aunt: 'Tio(a)', godparent: 'Padrinho/Madrinha', other: 'Outro',
};

const ADOPTION_STATUS_MAP: Record<string, string> = {
    initial_evaluation: 'Avaliação Inicial',
    family_search: 'Busca de Família',
    approximation: 'Aproximação',
    cohabitation: 'Estágio de Convivência',
    finalized: 'Finalizado (Sentença)',
    suspended: 'Suspenso',
    returned: 'Devolvido/Desistência',
};

export function SocialWorkDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

    // Print Support
    const [childToPrint, setChildToPrint] = useState<any>(null);
    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrintPIA = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `PIA - ${childToPrint?.full_name}`,
    });

    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
    const [isAdoptionModalOpen, setIsAdoptionModalOpen] = useState(false);
    const [selectedAdoptionProcess, setSelectedAdoptionProcess] = useState<any>(null);
    const [isPIAModalOpen, setIsPIAModalOpen] = useState(false);
    const [familyChildName, setFamilyChildName] = useState('');
    const [childSearch, setChildSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data: dashboardData, isLoading, isError } = useQuery({
        queryKey: ['socialWorkDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;
            const orgId = profile.organization_id;

            const [childrenRes, entriesRes, hearingsRes, visitsRes, adoptionRes] = await Promise.all([
                supabase.from('children').select('id, full_name, photo_url, date_of_birth, status, legal_status, judicial_process, origin_type, origin_reason, admission_date, reason_for_admission, mother_name, father_name').eq('organization_id', orgId).order('full_name'),
                supabase.from('child_entries').select('*, children(full_name, photo_url)').eq('organization_id', orgId).eq('type', 'social_work').order('created_at', { ascending: false }).limit(10),
                supabase.from('judicial_hearings').select('*, children(full_name, photo_url)').eq('organization_id', orgId).order('hearing_date', { ascending: true }),
                supabase.from('family_visits').select('*, children(full_name, photo_url)').eq('organization_id', orgId).order('visit_date', { ascending: false }).limit(20),
                supabase.from('adoption_processes').select('*, children(full_name, photo_url)').eq('organization_id', orgId).order('created_at', { ascending: false }),
            ]);

            const children = childrenRes.data || [];
            const entries = entriesRes.data || [];
            const hearings = hearingsRes.data || [];
            const visits = visitsRes.data || [];
            const adoptions = adoptionRes.data || [];

            const now = new Date();
            const upcomingHearings = hearings.filter((h: any) => isAfter(parseISO(h.hearing_date), now));
            const urgentHearings = upcomingHearings.filter((h: any) => isBefore(parseISO(h.hearing_date), addDays(now, 7)));
            const adoptionActive = children.filter(c => c.legal_status === 'disponivel_adocao' || c.legal_status === 'em_processo_adocao');
            const longStay = children.filter(c => c.admission_date && differenceInDays(now, parseISO(c.admission_date)) > 365);

            return {
                children,
                entries,
                hearings,
                visits,
                adoptions,
                stats: {
                    totalChildren: children.length,
                    upcomingHearings: upcomingHearings.length,
                    urgentHearings: urgentHearings.length,
                    totalVisits: visits.length,
                    adoptionCases: adoptionActive.length,
                    longStay: longStay.length,
                    totalEntries: entries.length,
                }
            };
        },
        enabled: !!profile?.organization_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const filteredChildren = dashboardData?.children.filter((child: any) => {
        const matchesSearch = child.full_name.toLowerCase().includes(childSearch.toLowerCase()) || child.judicial_process?.toLowerCase().includes(childSearch.toLowerCase());
        const matchesStatus = statusFilter === 'all' || child.legal_status === statusFilter;
        return matchesSearch && matchesStatus;
    }) || [];

    if (isLoading) {
        return (
            <div className="space-y-6 w-full animate-pulse pb-24 md:pb-8">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="w-48 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl mb-2"></div>
                        <div className="w-64 h-4 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-24 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                        <div className="w-24 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                        <div className="w-32 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                    </div>
                </div>

                {/* Tabs Skeleton */}
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-28 h-10 bg-gray-100 dark:bg-gray-800/50 rounded-xl"></div>
                    ))}
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-24 bg-white/50 dark:bg-surface-dark/50 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4"></div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="h-[400px] bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                    <div className="h-[400px] bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-4xl mb-4">error</span>
                <h3 className="text-xl font-bold mb-2">Erro ao carregar assistência social</h3>
                <p className="text-sm max-w-md mx-auto mb-4">Não foi possível carregar as informações do serviço social. Por favor, tente novamente mais tarde.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="h-10 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition active:scale-95 shadow-sm"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (!dashboardData) return null;

    const TABS = [
        { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
        { id: 'cases', label: 'Gestão de Casos', icon: 'folder_shared' },
        { id: 'hearings', label: 'Audiências', icon: 'gavel' },
        { id: 'visits', label: 'Visitas', icon: 'family_restroom' },
        { id: 'adoption', label: 'Adoção', icon: 'favorite' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-text-main dark:text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">social_leaderboard</span>
                        Serviço Social
                    </h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Gestão de casos, audiências, visitas familiares e processos de adoção.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto order-last sm:order-none">
                    <button onClick={() => { setSelectedChildId(undefined); setIsVisitModalOpen(true); }}
                        className="flex-1 sm:flex-none h-12 px-4 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-lg text-purple-500">family_restroom</span>
                        <span className="hidden xs:inline">Visita</span>
                    </button>
                    <button onClick={() => { setSelectedChildId(undefined); setIsHearingModalOpen(true); }}
                        className="flex-1 sm:flex-none h-12 px-4 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-lg text-red-500">gavel</span>
                        <span className="hidden xs:inline">Audiência</span>
                    </button>
                    <button onClick={() => { setSelectedChildId(undefined); setIsEntryModalOpen(true); }}
                        className="flex-[2] sm:flex-none h-12 px-6 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-lg">add</span>
                        Novo <span className="hidden xs:inline">Atendimento</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as DashboardTab)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
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

            {/* Tab Content */}
            {activeTab === 'overview' && <OverviewTab data={dashboardData} onOpenEntry={(id?: string) => { if (id) setSelectedChildId(id); setIsEntryModalOpen(true); }} onOpenHearing={(id?: string) => { if (id) setSelectedChildId(id); setIsHearingModalOpen(true); }} />}
            {activeTab === 'cases' && <CasesTab search={childSearch} setSearch={setChildSearch} filter={statusFilter} setFilter={setStatusFilter} filtered={filteredChildren} onOpenEntry={(id: string) => { setSelectedChildId(id); setIsEntryModalOpen(true); }} onOpenFamily={(id: string, name: string) => { setSelectedChildId(id); setFamilyChildName(name); setIsFamilyModalOpen(true); }} onOpenPIA={(id: string, name: string) => { setSelectedChildId(id); setFamilyChildName(name); setIsPIAModalOpen(true); }} onPrint={(child: any) => { setChildToPrint(child); setTimeout(() => handlePrintPIA(), 100); }} />}
            {activeTab === 'hearings' && <HearingsTab data={dashboardData} onNew={() => setIsHearingModalOpen(true)} />}
            {activeTab === 'visits' && <VisitsTab data={dashboardData} onNew={() => setIsVisitModalOpen(true)} />}
            {activeTab === 'adoption' && <AdoptionTab data={dashboardData} onEdit={(proc: any) => { setSelectedAdoptionProcess(proc); setIsAdoptionModalOpen(true); }} onNew={() => { setSelectedAdoptionProcess(null); setIsAdoptionModalOpen(true); }} />}

            <SocialWorkEntryModal isOpen={isEntryModalOpen} onClose={() => { setIsEntryModalOpen(false); setSelectedChildId(undefined); }} initialChildId={selectedChildId} />
            <HearingModal isOpen={isHearingModalOpen} onClose={() => { setIsHearingModalOpen(false); setSelectedChildId(undefined); }} initialChildId={selectedChildId} />
            <FamilyVisitModal isOpen={isVisitModalOpen} onClose={() => { setIsVisitModalOpen(false); setSelectedChildId(undefined); }} initialChildId={selectedChildId} />
            <FamilyReferenceModal
                isOpen={isFamilyModalOpen}
                onClose={() => setIsFamilyModalOpen(false)}
                childId={selectedChildId || ''}
                childName={familyChildName}
            />
            <AdoptionProcessModal
                isOpen={isAdoptionModalOpen}
                onClose={() => { setIsAdoptionModalOpen(false); setSelectedAdoptionProcess(null); setSelectedChildId(undefined); setFamilyChildName(''); }}
                childId={selectedChildId}
                childName={familyChildName}
                existingProcess={selectedAdoptionProcess}
            />
            <PIAManagerModal
                isOpen={isPIAModalOpen}
                onClose={() => { setIsPIAModalOpen(false); setSelectedChildId(undefined); setFamilyChildName(''); }}
                childId={selectedChildId || ''}
                childName={familyChildName}
            />

            {/* Hidden component for printing */}
            <div style={{ display: 'none' }}>
                {childToPrint && <PIADocument ref={componentRef} child={childToPrint} />}
            </div>
        </div>
    );
}

/* ==================== OVERVIEW TAB ==================== */
function OverviewTab({ data, onOpenEntry, onOpenHearing }: { data: any; onOpenEntry: (id?: string) => void; onOpenHearing: (id?: string) => void }) {
    if (!data) return null;
    const now = new Date();
    const upcomingHearings = (data.hearings || []).filter((h: any) => isAfter(parseISO(h.hearing_date), now)).slice(0, 5);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { icon: 'diversity_3', label: 'Acolhidos', value: data.stats.totalChildren, color: 'blue' },
                    { icon: 'gavel', label: 'Audiências Próx.', value: data.stats.upcomingHearings, color: 'red' },
                    { icon: 'priority_high', label: 'Audiências 7d', value: data.stats.urgentHearings, color: 'rose' },
                    { icon: 'family_restroom', label: 'Visitas (Total)', value: data.stats.totalVisits, color: 'purple' },
                    { icon: 'favorite', label: 'Casos Adoção', value: data.stats.adoptionCases, color: 'pink' },
                    { icon: 'schedule', label: 'Acolhimento +1 ano', value: data.stats.longStay, color: 'amber' },
                ].map((stat, i) => (
                    <div key={i} className={clsx(
                        "rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md",
                        stat.color === 'blue' && "bg-blue-50/50 border-blue-100 dark:bg-surface-dark dark:border-gray-800",
                        stat.color === 'red' && "bg-red-50/50 border-red-100 dark:bg-surface-dark dark:border-gray-800",
                        stat.color === 'rose' && "bg-rose-50/50 border-rose-100 dark:bg-surface-dark dark:border-gray-800",
                        stat.color === 'purple' && "bg-purple-50/50 border-purple-100 dark:bg-surface-dark dark:border-gray-800",
                        stat.color === 'pink' && "bg-pink-50/50 border-pink-100 dark:bg-surface-dark dark:border-gray-800",
                        stat.color === 'amber' && "bg-amber-50/50 border-amber-100 dark:bg-surface-dark dark:border-gray-800"
                    )}>
                        <div className={clsx(
                            "size-9 rounded-xl flex items-center justify-center mb-2",
                            stat.color === 'blue' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
                            stat.color === 'red' && "bg-red-100 dark:bg-red-900/30 text-red-600",
                            stat.color === 'rose' && "bg-rose-100 dark:bg-rose-900/30 text-rose-600",
                            stat.color === 'purple' && "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
                            stat.color === 'pink' && "bg-pink-100 dark:bg-pink-900/30 text-pink-600",
                            stat.color === 'amber' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                        )}>
                            <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                        </div>
                        <p className="text-2xl font-black text-text-main dark:text-white">{stat.value}</p>
                        <p className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Upcoming Hearings */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-red-500">gavel</span>Próximas Audiências
                        </h2>
                        <button onClick={() => onOpenHearing()} className="text-[10px] font-bold text-primary uppercase tracking-wider hover:text-primary-dark transition-colors">+ Nova</button>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {upcomingHearings.length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl mb-2 block">event_busy</span>
                                <p className="text-sm text-text-secondary dark:text-gray-500">Nenhuma audiência agendada.</p>
                            </div>
                        ) : upcomingHearings.map((h: any) => {
                            const daysUntil = differenceInDays(parseISO(h.hearing_date), now);
                            const isUrgent = daysUntil <= 7;
                            return (
                                <div key={h.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className={clsx("flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 min-w-[3.5rem]", isUrgent ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-400")}>
                                            <span className="text-[10px] font-bold uppercase">{format(parseISO(h.hearing_date), 'MMM', { locale: ptBR })}</span>
                                            <span className="text-lg font-black leading-none">{format(parseISO(h.hearing_date), 'dd')}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={clsx("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide", isUrgent ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400")}>
                                                    {HEARING_TYPE_MAP[h.hearing_type] || h.hearing_type}
                                                </span>
                                                {isUrgent && <span className="text-[9px] font-bold text-red-500 animate-pulse">Em {daysUntil}d</span>}
                                            </div>
                                            <p className="text-sm font-bold text-text-main dark:text-white truncate">{h.children?.full_name}</p>
                                            <p className="text-[10px] text-text-secondary dark:text-gray-500">{h.court || 'Vara não informada'} • {format(parseISO(h.hearing_date), 'HH:mm')}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Entries */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-blue-500">history</span>Atendimentos Recentes
                        </h2>
                        <button onClick={() => onOpenEntry()} className="text-[10px] font-bold text-primary uppercase tracking-wider hover:text-primary-dark transition-colors">+ Novo</button>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {(data.entries || []).length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl mb-2 block">note_alt</span>
                                <p className="text-sm text-text-secondary dark:text-gray-500">Nenhum atendimento registrado.</p>
                            </div>
                        ) : (data.entries || []).slice(0, 5).map((entry: any) => (
                            <div key={entry.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <img src={entry.children?.photo_url || `https://ui-avatars.com/api/?name=${entry.children?.full_name}&background=random`} className="size-6 rounded-full" />
                                        <span className="text-xs font-bold text-text-main dark:text-white truncate max-w-[150px]">{entry.children?.full_name}</span>
                                        <span className={clsx("px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                            entry.urgency === 'high' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                                entry.urgency === 'medium' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                                                    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                        )}>{entry.urgency === 'high' ? 'Alta' : entry.urgency === 'medium' ? 'Média' : 'Normal'}</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-text-secondary dark:text-gray-500">{format(parseISO(entry.created_at), "dd/MM HH:mm")}</span>
                                </div>
                                <p className="text-sm font-medium text-text-main dark:text-gray-200 line-clamp-1">{entry.title}</p>
                                <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-1 mt-0.5">{entry.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Visits Summary */}
            {(data.visits || []).length > 0 && (
                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border-light dark:border-gray-800">
                        <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-purple-500">family_restroom</span>Últimas Visitas Familiares
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 dark:bg-gray-800">
                        {(data.visits || []).slice(0, 6).map((v: any) => (
                            <div key={v.id} className="p-4 bg-white dark:bg-surface-dark">
                                <div className="flex items-center gap-2 mb-2">
                                    <img src={v.children?.photo_url || `https://ui-avatars.com/api/?name=${v.children?.full_name}&background=random`} className="size-7 rounded-full" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-text-main dark:text-white truncate">{v.children?.full_name}</p>
                                        <p className="text-[10px] text-text-secondary dark:text-gray-500">{format(parseISO(v.visit_date), 'dd/MM/yyyy HH:mm')}</p>
                                    </div>
                                    {v.child_reaction && REACTION_MAP[v.child_reaction] && (
                                        <span className={`material-symbols-outlined text-lg ${REACTION_MAP[v.child_reaction].color}`}>{REACTION_MAP[v.child_reaction].icon}</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-text-secondary dark:text-gray-500">
                                    <strong>{v.visitor_name}</strong> ({RELATIONSHIP_MAP[v.relationship] || v.relationship}) • {v.duration_minutes}min
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ==================== CASES TAB ==================== */
function CasesTab({ search, setSearch, filter, setFilter, filtered, onOpenEntry, onOpenFamily, onOpenPIA, onPrint }: any) {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                        <span className="material-symbols-outlined text-primary">folder_shared</span>Todos os Casos ({filtered.length})
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                        <div className="relative w-full sm:flex-1 lg:w-80">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input type="text" placeholder="Buscar por nome ou processo..." value={search} onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all" />
                        </div>
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}
                            className="w-full sm:w-auto px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-primary/50">
                            <option value="all">Status Legal: Todos</option>
                            {Object.entries(LEGAL_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Acolhido</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hidden sm:table-cell">Idade</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Status Legal</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hidden md:table-cell">Motivo do Acolhimento</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hidden lg:table-cell">Tempo Acolhido</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary text-sm">Nenhum acolhido encontrado.</td></tr>
                            ) : filtered.map((child: any) => {
                                const ageText = child.date_of_birth ? `${differenceInYears(new Date(), parseISO(child.date_of_birth))} anos` : '-';
                                const daysIn = child.admission_date ? differenceInDays(new Date(), parseISO(child.admission_date)) : 0;
                                const timeText = daysIn > 365 ? `${Math.floor(daysIn / 365)}a ${Math.floor((daysIn % 365) / 30)}m` : daysIn > 30 ? `${Math.floor(daysIn / 30)} meses` : `${daysIn} dias`;
                                const status = LEGAL_STATUS_MAP[child.legal_status] || { label: child.legal_status?.replace(/_/g, ' ') || 'Não definido', color: 'bg-gray-100 text-gray-600', darkColor: 'dark:bg-gray-800 dark:text-gray-400' };
                                return (
                                    <tr key={child.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <Link to={`/dashboard/children/${child.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}&background=random`} className="size-9 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                                                <div>
                                                    <p className="text-sm font-bold text-text-main dark:text-white">{child.full_name}</p>
                                                    <p className="text-[10px] text-text-secondary dark:text-gray-500">{child.judicial_process || 'S/ Processo'}</p>
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell"><span className="text-xs font-medium text-text-secondary dark:text-gray-400">{ageText}</span></td>
                                        <td className="px-4 py-3"><span className={clsx("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide", status.color, status.darkColor)}>{status.label}</span></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-text-secondary dark:text-gray-400 line-clamp-1 max-w-[200px]">{child.reason_for_admission || child.origin_reason || '-'}</span></td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className={clsx("text-xs font-mono font-medium", daysIn > 365 ? "text-red-500" : daysIn > 180 ? "text-amber-500" : "text-text-secondary dark:text-gray-400")}>{timeText}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => onPrint(child)} className="size-9 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-500 hover:text-white text-gray-400 transition-all flex items-center justify-center shrink-0" title="Imprimir PIA">
                                                    <span className="material-symbols-outlined text-lg">print</span>
                                                </button>
                                                <button onClick={() => onOpenPIA(child.id, child.full_name)} className="size-9 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-white text-gray-400 transition-all flex items-center justify-center shrink-0" title="Gerenciar PIA">
                                                    <span className="material-symbols-outlined text-lg">assignment</span>
                                                </button>
                                                <button onClick={() => onOpenFamily(child.id, child.full_name)} className="size-9 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-white text-gray-400 transition-all flex items-center justify-center shrink-0" title="Referências Familiares">
                                                    <span className="material-symbols-outlined text-lg">family_restroom</span>
                                                </button>
                                                <button onClick={() => onOpenEntry(child.id)} className="size-9 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-white text-gray-400 transition-all flex items-center justify-center shrink-0" title="Nova Anotação">
                                                    <span className="material-symbols-outlined text-lg">edit_note</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ==================== HEARINGS TAB ==================== */
function HearingsTab({ data, onNew }: { data: any; onNew: () => void }) {
    const now = new Date();
    const upcoming = (data?.hearings || []).filter((h: any) => isAfter(parseISO(h.hearing_date), now));
    const past = (data?.hearings || []).filter((h: any) => isBefore(parseISO(h.hearing_date), now));

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-text-main dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">gavel</span>Audiências Judiciais
                </h2>
                <button onClick={onNew} className="h-10 px-4 bg-red-600 text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all flex items-center gap-2 shadow-sm active:scale-95">
                    <span className="material-symbols-outlined text-lg">add</span>Nova Audiência
                </button>
            </div>

            {/* Upcoming */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800">
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">Próximas ({upcoming.length})</h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {upcoming.length === 0 ? (
                        <div className="p-8 text-center"><p className="text-sm text-text-secondary">Nenhuma audiência agendada.</p></div>
                    ) : upcoming.map((h: any) => {
                        const daysUntil = differenceInDays(parseISO(h.hearing_date), now);
                        return (
                            <div key={h.id} className="p-4 hover:bg-red-50/30 dark:hover:bg-red-900/5 transition-colors">
                                <div className="flex flex-col xs:flex-row items-start gap-4">
                                    <div className={clsx("flex xs:flex-col items-center justify-center rounded-xl p-2 xs:px-3 xs:py-2 min-w-full xs:min-w-[4.5rem] gap-2 xs:gap-0", daysUntil <= 3 ? "bg-red-100 dark:bg-red-900/30 text-red-600 animate-pulse" : daysUntil <= 7 ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "bg-gray-50 dark:bg-gray-800 text-text-secondary")}>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] xs:text-[10px] font-black uppercase">{format(parseISO(h.hearing_date), 'MMM', { locale: ptBR })}</span>
                                            <span className="text-lg xs:text-xl font-black leading-none">{format(parseISO(h.hearing_date), 'dd')}</span>
                                        </div>
                                        <div className="xs:border-t xs:border-current/10 xs:mt-1 xs:pt-1">
                                            <span className="text-[10px] font-bold">{format(parseISO(h.hearing_date), 'HH:mm')}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[9px] font-black uppercase tracking-wide">{HEARING_TYPE_MAP[h.hearing_type] || h.hearing_type}</span>
                                            {daysUntil <= 3 && <span className="text-[10px] font-bold text-red-500 animate-pulse">Em {daysUntil}d</span>}
                                        </div>
                                        <p className="text-sm font-bold text-text-main dark:text-white truncate">{h.children?.full_name}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-text-secondary dark:text-gray-500">
                                            {h.court && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">account_balance</span>{h.court}</span>}
                                            {h.judge_name && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span>{h.judge_name}</span>}
                                        </div>
                                        {h.subject && <p className="text-xs text-text-secondary dark:text-gray-400 mt-2 line-clamp-2 italic">"{h.subject}"</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Past */}
            {past.length > 0 && (
                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border-light dark:border-gray-800">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Realizadas ({past.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {past.slice(0, 10).map((h: any) => (
                            <div key={h.id} className="p-4 opacity-70">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-text-secondary dark:text-gray-500">{format(parseISO(h.hearing_date), 'dd/MM/yy')}</span>
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black uppercase text-gray-500">{HEARING_TYPE_MAP[h.hearing_type]}</span>
                                    <span className="text-sm font-bold text-text-main dark:text-white">{h.children?.full_name}</span>
                                    {h.outcome && h.outcome !== 'pending' && <span className={clsx("px-1.5 py-0.5 rounded text-[8px] font-black uppercase", h.outcome === 'favorable' ? "bg-green-100 text-green-600" : h.outcome === 'unfavorable' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500")}>{h.outcome === 'favorable' ? 'Favorável' : h.outcome === 'unfavorable' ? 'Desfavorável' : h.outcome === 'adjourned' ? 'Adiada' : h.outcome}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ==================== VISITS TAB ==================== */
function VisitsTab({ data, onNew }: { data: any; onNew: () => void }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-text-main dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500">family_restroom</span>Visitas Familiares
                </h2>
                <button onClick={onNew} className="h-10 px-4 bg-purple-600 text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all flex items-center gap-2 shadow-sm active:scale-95">
                    <span className="material-symbols-outlined text-lg">add</span>Nova Visita
                </button>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {(data?.visits || []).length === 0 ? (
                        <div className="p-12 text-center">
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3 block">family_restroom</span>
                            <p className="text-sm text-text-secondary dark:text-gray-500 font-medium">Nenhuma visita registrada ainda.</p>
                            <button onClick={onNew} className="mt-4 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 text-xs font-bold rounded-xl hover:bg-purple-100 transition-all">Registrar Primeira Visita</button>
                        </div>
                    ) : (data?.visits || []).map((v: any) => (
                        <div key={v.id} className="p-5 hover:bg-purple-50/20 dark:hover:bg-purple-900/5 transition-colors">
                            <div className="flex items-start gap-4">
                                <img src={v.children?.photo_url || `https://ui-avatars.com/api/?name=${v.children?.full_name}&background=random`} className="size-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-bold text-text-main dark:text-white">{v.children?.full_name}</p>
                                        <span className="text-[10px] font-medium text-text-secondary dark:text-gray-500">{format(parseISO(v.visit_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-text-secondary dark:text-gray-400">
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">person</span><strong>{v.visitor_name}</strong> ({RELATIONSHIP_MAP[v.relationship] || v.relationship})</span>
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span>{v.duration_minutes}min</span>
                                        {v.child_reaction && REACTION_MAP[v.child_reaction] && (
                                            <span className={`flex items-center gap-1 ${REACTION_MAP[v.child_reaction].color}`}>
                                                <span className="material-symbols-outlined text-sm">{REACTION_MAP[v.child_reaction].icon}</span>{REACTION_MAP[v.child_reaction].label}
                                            </span>
                                        )}
                                    </div>
                                    {v.observations && <p className="text-xs text-text-secondary dark:text-gray-400 mt-1.5 line-clamp-2">{v.observations}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ==================== ADOPTION TAB ==================== */
function AdoptionTab({ data, onEdit, onNew }: any) {
    const adoptionChildren = data?.children.filter((c: any) =>
        c.legal_status === 'disponivel_adocao' || c.legal_status === 'em_processo_adocao'
    ) || [];
    const processes = data?.adoptions || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Crianças em Adoção</h3>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Gestão de Vínculos e Processos</p>
                </div>
                <button onClick={onNew} className="h-10 px-4 bg-pink-500 text-white text-[10px] font-black uppercase rounded-xl hover:brightness-110 transition-all flex items-center gap-2 shadow-sm active:scale-95">
                    <span className="material-symbols-outlined text-lg">add</span>Novo Processo
                </button>
            </div>

            {/* Children available or in process */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {adoptionChildren.length === 0 ? (
                    <div className="col-span-full">
                        <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm p-12 text-center">
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3 block">favorite_border</span>
                            <p className="text-sm text-text-secondary dark:text-gray-500 font-medium">Nenhum acolhido com status de adoção no momento.</p>
                            <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">Atualize o status legal dos acolhidos para "Disponível para Adoção" quando aplicável.</p>
                        </div>
                    </div>
                ) : adoptionChildren.map((child: any) => {
                    const status = LEGAL_STATUS_MAP[child.legal_status];
                    const process = processes.find((p: any) => p.child_id === child.id);
                    return (
                        <div key={child.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}&background=random`} className="size-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                                <div>
                                    <Link to={`/dashboard/children/${child.id}`} className="text-sm font-bold text-text-main dark:text-white hover:text-primary transition-colors">{child.full_name}</Link>
                                    <p className="text-[10px] text-text-secondary dark:text-gray-500">{child.date_of_birth ? `${differenceInYears(new Date(), parseISO(child.date_of_birth))} anos` : '-'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {status && <span className={clsx("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide inline-block", status.color, status.darkColor)}>{status.label}</span>}
                                {process ? (
                                    <div className="p-3 bg-pink-50/50 dark:bg-pink-900/10 rounded-xl">
                                        <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider mb-1">Processo Ativo</p>
                                        {process.adopter_name && <p className="text-xs text-text-main dark:text-white"><strong>Adotante:</strong> {process.adopter_name}</p>}
                                        {process.court && <p className="text-[10px] text-text-secondary">{process.court}</p>}
                                        <p className="text-[10px] text-text-secondary mt-1">Status: <strong>{ADOPTION_STATUS_MAP[process.status] || process.status?.replace(/_/g, ' ')}</strong></p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-text-secondary italic">Sem processo de adoção registrado</p>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                {process ? (
                                    <button onClick={() => onEdit(process)} className="text-[10px] font-black text-pink-600 uppercase hover:underline">Ver Detalhes</button>
                                ) : (
                                    <button onClick={() => onEdit({ child_id: child.id })} className="text-[10px] font-black text-text-secondary uppercase hover:text-pink-600 transition-colors">Iniciar Processo</button>
                                )}
                                <p className="text-[10px] font-bold text-text-secondary uppercase">{child.judicial_process || 'Sem Nº Processo'}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
