import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface PsychologicalEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
}

const INDICATORS = [
    { id: 'anxiety', label: 'Ansiedade' },
    { id: 'aggressiveness', label: 'Agressividade' },
    { id: 'isolation', label: 'Isolamento' },
    { id: 'cooperation', label: 'Cooperação' },
    { id: 'stability', label: 'Estabilidade' },
    { id: 'regression', label: 'Regressão' }
];

const SLEEP_OPTIONS = [
    { id: 'normal', label: 'Normal' },
    { id: 'agitated', label: 'Agitado' },
    { id: 'insomnia', label: 'Insônia' },
    { id: 'excessive', label: 'Hipersônia' }
];

const APPETITE_OPTIONS = [
    { id: 'normal', label: 'Normal' },
    { id: 'reduced', label: 'Reduzido' },
    { id: 'increased', label: 'Aumentado' }
];

export function PsychologicalEntryModal({ isOpen, onClose, initialChildId }: PsychologicalEntryModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [isSuccess, setIsSuccess] = useState(false);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [form, setForm] = useState({
        child_id: '',
        title: '',
        content: '',
        urgency: 'low' as 'low' | 'medium' | 'high',
        next_appointment: '',
        mood: 3,
        sleep: 'normal',
        appetite: 'normal',
        indicators: [] as string[]
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-psych-entry'],
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
            return;
        }

        setForm({
            child_id: initialChildId || '',
            title: '',
            content: '',
            urgency: 'low',
            next_appointment: '',
            mood: 3,
            sleep: 'normal',
            appetite: 'normal',
            indicators: []
        });

        if (initialChildId && children) {
            const child = children.find(c => c.id === initialChildId);
            if (child) {
                setChildSearch(child.full_name);
                setStep(2);
            }
        } else {
            setChildSearch('');
        }
    }, [isOpen, initialChildId, children]);

    const filteredChildren = children?.filter(c =>
        c.full_name.toLowerCase().includes(childSearch.toLowerCase())
    ) || [];

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile || !form.child_id) throw new Error('Dados incompletos');

            const { error } = await supabase.from('child_entries').insert({
                child_id: form.child_id,
                organization_id: profile.organization_id,
                author_id: profile.id,
                type: 'psychological',
                title: form.title,
                content: form.content,
                urgency: form.urgency,
                next_appointment: form.next_appointment || null,
                metadata: {
                    mood: form.mood,
                    sleep: form.sleep,
                    appetite: form.appetite,
                    indicators: form.indicators
                }
            });

            if (error) throw error;
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['psychDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['child_entries'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-2xl">clinical_notes</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Registro Clínico</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Passo {step} de 2</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 mr-4">
                            {[1, 2].map((s) => (
                                <div
                                    key={s}
                                    className={clsx(
                                        "h-1.5 transition-all duration-300 rounded-full",
                                        step === s ? "w-6 bg-primary" : "w-1.5 bg-gray-200 dark:bg-gray-700"
                                    )}
                                />
                            ))}
                        </div>
                        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
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
                        <h3 className="text-xl font-bold">Evolução Registrada</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Paciente / Acolhido</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar paciente..."
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 transition-all font-bold text-sm"
                                        value={childSearch}
                                        onChange={(e) => {
                                            setChildSearch(e.target.value);
                                            setShowChildList(true);
                                        }}
                                        onFocus={() => setShowChildList(true)}
                                    />
                                    {showChildList && (
                                        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto z-20">
                                            {filteredChildren.map(child => (
                                                <button
                                                    key={child.id}
                                                    onClick={() => {
                                                        setForm({ ...form, child_id: child.id });
                                                        setChildSearch(child.full_name);
                                                        setShowChildList(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 text-left"
                                                >
                                                    <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}`} className="size-8 rounded-full" />
                                                    <span className="text-sm font-bold">{child.full_name}</span>
                                                    {form.child_id === child.id && <span className="material-symbols-outlined text-primary ml-auto text-sm">check</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Urgência do Caso</label>
                                    <div className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        {(['low', 'medium', 'high'] as const).map(u => (
                                            <button
                                                key={u}
                                                onClick={() => setForm({ ...form, urgency: u })}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                                                    form.urgency === u
                                                        ? u === 'high' ? "bg-red-500 text-white shadow-sm" : u === 'medium' ? "bg-orange-500 text-white shadow-sm" : "bg-blue-500 text-white shadow-sm"
                                                        : "text-gray-400 hover:text-primary"
                                                )}
                                            >
                                                {u === 'high' ? 'Alta' : u === 'medium' ? 'Média' : 'Baixa'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Humor Observado</label>
                                    <div className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 justify-between">
                                        {[1, 2, 3, 4, 5].map(v => (
                                            <button
                                                key={v}
                                                onClick={() => setForm({ ...form, mood: v })}
                                                className={clsx(
                                                    "size-7 rounded-lg text-[10px] font-black transition-all",
                                                    form.mood === v ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-400 hover:text-primary"
                                                )}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Indicadores Observados</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {INDICATORS.map(ind => (
                                        <button
                                            key={ind.id}
                                            onClick={() => {
                                                const newInds = form.indicators.includes(ind.id)
                                                    ? form.indicators.filter(i => i !== ind.id)
                                                    : [...form.indicators, ind.id];
                                                setForm({ ...form, indicators: newInds });
                                            }}
                                            className={clsx(
                                                "flex items-center gap-2 p-3 rounded-xl border text-left transition-all",
                                                form.indicators.includes(ind.id)
                                                    ? "bg-primary/5 border-primary text-primary"
                                                    : "bg-gray-50 dark:bg-gray-900 border-transparent text-text-secondary hover:bg-gray-100"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-lg">{form.indicators.includes(ind.id) ? 'check_circle' : 'circle'}</span>
                                            <span className="text-[10px] font-bold uppercase">{ind.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Qualidade do Sono</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                        value={form.sleep}
                                        onChange={e => setForm({ ...form, sleep: e.target.value })}
                                    >
                                        {SLEEP_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Apetite</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                        value={form.appetite}
                                        onChange={e => setForm({ ...form, appetite: e.target.value })}
                                    >
                                        {APPETITE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Título do Registro</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Sessão Individual, Retorno Quinzenal..."
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Evolução e Notas Clínicas</label>
                                <textarea
                                    rows={6}
                                    placeholder="Descreva a anamnese, intervenções e observações clínicas..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 text-sm font-medium resize-none shadow-inner"
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Data Prevista de Retorno (Opcional)</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                    value={form.next_appointment}
                                    onChange={(e) => setForm({ ...form, next_appointment: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-3">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 rounded-xl border border-gray-100 text-sm font-bold text-text-secondary hover:bg-gray-50 transition-all"
                        >
                            Voltar
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl border border-gray-100 text-sm font-bold text-text-secondary hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </button>
                    )}

                    <div className="flex-1 flex justify-end">
                        {step === 1 ? (
                            <button
                                onClick={() => setStep(2)}
                                disabled={!form.child_id}
                                className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                Próximo Passo
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={!form.title || !form.content || saveMutation.isPending}
                                className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[180px]"
                            >
                                {saveMutation.isPending ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Salvar Registro
                                        <span className="material-symbols-outlined text-lg">clinical_notes</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
