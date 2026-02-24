import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLogger } from '../../hooks/useLogger';
import clsx from 'clsx';

interface ReparationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const REPARATION_TYPES = [
    { id: 'tv_restriction', label: 'Privação de TV/Eletrônicos', icon: 'tv_off', color: 'bg-rose-50 text-rose-600' },
    { id: 'outing_restriction', label: 'Restrição de Saída Externa', icon: 'block', color: 'bg-orange-50 text-orange-600' },
    { id: 'event_restriction', label: 'Não Participar de Evento', icon: 'event_busy', color: 'bg-amber-50 text-amber-600' },
    { id: 'educational_task', label: 'Tarefa Pedagógica Extra', icon: 'menu_book', color: 'bg-blue-50 text-blue-600' },
    { id: 'other', label: 'Outro', icon: 'more_horiz', color: 'bg-gray-50 text-gray-600' },
];

export function ReparationModal({ isOpen, onClose, onSuccess }: ReparationModalProps) {
    const { user, profile } = useAuth();
    const { logAction } = useLogger();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChild, setSelectedChild] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        type: 'tv_restriction',
        reason: '',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().slice(0, 16);
        })(),
        notes: '',
    });

    useEffect(() => {
        if (!isOpen) {
            setIsSuccess(false);
            setSelectedChild(null);
            setSearchQuery('');
            setFormData({
                type: 'tv_restriction',
                reason: '',
                startTime: new Date().toISOString().slice(0, 16),
                endTime: (() => {
                    const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 16);
                })(),
                notes: '',
            });
        }
    }, [isOpen]);

    const { data: children } = useQuery({
        queryKey: ['children-simple'],
        queryFn: async () => {
            const { data } = await supabase.from('children').select('id, full_name, photo_url').order('full_name');
            return data || [];
        },
        enabled: isOpen
    });

    const filteredChildren = children?.filter(c =>
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedChild || !user || !profile?.organization_id) throw new Error('Unauthorized');

            const { error } = await supabase
                .from('educational_reparations')
                .insert([{
                    organization_id: profile.organization_id,
                    child_id: selectedChild.id,
                    created_by: user.id,
                    reason: formData.reason,
                    type: formData.type,
                    start_time: new Date(formData.startTime).toISOString(),
                    end_time: new Date(formData.endTime).toISOString(),
                    notes: formData.notes,
                    status: 'active'
                }]);

            if (error) throw error;

            logAction('CREATE', 'educational_reparation', selectedChild.id, {
                type: formData.type,
                reason: formData.reason.substring(0, 50) + '...'
            });
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['active-reparations'] });
            queryClient.invalidateQueries({ queryKey: ['logbook-timeline'] });
            setTimeout(onSuccess, 1000);
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col relative max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">gavel</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Nova Reparação</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Medida Pedagógica</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-xl text-text-secondary">close</span>
                    </button>
                </div>

                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-white dark:bg-surface-dark flex flex-col items-center justify-center animate-in fade-in">
                        <div className="size-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 scale-in">
                            <span className="material-symbols-outlined text-4xl">check_rounded</span>
                        </div>
                        <h3 className="text-xl font-bold">Reparação Registrada</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Child Search */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1">Acolhido sob Medida</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                            <input
                                type="text"
                                className="w-full h-12 pl-12 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-rose-200 transition-all font-bold text-sm"
                                placeholder="Buscar acolhido..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {filteredChildren.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => setSelectedChild(child)}
                                    className={clsx(
                                        "flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all w-24",
                                        selectedChild?.id === child.id
                                            ? "bg-white border-rose-200 shadow-lg shadow-rose-500/5 ring-1 ring-rose-200"
                                            : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 grayscale opacity-60"
                                    )}
                                >
                                    <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}`} className="size-12 rounded-xl object-cover" alt="" />
                                    <span className="text-[9px] font-black uppercase text-center truncate w-full">{child.full_name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Type selection as a grid of buttons */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1">Tipo de Medida</label>
                            <div className="grid grid-cols-1 gap-2">
                                {REPARATION_TYPES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setFormData({ ...formData, type: t.id })}
                                        className={clsx(
                                            "flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                                            formData.type === t.id
                                                ? "bg-white border-rose-200 shadow-sm ring-1 ring-rose-100 font-black text-rose-600"
                                                : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-text-secondary opacity-70"
                                        )}
                                    >
                                        <div className={clsx("size-8 rounded-lg flex items-center justify-center", formData.type === t.id ? t.color : "bg-white dark:bg-gray-800")}>
                                            <span className="material-symbols-outlined text-lg">{t.icon}</span>
                                        </div>
                                        <span className="text-[10px] uppercase truncate">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1 mb-2">Início da Medida</label>
                                <input
                                    type="datetime-local"
                                    className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-rose-200 font-bold text-sm"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1 mb-2">Término Previsto</label>
                                <input
                                    type="datetime-local"
                                    className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-rose-200 font-bold text-sm"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1 mb-2">Motivação Pedagógica</label>
                        <textarea
                            className="w-full min-h-[100px] p-5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] outline-none focus:border-rose-200 transition-all text-sm font-medium resize-none shadow-inner leading-relaxed"
                            placeholder="Descreva o incidente que motivou a medida..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-white active:scale-95 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !selectedChild || !formData.reason}
                        className="h-12 px-10 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                    >
                        {saveMutation.isPending ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined">gavel</span>
                        )}
                        Registrar Medida
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
