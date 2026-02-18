import clsx from 'clsx';

interface StatCardProps {
    icon: string;
    title: string;
    value: string | number;
    subValue?: React.ReactNode;
    variant?: 'default' | 'warning' | 'danger' | 'success';
}

export function StatCard({ icon, title, value, subValue, variant = 'default' }: StatCardProps) {
    const styles = {
        default: {
            border: 'border-l-4 border-l-transparent',
            bgIcon: 'bg-primary-light text-primary',
            badge: 'bg-green-50 text-green-600',
        },
        warning: {
            border: 'border-l-4 border-l-orange-400',
            bgIcon: 'bg-orange-50 text-orange-500',
            badge: 'bg-orange-50 text-orange-600',
        },
        danger: {
            border: 'border-l-4 border-l-red-500',
            bgIcon: 'bg-red-50 text-red-500',
            badge: 'bg-red-50 text-red-600',
        },
        success: {
            border: 'border-l-4 border-l-green-500', // hypothetical
            bgIcon: 'bg-green-50 text-green-600',
            badge: 'bg-green-50 text-green-600',
        }
    };

    const currentStyle = styles[variant];

    return (
        <div className={clsx(
            "bg-white dark:bg-surface-dark p-4 sm:p-5 rounded-xl border border-border-light dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[110px] sm:h-32 hover:shadow-md transition-all active:scale-[0.98]",
            currentStyle.border
        )}>
            <div className="flex justify-between items-start">
                <div className={clsx("p-2 rounded-lg", currentStyle.bgIcon)}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                {variant === 'warning' && (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">Alerta</span>
                )}
                {variant === 'default' && typeof subValue === 'string' && subValue.includes('+') && (
                    <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                        <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span> {subValue}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-text-secondary dark:text-gray-400 text-sm font-medium">{title}</h3>
                <div className="flex items-baseline gap-2">
                    <p className="text-text-main dark:text-white text-2xl font-bold">{value}</p>
                    {subValue && typeof subValue === 'string' && !subValue.includes('+') && (
                        <p className={clsx("text-xs font-medium", variant === 'danger' ? 'text-red-600' : 'text-text-secondary dark:text-gray-500')}>{subValue}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
