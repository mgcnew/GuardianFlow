import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface AppointmentsTabProps {
    childId: string;
}

const APPOINTMENT_TYPES = [
    { id: 'psychological', label: 'Psicológico', icon: 'psychology', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { id: 'pedagogical', label: 'Pedagógico', icon: 'school', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { id: 'social_work', label: 'Assistência Social', icon: 'diversity_3', color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
];

export function AppointmentsTab({ childId }: AppointmentsTabProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

    const [form, setForm] = useState({
        type: 'psychological',
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
                .in('type', ['psychological', 'pedagogical', 'social_work'])
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
                type: form.type,
                title: form.title,
                content: form.content,
                next_appointment: form.next_appointment || null,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['child-appointments', childId] });
            setForm({ type: 'psychological', title: '', content: '', next_appointment: '' });
            setIsFormOpen(false);
        },
        onError: (err: any) => alert('Erro: ' + err.message),
    });

    const filteredEntries = (entries || []).filter(
        (e: any) => filterType === 'all' || e.type === filterType
    );

    const getTypeMeta = (t: string) => APPOINTMENT_TYPES.find((a) => a.id === t) || APPOINTMENT_TYPES[0];

    // Stats
    const stats = APPOINTMENT_TYPES.map((t) => ({
        ...t,
        count: (entries || []).filter((e: any) => e.type === t.id).length,
    }));

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                {stats.map((s) => (
                    <div key={s.id} className="rounded-xl md:rounded-2xl bg-white dark:bg-surface-dark p-3 md:p-5 ring-1 ring-border-light dark:ring-gray-800 shadow-sm text-center">
                        <div className={clsx('size-8 md:size-10 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-1.5 md:mb-2', s.color)}>
                            <span className="material-symbols-outlined text-lg md:text-2xl">{s.icon}</span>
                        </div>
                        <p className="text-xl md:text-2xl font-black text-text-main dark:text-white">{s.count}</p>
                        <p className="text-[9px] md:text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-wider md:tracking-widest mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* New Appointment Form */}
            <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark p-4 md:p-6 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
                <div className="flex items-center justify-between mb-4 gap-2">
                    <h3 className="text-base md:text-xl font-black text-text-main dark:text-white font-display tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">event_note</span>
                        <span className="hidden sm:inline">Registro de Atendimentos</span>
                        <span className="sm:hidden">Atendimentos</span>
                    </h3>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-primary text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider md:tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[16px]">{isFormOpen ? 'close' : 'add'}</span>
                        <span className="hidden sm:inline">{isFormOpen ? 'Fechar' : 'Novo Atendimento'}</span>
                        <span className="sm:hidden">{isFormOpen ? 'Fechar' : 'Novo'}</span>
                    </button>
                </div>

                {isFormOpen && (
                    <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-border-light dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
                        {/* Type */}
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">Tipo de Atendimento</label>
                            <div className="flex flex-wrap gap-2 md:gap-3">
                                {APPOINTMENT_TYPES.map((at) => (
                                    <button
                                        key={at.id}
                                        onClick={() => setForm({ ...form, type: at.id })}
                                        className={clsx(
                                            'flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                                            form.type === at.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent bg-white dark:bg-gray-800 hover:border-gray-200'
                                        )}
                                    >
                                        <div className={clsx('size-10 rounded-xl flex items-center justify-center', at.color)}>
                                            <span className="material-symbols-outlined">{at.icon}</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{at.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Resumo da Sessão</label>
                            <input
                                type="text"
                                placeholder="Ex: Sessão de acompanhamento semanal..."
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Evolução / Observações</label>
                            <textarea
                                rows={4}
                                placeholder="Descreva a evolução observada, intervenções realizadas e encaminhamentos..."
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm resize-none"
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                            />
                        </div>

                        {/* Next Appointment */}
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Próximo Atendimento</label>
                            <input
                                type="datetime-local"
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm"
                                value={form.next_appointment}
                                onChange={(e) => setForm({ ...form, next_appointment: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={() => createAppointment.mutate()}
                            disabled={!form.title || createAppointment.isPending}
                            className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {createAppointment.isPending ? 'Salvando...' : 'Registrar Atendimento'}
                        </button>
                    </div>
                )}
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                    onClick={() => setFilterType('all')}
                    className={clsx('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all', filterType === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-text-secondary ring-1 ring-border-light dark:ring-gray-800')}
                >
                    Todos
                </button>
                {APPOINTMENT_TYPES.map((at) => (
                    <button key={at.id} onClick={() => setFilterType(at.id)}
                        className={clsx('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all', filterType === at.id ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-text-secondary ring-1 ring-border-light dark:ring-gray-800')}
                    >
                        {at.label}
                    </button>
                ))}
            </div>

            {/* Entries List */}
            {isLoading ? (
                <div className="flex justify-center py-12"><div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-white dark:bg-surface-dark rounded-2xl md:rounded-3xl ring-1 ring-border-light dark:ring-gray-800">
                    <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-3 block">event_busy</span>
                    <p className="text-sm font-bold text-text-main dark:text-white font-display">Nenhum atendimento registrado</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">Registre a primeira sessão clicando em "Novo Atendimento".</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEntries.map((entry: any) => {
                        const meta = getTypeMeta(entry.type);
                        return (
                            <div key={entry.id} className="rounded-2xl bg-white dark:bg-surface-dark p-5 ring-1 ring-border-light dark:ring-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                    <div className={clsx('size-10 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
                                        <span className="material-symbols-outlined">{meta.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-text-main dark:text-white font-display truncate">{entry.title}</p>
                                            <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase shrink-0">
                                                {new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase tracking-widest mt-0.5">{meta.label}</p>
                                        {entry.content && (
                                            <p className="mt-2 text-sm text-text-secondary dark:text-gray-300 leading-relaxed line-clamp-3">{entry.content}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-3">
                                            <p className="text-[10px] text-text-secondary/60 dark:text-gray-600 font-bold">por {entry.author?.full_name || 'Profissional'}</p>
                                            {entry.next_appointment && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                    <span className="material-symbols-outlined text-[12px]">event</span>
                                                    Próximo: {new Date(entry.next_appointment).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
