import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChildCard } from '../components/children/ChildCard';
import { AddChildModal } from '../components/children/AddChildModal';
import { EditChildModal } from '../components/children/EditChildModal';
import { MedicationsModal } from '../components/children/MedicationsModal';
import { ChildDetailsModal } from '../components/children/ChildDetailsModal';
import { StatCard } from '../components/dashboard/StatCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Child {
    id: string;
    organization_id: string;
    full_name: string;
    date_of_birth: string | null;
    admission_date: string | null;
    status: 'active' | 'pending' | 'urgent';
    unit: string | null;
    legal_status: string | null;
    photo_url: string | null;
    created_at: string;
    mother_name?: string | null;
    father_name?: string | null;
    judicial_process?: string | null;
    nis?: string | null;
    cpf?: string | null;
    rg?: string | null;
}

export function ChildrenList() {
    const { canAccess } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<Child | null>(null);
    const [medicationChild, setMedicationChild] = useState<Child | null>(null);
    const [viewChildId, setViewChildId] = useState<string | null>(null);
    const [editModalTab, setEditModalTab] = useState<'basic' | 'medications'>('basic');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'active' | 'pending'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'age' | 'time'>('name');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { data: children, isLoading } = useQuery({
        queryKey: ['children'],
        queryFn: async () => {
            const { data, error: fetchError } = await supabase
                .from('children')
                .select('*')
                .order('full_name');

            if (fetchError) throw fetchError;
            return data as Child[] || [];
        },
        staleTime: 1000 * 60 * 5,
    });

    const calculateAge = (dob: string | null) => {
        if (!dob) return 0;
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const calculateTimeInCareDays = (admissionDate: string | null) => {
        if (!admissionDate) return 0;
        const start = new Date(admissionDate);
        const now = new Date();
        return Math.ceil(Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const formatTimeInCare = (admissionDate: string | null) => {
        const diffDays = calculateTimeInCareDays(admissionDate);
        if (diffDays === 0) return 'Recente';
        if (diffDays < 30) return `${diffDays} dias`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths} meses`;
        const diffYears = Math.floor(diffMonths / 12);
        return `${diffYears} anos`;
    };

    const filteredChildren = (children || [])
        .filter(child => {
            if (activeTab !== 'all' && child.status !== activeTab) return false;
            const query = searchQuery.toLowerCase();
            return (
                child.full_name.toLowerCase().includes(query) ||
                (child.mother_name?.toLowerCase().includes(query)) ||
                (child.judicial_process?.toLowerCase().includes(query)) ||
                (child.cpf?.includes(query))
            );
        })
        .sort((a, b) => {
            if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
            if (sortBy === 'age') return calculateAge(b.date_of_birth) - calculateAge(a.date_of_birth);
            if (sortBy === 'time') return calculateTimeInCareDays(b.admission_date) - calculateTimeInCareDays(a.admission_date);
            return 0;
        });

    const totalPages = Math.ceil(filteredChildren.length / PAGE_SIZE);
    const paginatedChildren = filteredChildren.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const stats = {
        total: children?.length || 0,
        urgent: children?.filter(c => c.status === 'urgent').length || 0,
        active: children?.filter(c => c.status === 'active').length || 0,
        pending: children?.filter(c => c.status === 'pending').length || 0,
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                        <div className="h-4 w-64 bg-slate-100 dark:bg-slate-900 rounded-lg" />
                    </div>
                    <div className="h-11 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-[140px] bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-slate-100 dark:border-gray-800 p-5 flex flex-col justify-between">
                            <div className="size-12 rounded-2xl bg-slate-200 dark:bg-slate-700/50" />
                            <div>
                                <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-700/50 rounded-lg mb-1.5" />
                                <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-72 bg-white/50 dark:bg-surface-dark/50 rounded-[20px] border border-slate-100 dark:border-gray-800" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header - Scaled down */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 rounded-full text-[9px] font-black uppercase tracking-widest text-primary mb-3">
                        <span className="material-symbols-outlined text-[14px]">id_card</span>
                        Gestão de Identidade
                    </div>
                    <h2 className="text-3xl font-black text-text-main dark:text-white font-display tracking-tight leading-none mb-2">Acolhidos</h2>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium">Controle técnico e prontuários digitais integrados.</p>
                </div>
                {canAccess('children', 'create') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-11 flex items-center justify-center gap-2 bg-primary text-white font-black uppercase tracking-[0.05em] text-[11px] px-6 rounded-xl transition-all shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Novo Acolhimento
                    </button>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="groups"
                    title="Total Geral"
                    value={stats.total}
                    variant="info"
                    active={activeTab === 'all'}
                    onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                />
                <StatCard
                    icon="bolt"
                    title="Urgências"
                    value={stats.urgent}
                    variant="danger"
                    active={activeTab === 'urgent'}
                    onClick={() => { setActiveTab('urgent'); setCurrentPage(1); }}
                />
                <StatCard
                    icon="verified"
                    title="Efetivados"
                    value={stats.active}
                    variant="success"
                    active={activeTab === 'active'}
                    onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
                />
                <StatCard
                    icon="hourglass_top"
                    title="Processamento"
                    value={stats.pending}
                    variant="warning"
                    active={activeTab === 'pending'}
                    onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                />
            </div>

            {/* Filter & Search Bar - Scaled down */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="flex-1 relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-surface-dark border-2 border-slate-50 dark:border-transparent rounded-[18px] text-[13px] font-bold text-text-main dark:text-white placeholder-slate-400 focus:border-primary/20 transition-all outline-none shadow-sm"
                        placeholder="Pesquisar acolhido..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <div className="flex p-1 bg-white dark:bg-surface-dark border border-slate-100 dark:border-gray-800 rounded-[16px] shadow-sm overflow-x-auto">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'urgent', label: 'Críticos' },
                        { id: 'active', label: 'Regulares' },
                        { id: 'pending', label: 'Ingresso' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); }}
                            className={clsx(
                                "px-4 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                                activeTab === tab.id
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-surface-dark px-4 py-2.5 border border-slate-100 dark:border-gray-800 rounded-[16px] shadow-sm">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">sort</span>
                    <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white focus:ring-0 outline-none p-0 cursor-pointer"
                    >
                        <option value="name">A-Z</option>
                        <option value="age">Idade</option>
                        <option value="time">Tempo</option>
                    </select>
                </div>
            </div>

            {/* Main List Grid - Removed manual reveal for CSS animation */}
            {filteredChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-surface-dark border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-[32px]">
                    <div className="size-16 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-slate-300 mb-6">
                        <span className="material-symbols-outlined text-4xl">person_search</span>
                    </div>
                    <h3 className="text-xl font-black text-text-main dark:text-white mb-2 font-display">Nenhum resultado.</h3>
                    <button
                        onClick={() => { setSearchQuery(''); setActiveTab('all'); setCurrentPage(1); }}
                        className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                        Resetar Filtros
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedChildren.map((child, idx) => (
                            <div key={child.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}>
                                <ChildCard
                                    id={child.id}
                                    name={child.full_name}
                                    image={child.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(child.full_name)}&background=random&color=fff`}
                                    status={child.status as any}
                                    unit={child.unit || 'Acolhimento'}
                                    age={calculateAge(child.date_of_birth)}
                                    timeInCare={formatTimeInCare(child.admission_date)}
                                    legalStatus={child.legal_status || 'A definir'}
                                    lastUpdate="Registrado"
                                    onEditProfile={() => {
                                        setEditingChild(child);
                                        setEditModalTab('basic');
                                    }}
                                    onManageMedications={() => setMedicationChild(child)}
                                    onViewDetails={() => setViewChildId(child.id)}
                                />
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredChildren.length)} de {filteredChildren.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setCurrentPage(p => p - 1); window.scrollTo(0, 0); }}
                                    disabled={currentPage === 1}
                                    className="size-9 rounded-xl border border-slate-100 dark:border-gray-800 flex items-center justify-center text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, i) => p === '…' ? (
                                        <span key={`ellipsis-${i}`} className="size-9 flex items-center justify-center text-[11px] text-text-secondary">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => { setCurrentPage(p as number); window.scrollTo(0, 0); }}
                                            className={clsx(
                                                "size-9 rounded-xl text-[11px] font-black transition-all",
                                                currentPage === p ? "bg-primary text-white shadow-md shadow-primary/20" : "border border-slate-100 dark:border-gray-800 text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                <button
                                    onClick={() => { setCurrentPage(p => p + 1); window.scrollTo(0, 0); }}
                                    disabled={currentPage === totalPages}
                                    className="size-9 rounded-xl border border-slate-100 dark:border-gray-800 flex items-center justify-center text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <AddChildModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <EditChildModal isOpen={!!editingChild} onClose={() => setEditingChild(null)} child={editingChild} initialTab={editModalTab} />
            <MedicationsModal isOpen={!!medicationChild} onClose={() => setMedicationChild(null)} child={medicationChild} />
            <ChildDetailsModal childId={viewChildId} isOpen={!!viewChildId} onClose={() => setViewChildId(null)} />
        </div>
    );
}
