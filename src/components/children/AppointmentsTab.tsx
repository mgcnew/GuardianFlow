import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentsTabProps {
    childId: string;
}

export function AppointmentsTab({ childId }: AppointmentsTabProps) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [form, setForm] = useState({
        type: 'social_work',
        title: '',
        content: '',
        next_appointment: '',
    });

    const { data: entries, isLoading } = useQuery({
        queryKey: ['child-appointments', childId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('child_entries')
                .select('*, author:profiles(full_name)')
                .eq('child_id', childId)
                .eq('type', 'social_work')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const createAppointment = useMutation({
        mutationFn: async () => {
            if (!profile) throw new Error('Perfil não carregado');
            const { error } = await supabase.from('child_entries').insert({
                child_id: childId,
                organization_id: profile.organization_id,
                author_id: profile.id,
                type: 'social_work',
                title: form.title,
                content: form.content,
                next_appointment: form.next_appointment || null,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['child-appointments', childId] });
            setForm({ type: 'social_work', title: '', content: '', next_appointment: '' });
            setIsFormOpen(false);
            toast('Registro de assistência social salvo!', 'success');
        },
        onError: (err: any) => toast('Erro: ' + err.message, 'error'),
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Summary Card */}
            <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 ring-1 ring-border-light dark:ring-gray-800 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">diversity_3</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Registros Sociais</p>
                            <h3 className="text-2xl font-black text-text-main dark:text-white">{entries?.length || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header & New Action */}
            <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-black text-text-main dark:text-white font-display flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">history</span>
                    Assistência Social
                </h3>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-lg">{isFormOpen ? 'close' : 'add'}</span>
                    {isFormOpen ? 'Cancelar' : 'Novo Registro'}
                </button>
            </div>

            {/* Form */}
            {isFormOpen && (
                <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Assunto / Visita</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Atualização do Bolsa Família, Visita Domiciliar..."
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Próximo Contato</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm"
                                    value={form.next_appointment}
                                    onChange={(e) => setForm({ ...form, next_appointment: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Relatório Social</label>
                            <textarea
                                rows={6}
                                placeholder="Descreva os detalhes do atendimento, situação familiar e encaminhamentos..."
                                className="w-full flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm resize-none"
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                            />
                            <button
                                onClick={() => createAppointment.mutate()}
                                disabled={!form.title || !form.content || createAppointment.isPending}
                                className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {createAppointment.isPending ? 'Salvando...' : 'Salvar Registro Social'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {isLoading ? (
                <div className="text-center py-12 animate-pulse text-text-secondary">Carregando histórico...</div>
            ) : entries?.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-surface-dark rounded-3xl border border-dashed border-border-light dark:border-gray-800">
                    <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-2">assignment_ind</span>
                    <p className="text-sm font-bold text-text-main dark:text-white">Nenhum registro social</p>
                    <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">Clique em "Novo Registro" para começar.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {entries?.map((entry: any) => (
                        <div key={entry.id} className="rounded-2xl bg-white dark:bg-surface-dark p-6 ring-1 ring-border-light dark:ring-gray-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">diversity_3</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-text-main dark:text-white">{entry.title}</h4>
                                        <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">
                                            {format(new Date(entry.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })} • por {entry.author?.full_name || 'Profissional'}
                                        </p>
                                    </div>
                                </div>
                                {entry.next_appointment && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-full border border-orange-100 dark:border-orange-900/50">
                                        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                        RETORNO: {format(new Date(entry.next_appointment), 'dd/MM/yyyy')}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-text-secondary dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
