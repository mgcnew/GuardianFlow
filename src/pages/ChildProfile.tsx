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
    QuickNote
} from '../components/children/ProfileComponents';
import { ChildHistoryTab } from '../components/children/ChildHistoryTab';
import { EditChildModal } from '../components/children/EditChildModal';
import { PIADocument } from '../components/documents/PIADocument';
import { DiaryTab } from '../components/children/DiaryTab';
import { EvolutionTab } from '../components/children/EvolutionTab';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

type ProfileTab = 'resumo' | 'historico' | 'saude' | 'documentos' | 'diario' | 'evolucao';

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
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium font-display animate-pulse">Carregando prontuário...</p>
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
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all font-display"
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
                    {activeTab === 'historico' && <ChildHistoryTab childId={child.id} child={child} />}
                    {activeTab === 'saude' && (hasRole(['saas_admin', 'admin', 'technical', 'educator']) ? <HealthOverview child={child} /> : <p className="text-red-500">Acesso Negado</p>)}
                    {activeTab === 'documentos' && (hasRole(['saas_admin', 'admin', 'technical']) ? <RecentDocuments /> : <p className="text-red-500">Acesso Negado</p>)}
                    {activeTab === 'diario' && <DiaryTab childId={child.id} />}
                    {activeTab === 'evolucao' && (hasRole(['saas_admin', 'admin', 'technical']) ? <EvolutionTab childId={child.id} /> : <p className="text-red-500">Acesso Negado</p>)}
                </div>

                <div className="space-y-4 sm:space-y-6">
                    <QuickNote />
                    <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/10 dark:border-primary/20">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Resumo de Acesso</h4>
                        <p className="text-xs text-text-secondary dark:text-gray-400 leading-relaxed font-display">
                            Você está visualizando as informações técnicas de acolhimento. Acesso restrito a profissionais autorizados.
                        </p>
                    </div>
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

