import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggleIcon } from '../shared/ThemeToggleIcon';
import {
    DashboardIcon,
    ResidentsIcon,
    AgendaIcon,
    LogbookIcon,
    PsychologyIcon,
    PedagogyIcon,
    SocialWorkIcon,
    InventoryIcon,
    FinancialIcon,
    OperationalIcon,
    SuperAdminIcon
} from '../shared/CustomIcons';

const navItems = [
    { icon: 'dashboard', label: 'Dashboard', to: '/dashboard' },
    { icon: 'child_care', label: 'Acolhidos', to: '/dashboard/children' },
    { icon: 'calendar_month', label: 'Agenda', to: '/dashboard/agenda' },
    { icon: 'edit_note', label: 'Diário', to: '/dashboard/logbook' },
    { icon: 'psychology', label: 'Psicologia', to: '/dashboard/psychology' },
    { icon: 'school', label: 'Pedagogia', to: '/dashboard/pedagogy' },
    { icon: 'diversity_3', label: 'Assis. Social', to: '/dashboard/social' },
    { icon: 'inventory_2', label: 'Estoque', to: '/dashboard/inventory' },
    { icon: 'account_balance_wallet', label: 'Financeiro', to: '/dashboard/finance' },
    { icon: 'construction', label: 'Operacional', to: '/dashboard/operational' },
    { icon: 'admin_panel_settings', label: 'Painel Admin', to: '/admin' },
];

// Map icon names to their respective components
const iconMap: { [key: string]: React.ElementType } = {
    dashboard: DashboardIcon,
    child_care: ResidentsIcon,
    calendar_month: AgendaIcon,
    edit_note: LogbookIcon,
    psychology: PsychologyIcon,
    school: PedagogyIcon,
    diversity_3: SocialWorkIcon,
    inventory_2: InventoryIcon,
    account_balance_wallet: FinancialIcon,
    construction: OperationalIcon,
    admin_panel_settings: SuperAdminIcon,
};

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    isMobileOpen: boolean;
    closeMobile: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar, isMobileOpen, closeMobile }: SidebarProps) {
    const { profile, organization, canAccess } = useAuth();
    const { toggleTheme, isDark } = useTheme();

    const filteredNavItems = navItems.filter(item => {
        // SaaS Admin always sees everything
        if (profile?.role === 'saas_admin') return true;

        // Hide Super Admin Panel for everyone else
        if (item.to === '/admin') return false;

        // Dashboard is always visible to everyone logged in
        if (item.to === '/dashboard') return true;

        // Map sidebar items to permission modules
        const permissionMap: Record<string, string> = {
            '/dashboard/children': 'children',
            '/dashboard/agenda': 'agenda',
            '/dashboard/logbook': 'logbook',
            '/dashboard/psychology': 'psychology',
            '/dashboard/pedagogy': 'pedagogy',
            '/dashboard/social': 'social',
            '/dashboard/inventory': 'inventory',
            '/dashboard/finance': 'finance',
            '/dashboard/operational': 'operational'
        };

        const moduleKey = permissionMap[item.to];
        if (moduleKey) {
            // Check 'view' permission for that module
            return canAccess(moduleKey, 'view');
        }

        return true;
    });

    const sidebarContent = (
        <>
            {/* Logo / Brand */}
            <div className={clsx(
                "flex items-center justify-center border-b border-border-light dark:border-gray-800 transition-all overflow-hidden relative",
                isCollapsed && !isMobileOpen ? "py-4 px-2" : "py-0 px-0"
            )}>
                <img
                    src="/logo.png"
                    alt="Logo"
                    className={clsx(
                        "object-contain transition-all duration-300",
                        isCollapsed && !isMobileOpen ? "h-11 w-[95%]" : "h-16 w-[75%]"
                    )}
                />

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
            {
                isMobileOpen && (
                    <div className="px-6 py-3 border-b border-border-light dark:border-gray-800 bg-gray-50/10 dark:bg-gray-800/10">
                        <label className="text-[9px] text-text-secondary dark:text-gray-400 font-black uppercase tracking-widest block mb-1 opacity-70">Unidade Atual</label>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[16px]">home_work</span>
                            <span className="text-xs font-bold text-text-main dark:text-white truncate">
                                {organization?.name || 'Carregando...'}
                            </span>
                        </div>
                    </div>
                )
            }

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto no-scrollbar overflow-x-hidden">
                {filteredNavItems.map((item) => {
                    const IconComponent = iconMap[item.icon];
                    return (
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
                                    {IconComponent && (
                                        <IconComponent isActive={isActive} className="size-5 shrink-0" />
                                    )}
                                    <span className={clsx(
                                        "text-sm font-medium transition-opacity duration-300 whitespace-nowrap",
                                        isCollapsed && !isMobileOpen ? "opacity-0 w-0 hidden" : "opacity-100"
                                    )}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>


            {/* Bottom Actions */}
            <div className="p-4 border-t border-border-light dark:border-gray-800 space-y-2">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={clsx(
                        "flex lg:hidden w-full cursor-pointer items-center gap-3 rounded-lg h-10 text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-text-main dark:hover:text-white text-sm font-bold transition-all overflow-hidden active:scale-95",
                        isCollapsed && !isMobileOpen ? "justify-center px-0" : "px-3"
                    )}
                    title={isDark ? 'Modo claro' : 'Modo escuro'}
                >
                    <ThemeToggleIcon isDark={isDark} className="w-5 h-5 shrink-0" />
                    <span className={clsx("transition-all duration-300 whitespace-nowrap", isCollapsed && !isMobileOpen ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                        {isDark ? 'Modo Claro' : 'Modo Escuro'}
                    </span>
                </button>

                {/* Collapse Toggle - desktop only */}
                <button
                    onClick={toggleSidebar}
                    className={clsx(
                        "w-full cursor-pointer items-center justify-center gap-2 rounded-lg h-10 bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-text-main dark:hover:text-white text-sm font-bold transition-colors overflow-hidden hidden lg:flex"
                    )}
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
