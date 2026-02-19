import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

    const { data: children, isLoading } = useQuery({
        queryKey: ['children'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('children')
                .select('*')
                .order('full_name');

            if (error) throw error;
            return data as Child[] || [];
        },
        staleTime: 1000 * 60 * 5,
    });

    // Helper functions
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

    // Filter and Sort Logic
    const filteredChildren = (children || [])
        .filter(child => {
            // Tab filter
            if (activeTab !== 'all' && child.status !== activeTab) return false;

            // Search filter
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

    // Stats
    const stats = {
        total: children?.length || 0,
        urgent: children?.filter(c => c.status === 'urgent').length || 0,
        active: children?.filter(c => c.status === 'active').length || 0,
        pending: children?.filter(c => c.status === 'pending').length || 0,
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium font-display">Carregando acolhidos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-main dark:text-white font-display">Gestão de Acolhidos</h2>
                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Acompanhamento e prontuário digital dos acolhidos</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Novo Acolhimento
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-text-main dark:text-white', icon: 'groups', bg: 'bg-gray-100 dark:bg-gray-800' },
                    { label: 'Urgentes', value: stats.urgent, color: 'text-red-600 dark:text-red-400', icon: 'emergency', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'Ativos', value: stats.active, color: 'text-green-600 dark:text-green-400', icon: 'check_circle', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Pendentes', value: stats.pending, color: 'text-amber-600 dark:text-amber-400', icon: 'pending', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-gray-800 shadow-sm flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                            <span className="material-symbols-outlined">{stat.icon}</span>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-text-main dark:text-white">{stat.value}</p>
                            <p className="text-xs text-text-secondary dark:text-gray-400 font-medium">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-surface-dark p-2 rounded-2xl border border-border-light dark:border-gray-800 shadow-sm flex flex-col xl:flex-row gap-4">
                {/* Tabs */}
                <div className="flex p-1 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'urgent', label: 'Urgentes' },
                        { id: 'active', label: 'Ativos' },
                        { id: 'pending', label: 'Pendentes' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                                : 'text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400 text-[20px]">search</span>
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-transparent border-none text-sm focus:ring-0 outline-none text-text-main dark:text-white placeholder-text-secondary"
                        placeholder="Buscar por nome, processo ou CPF..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="h-8 w-[1px] bg-border-light dark:bg-gray-800 hidden xl:block self-center"></div>

                {/* Sort */}
                <div className="flex items-center gap-3 px-2">
                    <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Ordenar:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent border-none text-sm font-bold text-text-main dark:text-white focus:ring-0 outline-none cursor-pointer"
                    >
                        <option value="name">Nome (A-Z)</option>
                        <option value="age">Idade (Maior)</option>
                        <option value="time">Tempo de Casa</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {filteredChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 py-20 text-center bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl shadow-sm">
                    <div className="size-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center text-gray-400 mb-6">
                        <span className="material-symbols-outlined text-5xl">person_search</span>
                    </div>
                    <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Nenhum resultado</h3>
                    <p className="text-text-secondary dark:text-gray-400 mb-8 max-w-xs mx-auto">
                        Não encontramos nenhum acolhido com os critérios selecionados.
                    </p>
                    <button
                        onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
                        className="text-primary font-bold hover:underline"
                    >
                        Limpar todos os filtros
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {filteredChildren.map(child => (
                        <ChildCard
                            key={child.id}
                            id={child.id}
                            name={child.full_name}
                            image={child.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(child.full_name)}&background=random&color=fff`}
                            status={child.status as any}
                            unit={child.unit || 'N/A'}
                            age={calculateAge(child.date_of_birth)}
                            timeInCare={formatTimeInCare(child.admission_date)}
                            legalStatus={child.legal_status || 'Não informado'}
                            lastUpdate="Atualizado recentemente"
                            onEditProfile={() => {
                                setEditingChild(child);
                                setEditModalTab('basic');
                            }}
                            onManageMedications={() => {
                                setMedicationChild(child);
                            }}
                            onViewDetails={() => setViewChildId(child.id)}
                        />
                    ))}
                </div>
            )}

            <AddChildModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <EditChildModal
                isOpen={!!editingChild}
                onClose={() => setEditingChild(null)}
                child={editingChild}
                initialTab={editModalTab}
            />

            <MedicationsModal
                isOpen={!!medicationChild}
                onClose={() => setMedicationChild(null)}
                child={medicationChild}
            />

            <ChildDetailsModal
                childId={viewChildId}
                isOpen={!!viewChildId}
                onClose={() => setViewChildId(null)}
            />
        </div>
    );
}

