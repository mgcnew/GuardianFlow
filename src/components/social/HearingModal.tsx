import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLogger } from '../../hooks/useLogger';
import clsx from 'clsx';

interface HearingModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
}

const HEARING_TYPES = [
    { id: 'reavaliacao', label: 'Reavaliação', icon: 'update' },
    { id: 'destituicao', label: 'Destituição', icon: 'family_restroom' },
    { id: 'adocao', label: 'Adoção', icon: 'favorite' },
    { id: 'guarda', label: 'Guarda', icon: 'shield_person' },
    { id: 'tutela', label: 'Tutela', icon: 'supervisor_account' },
    { id: 'other', label: 'Outra', icon: 'more_horiz' },
];

export function HearingModal({ isOpen, onClose, initialChildId }: HearingModalProps) {
    const { profile } = useAuth();
    const { logAction } = useLogger();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [form, setForm] = useState({
        child_id: '',
        hearing_date: '',
        hearing_time: '09:00',
        hearing_type: 'reavaliacao',
        court: '',
        judge_name: '',
        process_number: '',
        subject: '',
        documents_required: '',
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-hearing'],
        queryFn: async () => {
            const { data } = await supabase
                .from('children')
                .select('id, full_name, photo_url, judicial_process')
                .eq('organization_id', profile?.organization_id)
                .order('full_name');
            return data || [];
        },
        enabled: !!profile?.organization_id && isOpen,
    });

    useEffect(() => {
        if (!isOpen) { setIsSuccess(false); return; }
        setForm(f => ({ ...f, child_id: initialChildId || '' }));
        if (initialChildId && children) {
            const child = children.find(c => c.id === initialChildId);
            if (child) { setChildSearch(child.full_name); setForm(f => ({ ...f, process_number: child.judicial_process || '' })); }
        } else { setChildSearch(''); }
    }, [isOpen, initialChildId, children]);

    const filteredChildren = children?.filter(c =>
        c.full_name.toLowerCase().includes(childSearch.toLowerCase())
    ) || [];

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile || !form.child_id) throw new Error('Dados incompletos');
            const hearingDateTime = new Date(`${form.hearing_date}T${form.hearing_time}`);
            const { error } = await supabase.from('judicial_hearings').insert({
                child_id: form.child_id,
                organization_id: profile.organization_id,
                hearing_date: hearingDateTime.toISOString(),
                hearing_type: form.hearing_type,
                court: form.court || null,
                judge_name: form.judge_name || null,
                process_number: form.process_number || null,
                subject: form.subject || null,
                documents_required: form.documents_required || null,
                outcome: 'pending',
                created_by: profile.id,
            });
            if (error) throw error;

            logAction('CREATE', 'judicial_hearing', form.child_id, {
                hearing_type: form.hearing_type,
                hearing_date: hearingDateTime.toISOString(),
                court: form.court
            });
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['socialWorkDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['judicial-hearings'] });
            setTimeout(onClose, 1000);
        }
    });

    if (!isOpen) return null;

    if (isSuccess) {
        return createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="size-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                    </div>
                    <h3 className="text-lg font-black text-text-main dark:text-white">Audiência Registrada!</h3>
                    <p className="text-sm text-text-secondary mt-1">Lembrete adicionado ao calendário.</p>
                </div>
            </div>, document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-600 text-2xl">gavel</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Nova Audiência</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Registro Judicial</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5">
                    {/* Child Selection */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Acolhido *</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                type="text" placeholder="Buscar acolhido..."
                                className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-red-500/50 transition-all"
                                value={childSearch}
                                onChange={(e) => { setChildSearch(e.target.value); setShowChildList(true); }}
                                onFocus={() => setShowChildList(true)}
                            />
                        </div>
                        {showChildList && filteredChildren.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg max-h-40 overflow-y-auto no-scrollbar">
                                {filteredChildren.map(c => (
                                    <button key={c.id} type="button" className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm"
                                        onClick={() => { setForm(f => ({ ...f, child_id: c.id, process_number: c.judicial_process || f.process_number })); setChildSearch(c.full_name); setShowChildList(false); }}>
                                        <img src={c.photo_url || `https://ui-avatars.com/api/?name=${c.full_name}&background=random`} className="size-6 rounded-full" />
                                        <span className="font-bold text-text-main dark:text-white">{c.full_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Hearing Type */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">Tipo de Audiência *</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {HEARING_TYPES.map(t => (
                                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, hearing_type: t.id }))}
                                    className={clsx("flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs font-bold",
                                        form.hearing_type === t.id ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600" : "border-gray-100 dark:border-gray-700 text-text-secondary hover:border-gray-300")}>
                                    <span className="material-symbols-outlined text-lg">{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Data *</label>
                            <input type="date" value={form.hearing_date} onChange={e => setForm(f => ({ ...f, hearing_date: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-red-500/50 transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Horário</label>
                            <input type="time" value={form.hearing_time} onChange={e => setForm(f => ({ ...f, hearing_time: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-red-500/50 transition-all" />
                        </div>
                    </div>

                    {/* Court & Judge */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Vara / Tribunal</label>
                            <input type="text" placeholder="Vara da Infância..." value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-red-500/50 transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Juiz(a)</label>
                            <input type="text" placeholder="Nome do juiz..." value={form.judge_name} onChange={e => setForm(f => ({ ...f, judge_name: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-red-500/50 transition-all" />
                        </div>
                    </div>

                    {/* Process Number */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Nº do Processo</label>
                        <input type="text" placeholder="0000000-00.0000.0.00.0000" value={form.process_number} onChange={e => setForm(f => ({ ...f, process_number: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-mono font-medium outline-none focus:border-red-500/50 transition-all" />
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Assunto / Pauta</label>
                        <textarea rows={3} placeholder="Descreva o assunto da audiência..." value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-red-500/50 transition-all resize-none" />
                    </div>

                    {/* Documents Required */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Documentos Necessários</label>
                        <textarea rows={2} placeholder="Liste os documentos a serem preparados..." value={form.documents_required} onChange={e => setForm(f => ({ ...f, documents_required: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-red-500/50 transition-all resize-none" />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <button onClick={onClose} className="h-12 flex-1 text-sm font-bold text-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-display">Cancelar</button>
                    <button onClick={() => saveMutation.mutate()} disabled={!form.child_id || !form.hearing_date || saveMutation.isPending}
                        className="h-12 flex-1 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                        {saveMutation.isPending ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-outlined text-lg">gavel</span> Registrar</>}
                    </button>
                </div>
            </div>
        </div>, document.body
    );
}
