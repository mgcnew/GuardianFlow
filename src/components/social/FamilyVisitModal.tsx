import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface FamilyVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
}

const REACTIONS = [
    { id: 'positive', label: 'Positiva', icon: 'sentiment_satisfied', color: 'green' },
    { id: 'neutral', label: 'Neutra', icon: 'sentiment_neutral', color: 'gray' },
    { id: 'anxious', label: 'Ansiosa', icon: 'psychology_alt', color: 'amber' },
    { id: 'negative', label: 'Negativa', icon: 'sentiment_dissatisfied', color: 'orange' },
    { id: 'aggressive', label: 'Agressiva', icon: 'sentiment_very_dissatisfied', color: 'red' },
];

export function FamilyVisitModal({ isOpen, onClose, initialChildId }: FamilyVisitModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [form, setForm] = useState({
        child_id: '',
        visitor_name: '',
        relationship: 'mother',
        visit_date: '',
        visit_time: '14:00',
        duration_minutes: 60,
        visit_type: 'presential',
        child_reaction: '',
        observations: '',
        professional_present: profile?.full_name || '',
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-visit'],
        queryFn: async () => {
            const { data } = await supabase
                .from('children')
                .select('id, full_name, photo_url')
                .eq('organization_id', profile?.organization_id)
                .order('full_name');
            return data || [];
        },
        enabled: !!profile?.organization_id && isOpen,
    });

    const { data: familyRefs } = useQuery({
        queryKey: ['family-refs', form.child_id],
        queryFn: async () => {
            const { data } = await supabase
                .from('family_references')
                .select('*')
                .eq('child_id', form.child_id)
                .eq('has_visitation_rights', true);
            return data || [];
        },
        enabled: !!form.child_id && isOpen,
    });

    useEffect(() => {
        if (!isOpen) { setIsSuccess(false); return; }
        setForm(f => ({ ...f, child_id: initialChildId || '', professional_present: profile?.full_name || '' }));
        if (initialChildId && children) {
            const child = children.find(c => c.id === initialChildId);
            if (child) setChildSearch(child.full_name);
        } else { setChildSearch(''); }
    }, [isOpen, initialChildId, children]);

    const filteredChildren = children?.filter(c =>
        c.full_name.toLowerCase().includes(childSearch.toLowerCase())
    ) || [];

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile || !form.child_id || !form.visitor_name) throw new Error('Dados incompletos');
            const visitDateTime = new Date(`${form.visit_date}T${form.visit_time}`);
            const { error } = await supabase.from('family_visits').insert({
                child_id: form.child_id,
                organization_id: profile.organization_id,
                visitor_name: form.visitor_name,
                relationship: form.relationship,
                visit_date: visitDateTime.toISOString(),
                duration_minutes: form.duration_minutes,
                visit_type: form.visit_type,
                child_reaction: form.child_reaction || null,
                observations: form.observations || null,
                professional_present: form.professional_present || null,
                authorized_by: profile.id,
                created_by: profile.id,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['socialWorkDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['family-visits'] });
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
                    <h3 className="text-lg font-black text-text-main dark:text-white">Visita Registrada!</h3>
                </div>
            </div>, document.body
        );
    }

    const RELATIONSHIPS = [
        { id: 'mother', label: 'Mãe' }, { id: 'father', label: 'Pai' },
        { id: 'sibling', label: 'Irmão(ã)' }, { id: 'grandparent', label: 'Avô(ó)' },
        { id: 'uncle_aunt', label: 'Tio(a)' }, { id: 'other', label: 'Outro' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600 text-2xl">family_restroom</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Visita Familiar</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Registro de Visita</p>
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
                            <input type="text" placeholder="Buscar acolhido..." className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all"
                                value={childSearch} onChange={(e) => { setChildSearch(e.target.value); setShowChildList(true); }} onFocus={() => setShowChildList(true)} />
                        </div>
                        {showChildList && filteredChildren.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg max-h-40 overflow-y-auto no-scrollbar">
                                {filteredChildren.map(c => (
                                    <button key={c.id} type="button" className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm"
                                        onClick={() => { setForm(f => ({ ...f, child_id: c.id })); setChildSearch(c.full_name); setShowChildList(false); }}>
                                        <img src={c.photo_url || `https://ui-avatars.com/api/?name=${c.full_name}&background=random`} className="size-6 rounded-full" />
                                        <span className="font-bold text-text-main dark:text-white">{c.full_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Visitor + Relationship */}
                    <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-3">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Nome do Visitante *</label>
                            {familyRefs && familyRefs.length > 0 ? (
                                <select value={form.visitor_name} onChange={e => {
                                    const ref = familyRefs.find(r => r.full_name === e.target.value);
                                    setForm(f => ({ ...f, visitor_name: e.target.value, relationship: ref?.relationship || f.relationship }));
                                }} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all">
                                    <option value="">Selecione...</option>
                                    {familyRefs.map(r => <option key={r.id} value={r.full_name}>{r.full_name} ({RELATIONSHIPS.find(rel => rel.id === r.relationship)?.label || r.relationship})</option>)}
                                    <option value="__other">Outro visitante...</option>
                                </select>
                            ) : (
                                <input type="text" placeholder="Nome completo..." value={form.visitor_name} onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all" />
                            )}
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Parentesco</label>
                            <select value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all">
                                {RELATIONSHIPS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Date, Time, Duration */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Data *</label>
                            <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                                className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Horário</label>
                            <input type="time" value={form.visit_time} onChange={e => setForm(f => ({ ...f, visit_time: e.target.value }))}
                                className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Duração</label>
                            <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                                className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all">
                                <option value={30}>30 min</option><option value={60}>1 hora</option><option value={90}>1h30</option><option value={120}>2 horas</option>
                            </select>
                        </div>
                    </div>

                    {/* Visit Type */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">Tipo de Visita</label>
                        <div className="flex gap-2">
                            {[{ id: 'presential', label: 'Presencial', icon: 'person' }, { id: 'phone', label: 'Telefone', icon: 'call' }, { id: 'video', label: 'Vídeo', icon: 'videocam' }, { id: 'external', label: 'Externa', icon: 'directions_walk' }].map(t => (
                                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, visit_type: t.id }))}
                                    className={clsx("flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-xs font-bold",
                                        form.visit_type === t.id ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600" : "border-gray-100 dark:border-gray-700 text-text-secondary hover:border-gray-300")}>
                                    <span className="material-symbols-outlined text-lg">{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Child Reaction */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">Reação da Criança</label>
                        <div className="flex gap-2">
                            {REACTIONS.map(r => (
                                <button key={r.id} type="button" onClick={() => setForm(f => ({ ...f, child_reaction: r.id }))}
                                    className={clsx("flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all text-[10px] font-bold",
                                        form.child_reaction === r.id ? `border-${r.color}-500 bg-${r.color}-50 dark:bg-${r.color}-900/20 text-${r.color}-600` : "border-gray-100 dark:border-gray-700 text-text-secondary hover:border-gray-300")}>
                                    <span className="material-symbols-outlined text-lg">{r.icon}</span>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Observações</label>
                        <textarea rows={3} placeholder="Descreva como foi a visita, comportamento, interações..." value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-purple-500/50 transition-all resize-none" />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">Cancelar</button>
                    <button onClick={() => saveMutation.mutate()} disabled={!form.child_id || !form.visitor_name || !form.visit_date || saveMutation.isPending}
                        className="flex-1 py-3 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {saveMutation.isPending ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-outlined text-lg">family_restroom</span> Registrar</>}
                    </button>
                </div>
            </div>
        </div>, document.body
    );
}
