import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';

interface ShiftReportFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function ShiftReportForm({ onSuccess, onCancel }: ShiftReportFormProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        shift: 'morning',
        summary: '',
        occurrences: '',
        staff_present: '',
    });

    const shiftOptions = [
        { id: 'morning', label: 'Manhã', icon: 'wb_sunny', color: 'text-amber-500 bg-amber-50 border-amber-200' },
        { id: 'afternoon', label: 'Tarde', icon: 'wb_twilight', color: 'text-orange-500 bg-orange-50 border-orange-200' },
        { id: 'night', label: 'Noite', icon: 'dark_mode', color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!formData.summary.trim()) {
            alert('Por favor, preencha o resumo das atividades.');
            return;
        }

        setLoading(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error('Organização não encontrada.');

            const { error } = await supabase.from('shift_reports').insert({
                organization_id: profile.organization_id,
                staff_id: user.id,
                shift: formData.shift,
                summary: formData.summary,
                occurrences: formData.occurrences,
                staff_present: formData.staff_present,
                report_date: new Date().toISOString().split('T')[0],
            });

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['daily_overview'] });
            alert('Relatório salvo com sucesso!');
            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert('Erro ao salvar relatório: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-text-secondary dark:text-gray-400 -mt-2 mb-4">Registre o resumo das atividades e ocorrências gerais do plantão.</p>

            <div className="space-y-4">
                {/* Seleção de Turno */}
                <div>
                    <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Turno</label>
                    <div className="grid grid-cols-3 gap-3">
                        {shiftOptions.map((option) => (
                            <button
                                type="button"
                                key={option.id}
                                onClick={() => setFormData({ ...formData, shift: option.id })}
                                className={clsx(
                                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2",
                                    formData.shift === option.id
                                        ? `${option.color} ring-2 ring-offset-1 ring-primary/20 border-transparent shadow-sm`
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-500"
                                )}
                            >
                                <span className="material-symbols-outlined text-2xl">{option.icon}</span>
                                <span className="text-sm font-semibold">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resumo das Atividades */}
                <div>
                    <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Resumo das Atividades</label>
                    <textarea
                        className="w-full min-h-[120px] p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y text-text-main dark:text-white placeholder-gray-400"
                        placeholder="Descreva as principais atividades realizadas, rotina, alimentação..."
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        required
                    />
                </div>

                {/* Ocorrências Gerais (Opcional) */}
                <div>
                    <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Ocorrências Gerais (Opcional)</label>
                    <textarea
                        className="w-full min-h-[80px] p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y text-text-main dark:text-white placeholder-gray-400"
                        placeholder="Algum incidente coletivo ou observação importante que não se aplica a um acolhido específico?"
                        value={formData.occurrences}
                        onChange={(e) => setFormData({ ...formData, occurrences: e.target.value })}
                    />
                </div>

                {/* Equipe Presente (Opcional) */}
                <div>
                    <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Equipe Presente</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-main dark:text-white placeholder-gray-400"
                        placeholder="Nomes dos profissionais no plantão..."
                        value={formData.staff_present}
                        onChange={(e) => setFormData({ ...formData, staff_present: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium shadow-sm shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span className="material-symbols-outlined text-[20px]">check</span>
                    )}
                    Salvar Relatório
                </button>
            </div>
        </form>
    );
}
