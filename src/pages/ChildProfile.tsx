import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
    ProfileHeader,
    BioSummary,
    FamilyContacts,
    HealthOverview,
    RecentDocuments,
    QuickNote,
    AlertFlags,
} from '../components/children/ProfileComponents';
import { ChildHistoryTab } from '../components/children/ChildHistoryTab';
import { EditChildModal } from '../components/children/EditChildModal';
import { PIADocument } from '../components/documents/PIADocument';
import { DiaryTab } from '../components/children/DiaryTab';
import { EvolutionTab } from '../components/children/EvolutionTab';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

type ProfileTab = 'resumo' | 'prontuario' | 'saude' | 'documentos' | 'diario' | 'evolucao';

import { useAuth } from '../contexts/AuthContext';

export function ChildProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ProfileTab>('resumo');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { hasRole } = useAuth();

    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrintPIA = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `PIA - ${id}`,
    });

    const { data: child, isLoading, isError } = useQuery({
        queryKey: ['child', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('children')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 sm:gap-6 animate-pulse">
                {/* Profile Header Skeleton */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-border-light dark:border-gray-800 shadow-sm relative overflow-hidden">
                    <div className="size-24 sm:size-32 rounded-full border-4 border-white dark:border-gray-800 shadow-md bg-gray-200 dark:bg-gray-700/50 shrink-0"></div>
                    <div className="flex-1 text-center md:text-left space-y-3 w-full">
                        <div className="w-1/2 h-8 bg-gray-200 dark:bg-gray-700/50 rounded-xl mx-auto md:mx-0"></div>
                        <div className="w-1/3 h-4 bg-gray-200 dark:bg-gray-700/50 rounded-full mx-auto md:mx-0"></div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                            <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Tabs Skeleton */}
                <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-900 rounded-2xl w-full overflow-x-auto">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="w-24 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl shrink-0"></div>
                    ))}
                </div>

                {/* Grid Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                        <div className="h-64 bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                        <div className="h-48 bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                    </div>
                    <div className="space-y-4 sm:space-y-6">
                        <div className="h-40 bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                        <div className="h-32 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/10 dark:border-primary/20"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !child) {
        return (
            <div className="p-8 bg-white dark:bg-surface-dark rounded-2xl border border-red-100 dark:border-red-900/30 text-center shadow-sm">
                <span className="material-symbols-outlined text-red-500 text-5xl mb-4">person_off</span>
                <h3 className="text-xl font-bold text-text-main dark:text-white mb-2 font-display">Acolhido não encontrado</h3>
                <p className="text-text-secondary dark:text-gray-400 mb-6 font-display">O registro solicitado não existe ou foi removido.</p>
                <button
                    onClick={() => navigate('/children')}
                    className="h-10 px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all font-display shadow-sm"
                >
                    Voltar para Lista
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-400">
            <ProfileHeader
                child={child}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onEdit={() => setIsEditModalOpen(true)}
                onPrintPIA={handlePrintPIA}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    {activeTab === 'resumo' && (
                        <>
                            <BioSummary child={child} />
                            <FamilyContacts child={child} />
                        </>
                    )}
                    {activeTab === 'prontuario' && <ChildHistoryTab childId={child.id} child={child} />}
                    {activeTab === 'saude' && (hasRole(['saas_admin', 'admin', 'technical', 'educator']) ? <HealthOverview child={child} /> : <p className="text-red-500">Acesso Negado</p>)}
                    {activeTab === 'documentos' && (hasRole(['saas_admin', 'admin', 'technical']) ? <RecentDocuments /> : <p className="text-red-500">Acesso Negado</p>)}
                    {activeTab === 'diario' && <DiaryTab childId={child.id} />}
                    {activeTab === 'evolucao' && (hasRole(['saas_admin', 'admin', 'technical']) ? <EvolutionTab childId={child.id} /> : <p className="text-red-500">Acesso Negado</p>)}
                </div>

                <div className="space-y-4 sm:space-y-6">
                    <AlertFlags child={child} />
                    <QuickNote />
                </div>
            </div>

            <EditChildModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                child={child}
            />

            <div style={{ display: 'none' }}>
                <PIADocument ref={componentRef} child={child} />
            </div>
        </div>
    );
}

