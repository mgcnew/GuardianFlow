import clsx from 'clsx';

interface IconProps {
    className?: string;
    isActive?: boolean;
}

export function DashboardIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                {/* Defs for Primary Blue gradients */}
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

                {/* Top Left */}
                <rect
                    x="3" y="3" width="8" height="8" rx="2.5"
                    fill={isActive ? "url(#dash-grad-primary)" : "currentColor"}
                    fillOpacity={isActive ? "1" : "0.5"}
                    className="transition-all duration-300"
                />

                {/* Top Right */}
                <rect
                    x="13" y="3" width="8" height="8" rx="2.5"
                    fill={isActive ? "url(#dash-grad-primary)" : "currentColor"}
                    fillOpacity={isActive ? "0.6" : "0.4"}
                    className="transition-all duration-300"
                />

                {/* Bottom Left */}
                <rect
                    x="3" y="13" width="8" height="8" rx="2.5"
                    fill={isActive ? "url(#dash-grad-secondary)" : "currentColor"}
                    fillOpacity={isActive ? "0.8" : "0.4"}
                    className="transition-all duration-300"
                />

                {/* Bottom Right (The "Accent" block) */}
                <rect
                    x="13" y="13" width="8" height="8" rx="2.5"
                    fill={isActive ? "#308ce8" : "currentColor"}
                    fillOpacity={isActive ? "1" : "0.3"}
                    className="transition-all duration-300"
                />
            </svg>
        </div>
    );
}

export function ResidentsIcon({ className, isActive }: IconProps) {
    return (
        <div className={clsx("relative flex items-center justify-center shrink-0", className)}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                <defs>
                    <linearGradient id="res-grad-primary" x1="12" y1="2" x2="12" y2="10">
                        <stop offset="0%" stopColor="#308ce8" />
                        <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                </defs>

                {/* Head */}
                <circle
                    cx="12" cy="7" r="4"
                    fill={isActive ? "url(#res-grad-primary)" : "currentColor"}
                    fillOpacity={isActive ? "1" : "0.5"}
                    className="transition-all duration-300"
                />

                {/* Body/Shoulders */}
                <path
                    d="M4 21C4 17.134 7.134 14 11 14H13C16.866 14 20 17.134 20 21"
                    stroke={isActive ? "#308ce8" : "currentColor"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeOpacity={isActive ? "1" : "0.4"}
                    className="transition-all duration-300"
                />

                {/* Heart/Care accent - Small dot in active state */}
                {isActive && (
                    <circle cx="12" cy="14" r="2" fill="#308ce8" className="animate-pulse" />
                )}
            </svg>
        </div>
    );
}
