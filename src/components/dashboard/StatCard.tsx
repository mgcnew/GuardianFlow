import clsx from 'clsx';

interface StatCardProps {
    icon: string;
    title: string;
    value: string | number;
    subValue?: React.ReactNode;
    variant?: 'default' | 'warning' | 'danger' | 'success' | 'info' | 'purple';
    isLoading?: boolean;
    onInfoClick?: () => void;
}

export function StatCard({ icon, title, value, subValue, variant = 'default', isLoading, onInfoClick }: StatCardProps) {
    const styles = {
        default: {
            container: 'bg-white dark:bg-surface-dark border-border-light dark:border-gray-800',
            border: 'border-l-4 border-l-transparent',
            bgIcon: 'bg-primary-light dark:bg-primary/20 text-primary dark:text-primary',
            badge: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        },
        info: {
            container: 'bg-blue-50/50 dark:bg-surface-dark border-blue-100 dark:border-gray-800',
            border: 'border-l-4 border-l-blue-400',
            bgIcon: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
            badge: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        },
        warning: {
            container: 'bg-amber-50/50 dark:bg-surface-dark border-amber-100 dark:border-gray-800',
            border: 'border-l-4 border-l-amber-400',
            bgIcon: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
            badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
        },
        danger: {
            container: 'bg-red-50/50 dark:bg-surface-dark border-red-100 dark:border-gray-800',
            border: 'border-l-4 border-l-red-500',
            bgIcon: 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400',
            badge: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
        },
        success: {
            container: 'bg-emerald-50/50 dark:bg-surface-dark border-emerald-100 dark:border-gray-800',
            border: 'border-l-4 border-l-emerald-500',
            bgIcon: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        },
        purple: {
            container: 'bg-purple-50/50 dark:bg-surface-dark border-purple-100 dark:border-gray-800',
            border: 'border-l-4 border-l-purple-500',
            bgIcon: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
            badge: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
        }
    };

    const currentStyle = styles[variant];

    return (
        <div className={clsx(
            "p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between min-h-[110px] sm:h-32 hover:shadow-md transition-all active:scale-[0.98]",
            currentStyle.container,
            currentStyle.border
        )}>
            <div className="flex justify-between items-start">
                <div className={clsx("p-2 rounded-lg", currentStyle.bgIcon)}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="flex items-center gap-2">
                    {variant === 'warning' && (
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">Alerta</span>
                    )}
                    {variant === 'default' && typeof subValue === 'string' && subValue.includes('+') && (
                        <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                            <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span> {subValue}
                        </span>
                    )}
                    {onInfoClick && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onInfoClick();
                            }}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-text-secondary dark:text-gray-400 transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">info</span>
                        </button>
                    )}
                </div>
            </div>
            <div>
                <h3 className="text-text-secondary dark:text-gray-400 text-sm font-medium">{title}</h3>
                <div className="flex items-baseline gap-2">
                    <p className={clsx(
                        "text-text-main dark:text-white text-2xl font-bold",
                        isLoading && "animate-pulse opacity-50"
                    )}>{isLoading ? '...' : value}</p>
                    {subValue && typeof subValue === 'string' && !subValue.includes('+') && (
                        <p className={clsx("text-[10px] font-black uppercase tracking-widest", variant === 'danger' ? 'text-red-500' : 'text-text-secondary dark:text-gray-500')}>
                            {subValue}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
