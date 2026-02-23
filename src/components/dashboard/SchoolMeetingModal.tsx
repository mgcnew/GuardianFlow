import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import clsx from 'clsx';

interface SchoolMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
    childrenList: any[];
}

export function SchoolMeetingModal({ isOpen, onClose, initialChildId, childrenList }: SchoolMeetingModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [isSuccess, setIsSuccess] = useState(false);

    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [form, setForm] = useState({
        child_id: initialChildId || '',
        meeting_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        participants: '',
        summary: '',
        decisions: '',
        meeting_type: 'Reunião de Pais e Mestres'
    });

    const meetingTypes = ['Reunião de Pais e Mestres', 'Conselho de Classe', 'Atendimento Individual', 'Visita Técnica', 'Reunião Extraordinária', 'Outro'];

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setIsSuccess(false);
            return;
        }

        setForm(prev => ({
            ...prev,
            child_id: initialChildId || '',
            meeting_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            participants: '',
            summary: '',
            decisions: '',
            meeting_type: 'Reunião de Pais e Mestres'
        }));

        const child = childrenList.find(c => c.id === (initialChildId || form.child_id));
        if (child) {
            setChildSearch(child.full_name);
            setStep(2); // Jump if child is pre-selected
        } else {
            setChildSearch('');
        }
    }, [isOpen, initialChildId, childrenList]);

    const filteredChildren = useMemo(() => {
        return childrenList.filter(c => c.full_name.toLowerCase().includes(childSearch.toLowerCase()));
    }, [childrenList, childSearch]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile?.organization_id || !profile?.id) throw new Error('Unauthorized');

            const { error } = await supabase
                .from('school_meetings')
                .insert([{
                    ...form,
                    organization_id: profile.organization_id,
                    author_id: profile.id
                }]);

            if (error) throw error;
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['pedagogueDashboard'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        },
        onError: (error: any) => {
            alert(`Erro ao salvar: ${error.message}`);
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-indigo-500 text-2xl">groups</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Ata de Reunião</h2>
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
                                        step === s ? "w-6 bg-indigo-500" : "w-1.5 bg-gray-200 dark:bg-gray-700"
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
                        <h3 className="text-xl font-bold">Ata Registrada</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Acolhido Participante</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar aluno..."
                                        className="w-full h-12 pl-11 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500/30 transition-all font-bold text-sm"
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
                                                    {form.child_id === child.id && <span className="material-symbols-outlined text-indigo-500 ml-auto text-sm">check</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Tipo de Reunião</label>
                                    <select
                                        value={form.meeting_type}
                                        onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500/30 transition-all font-bold text-sm appearance-none"
                                    >
                                        {meetingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Data e Horário</label>
                                    <input
                                        type="datetime-local"
                                        value={form.meeting_date}
                                        onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500/30 transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Participantes Adicionais</label>
                                <textarea
                                    placeholder="Ex: Direção, Professores, Equipe Técnica..."
                                    rows={2}
                                    value={form.participants}
                                    onChange={(e) => setForm({ ...form, participants: e.target.value })}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500/30 text-sm font-medium resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Resumo da Discussão</label>
                                <textarea
                                    rows={8}
                                    placeholder="Descreva o que foi abordado na reunião..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500/30 text-sm font-medium resize-none shadow-inner"
                                    value={form.summary}
                                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Deliberações e Acordos</label>
                                <textarea
                                    rows={4}
                                    placeholder="Quais foram as decisões tomadas?"
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500/30 text-sm font-medium resize-none"
                                    value={form.decisions}
                                    onChange={(e) => setForm({ ...form, decisions: e.target.value })}
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
                            className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all"
                        >
                            Voltar
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all"
                        >
                            Cancelar
                        </button>
                    )}

                    <div className="flex-1 flex justify-end">
                        {step === 1 ? (
                            <button
                                onClick={() => setStep(2)}
                                disabled={!form.child_id}
                                className="h-12 px-8 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                            >
                                Próximo Passo
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={!form.summary || saveMutation.isPending}
                                className="h-12 px-8 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 min-w-[200px]"
                            >
                                {saveMutation.isPending ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Finalizar Ata
                                        <span className="material-symbols-outlined text-lg">done_all</span>
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
