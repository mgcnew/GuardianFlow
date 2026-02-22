import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface ReparationModalProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const REPARATION_TYPES = [
    { id: 'tv_restriction', label: 'Privação de TV/Eletrônicos', icon: 'tv_off' },
    { id: 'outing_restriction', label: 'Restrição de Saída Externa', icon: 'block' },
    { id: 'event_restriction', label: 'Não Participar de Evento', icon: 'event_busy' },
    { id: 'educational_task', label: 'Tarefa Pedagógica Extra', icon: 'menu_book' },
    { id: 'other', label: 'Outro', icon: 'more_horiz' },
];

export function ReparationModal({ onSuccess, onCancel }: ReparationModalProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [childId, setChildId] = useState('');
    const [type, setType] = useState('tv_restriction');
    const [reason, setReason] = useState('');
    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
    const [endTime, setEndTime] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 16);
    });
    const [notes, setNotes] = useState('');

    const { data: children } = useQuery({
        queryKey: ['children-simple'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('children')
                .select('id, full_name')
                .order('full_name');
            if (error) throw error;
            return data;
        }
    });

    const mutation = useMutation({
        mutationFn: async (newData: any) => {
            const { error } = await supabase
                .from('educational_reparations')
                .insert([newData]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-reparations'] });
            queryClient.invalidateQueries({ queryKey: ['logbook-timeline'] });
            onSuccess();
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!childId || !reason || !type || !startTime || !endTime) return;

        setLoading(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user?.id)
                .single();

            await mutation.mutateAsync({
                organization_id: profile?.organization_id,
                child_id: childId,
                created_by: user?.id,
                reason,
                type,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                notes,
                status: 'active'
            });
        } catch (error) {
            console.error('Erro ao salvar reparação:', error);
            alert('Erro ao salvar a medida de reparação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Acolhido */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-400 ml-1">
                        Acolhido
                    </label>
                    <select
                        required
                        value={childId}
                        onChange={(e) => setChildId(e.target.value)}
                        className="w-full h-12 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-xl px-4 text-sm font-bold text-text-main dark:text-white transition-all outline-none"
                    >
                        <option value="">Selecione um acolhido...</option>
                        {children?.map((child) => (
                            <option key={child.id} value={child.id}>{child.full_name}</option>
                        ))}
                    </select>
                </div>

                {/* Tipo de Reparação */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-400 ml-1">
                        Tipo de Medida
                    </label>
                    <select
                        required
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full h-12 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-xl px-4 text-sm font-bold text-text-main dark:text-white transition-all outline-none"
                    >
                        {REPARATION_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* Início */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-400 ml-1">
                        Início da Medida
                    </label>
                    <input
                        type="datetime-local"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full h-12 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-xl px-4 text-sm font-bold text-text-main dark:text-white transition-all outline-none"
                    />
                </div>

                {/* Término */}
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-400 ml-1">
                        Término Previsto
                    </label>
                    <input
                        type="datetime-local"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full h-12 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-xl px-4 text-sm font-bold text-text-main dark:text-white transition-all outline-none"
                    />
                </div>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-400 ml-1">
                    Motivação Pedagógica (O que aconteceu?)
                </label>
                <textarea
                    required
                    rows={3}
                    placeholder="Descreva detalhadamente o incidente que motivou a medida..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-2xl p-4 text-sm font-medium text-text-main dark:text-white transition-all outline-none resize-none"
                />
            </div>

            {/* Observações */}
            <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-400 ml-1">
                    Como foi conversado com o acolhido? (Opcional)
                </label>
                <textarea
                    rows={2}
                    placeholder="Notas sobre a reação e compreensão do acolhido sobre a medida..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-2xl p-4 text-sm font-medium text-text-main dark:text-white transition-all outline-none resize-none"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-12 px-6 rounded-xl text-sm font-bold text-text-secondary hover:text-text-main hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-8 bg-primary text-white text-sm font-black uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Salvando...' : 'Registrar Reparação'}
                </button>
            </div>
        </form>
    );
}
