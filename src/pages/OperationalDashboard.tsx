import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

// Components
import { StatCard } from '../components/dashboard/StatCard';
import { MaintenanceTaskModal } from '../components/operational/MaintenanceTaskModal';
import { MaintenanceTaskCard, MaintenanceListItem } from '../components/operational/MaintenanceTasks';

type OperationalTab = 'agenda' | 'tasks' | 'history';

export function OperationalDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<OperationalTab>('agenda');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const { data: maintenanceData, isLoading } = useQuery({
        queryKey: ['maintenanceTasks', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;

            const { data, error } = await supabase
                .from('maintenance_tasks')
                .select(`
                    *,
                    photos:maintenance_photos(*)
                `)
                .eq('organization_id', profile.organization_id)
                .order('scheduled_date', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse font-display">Sincronizando cronograma operacional...</p>
            </div>
        );
    }

    const tasks = maintenanceData || [];
    const todayTasks = tasks.filter(t => isToday(parseISO(t.scheduled_date)) && t.status !== 'completed');
    const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const historyTasks = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled').sort((a, b) =>
        new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()
    );

    const stats = {
        forToday: todayTasks.length,
        pending: pendingTasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        corrective: tasks.filter(t => t.task_type === 'corrective' && t.status !== 'completed').length
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-text-main dark:text-white tracking-tight flex items-center gap-2 font-display">
                        <span className="material-symbols-outlined text-primary text-3xl">construction</span>
                        Operacional & Manutenção
                    </h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Cronograma de reparos, manutenções preventivas e controle de infraestrutura.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setSelectedTask(null); setIsModalOpen(true); }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined">add_task</span>
                        Nova Ordem
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    variant="info"
                    icon="event_upcoming"
                    title="Para Hoje"
                    value={stats.forToday}
                    subValue="Tarefas agendadas"
                />
                <StatCard
                    variant="warning"
                    icon="pending_actions"
                    title="Pendentes"
                    value={stats.pending}
                    subValue="Total em aberto"
                />
                <StatCard
                    variant="danger"
                    icon="build_circle"
                    title="Corretivas"
                    value={stats.corrective}
                    subValue="Reparos urgentes"
                />
                <StatCard
                    variant="success"
                    icon="task_alt"
                    title="Concluídas"
                    value={stats.completed}
                    subValue="Histórico total"
                />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-fit">
                {[
                    { id: 'agenda', label: 'Cronograma', icon: 'calendar_view_day' },
                    { id: 'tasks', label: 'Todas Tarefas', icon: 'format_list_bulleted' },
                    { id: 'history', label: 'Histórico', icon: 'history' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as OperationalTab);
                            window.scrollTo(0, 0);
                        }}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            activeTab === tab.id
                                ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                                : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                        )}
                    >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {activeTab === 'agenda' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-text-main dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="size-2 rounded-full bg-primary animate-pulse" />
                                Tarefas de Hoje
                            </h2>
                            <span className="text-xs font-bold text-text-secondary uppercase">
                                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </span>
                        </div>

                        {todayTasks.length === 0 ? (
                            <div className="bg-white dark:bg-surface-dark border border-dashed border-border-light dark:border-gray-800 rounded-3xl p-12 text-center">
                                <div className="size-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <span className="material-symbols-outlined text-3xl">task</span>
                                </div>
                                <h3 className="text-lg font-bold text-text-main dark:text-white">Tudo em ordem!</h3>
                                <p className="text-text-secondary dark:text-gray-500 mt-1 max-w-xs mx-auto">
                                    Não há manutenções agendadas para hoje até o momento.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {todayTasks.map(task => (
                                    <MaintenanceTaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={() => { setSelectedTask(task); setIsModalOpen(true); }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="p-6 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                            <h2 className="font-bold text-text-main dark:text-white uppercase tracking-widest text-xs">Ordens de Serviço em Aberto</h2>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase">Preventiva</span>
                                <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black uppercase">Corretiva</span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {pendingTasks.length === 0 ? (
                                <div className="p-12 text-center text-text-secondary">Nenhuma tarefa pendente.</div>
                            ) : (
                                pendingTasks.map(task => (
                                    <MaintenanceListItem
                                        key={task.id}
                                        task={task}
                                        onEdit={() => { setSelectedTask(task); setIsModalOpen(true); }}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                            <h2 className="text-xs font-black text-text-main dark:text-white uppercase tracking-widest">Histórico Administrativo</h2>
                            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">verified</span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {historyTasks.length === 0 ? (
                                <div className="p-12 text-center text-text-secondary">Nenhum histórico disponível.</div>
                            ) : (
                                historyTasks.map(task => (
                                    <MaintenanceListItem
                                        key={task.id}
                                        task={task}
                                        onEdit={() => { setSelectedTask(task); setIsModalOpen(true); }}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <MaintenanceTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
            />
        </div>
    );
}
