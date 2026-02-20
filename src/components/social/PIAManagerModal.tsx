import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface PIAManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    childId: string;
    childName: string;
}

const GOAL_CATEGORIES = [
    { id: 'family', label: 'Convivência Familiar', icon: 'family_restroom', color: 'bg-emerald-50 text-emerald-600' },
    { id: 'health', label: 'Saúde', icon: 'medical_services', color: 'bg-red-50 text-red-600' },
    { id: 'education', label: 'Educação', icon: 'school', color: 'bg-blue-50 text-blue-600' },
    { id: 'psychosocial', label: 'Psicossocial', icon: 'psychology', color: 'bg-purple-50 text-purple-600' },
    { id: 'legal', label: 'Situação Jurídica', icon: 'gavel', color: 'bg-amber-50 text-amber-600' },
];

export function PIAManagerModal({ isOpen, onClose, childId, childName }: PIAManagerModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState<'assessment' | 'goals'>('assessment');

    const [assessment, setAssessment] = useState({
        technical_opinion: '',
        family_situation: '',
        evolution_notes: '',
    });

    const [goals, setGoals] = useState<any[]>([]);
    const [newGoal, setNewGoal] = useState({ description: '', category: 'family', deadline: '' });

    // Fetch existing PIA data
    const { data: piaData } = useQuery({
        queryKey: ['child-pia', childId],
        queryFn: async () => {
            const { data: pia, error } = await supabase
                .from('pias')
                .select('*')
                .eq('child_id', childId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;
            return pia;
        },
        enabled: isOpen && !!childId,
    });

    const { data: piaGoals } = useQuery({
        queryKey: ['child-pia-goals', childId],
        queryFn: async () => {
            const { data } = await supabase
                .from('pia_goals')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: true });
            return data || [];
        },
        enabled: isOpen && !!childId,
    });

    useEffect(() => {
        if (piaData) {
            setAssessment({
                technical_opinion: piaData.technical_opinion || '',
                family_situation: piaData.family_situation || '',
                evolution_notes: piaData.evolution_notes || '',
            });
        }
        if (piaGoals) {
            setGoals(piaGoals);
        }
    }, [piaData, piaGoals]);

    const saveAssessmentMutation = useMutation({
        mutationFn: async () => {
            if (!profile) return;
            const payload = {
                child_id: childId,
                organization_id: profile.organization_id,
                ...assessment,
                updated_by: profile.id,
                updated_at: new Date().toISOString(),
            };

            if (piaData?.id) {
                const { error } = await supabase.from('pias').update(payload).eq('id', piaData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('pias').insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['child-pia', childId] });
        }
    });

    const addGoalMutation = useMutation({
        mutationFn: async () => {
            if (!profile || !newGoal.description) return;
            const { error } = await supabase.from('pia_goals').insert({
                child_id: childId,
                organization_id: profile.organization_id,
                ...newGoal,
                status: 'pending'
            });
            if (error) throw error;
        },
        onSuccess: () => {
            setNewGoal({ description: '', category: 'family', deadline: '' });
            queryClient.invalidateQueries({ queryKey: ['child-pia-goals', childId] });
        }
    });

    const toggleGoalMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase.from('pia_goals').update({
                status: status === 'completed' ? 'pending' : 'completed',
                completed_at: status === 'completed' ? null : new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['child-pia-goals', childId] })
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 text-2xl">assignment</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Plano Individual de Atendimento (PIA)</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">{childName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
                    </button>
                </div>

                {/* Sub-Header Tabs */}
                <div className="px-6 py-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 flex gap-4">
                    <button onClick={() => setActiveSection('assessment')}
                        className={clsx("text-[10px] font-black uppercase tracking-widest py-2 border-b-2 transition-all",
                            activeSection === 'assessment' ? "border-blue-500 text-blue-600" : "border-transparent text-text-secondary hover:text-text-main")}>
                        Parecer Técnico
                    </button>
                    <button onClick={() => setActiveSection('goals')}
                        className={clsx("text-[10px] font-black uppercase tracking-widest py-2 border-b-2 transition-all",
                            activeSection === 'goals' ? "border-blue-500 text-blue-600" : "border-transparent text-text-secondary hover:text-text-main")}>
                        Metas e Objetivos
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                    {activeSection === 'assessment' ? (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Parecer Técnico Consolidado</label>
                                <textarea rows={6} placeholder="Descreva a avaliação técnica global da situação da criança..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 text-sm font-medium resize-none shadow-inner transition-all"
                                    value={assessment.technical_opinion} onChange={e => setAssessment(a => ({ ...a, technical_opinion: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Situação Familiar e Vínculos</label>
                                    <textarea rows={4} placeholder="Análise da convivência e possibilidades de reintegração..."
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 text-sm font-medium resize-none shadow-inner transition-all"
                                        value={assessment.family_situation} onChange={e => setAssessment(a => ({ ...a, family_situation: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Notas de Evolução do Acolhimento</label>
                                    <textarea rows={4} placeholder="Observações sobre o desenvolvimento da criança na unidade..."
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 text-sm font-medium resize-none shadow-inner transition-all"
                                        value={assessment.evolution_notes} onChange={e => setAssessment(a => ({ ...a, evolution_notes: e.target.value }))} />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button onClick={() => saveAssessmentMutation.mutate()} disabled={saveAssessmentMutation.isPending}
                                    className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                                    {saveAssessmentMutation.isPending ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-outlined text-sm">save</span> Salvar Parecer</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* New Goal Form */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-3xl p-5">
                                <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">add_task</span>Adicionar Nova Meta ao PIA
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-6">
                                        <input type="text" placeholder="Descreva a meta (ex: Iniciar psicoterapia, Efetuar matrícula...)"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-transparent rounded-xl text-sm font-medium outline-none focus:border-blue-500/50 shadow-sm transition-all"
                                            value={newGoal.description} onChange={e => setNewGoal(g => ({ ...g, description: e.target.value }))} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <select className="w-full px-3 py-3 bg-white dark:bg-gray-900 border border-transparent rounded-xl text-sm font-medium outline-none shadow-sm"
                                            value={newGoal.category} onChange={e => setNewGoal(g => ({ ...g, category: e.target.value }))}>
                                            {GOAL_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3 flex gap-2">
                                        <input type="date" className="flex-1 px-3 py-3 bg-white dark:bg-gray-900 border border-transparent rounded-xl text-sm font-medium outline-none shadow-sm"
                                            value={newGoal.deadline} onChange={e => setNewGoal(g => ({ ...g, deadline: e.target.value }))} />
                                        <button onClick={() => addGoalMutation.mutate()} disabled={!newGoal.description || addGoalMutation.isPending}
                                            className="size-11 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
                                            <span className="material-symbols-outlined">check</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Goals List Categorized */}
                            <div className="space-y-6">
                                {GOAL_CATEGORIES.map(cat => {
                                    const catGoals = goals.filter(g => g.category === cat.id);
                                    if (catGoals.length === 0) return null;

                                    return (
                                        <div key={cat.id} className="space-y-3">
                                            <div className="flex items-center gap-2 px-2">
                                                <div className={`size-6 ${cat.color} rounded-lg flex items-center justify-center`}>
                                                    <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                                                </div>
                                                <h5 className="text-[10px] font-black text-text-main dark:text-white uppercase tracking-widest">{cat.label}</h5>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {catGoals.map(goal => (
                                                    <div key={goal.id} className={clsx("flex items-center gap-4 p-4 rounded-2xl border transition-all group",
                                                        goal.status === 'completed' ? "bg-emerald-50/20 border-emerald-100 dark:border-emerald-900/20" : "bg-white dark:bg-surface-dark border-gray-50 dark:border-gray-800 shadow-sm")}>
                                                        <button onClick={() => toggleGoalMutation.mutate(goal)}
                                                            className={clsx("size-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                                goal.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 dark:border-gray-700 hover:border-blue-400")}>
                                                            {goal.status === 'completed' && <span className="material-symbols-outlined text-sm">check</span>}
                                                        </button>
                                                        <div className="flex-1">
                                                            <p className={clsx("text-sm font-bold", goal.status === 'completed' ? "text-gray-400 line-through" : "text-text-main dark:text-white")}>
                                                                {goal.description}
                                                            </p>
                                                            {goal.deadline && (
                                                                <p className="text-[10px] text-text-secondary dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-xs">calendar_today</span>
                                                                    Prazo: {new Date(goal.deadline).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {goal.completed_at && (
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Concluído</p>
                                                                <p className="text-[9px] text-text-secondary">{new Date(goal.completed_at).toLocaleDateString()}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {goals.length === 0 && (
                                    <div className="py-12 text-center text-text-secondary uppercase tracking-widest text-[10px] font-bold">
                                        Nenhuma meta estratégica definida para este PIA.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-900/30">
                    <p className="text-[10px] text-text-secondary dark:text-gray-500 italic max-w-md leading-relaxed">
                        O PIA deve ser elaborado pela equipe técnica e discutido com o acolhido e sua família, visando à superação da situação que motivou o acolhimento.
                    </p>
                    <button onClick={onClose} className="px-6 py-2.5 text-xs font-black text-text-secondary uppercase tracking-widest hover:text-text-main transition-colors">Fechar</button>
                </div>
            </div>
        </div>, document.body
    );
}
