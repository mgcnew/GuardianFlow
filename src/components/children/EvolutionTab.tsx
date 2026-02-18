import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';
import { format } from 'date-fns';

interface EvolutionTabProps {
    childId: string;
}

export function EvolutionTab({ childId }: EvolutionTabProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newGoal, setNewGoal] = useState('');

    // Fetch Goals
    const { data: goals, isLoading } = useQuery({
        queryKey: ['child-goals', childId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('child_goals')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const createGoal = useMutation({
        mutationFn: async () => {
            if (!profile) throw new Error('Perfil não carregado');
            const { error } = await supabase.from('child_goals').insert({
                child_id: childId,
                organization_id: profile.organization_id,
                created_by: profile.id,
                title: newGoal,
                status: 'pending',
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['child-goals', childId] });
            setNewGoal('');
            setIsFormOpen(false);
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const updateData: any = { status };
            if (status === 'completed') updateData.completed_at = new Date().toISOString();

            const { error } = await supabase
                .from('child_goals')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['child-goals', childId] });
        },
    });

    const deleteGoal = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('child_goals').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['child-goals', childId] });
        },
    });

    const pendingGoals = goals?.filter(g => g.status === 'pending') || [];
    const inProgressGoals = goals?.filter(g => g.status === 'in_progress') || [];
    const completedGoals = goals?.filter(g => g.status === 'completed') || [];

    const renderGoalCard = (goal: any) => (
        <div key={goal.id} className="group flex items-start justify-between p-4 bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-gray-800 hover:shadow-md transition-all">
            <div className="flex-1">
                <p className={clsx("text-sm font-bold text-text-main dark:text-white font-display", goal.status === 'completed' && "line-through text-gray-400 dark:text-gray-600")}>
                    {goal.title}
                </p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-text-secondary dark:text-gray-500 uppercase tracking-widest font-bold">
                        {format(new Date(goal.created_at), 'dd/MM/yyyy')}
                    </span>
                    {goal.completed_at && (
                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full">
                            Concluído em: {format(new Date(goal.completed_at), 'dd/MM/yyyy')}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {goal.status !== 'completed' && (
                    <button
                        onClick={() => updateStatus.mutate({ id: goal.id, status: 'completed' })}
                        className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="Concluir"
                    >
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </button>
                )}
                {goal.status === 'pending' && (
                    <button
                        onClick={() => updateStatus.mutate({ id: goal.id, status: 'in_progress' })}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Iniciar"
                    >
                        <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    </button>
                )}
                <button
                    onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta meta?')) deleteGoal.mutate(goal.id)
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header / Add Goal */}
            <div className="rounded-3xl bg-primary/5 p-8 border border-primary/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black text-text-main dark:text-white font-display tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">flag</span>
                            Metas do PIA (Plano Individual)
                        </h3>
                        <p className="text-sm text-text-secondary dark:text-gray-400 mt-1 font-display">Acompanhamento estratégico da evolução do acolhido.</p>
                    </div>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nova Meta
                    </button>
                </div>

                {isFormOpen && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <input
                            type="text"
                            placeholder="Descreva a meta (ex: Regularizar matrícula escolar, Localizar avós maternos...)"
                            className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm"
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createGoal.mutate()}
                        />
                        <button
                            onClick={() => createGoal.mutate()}
                            disabled={!newGoal || createGoal.isPending}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-all"
                        >
                            Salvar
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Column: Pending */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">A Fazer ({pendingGoals.length})</h4>
                            <span className="size-2 rounded-full bg-gray-300"></span>
                        </div>
                        {pendingGoals.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-4 text-center">Nenhuma meta pendente.</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingGoals.map(renderGoalCard)}
                            </div>
                        )}
                    </div>

                    {/* Column: In Progress */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-blue-900/30">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Em Andamento ({inProgressGoals.length})</h4>
                            <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
                        </div>
                        {inProgressGoals.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-4 text-center">Nenhuma meta em andamento.</p>
                        ) : (
                            <div className="space-y-3">
                                {inProgressGoals.map(renderGoalCard)}
                            </div>
                        )}
                    </div>

                    {/* Column: Completed */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-green-100 dark:border-green-900/30">
                            <h4 className="text-xs font-black text-green-600 uppercase tracking-widest">Concluídas ({completedGoals.length})</h4>
                            <span className="size-2 rounded-full bg-green-500"></span>
                        </div>
                        {completedGoals.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-4 text-center">Nenhuma meta concluída.</p>
                        ) : (
                            <div className="space-y-3">
                                {completedGoals.map(renderGoalCard)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
