import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChildCard } from '../components/children/ChildCard';
import { AddChildModal } from '../components/children/AddChildModal';
import { EditChildModal } from '../components/children/EditChildModal';
import { MedicationsModal } from '../components/children/MedicationsModal';
import { ChildDetailsModal } from '../components/children/ChildDetailsModal';
import { supabase } from '../lib/supabase';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<Child | null>(null);
    const [medicationChild, setMedicationChild] = useState<Child | null>(null);
    const [viewChildId, setViewChildId] = useState<string | null>(null);
    const [editModalTab, setEditModalTab] = useState<'basic' | 'medications'>('basic');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'active' | 'pending'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'age' | 'time'>('name');

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

    const stats = {
        total: children?.length || 0,
        urgent: children?.filter(c => c.status === 'urgent').length || 0,
        active: children?.filter(c => c.status === 'active').length || 0,
        pending: children?.filter(c => c.status === 'pending').length || 0,
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse p-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                        <div className="h-4 w-64 bg-slate-100 dark:bg-slate-900 rounded-lg" />
                    </div>
                    <div className="h-10 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-900 rounded-[24px]" />)}
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-72 bg-slate-100 dark:bg-slate-900 rounded-[24px]" />)}
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
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="h-11 flex items-center justify-center gap-2 bg-primary text-white font-black uppercase tracking-[0.05em] text-[11px] px-6 rounded-xl transition-all shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Novo Acolhimento
                </button>
            </div>

            {/* Stats Row - Scaled down */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Geral', value: stats.total, icon: 'groups', color: 'blue' },
                    { label: 'Urgências', value: stats.urgent, icon: 'bolt', color: 'rose' },
                    { label: 'Efetivados', value: stats.active, icon: 'verified', color: 'emerald' },
                    { label: 'Processamento', value: stats.pending, icon: 'hourglass_top', color: 'amber' },
                ].map((stat) => (
                    <div key={stat.label} className={clsx(
                        "group bg-white dark:bg-surface-dark rounded-[24px] border border-slate-100 dark:border-gray-800 p-5 transition-all duration-300 hover:shadow-md",
                    )}>
                        <div className="flex justify-between items-start mb-3">
                            <div className={clsx(
                                "size-10 rounded-xl flex items-center justify-center",
                                stat.color === 'blue' && "bg-blue-500 text-white",
                                stat.color === 'rose' && "bg-rose-500 text-white",
                                stat.color === 'emerald' && "bg-emerald-500 text-white",
                                stat.color === 'amber' && "bg-amber-500 text-white"
                            )}>
                                <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-text-main dark:text-white leading-none tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-text-secondary dark:text-gray-500">
                            {stat.label}
                        </p>
                    </div>
                ))}
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
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                            onClick={() => setActiveTab(tab.id as any)}
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
                        onChange={(e) => setSortBy(e.target.value as any)}
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
                        onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
                        className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                        Resetar Filtros
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredChildren.map((child, idx) => (
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
            )}

            <AddChildModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <EditChildModal isOpen={!!editingChild} onClose={() => setEditingChild(null)} child={editingChild} initialTab={editModalTab} />
            <MedicationsModal isOpen={!!medicationChild} onClose={() => setMedicationChild(null)} child={medicationChild} />
            <ChildDetailsModal childId={viewChildId} isOpen={!!viewChildId} onClose={() => setViewChildId(null)} />
        </div>
    );
}
