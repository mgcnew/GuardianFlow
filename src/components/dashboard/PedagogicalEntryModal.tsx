import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface PedagogicalEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
}

const CATEGORIES = [
    { id: 'tutoring', label: 'Reforço Escolar', icon: 'menu_book', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'school_visit', label: 'Visita à Escola', icon: 'school', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { id: 'evaluation', label: 'Avaliação', icon: 'analytics', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'recreational', label: 'Atividade Lúdica', icon: 'interests', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
];

export function PedagogicalEntryModal({ isOpen, onClose, initialChildId }: PedagogicalEntryModalProps) {
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
        next_appointment: '',
        engagement: 3,
        category: 'tutoring' as 'tutoring' | 'school_visit' | 'evaluation' | 'recreational'
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-pedagogical-entry'],
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
            next_appointment: '',
            engagement: 3,
            category: 'tutoring'
        });

        if (initialChildId && children) {
            const child = children.find(c => c.id === initialChildId);
            if (child) {
                setChildSearch(child.full_name);
                setStep(2); // Jump to step 2 if child is already selected
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
            if (!profile || !form.child_id) throw new Error('Dados incompletos. Certifique-se de selecionar um aluno.');

            const { error } = await supabase.from('child_entries').insert({
                child_id: form.child_id,
                organization_id: profile.organization_id,
                author_id: profile.id,
                type: 'pedagogical',
                title: form.title,
                content: form.content,
                category: form.category, // Use top-level category
                next_appointment: form.next_appointment || null,
                metadata: {
                    engagement: form.engagement,
                    category: form.category
                }
            });

            if (error) throw error;
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['pedagogueDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['child_entries'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        },
        onError: (error: any) => {
            console.error('Error saving pedagogical entry:', error);
            alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        }
    });

    if (!isOpen) return null;

    const selectedCategory = CATEGORIES.find(c => c.id === form.category)!;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className={clsx("size-10 rounded-xl flex items-center justify-center", selectedCategory.bg)}>
                            <span className={clsx("material-symbols-outlined text-2xl", selectedCategory.color)}>{selectedCategory.icon}</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Registro Pedagógico</h2>
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
                        <h3 className="text-xl font-bold">Registro Concluído</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Aluno / Acolhido</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar aluno..."
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

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Categoria da Atividade</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setForm({ ...form, category: cat.id as any })}
                                            className={clsx(
                                                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center",
                                                form.category === cat.id
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-text-secondary hover:bg-gray-100"
                                            )}
                                        >
                                            <span className={clsx("material-symbols-outlined text-2xl", cat.id === form.category ? cat.color : "")}>{cat.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-tight">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Título da Atividade</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Alfabetização, Reunião com Professores..."
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Nível de Engajamento</label>
                                        <div className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 justify-between">
                                            {[1, 2, 3, 4, 5].map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => setForm({ ...form, engagement: v })}
                                                    className={clsx(
                                                        "size-8 rounded-xl text-[11px] font-black transition-all",
                                                        form.engagement === v ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-400 hover:text-primary"
                                                    )}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Próxima Meta (Opcional)</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                            value={form.next_appointment}
                                            onChange={(e) => setForm({ ...form, next_appointment: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Desenvolvimento e Notas</label>
                                <textarea
                                    rows={6}
                                    placeholder="Descreva o progresso, dificuldades e intervenções realizadas..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 text-sm font-medium resize-none shadow-inner"
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
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
                            className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all font-display"
                        >
                            Voltar
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all font-display"
                        >
                            Cancelar
                        </button>
                    )}

                    <div className="flex-1 flex justify-end">
                        {step === 1 ? (
                            <button
                                onClick={() => setStep(2)}
                                disabled={!form.child_id || !form.category}
                                className="h-12 px-8 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                            >
                                Próximo Passo
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={!form.title || !form.content || saveMutation.isPending}
                                className="h-12 px-8 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 min-w-[200px]"
                            >
                                {saveMutation.isPending ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Salvar Registro
                                        <span className="material-symbols-outlined text-lg">check</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
