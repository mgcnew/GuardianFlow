import clsx from 'clsx';

interface IconProps {
    className?: string;
    isActive?: boolean;
}

export function DashboardIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <linearGradient id="dash-grad-primary" x1="2" y1="2" x2="10" y2="10">
                        <stop offset="0%" stopColor="#308ce8" />
                        <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                    <linearGradient id="dash-grad-secondary" x1="2" y1="14" x2="10" y2="22">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#93c5fd" />
                    </linearGradient>
                </defs>
                <rect x="3" y="3" width="8" height="8" rx="2.5" fill={isActive ? "url(#dash-grad-primary)" : "currentColor"} fillOpacity={isActive ? "1" : "0.5"} className="transition-all duration-300" />
                <rect x="13" y="3" width="8" height="8" rx="2.5" fill={isActive ? "url(#dash-grad-primary)" : "currentColor"} fillOpacity={isActive ? "0.6" : "0.4"} className="transition-all duration-300" />
                <rect x="3" y="13" width="8" height="8" rx="2.5" fill={isActive ? "url(#dash-grad-secondary)" : "currentColor"} fillOpacity={isActive ? "0.8" : "0.4"} className="transition-all duration-300" />
                <rect x="13" y="13" width="8" height="8" rx="2.5" fill={isActive ? "#308ce8" : "currentColor"} fillOpacity={isActive ? "1" : "0.3"} className="transition-all duration-300" />
            </svg>
        </div>
    );
}

export function ResidentsIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <linearGradient id="res-grad-primary" x1="12" y1="2" x2="12" y2="10">
                        <stop offset="0%" stopColor="#308ce8" />
                        <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                </defs>
                <circle cx="12" cy="7" r="4" fill={isActive ? "url(#res-grad-primary)" : "currentColor"} fillOpacity={isActive ? "1" : "0.5"} className="transition-all duration-300" />
                <path d="M4 21C4 17.134 7.134 14 11 14H13C16.866 14 20 17.134 20 21" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeOpacity={isActive ? "1" : "0.4"} className="transition-all duration-300" />
                {isActive && <circle cx="12" cy="14" r="2" fill="#308ce8" className="animate-pulse" />}
            </svg>
        </div>
    );
}

export function AgendaIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect x="3" y="4" width="18" height="16" rx="3" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "1" : "0.5"} className="transition-all duration-300" />
                <path d="M3 9H21" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "1" : "0.5"} />
                <path d="M8 2V6" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <path d="M16 2V6" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                {isActive && <circle cx="15" cy="15" r="3" fill="#308ce8" fillOpacity="0.2" className="animate-pulse" />}
                <circle cx="15" cy="15" r="1.5" fill={isActive ? "#308ce8" : "currentColor"} fillOpacity={isActive ? "1" : "0.3"} />
            </svg>
        </div>
    );
}

export function LogbookIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M4 4H16C18.2091 4 20 5.79086 20 8V20H8C5.79086 20 4 18.2091 4 16V4Z" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "1" : "0.5"} />
                <path d="M8 8H16" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <path d="M8 12H16" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <path d="M8 16H12" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <rect x="16" y="2" width="2" height="22" rx="1" fill={isActive ? "#308ce8" : "currentColor"} fillOpacity={isActive ? "0.3" : "0.1"} />
            </svg>
        </div>
    );
}

export function PsychologyIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="9" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "1" : "0.5"} />
                <path d="M12 7V17M12 7C9.5 7 7.5 9 7.5 12C7.5 15 9.5 17 12 17M12 7C14.5 7 16.5 9 16.5 12C16.5 15 14.5 17 12 17" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="1.5" strokeOpacity={isActive ? "0.8" : "0.4"} />
                {isActive && <circle cx="12" cy="12" r="2" fill="#308ce8" className="animate-pulse" />}
            </svg>
        </div>
    );
}

export function PedagogyIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M12 3L2 8L12 13L22 8L12 3Z" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinejoin="round" strokeOpacity={isActive ? "1" : "0.5"} />
                <path d="M2 8V14M22 8V14" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <path d="M6 10V16C6 16 8 18 12 18C16 18 18 16 18 16V10" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                {isActive && <path d="M12 13V21" stroke="#308ce8" strokeWidth="2" strokeDasharray="2 2" />}
            </svg>
        </div>
    );
}

export function SocialWorkIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="8" cy="14" r="3" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "1" : "0.5"} />
                <circle cx="16" cy="14" r="3" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <path d="M8 8C8 8 10 5 12 5C14 5 16 8 16 8" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "1" : "0.5"} />
                {isActive && <circle cx="12" cy="10" r="1.5" fill="#308ce8" className="animate-bounce" />}
            </svg>
        </div>
    );
}

export function InventoryIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M3 8L12 3L21 8L12 13L3 8Z" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinejoin="round" strokeOpacity={isActive ? "1" : "0.5"} />
                <path d="M3 8V16L12 21L21 16V8" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinejoin="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <path d="M12 13V21" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "0.6" : "0.3"} />
                {isActive && <rect x="9" y="8" width="6" height="4" fill="#308ce8" fillOpacity="0.2" />}
            </svg>
        </div>
    );
}

export function FinancialIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect x="3" y="6" width="18" height="12" rx="3" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "1" : "0.5"} />
                <path d="M3 10H21" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <circle cx="17" cy="14" r="1.5" fill={isActive ? "#308ce8" : "currentColor"} fillOpacity={isActive ? "1" : "0.3"} />
                {isActive && <path d="M7 14H11" stroke="#308ce8" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />}
            </svg>
        </div>
    );
}

export function OperationalIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M14.7 6.3C14.7 6.3 16 5 17.5 5C19 5 20.5 6.5 20.5 8C20.5 9.5 19.2 11.2 17.5 11.2L14.7 8.4" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "1" : "0.5"} />
                <path d="M6.3 14.7L14.7 6.3" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "0.8" : "0.4"} />
                <path d="M3.5 20.5C3.5 20.5 5 19 6.5 19C8 19 9.5 20.5 11 20.5C12.5 20.5 14 19 14 17.5C14 16 12.3 14.7 12.3 14.7L9.5 17.5" stroke={isActive ? "#308ce8" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeOpacity={isActive ? "1" : "0.5"} />
                {isActive && <circle cx="12" cy="12" r="1" fill="#308ce8" />}
            </svg>
        </div>
    );
}
