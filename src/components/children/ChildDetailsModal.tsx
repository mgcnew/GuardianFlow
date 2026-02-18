import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface ChildDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    childId: string | null;
}

export function ChildDetailsModal({ isOpen, onClose, childId }: ChildDetailsModalProps) {
    const [child, setChild] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && childId) {
            fetchChildDetails();
        }
    }, [isOpen, childId]);

    const fetchChildDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('children')
                .select('*')
                .eq('id', childId)
                .single();

            if (error) throw error;
            setChild(data);
        } catch (error) {
            console.error('Erro ao buscar detalhes:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const Section = ({ title, icon, children, className = "" }: { title: string, icon: string, children: React.ReactNode, className?: string }) => (
        <div className={clsx("p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-sm", className)}>
            <h4 className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest mb-3">
                <span className="material-symbols-outlined text-base">{icon}</span>
                {title}
            </h4>
            <div className="text-sm text-text-secondary dark:text-gray-300 leading-relaxed">
                {children}
            </div>
        </div>
    );

    const EmptyState = ({ text }: { text: string }) => (
        <span className="text-gray-400 italic text-xs">{text}</span>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <style>
                {`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                    .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}
            </style>
            <div className="bg-gray-50 dark:bg-gray-900 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl border border-border-light dark:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-200">
                            {child?.photo_url ? (
                                <img src={child.photo_url} alt={child.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-text-main dark:text-white font-display leading-tight">
                                {loading ? 'Carregando...' : child?.full_name}
                            </h3>
                            <p className="text-xs text-text-secondary dark:text-gray-400 font-medium">Resumo Geral do Acolhido</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : child ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Alergias & Dieta */}
                            <Section title="Saúde & Alimentação" icon="restaurant" className="md:row-span-2">
                                <div className="space-y-4">
                                    <div>
                                        <p className="font-bold text-gray-700 dark:text-gray-200 text-xs mb-1">Alergias</p>
                                        {child.allergies ? (
                                            <div className="bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 p-2 rounded-lg text-xs font-medium border border-red-100 dark:border-red-800/30">
                                                {child.allergies}
                                            </div>
                                        ) : <EmptyState text="Nenhuma alergia registrada." />}
                                    </div>

                                    <div>
                                        <p className="font-bold text-gray-700 dark:text-gray-200 text-xs mb-1">Dieta Especial</p>
                                        {child.special_dietary_needs || child.diet_details ? (
                                            <div className="bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 p-2 rounded-lg text-xs border border-amber-100 dark:border-amber-800/30">
                                                {child.special_dietary_needs && <span className="block font-bold mb-1 uppercase text-[10px]">{child.special_dietary_needs}</span>}
                                                {child.diet_details || "Sem detalhes específicos."}
                                            </div>
                                        ) : <EmptyState text="Nenhuma restrição alimentar." />}
                                    </div>

                                    <div>
                                        <p className="font-bold text-gray-700 dark:text-gray-200 text-xs mb-1">Medicamentos</p>
                                        {child.medications ? (
                                            <p className="bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 p-2 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800/30">
                                                {child.medications}
                                            </p>
                                        ) : <EmptyState text="Nenhum medicamento em uso." />}
                                    </div>
                                </div>
                            </Section>

                            {/* Comportamento & Vícios */}
                            <Section title="Comportamento" icon="psychology">
                                <div className="space-y-3">
                                    <div>
                                        <p className="font-bold text-gray-700 dark:text-gray-200 text-xs mb-1">Vícios / Substâncias</p>
                                        {child.has_addictions ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-800">
                                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                                {child.addiction_details || "Sim, não especificado"}
                                            </span>
                                        ) : <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Não possui vícios relatados.</span>}
                                    </div>

                                    <div>
                                        <p className="font-bold text-gray-700 dark:text-gray-200 text-xs mb-1">Observações Comportamentais</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                            "{child.behavioral_observations || 'Sem observações registradas.'}"
                                        </p>
                                    </div>
                                </div>
                            </Section>

                            {/* Indicações Profissionais */}
                            <Section title="Indicações Profissionais" icon="medical_information" className="md:col-span-2 bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xs">psychology_alt</span>
                                            </div>
                                            <span className="font-bold text-xs text-purple-700 dark:text-purple-300 uppercase">Psicólogo</span>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100 dark:border-purple-900/20 shadow-sm min-h-[80px]">
                                            {child.psychologist_indications ? (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line">{child.psychologist_indications}</p>
                                            ) : <EmptyState text="Aguardando avaliação psicológica." />}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xs">school</span>
                                            </div>
                                            <span className="font-bold text-xs text-orange-700 dark:text-orange-300 uppercase">Pedagogo</span>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-orange-100 dark:border-orange-900/20 shadow-sm min-h-[80px]">
                                            {child.pedagogue_indications ? (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line">{child.pedagogue_indications}</p>
                                            ) : <EmptyState text="Aguardando avaliação pedagógica." />}
                                        </div>
                                    </div>
                                </div>
                            </Section>

                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400">Acolhido não encontrado.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
