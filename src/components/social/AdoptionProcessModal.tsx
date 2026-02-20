import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AdoptionProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    childId?: string;
    childName?: string;
    existingProcess?: any;
}

const ADOPTION_STATUSES = [
    { id: 'initial_evaluation', label: 'Avaliação Inicial' },
    { id: 'family_search', label: 'Busca de Família' },
    { id: 'approximation', label: 'Aproximação' },
    { id: 'cohabitation', label: 'Estágio de Convivência' },
    { id: 'finalized', label: 'Finalizado (Sentença)' },
    { id: 'suspended', label: 'Suspenso' },
    { id: 'returned', label: 'Devolvido/Desistência' },
];

export function AdoptionProcessModal({ isOpen, onClose, childId, childName, existingProcess }: AdoptionProcessModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [form, setForm] = useState({
        child_id: '',
        process_number: '',
        status: 'initial_evaluation',
        court: '',
        judge_name: '',
        adopter_name: '',
        adopter_contact: '',
        approximation_start: '',
        cohabitation_start: '',
        finalization_date: '',
        social_worker_report: '',
        notes: '',
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-adoption-modal'],
        queryFn: async () => {
            const { data } = await supabase
                .from('children')
                .select('id, full_name, photo_url, judicial_process')
                .eq('organization_id', profile?.organization_id)
                .order('full_name');
            return data || [];
        },
        enabled: !!profile?.organization_id && isOpen && !childId,
    });

    useEffect(() => {
        if (!isOpen) { setIsSuccess(false); return; }

        if (existingProcess) {
            setForm({
                child_id: existingProcess.child_id,
                process_number: existingProcess.process_number || '',
                status: existingProcess.status || 'initial_evaluation',
                court: existingProcess.court || '',
                judge_name: existingProcess.judge_name || '',
                adopter_name: existingProcess.adopter_name || '',
                adopter_contact: existingProcess.adopter_contact || '',
                approximation_start: existingProcess.approximation_start || '',
                cohabitation_start: existingProcess.cohabitation_start || '',
                finalization_date: existingProcess.finalization_date || '',
                social_worker_report: existingProcess.social_worker_report || '',
                notes: existingProcess.notes || '',
            });
            if (childName) setChildSearch(childName);
        } else {
            setForm({
                child_id: childId || '',
                process_number: '',
                status: 'initial_evaluation',
                court: '',
                judge_name: '',
                adopter_name: '',
                adopter_contact: '',
                approximation_start: '',
                cohabitation_start: '',
                finalization_date: '',
                social_worker_report: '',
                notes: '',
            });
            if (childName) setChildSearch(childName);
        }
    }, [isOpen, existingProcess, childId, childName]);

    const filteredChildren = children?.filter(c =>
        c.full_name.toLowerCase().includes(childSearch.toLowerCase())
    ) || [];

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile || !form.child_id) throw new Error('Dados incompletos');
            const payload = {
                ...form,
                organization_id: profile.organization_id,
                created_by: profile.id,
                updated_at: new Date().toISOString(),
            };

            if (existingProcess?.id) {
                const { error } = await supabase.from('adoption_processes').update(payload).eq('id', existingProcess.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('adoption_processes').insert(payload);
                if (error) throw error;

                // Also update child legal_status if needed
                await supabase.from('children').update({ legal_status: 'em_processo_adocao' }).eq('id', form.child_id);
            }
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['socialWorkDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['adoption-processes'] });
            setTimeout(onClose, 1000);
        }
    });

    if (!isOpen) return null;

    if (isSuccess) {
        return createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="size-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-pink-600 text-3xl">check_circle</span>
                    </div>
                    <h3 className="text-lg font-black text-text-main dark:text-white">Processo Atualizado!</h3>
                </div>
            </div>, document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2rem] sm:rounded-3xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-pink-50 dark:bg-pink-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-pink-600 text-2xl">favorite</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Processo de Adoção</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Gestão de Vínculo Efetivo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Child Selection */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Acolhido *</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input type="text" placeholder="Buscar acolhido disponível..." className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50 transition-all disabled:opacity-50"
                                value={childSearch} onChange={(e) => { setChildSearch(e.target.value); setShowChildList(true); }} onFocus={() => setShowChildList(true)} disabled={!!childId} />
                        </div>
                        {showChildList && !childId && filteredChildren.length > 0 && (
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Status do Processo</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50">
                                {ADOPTION_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Nº Processo Adoção</label>
                            <input type="text" placeholder="0000000-00..." value={form.process_number} onChange={e => setForm(f => ({ ...f, process_number: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Vara / Comarca</label>
                            <input type="text" placeholder="Vara da Infância..." value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Juiz(a) Responsável</label>
                            <input type="text" placeholder="Nome do juiz(a)..." value={form.judge_name} onChange={e => setForm(f => ({ ...f, judge_name: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50" />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                        <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Informações dos Adotantes</p>
                        <div>
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">Nome do(s) Adotante(s)</label>
                            <input type="text" placeholder="Nome completo..." value={form.adopter_name} onChange={e => setForm(f => ({ ...f, adopter_name: e.target.value }))}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">Contato (Fone/Email)</label>
                            <input type="text" placeholder="(00) 00000-0000 / email@..." value={form.adopter_contact} onChange={e => setForm(f => ({ ...f, adopter_contact: e.target.value }))}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Início Aproximação</label>
                            <input type="date" value={form.approximation_start} onChange={e => setForm(f => ({ ...f, approximation_start: e.target.value }))}
                                className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Estágio Convivência</label>
                            <input type="date" value={form.cohabitation_start} onChange={e => setForm(f => ({ ...f, cohabitation_start: e.target.value }))}
                                className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Data Sentença</label>
                            <input type="date" value={form.finalization_date} onChange={e => setForm(f => ({ ...f, finalization_date: e.target.value }))}
                                className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Observações Sociais</label>
                        <textarea rows={3} placeholder="Descreva os pontos principais do relatório social sobre este processo..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-pink-500/50 transition-all resize-none" />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">Cancelar</button>
                    <button onClick={() => saveMutation.mutate()} disabled={!form.child_id || saveMutation.isPending}
                        className="flex-1 py-3 bg-pink-600 text-white text-sm font-bold rounded-xl hover:bg-pink-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {saveMutation.isPending ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-outlined text-lg">save</span> Salvar Processo</>}
                    </button>
                </div>
            </div>
        </div>, document.body
    );
}
