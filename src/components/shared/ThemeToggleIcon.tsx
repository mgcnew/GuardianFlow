import clsx from 'clsx';

interface ThemeToggleIconProps {
    isDark: boolean;
    className?: string;
}

export function ThemeToggleIcon({ isDark, className }: ThemeToggleIconProps) {
    return (
        <div className={clsx("flex items-center justify-center overflow-visible", className)} style={{ width: '24px', height: '24px' }}>
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible' }}
            >
                {/* Sun Design (Visible in Light Mode) */}
                <g
                    style={{
                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: !isDark ? 1 : 0,
                        transform: !isDark ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-90deg)',
                        transformOrigin: 'center'
                    }}
                >
                    {/* Outer Glow */}
                    <circle cx="12" cy="12" r="8" fill="#FBBF24" fillOpacity="0.1" />
                    {/* Sun Core */}
                    <circle cx="12" cy="12" r="5" fill="#F59E0B" />
                    {/* Sun Rays */}
                    <g stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                    </g>
                </g>

                {/* Moon Design (Visible in Dark Mode) */}
                <g
                    style={{
                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isDark ? 1 : 0,
                        transform: isDark ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(90deg)',
                        transformOrigin: 'center'
                    }}
                >
                    {/* Moon Glow */}
                    <circle cx="12" cy="12" r="8" fill="#818CF8" fillOpacity="0.1" />
                    {/* Moon Body */}
                    <path
                        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                        fill="#6366F1"
                    />
                    {/* Small Stars */}
                    <circle cx="12" cy="7" r="0.5" fill="white" fillOpacity="0.8" />
                    <circle cx="16" cy="11" r="0.5" fill="white" fillOpacity="0.8" />
                </g>
            </svg>
        </div>
    );
}
