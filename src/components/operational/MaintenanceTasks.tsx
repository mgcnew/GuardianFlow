import { memo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export const MaintenanceTaskCard = memo(({ task, onEdit }: { task: any, onEdit: (t: any) => void }) => {
    const isUrgent = task.task_type === 'corrective';

    return (
        <div className={clsx(
            "p-6 rounded-[2rem] border transition-all duration-300 bg-white dark:bg-surface-dark group relative overflow-hidden",
            isUrgent
                ? 'border-red-100 dark:border-red-900/20 hover:border-red-200 dark:hover:border-red-900/40 shadow-red-500/5 hover:shadow-red-500/10'
                : 'border-amber-100 dark:border-amber-900/20 hover:border-amber-200 dark:hover:border-amber-900/40 shadow-amber-500/5 hover:shadow-amber-500/10',
            "shadow-sm hover:shadow-xl hover:-translate-y-1"
        )}>
            {/* Decoration */}
            <div className={clsx(
                "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-20",
                isUrgent ? "bg-red-500" : "bg-amber-500"
            )} />

            <div className="flex items-start justify-between mb-5 relative">
                <div className={clsx(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                    isUrgent
                        ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                )}>
                    <span className="material-symbols-outlined text-sm">
                        {isUrgent ? 'warning' : 'engineering'}
                    </span>
                    {isUrgent ? 'Corretiva' : 'Preventiva'}
                </div>

                <div className="flex flex-col items-end">
                    <div className="text-[11px] font-black text-text-main dark:text-white uppercase tracking-tighter">
                        {format(parseISO(task.scheduled_date), "HH:mm")}
                    </div>
                    <div className="text-[9px] font-bold text-text-secondary uppercase">
                        {format(parseISO(task.scheduled_date), "dd MMM", { locale: ptBR })}
                    </div>
                </div>
            </div>

            <h3 className="text-xl font-black text-text-main dark:text-white leading-[1.1] mb-2 uppercase font-display line-clamp-2 min-h-[2.2em]">
                {task.title}
            </h3>

            <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2 mb-6 h-10 leading-relaxed font-medium">
                {task.description || "Nenhuma descrição fornecida."}
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] font-bold text-text-secondary dark:text-gray-500 mb-6 py-4 border-y border-gray-50 dark:border-gray-800/50">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">location_on</span>
                    {task.location}
                </div>
                {task.materials_used?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-primary">
                        <span className="material-symbols-outlined text-base">inventory_2</span>
                        {task.materials_used.length} {task.materials_used.length === 1 ? 'Item' : 'Itens'}
                    </div>
                )}
            </div>

            <button
                onClick={() => onEdit(task)}
                className={clsx(
                    "w-full font-black text-[10px] uppercase tracking-[0.15em] py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm",
                    "bg-gray-50 dark:bg-gray-800/80 text-text-main dark:text-white hover:bg-primary hover:text-white hover:shadow-primary/20"
                )}
            >
                Gerenciar Ordem
                <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
        </div>
    );
});

export const MaintenanceListItem = memo(({ task, onEdit }: { task: any, onEdit: (t: any) => void }) => {
    const isUrgent = task.task_type === 'corrective';

    return (
        <div className="p-4 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-all group cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0" onClick={() => onEdit(task)}>
            <div className="flex items-center gap-5">
                <div className={clsx(
                    "size-12 rounded-[1.25rem] flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                    isUrgent
                        ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                )}>
                    <span className="material-symbols-outlined text-2xl">
                        {isUrgent ? 'pests' : 'engineering'}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <h4 className="text-[13px] font-black text-text-main dark:text-white uppercase leading-tight tracking-tight group-hover:text-primary transition-colors">
                        {task.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary dark:text-gray-500">
                        <span>{task.location}</span>
                        <span className="size-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>{format(parseISO(task.scheduled_date), "dd/MM HH:mm")}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden sm:flex flex-col items-end gap-1">
                    {task.status === 'completed' ? (
                        <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            Concluído
                        </div>
                    ) : task.status === 'in_progress' ? (
                        <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-[12px] animate-spin-slow">sync</span>
                            Executando
                        </div>
                    ) : task.status === 'cancelled' ? (
                        <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded-md">
                            Cancelado
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">
                            Pendente
                        </div>
                    )}
                </div>

                <div className="size-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center text-text-secondary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                </div>
            </div>
        </div>
    );
});
