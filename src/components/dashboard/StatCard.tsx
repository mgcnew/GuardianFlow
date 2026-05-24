import clsx from 'clsx';

interface StatCardProps {
    icon: string;
    title: string;
    value: string | number;
    subValue?: React.ReactNode;
    variant?: 'default' | 'warning' | 'danger' | 'success' | 'info' | 'purple';
    isLoading?: boolean;
    onInfoClick?: () => void;
    progress?: number;
}

export function StatCard({ icon, title, value, subValue, variant = 'default', isLoading, onInfoClick, progress }: StatCardProps) {
    const styles = {
        default: {
            iconBg: 'bg-primary/10 dark:bg-primary/20',
            iconColor: 'text-primary',
            decor: 'bg-primary/5 dark:bg-primary/10',
            bar: 'bg-primary',
        },
        info: {
            iconBg: 'bg-blue-100 dark:bg-blue-500/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            decor: 'bg-blue-50 dark:bg-blue-900/20',
            bar: 'bg-blue-500',
        },
        warning: {
            iconBg: 'bg-amber-100 dark:bg-amber-500/20',
            iconColor: 'text-amber-600 dark:text-amber-400',
            decor: 'bg-amber-50 dark:bg-amber-900/20',
            bar: 'bg-amber-500',
        },
        danger: {
            iconBg: 'bg-red-100 dark:bg-red-500/20',
            iconColor: 'text-red-500 dark:text-red-400',
            decor: 'bg-red-50 dark:bg-red-900/20',
            bar: 'bg-red-500',
        },
        success: {
            iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            decor: 'bg-emerald-50 dark:bg-emerald-900/20',
            bar: 'bg-emerald-500',
        },
        purple: {
            iconBg: 'bg-purple-100 dark:bg-purple-500/20',
            iconColor: 'text-purple-600 dark:text-purple-400',
            decor: 'bg-purple-50 dark:bg-purple-900/20',
            bar: 'bg-purple-500',
        },
    };

    const s = styles[variant];

    const progressBarColor =
        progress !== undefined
            ? progress > 85 ? 'bg-red-500'
            : progress > 65 ? 'bg-amber-500'
            : s.bar
        : s.bar;

    return (
        <div className="relative bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between min-h-[140px]">
            {/* Decorative background circle */}
            <div className={clsx("absolute -right-5 -top-5 size-24 rounded-full opacity-60", s.decor)} />

            {/* Top row: icon + actions */}
            <div className="relative z-10 flex items-start justify-between mb-4">
                <div className={clsx("size-12 rounded-2xl flex items-center justify-center shadow-sm", s.iconBg)}>
                    <span className={clsx("material-symbols-outlined text-[22px]", s.iconColor)}>{icon}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {variant === 'warning' && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            Alerta
                        </span>
                    )}
                    {onInfoClick && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
                            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px] text-text-secondary dark:text-gray-500">info</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom: value + title + optional progress */}
            <div className="relative z-10">
                <p className={clsx(
                    "text-4xl font-black text-text-main dark:text-white tracking-tight leading-none",
                    isLoading && "animate-pulse opacity-40"
                )}>
                    {isLoading ? '—' : value}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-text-secondary dark:text-gray-500 mt-1.5">
                    {title}
                </p>
                {subValue && typeof subValue === 'string' && (
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5 truncate">{subValue}</p>
                )}

                {progress !== undefined && (
                    <div className="mt-3">
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={clsx("h-full rounded-full transition-all duration-700", progressBarColor)}
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                        </div>
                        <p className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mt-1">
                            {Math.round(progress)}% ocupado
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
