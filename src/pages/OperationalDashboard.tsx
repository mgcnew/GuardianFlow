import { useState, useMemo, memo } from 'react';
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

// --- Sub-components (Memoized) ---

const AgendaView = memo(({ tasks, onEdit }: { tasks: any[], onEdit: (t: any) => void }) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-text-main dark:text-white uppercase tracking-widest flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                Tarefas de Hoje
            </h2>
            <span className="text-xs font-bold text-text-secondary dark:text-gray-500 uppercase">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
        </div>

        {tasks.length === 0 ? (
            <div className="bg-white dark:bg-surface-dark border border-dashed border-border-light dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm">
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
                {tasks.map(task => (
                    <MaintenanceTaskCard
                        key={task.id}
                        task={task}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        )}
    </div>
));

const TasksListView = memo(({ tasks, title, emptyMessage, onEdit, icon }: { tasks: any[], title: string, emptyMessage: string, onEdit: (t: any) => void, icon?: string }) => (
    <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden min-h-[400px] animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="p-6 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon && <span className="material-symbols-outlined text-primary text-xl">{icon}</span>}
                <h2 className="font-bold text-text-main dark:text-white uppercase tracking-widest text-xs">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase">Preventiva</span>
                <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black uppercase">Corretiva</span>
            </div>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {tasks.length === 0 ? (
                <div className="p-16 text-center text-text-secondary dark:text-gray-500 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl opacity-20">inventory_2</span>
                    <p className="font-medium italic">{emptyMessage}</p>
                </div>
            ) : (
                tasks.map(task => (
                    <MaintenanceListItem
                        key={task.id}
                        task={task}
                        onEdit={onEdit}
                    />
                ))
            )}
        </div>
    </div>
));

// --- Main Page ---

export function OperationalDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<OperationalTab>('agenda');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const { data: maintenanceData, isLoading, isError, isFetching } = useQuery({
        queryKey: ['maintenanceTasks', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const { data, error } = await supabase
                .from('maintenance_tasks')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('scheduled_date', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    // --- Derived Data (Memoized for Performance) ---
    const { todayTasks, pendingTasks, historyTasks, stats } = useMemo(() => {
        const tasks = maintenanceData || [];

        const filteredToday = tasks.filter(t => isToday(parseISO(t.scheduled_date)) && t.status !== 'completed');
        const filteredPending = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
        const filteredHistory = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled').sort((a, b) =>
            new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()
        );

        return {
            todayTasks: filteredToday,
            pendingTasks: filteredPending,
            historyTasks: filteredHistory,
            stats: {
                forToday: filteredToday.length,
                pending: filteredPending.length,
                completed: tasks.filter(t => t.status === 'completed').length,
                corrective: tasks.filter(t => t.task_type === 'corrective' && t.status !== 'completed').length
            }
        };
    }, [maintenanceData]);

    const handleEditTask = (task: any) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleNewTask = () => {
        setSelectedTask(null);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse pb-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="w-64 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                        <div className="w-96 h-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    </div>
                    <div className="w-40 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm" />
                    ))}
                </div>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-28 h-10 bg-gray-100 dark:bg-gray-800/50 rounded-xl" />
                        ))}
                    </div>
                    <div className="h-[400px] bg-white/50 dark:bg-surface-dark/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-4xl mb-4">error</span>
                <h3 className="text-xl font-bold mb-2">Erro ao carregar manutenções</h3>
                <p className="text-sm max-w-md mx-auto mb-4">Não foi possível carregar as ordens de serviço. Por favor, tente novamente mais tarde.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition active:scale-95"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (!maintenanceData) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-text-main dark:text-white tracking-tight flex items-center gap-2 font-display">
                        <span className="material-symbols-outlined text-primary text-3xl">construction</span>
                        Operacional & Manutenção
                        {isFetching && (
                            <span className="material-symbols-outlined text-primary text-sm animate-spin-slow ml-2" title="Sincronizando...">sync</span>
                        )}
                    </h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Cronograma de reparos, manutenções preventivas e controle de infraestrutura.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleNewTask}
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

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar border border-border-light dark:border-gray-800">
                {[
                    { id: 'agenda', label: 'Cronograma', icon: 'calendar_view_day' },
                    { id: 'tasks', label: 'Todas Tarefas', icon: 'format_list_bulleted' },
                    { id: 'history', label: 'Histórico', icon: 'history' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as OperationalTab);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-white dark:bg-surface-dark text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                        )}
                    >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'agenda' && (
                    <AgendaView tasks={todayTasks} onEdit={handleEditTask} />
                )}

                {activeTab === 'tasks' && (
                    <TasksListView
                        tasks={pendingTasks}
                        title="Ordens de Serviço em Aberto"
                        emptyMessage="Nenhuma tarefa pendente encontrada."
                        onEdit={handleEditTask}
                        icon="pending_actions"
                    />
                )}

                {activeTab === 'history' && (
                    <TasksListView
                        tasks={historyTasks}
                        title="Histórico Administrativo"
                        emptyMessage="Nenhum registro no histórico."
                        onEdit={handleEditTask}
                        icon="verified"
                    />
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

