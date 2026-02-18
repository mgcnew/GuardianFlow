import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export function SocialWorkDashboard() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [form, setForm] = useState({
        title: '',
        content: '',
        urgency: 'low' as 'low' | 'medium' | 'high',
        next_appointment: '',
    });

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['socialWorkDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            // Fetch summary stats for social work
            const { data: children } = await supabase
                .from('children')
                .select('id, full_name, status')
                .eq('organization_id', profile.organization_id);

            const { data: recentEntries } = await supabase
                .from('child_entries')
                .select('*, children(full_name)')
                .eq('organization_id', profile.organization_id)
                .eq('type', 'social_work')
                .order('created_at', { ascending: false })
                .limit(10);

            return {
                stats: {
                    totalChildren: children?.length || 0,
                    pendingProcesses: children?.filter(c => c.status === 'urgent').length || 0, // Placeholder
                    recentEntries: recentEntries?.length || 0,
                    urgentCases: children?.filter(c => c.status === 'urgent').length || 0
                },
                recentEntries: recentEntries || [],
                allChildren: children || []
            };
        },
        enabled: !!profile?.organization_id
    });

    const createEntry = useMutation({
        mutationFn: async () => {
            if (!profile || !selectedChildId) throw new Error('Selecione uma criança e certifique-se de estar logado');

            const { error } = await supabase.from('child_entries').insert({
                child_id: selectedChildId,
                organization_id: profile.organization_id,
                author_id: profile.id,
                type: 'social_work',
                title: form.title,
                content: form.content,
                urgency: form.urgency,
                next_appointment: form.next_appointment || null,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['socialWorkDashboard', profile?.organization_id] });
            setForm({ title: '', content: '', urgency: 'low', next_appointment: '' });
            setSelectedChildId('');
            setIsFormOpen(false);
            alert('Atendimento social registrado com sucesso!');
        },
        onError: (err: any) => alert('Erro ao salvar: ' + err.message),
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando painel social...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Serviço Social</h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Gestão de casos, processos e acompanhamento familiar.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-lg">description</span>
                        Relatórios
                    </button>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg">{isFormOpen ? 'close' : 'add'}</span>
                        {isFormOpen ? 'Fechar Form' : 'Novo Atendimento'}
                    </button>
                </div>
            </div>

            {/* Entry Form */}
            {isFormOpen && (
                <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <h2 className="text-lg font-bold text-text-main dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">diversity_3</span>
                        Registrar Atendimento Social
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Criança / Adolescente</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    value={selectedChildId}
                                    onChange={(e) => setSelectedChildId(e.target.value)}
                                >
                                    <option value="">Selecione um acolhido...</option>
                                    {dashboardData?.allChildren.map(child => (
                                        <option key={child.id} value={child.id}>{child.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Título do Atendimento</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Visita Domiciliar, Reunião de Rede, Estudo de Caso..."
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Urgência</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                        value={form.urgency}
                                        onChange={(e) => setForm({ ...form, urgency: e.target.value as any })}
                                    >
                                        <option value="low">Normal</option>
                                        <option value="medium">Atenção</option>
                                        <option value="high">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Próximo Contato</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                        value={form.next_appointment}
                                        onChange={(e) => setForm({ ...form, next_appointment: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Relatório / Observações</label>
                            <textarea
                                rows={8}
                                placeholder="Descreva os detalhes do atendimento, evolução do caso, contatos realizados..."
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => createEntry.mutate()}
                                    disabled={!selectedChildId || !form.title || !form.content || createEntry.isPending}
                                    className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                >
                                    {createEntry.isPending ? (
                                        <>
                                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">save</span>
                                            Salvar Atendimento
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="diversity_3"
                    title="Total Acolhidos"
                    value={dashboardData?.stats.totalChildren || 0}
                    variant="default"
                />
                <StatCard
                    icon="gavel"
                    title="Processos Urgentes"
                    value={dashboardData?.stats.urgentCases || 0}
                    variant={dashboardData?.stats.urgentCases && dashboardData.stats.urgentCases > 0 ? 'danger' : 'default'}
                />
                <StatCard
                    icon="history"
                    title="Atendimentos (Mês)"
                    value={dashboardData?.stats.recentEntries || 0}
                    variant="default"
                />
                <StatCard
                    icon="contact_support"
                    title="Prazos Ativos"
                    value="0"
                    variant="warning"
                />
            </div>

            {/* Recent Entries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">history</span>
                            Últimos Atendimentos Sociais
                        </h2>
                    </div>
                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                        {dashboardData?.recentEntries.length === 0 ? (
                            <p className="text-center text-text-secondary py-12">Nenhum atendimento registrado.</p>
                        ) : (
                            <div className="divide-y divide-border-light dark:divide-gray-800">
                                {dashboardData?.recentEntries.map((entry: any) => (
                                    <div key={entry.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-text-main dark:text-white uppercase text-xs">{entry.children?.full_name}</span>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                    entry.urgency === 'high' ? "bg-red-100 text-red-700" :
                                                        entry.urgency === 'medium' ? "bg-orange-100 text-orange-700" :
                                                            "bg-blue-100 text-blue-700"
                                                )}>
                                                    {entry.urgency === 'high' ? 'Urgente' : entry.urgency === 'medium' ? 'Atenção' : 'Normal'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase">
                                                {format(new Date(entry.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-text-main dark:text-gray-100 mb-1">{entry.title}</h4>
                                        <p className="text-sm text-text-secondary dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                                            {entry.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800">
                            <button className="text-primary text-sm font-bold hover:underline">Ver todo histórico social</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden h-fit">
                    <div className="px-6 py-5 border-b border-border-light dark:border-gray-800">
                        <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">feed</span>
                            Notas Rápidas
                        </h2>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-text-secondary mb-4">Mantenha aqui lembretes sobre prazos judiciais ou visitas de rede.</p>
                        <div className="space-y-3">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase mb-1">Dica</p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Todos os atendimentos registrados aqui também ficam disponíveis no histórico individual de cada acolhido.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
