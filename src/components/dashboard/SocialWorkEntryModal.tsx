import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

const SOCIAL_CATEGORIES = [
    { id: 'atendimento', label: 'Atendimento', icon: 'diversity_3' },
    { id: 'visita_domiciliar', label: 'Visita Domiciliar', icon: 'home' },
    { id: 'audiencia', label: 'Audiência', icon: 'gavel' },
    { id: 'relatorio_judicial', label: 'Relatório Judicial', icon: 'description' },
    { id: 'contato_telefonico', label: 'Contato Telefônico', icon: 'call' },
    { id: 'estudo_caso', label: 'Estudo de Caso', icon: 'psychology' },
    { id: 'reuniao_equipe', label: 'Reunião de Equipe', icon: 'groups' },
    { id: 'encaminhamento', label: 'Encaminhamento', icon: 'send' },
    { id: 'pia', label: 'PIA', icon: 'assignment' },
    { id: 'adocao', label: 'Adoção', icon: 'favorite' },
];

interface SocialWorkEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
}

export function SocialWorkEntryModal({ isOpen, onClose, initialChildId }: SocialWorkEntryModalProps) {
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
        category: 'atendimento',
        referral: '',
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-social-entry'],
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
            category: 'atendimento',
            referral: '',
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
                type: 'social_work',
                title: form.title,
                content: form.content,
                urgency: form.urgency,
                category: form.category,
                referral: form.referral || null,
                next_appointment: form.next_appointment || null,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['socialWorkDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['child_entries'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-500 text-2xl">diversity_3</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Atendimento Social</h2>
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
                                        step === s ? "w-6 bg-amber-500" : "w-1.5 bg-gray-200 dark:bg-gray-700"
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
                        <h3 className="text-xl font-bold">Atendimento Registrado</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Selecione o Acolhido</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar acolhido..."
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/30 transition-all font-bold text-sm"
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
                                                    {form.child_id === child.id && <span className="material-symbols-outlined text-amber-500 ml-auto text-sm">check</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Nível de Prioridade</label>
                                <div className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    {(['low', 'medium', 'high'] as const).map(u => (
                                        <button
                                            key={u}
                                            onClick={() => setForm({ ...form, urgency: u })}
                                            className={clsx(
                                                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                                                form.urgency === u
                                                    ? u === 'high' ? "bg-red-500 text-white shadow-sm" : u === 'medium' ? "bg-amber-500 text-white shadow-sm" : "bg-blue-500 text-white shadow-sm"
                                                    : "text-gray-400 hover:text-amber-500 font-bold"
                                            )}
                                        >
                                            {u === 'high' ? 'Crítico' : u === 'medium' ? 'Atenção' : 'Normal'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Tipo de Atendimento</label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {SOCIAL_CATEGORIES.map(cat => (
                                        <button key={cat.id} type="button" onClick={() => setForm({ ...form, category: cat.id })}
                                            className={clsx("flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-[10px] font-bold",
                                                form.category === cat.id ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600" : "border-gray-100 dark:border-gray-700 text-text-secondary hover:border-gray-300")}>
                                            <span className="material-symbols-outlined text-base">{cat.icon}</span>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase mb-2">Orientações do Serviço Social</p>
                                <p className="text-[11px] text-amber-600/80 leading-relaxed italic">
                                    "A escuta qualificada e o sigilo profissional são pilares fundamentais. Certifique-se de documentar apenas o necessário para o acompanhamento do caso."
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Título do Atendimento</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Visita Domiciliar, Reunião Sistêmica..."
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/50 font-bold text-sm"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Relatório Social e Intervenções</label>
                                <textarea
                                    rows={8}
                                    placeholder="Descreva as observações, encaminhamentos e resultados do atendimento..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/30 text-sm font-medium resize-none shadow-inner"
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                />
                            </div>

                            {/* Referral / Follow-up */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Encaminhamentos / Providências</label>
                                <textarea
                                    rows={3}
                                    placeholder="Encaminhamentos realizados, providências a tomar, articulações necessárias..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/30 text-sm font-medium resize-none"
                                    value={form.referral}
                                    onChange={(e) => setForm({ ...form, referral: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Próximo Contato Agendado (Opcional)</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/50 font-bold text-sm"
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
                                className="px-8 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                Próximo Passo
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={!form.title || !form.content || saveMutation.isPending}
                                className="px-8 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[180px]"
                            >
                                {saveMutation.isPending ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Salvar Atendimento
                                        <span className="material-symbols-outlined text-lg">save</span>
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
