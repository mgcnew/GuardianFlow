import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

export function MaintenanceTaskCard({ task, onEdit }: { task: any, onEdit: (t: any) => void }) {
    return (
        <div className={clsx(
            "p-5 rounded-3xl border shadow-sm transition-all hover:shadow-md bg-white dark:bg-surface-dark animate-in zoom-in-95 duration-300",
            task.task_type === 'corrective' ? 'border-red-100 dark:border-red-900/30' : 'border-amber-100 dark:border-amber-900/30'
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    task.task_type === 'corrective' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                )}>
                    {task.task_type === 'corrective' ? 'Corretiva' : 'Preventiva'}
                </div>
                <div className="text-[10px] font-bold text-text-secondary uppercase">
                    {format(parseISO(task.scheduled_date), "HH:mm")}
                </div>
            </div>

            <h3 className="text-xl font-black text-text-main dark:text-white leading-tight mb-2 uppercase font-display">{task.title}</h3>
            <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2 mb-4 h-10">{task.description}</p>

            <div className="flex items-center gap-4 text-xs font-bold text-text-secondary mb-6">
                <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {task.location}
                </div>
                {task.materials_used?.length > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                        {task.materials_used.length} itens
                    </div>
                )}
            </div>

            <button
                onClick={() => onEdit(task)}
                className="w-full bg-gray-50 dark:bg-gray-800 text-text-main dark:text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-primary hover:text-white transition-all active:scale-[0.98]"
            >
                Ver Detalhes / Gerenciar
            </button>
        </div>
    );
}

export function MaintenanceListItem({ task, onEdit }: { task: any, onEdit: (t: any) => void }) {
    return (
        <div className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                    task.task_type === 'corrective' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                )}>
                    <span className="material-symbols-outlined text-xl">
                        {task.task_type === 'corrective' ? 'pests' : 'engineering'}
                    </span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-text-main dark:text-white uppercase leading-none">{task.title}</h4>
                    <p className="text-[11px] text-text-secondary dark:text-gray-500 mt-1">{task.location} • {format(parseISO(task.scheduled_date), "dd/MM/yy HH:mm")}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {task.status === 'completed' ? (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 uppercase">Concluído</span>
                ) : task.status === 'in_progress' ? (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">Em Andamento</span>
                ) : (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest">Pendente</span>
                )}

                <button
                    onClick={() => onEdit(task)}
                    className="size-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
            </div>
        </div>
    );
}
