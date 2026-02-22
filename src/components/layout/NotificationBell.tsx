import clsx from 'clsx';

interface NotificationBellProps {
    unreadCount: number;
    isOpen: boolean;
    className?: string;
}

export function NotificationBell({ unreadCount, isOpen, className }: NotificationBellProps) {
    return (
        <div className={clsx("relative flex items-center justify-center cursor-pointer group", className)}>
            <div className={clsx(
                "relative transition-all duration-300 transform group-hover:scale-110 active:scale-90",
                unreadCount > 0 && !isOpen && "animate-bell-swing"
            )}>
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={clsx(
                        "transition-colors duration-300",
                        isOpen
                            ? "text-primary shadow-sm"
                            : "text-text-secondary dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary"
                    )}
                >
                    {/* Clapper (the bottom part) */}
                    <path
                        d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"
                        fill="currentColor"
                        className={clsx(
                            "transition-transform duration-500 origin-top",
                            unreadCount > 0 && !isOpen && "animate-clapper-move"
                        )}
                    />

                    {/* Bell Body */}
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C10.9 2 10 2.9 10 4V4.29C7.11 5.14 5 7.82 5 11V17L3 19V20H21V19L19 17V11C19 7.82 16.89 5.14 14 4.29V4C14 2.9 13.1 2 12 2ZM7 11C7 8.24 9.24 6 12 6C14.76 6 17 8.24 17 11V18H7V11Z"
                        fill="currentColor"
                    />

                    {/* New Notification Indicator Dot - Inside SVG */}
                    {unreadCount > 0 && (
                        <circle
                            cx="18"
                            cy="6"
                            r="3"
                            fill="currentColor"
                            className="text-primary animate-pulse"
                        />
                    )}
                </svg>

                {/* External Badge (optional, but keep for usability) */}
                {unreadCount > 0 && (
                    <span className={clsx(
                        "absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-surface-dark transition-all duration-300",
                        isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100 animate-in zoom-in"
                    )}>
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </div>

            <style>{`
                @keyframes bell-swing {
                    0%, 70%, 100% { transform: rotate(0); }
                    75% { transform: rotate(-15deg); }
                    80% { transform: rotate(12deg); }
                    85% { transform: rotate(-8deg); }
                    90% { transform: rotate(4deg); }
                    95% { transform: rotate(-2deg); }
                }
                
                @keyframes clapper-move {
                    0%, 70%, 100% { transform: translateX(0); }
                    75% { transform: translateX(2px); }
                    80% { transform: translateX(-2px); }
                    85% { transform: translateX(1px); }
                    90% { transform: translateX(-1px); }
                }

                .animate-bell-swing {
                    animation: bell-swing 4s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
                    transform-origin: top center;
                }

                .animate-clapper-move {
                    animation: clapper-move 4s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
                }
            `}</style>
        </div>
    );
}
