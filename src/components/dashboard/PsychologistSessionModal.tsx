import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, addMinutes, parseISO } from 'date-fns';
import clsx from 'clsx';

interface PsychologistSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
    eventToEdit?: any;
}

const SESSION_TYPES = [
    { id: 'individual', label: 'Individual', icon: 'person' },
    { id: 'group', label: 'Grupo / Coletivo', icon: 'groups' },
    { id: 'assessment', label: 'Avaliação / Anamnese', icon: 'assignment_ind' },
    { id: 'family', label: 'Orientação Familiar', icon: 'family_restroom' },
    { id: 'crisis', label: 'Intervenção em Crise', icon: 'warning' },
];

const LOCATIONS = [
    { id: 'consultorio', label: 'Consultório', icon: 'meeting_room' },
    { id: 'escola', label: 'Escola / Ambiente Externo', icon: 'school' },
    { id: 'unidade', label: 'Na Unidade', icon: 'home' },
    { id: 'online', label: 'Atendimento Online', icon: 'videocam' },
];

const DURATIONS = [
    { label: '30 min', value: 30 },
    { label: '50 min', value: 50 },
    { label: '90 min', value: 90 },
];

export function PsychologistSessionModal({ isOpen, onClose, selectedDate, eventToEdit }: PsychologistSessionModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [step, setStep] = useState(1);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [formData, setFormData] = useState({
        child_id: '',
        title: 'Sessão Psicológica',
        session_type: 'individual',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        duration: 50,
        location: 'consultorio',
        priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
        objective: '',
        is_recurring: false,
        recurrence_weeks: 4,
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-psych-session'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('children')
                .select('id, full_name, photo_url')
                .eq('organization_id', profile?.organization_id)
                .order('full_name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id && isOpen,
    });

    useEffect(() => {
        if (!isOpen) {
            setIsSuccess(false);
            setStep(1);
            setChildSearch('');
            return;
        }

        if (eventToEdit) {
            const start = parseISO(eventToEdit.start_time);
            const end = parseISO(eventToEdit.end_time);
            const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

            setFormData({
                child_id: eventToEdit.child_id || '',
                title: eventToEdit.title || 'Sessão Psicológica',
                session_type: eventToEdit.metadata?.session_type || 'individual',
                date: format(start, 'yyyy-MM-dd'),
                start_time: format(start, 'HH:mm'),
                duration: diffMinutes,
                location: eventToEdit.location || 'consultorio',
                priority: eventToEdit.priority || 'normal',
                objective: eventToEdit.description || '',
                is_recurring: false,
                recurrence_weeks: 4,
            });

            const child = children?.find(c => c.id === eventToEdit.child_id);
            if (child) setChildSearch(child.full_name);
        } else if (selectedDate) {
            setFormData(prev => ({
                ...prev,
                date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: format(new Date(), 'HH:mm'),
            }));
        }
    }, [eventToEdit, selectedDate, isOpen, children]);

    const filteredChildren = children?.filter(c =>
        c.full_name.toLowerCase().includes(childSearch.toLowerCase())
    ) || [];

    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const startDateTime = new Date(`${data.date}T${data.start_time}`);
            const endDateTime = addMinutes(startDateTime, data.duration);

            const eventData = {
                organization_id: profile?.organization_id,
                title: data.title,
                description: data.objective,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                type: 'medical', // Tag as medical for blue styling
                location: data.location,
                child_id: data.child_id,
                professional_id: profile?.id,
                priority: data.priority,
                status: 'scheduled',
                metadata: {
                    session_type: data.session_type,
                    clinical_origin: 'psychology_dashboard',
                    duration: data.duration
                }
            };

            if (eventToEdit) {
                const { error } = await supabase
                    .from('calendar_events')
                    .update(eventData)
                    .eq('id', eventToEdit.id);
                if (error) throw error;
            } else {
                // Handle single insertion
                const { error } = await supabase
                    .from('calendar_events')
                    .insert([eventData]);
                if (error) throw error;

                // Handle recurrence (simplified version: create identical events)
                if (data.is_recurring) {
                    const recurringEvents = [];
                    for (let i = 1; i < data.recurrence_weeks; i++) {
                        const recStart = new Date(startDateTime);
                        recStart.setDate(recStart.getDate() + (i * 7));
                        const recEnd = new Date(endDateTime);
                        recEnd.setDate(recEnd.getDate() + (i * 7));

                        recurringEvents.push({
                            ...eventData,
                            start_time: recStart.toISOString(),
                            end_time: recEnd.toISOString()
                        });
                    }
                    if (recurringEvents.length > 0) {
                        const { error: recError } = await supabase
                            .from('calendar_events')
                            .insert(recurringEvents);
                        if (recError) console.error('Error in recurrence:', recError);
                    }
                }
            }
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['psychologist-calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-xl shadow-xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col relative">

                {/* Header with Stepper Dots */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary/5 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Agendamento Clínico</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Passo {step} de 3</p>
                        </div>
                    </div>

                    {/* Stepper Dots */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={clsx(
                                    "h-1.5 transition-all duration-300 rounded-full",
                                    step === s ? "w-6 bg-primary" : "w-1.5 bg-gray-200 dark:bg-gray-700"
                                )}
                            />
                        ))}
                        <button onClick={onClose} className="ml-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="material-symbols-outlined text-xl text-text-secondary">close</span>
                        </button>
                    </div>
                </div>

                {/* Success Overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-white dark:bg-surface-dark flex flex-col items-center justify-center animate-in fade-in">
                        <div className="size-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 scale-in">
                            <span className="material-symbols-outlined text-4xl">check_rounded</span>
                        </div>
                        <h3 className="text-xl font-bold">Agendamento Concluído</h3>
                    </div>
                )}

                <div className="p-6">
                    {/* Step 1: Who and What */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Selecione o Acolhido</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar acolhido..."
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 transition-all font-bold text-sm"
                                        value={childSearch}
                                        onChange={(e) => {
                                            setChildSearch(e.target.value);
                                            setShowChildList(true);
                                        }}
                                        onFocus={() => setShowChildList(true)}
                                    />

                                    {showChildList && (childSearch.length > 0) && (
                                        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto z-20">
                                            {filteredChildren.length > 0 ? filteredChildren.map(child => (
                                                <button
                                                    key={child.id}
                                                    onClick={() => {
                                                        setFormData({ ...formData, child_id: child.id });
                                                        setChildSearch(child.full_name);
                                                        setShowChildList(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-b border-gray-50 last:border-0"
                                                >
                                                    <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}`} className="size-8 rounded-full" />
                                                    <span className="text-sm font-bold">{child.full_name}</span>
                                                    {formData.child_id === child.id && <span className="material-symbols-outlined text-primary ml-auto">check</span>}
                                                </button>
                                            )) : (
                                                <p className="p-4 text-center text-xs text-text-secondary">Nenhum acolhido encontrado</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Tipo de Sessão</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {SESSION_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setFormData({ ...formData, session_type: type.id })}
                                            className={clsx(
                                                "flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left",
                                                formData.session_type === type.id
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-text-secondary hover:bg-gray-100"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-xl">{type.icon}</span>
                                            <span className="text-[11px] font-bold uppercase tracking-tight">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Date and Time */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Data</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Início</label>
                                    <input
                                        type="time"
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Duração</label>
                                <div className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    {DURATIONS.map(d => (
                                        <button
                                            key={d.value}
                                            onClick={() => setFormData({ ...formData, duration: d.value })}
                                            className={clsx(
                                                "flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all",
                                                formData.duration === d.value ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-text-secondary"
                                            )}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Localização</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {LOCATIONS.map(loc => (
                                        <button
                                            key={loc.id}
                                            onClick={() => setFormData({ ...formData, location: loc.id })}
                                            className={clsx(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                                formData.location === loc.id
                                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900"
                                                    : "bg-white dark:bg-gray-800 text-text-secondary border-gray-100 dark:border-gray-700"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-lg">{loc.icon}</span>
                                            <span className="text-[10px] font-bold uppercase">{loc.label.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Objective and Recurrence */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Objetivo Terapêutico</label>
                                <textarea
                                    rows={3}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 text-sm font-medium resize-none"
                                    placeholder="Ex: Fortalecer vínculos, trabalhar ansiedade..."
                                    value={formData.objective}
                                    onChange={e => setFormData({ ...formData, objective: e.target.value })}
                                />
                            </div>

                            <div className="p-5 bg-primary/[0.03] rounded-2xl border border-primary/10 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-text-main">Atendimento Recorrente?</span>
                                    <p className="text-[10px] text-text-secondary">Repetir semanalmente</p>
                                </div>
                                <button
                                    onClick={() => setFormData({ ...formData, is_recurring: !formData.is_recurring })}
                                    className={clsx(
                                        "w-12 h-6 rounded-full relative transition-all duration-300",
                                        formData.is_recurring ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                                    )}
                                >
                                    <div className={clsx(
                                        "absolute top-1 size-4 bg-white rounded-full transition-all duration-300",
                                        formData.is_recurring ? "left-7" : "left-1"
                                    )} />
                                </button>
                            </div>

                            {formData.is_recurring && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                                    {[4, 12].map(w => (
                                        <button
                                            key={w}
                                            onClick={() => setFormData({ ...formData, recurrence_weeks: w })}
                                            className={clsx(
                                                "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                                formData.recurrence_weeks === w
                                                    ? "bg-gray-900 text-white border-gray-900"
                                                    : "bg-white text-text-secondary border-gray-100"
                                            )}
                                        >
                                            {w === 4 ? '1 Mês' : '3 Meses'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex gap-3">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3.5 rounded-xl border border-gray-100 text-sm font-bold text-text-secondary hover:bg-gray-50 transition-all"
                        >
                            Voltar
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-6 py-3.5 rounded-xl border border-gray-100 text-sm font-bold text-text-secondary hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={step === 1 && !formData.child_id}
                            className="flex-1 px-6 py-3.5 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            Próximo Passo
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => saveMutation.mutate(formData)}
                            disabled={saveMutation.isPending}
                            className="flex-1 px-6 py-3.5 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {saveMutation.isPending ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Confirmar Agendamento
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
