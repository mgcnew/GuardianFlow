import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
    { icon: 'dashboard', label: 'Dashboard', to: '/dashboard' },
    { icon: 'child_care', label: 'Acolhidos', to: '/dashboard/children' },
    { icon: 'calendar_month', label: 'Agenda', to: '/dashboard/agenda' },
    { icon: 'edit_note', label: 'Diário', to: '/dashboard/logbook' },
    { icon: 'psychology', label: 'Psicologia', to: '/dashboard/psychology' },
    { icon: 'school', label: 'Pedagogia', to: '/dashboard/pedagogy' },
    { icon: 'diversity_3', label: 'Assis. Social', to: '/dashboard/social' },
    { icon: 'inventory_2', label: 'Estoque', to: '/dashboard/inventory' },
];

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    isMobileOpen: boolean;
    closeMobile: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar, isMobileOpen, closeMobile }: SidebarProps) {
    const { profile, organization } = useAuth();

    const filteredNavItems = navItems.filter(item => {
        if (!profile) return false;

        // Admins see everything
        if (['saas_admin', 'admin', 'org_admin'].includes(profile.role)) return true;

        const role = profile.role || 'membro';

        // Base items for almost everyone
        const baseItems = ['dashboard', 'child_care', 'calendar_month', 'edit_note'];

        if (['technical', 'technician', 'pedagogue'].includes(role)) {
            const allowed = [...baseItems];
            if (role === 'technical' || role === 'technician') allowed.push('psychology', 'diversity_3');
            if (role === 'pedagogue') allowed.push('school');
            return allowed.includes(item.icon);
        }

        if (role === 'educator') {
            return baseItems.includes(item.icon);
        }

        if (role === 'operational') {
            return [...baseItems, 'inventory_2'].includes(item.icon);
        }

        // Fallback for 'membro' or any other role: see basic items
        return baseItems.includes(item.icon) || item.icon === 'dashboard';
    });

    const sidebarContent = (
        <>
            {/* Logo / Brand */}
            <div className={clsx(
                "flex items-center gap-3 px-6 py-6 border-b border-border-light dark:border-gray-800 transition-all overflow-hidden",
                isCollapsed && !isMobileOpen ? "justify-center px-2" : ""
            )}>
                <div className="flex items-center justify-center bg-primary/10 rounded-full size-10 text-primary shrink-0">
                    <span className="material-symbols-outlined">shield_person</span>
                </div>
                <div className={clsx(
                    "flex flex-col transition-opacity duration-300",
                    isCollapsed && !isMobileOpen ? "opacity-0 w-0 h-0 overflow-hidden" : "opacity-100"
                )}>
                    <h1 className="text-text-main dark:text-white text-base font-bold leading-normal truncate">GuardianFlow</h1>
                    <p className="text-text-secondary dark:text-gray-400 text-xs font-normal leading-normal truncate">Gestão de Acolhimento</p>
                </div>

                {/* Close button - mobile only */}
                {isMobileOpen && (
                    <button
                        onClick={closeMobile}
                        className="ml-auto lg:hidden size-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                )}
            </div>

            {/* Current Unit - Mobile Only */}
            {isMobileOpen && (
                <div className="px-6 py-3 border-b border-border-light dark:border-gray-800 bg-gray-50/10 dark:bg-gray-800/10">
                    <label className="text-[9px] text-text-secondary dark:text-gray-400 font-black uppercase tracking-widest block mb-1 opacity-70">Unidade Atual</label>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[16px]">home_work</span>
                        <span className="text-xs font-bold text-text-main dark:text-white truncate">
                            {organization?.name || 'Carregando...'}
                        </span>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto no-scrollbar overflow-x-hidden">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/dashboard'}
                        onClick={closeMobile}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group overflow-hidden',
                                isActive
                                    ? 'bg-primary-light dark:bg-primary/20 text-primary'
                                    : 'text-text-secondary dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-text-main dark:hover:text-white',
                                isCollapsed && !isMobileOpen ? "justify-center" : ""
                            )
                        }
                        title={isCollapsed && !isMobileOpen ? item.label : ''}
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={clsx(
                                        "material-symbols-outlined group-hover:text-text-main dark:group-hover:text-white transition-colors shrink-0",
                                        (isActive && item.icon === 'dashboard') ? 'fill-1' : ''
                                    )}
                                >
                                    {item.icon}
                                </span>
                                <span className={clsx(
                                    "text-sm font-medium transition-opacity duration-300 whitespace-nowrap",
                                    isCollapsed && !isMobileOpen ? "opacity-0 w-0 hidden" : "opacity-100"
                                )}>
                                    {item.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>


            {/* Collapse Toggle - desktop only */}
            <div className="p-4 border-t border-border-light dark:border-gray-800 hidden lg:block">
                <button
                    onClick={toggleSidebar}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg h-10 bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-text-main dark:hover:text-white text-sm font-bold transition-colors overflow-hidden"
                    title={isCollapsed ? "Expandir" : "Recolher"}
                >
                    <span className="material-symbols-outlined text-[18px]">
                        {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
                    </span>
                    <span className={clsx("transition-all duration-300 whitespace-nowrap", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>Recolher</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={clsx(
                    "hidden lg:flex flex-col border border-border-light dark:border-gray-800 bg-surface-light dark:bg-surface-dark shrink-0 h-full rounded-2xl shadow-2xl shadow-primary/5 transition-all duration-300 relative overflow-hidden",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closeMobile}
                    />
                    {/* Sidebar Panel */}
                    <aside
                        className="absolute inset-y-0 left-0 w-72 flex flex-col bg-surface-light dark:bg-surface-dark shadow-2xl"
                        style={{ animation: 'slideInLeft 0.25s ease-out' }}
                    >
                        {sidebarContent}
                    </aside>

                    <style>{`
                        @keyframes slideInLeft {
                            from { transform: translateX(-100%); }
                            to { transform: translateX(0); }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
