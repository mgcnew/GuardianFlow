import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
    const { user, profile, organization, signOut, switchRole } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close dropdown and search when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchExpanded(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const userDisplayName = user?.email?.split('@')[0] || 'Usuário';

    return (
        <header className="flex flex-row items-center justify-between gap-2 md:gap-4 border border-border-light dark:border-gray-800 bg-surface-light dark:bg-surface-dark px-4 py-4 md:px-8 md:py-4 z-40 rounded-2xl shadow-sm">
            <div className={clsx("flex items-center gap-1 md:gap-2", searchExpanded && "hidden md:flex")}>
                <button onClick={onMenuToggle} className="lg:hidden p-2 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[22px]">menu</span>
                </button>
                {/* Organization name - Hidden on mobile, visible on desktop */}
                <div className="hidden md:flex flex-col">
                    <label className="text-xs text-text-secondary dark:text-gray-400 font-medium uppercase tracking-wider">Unidade Atual</label>
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <span className="material-symbols-outlined text-primary text-[20px]">home_work</span>
                        <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                            {organization?.name || 'Carregando...'}
                        </h2>
                        <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[18px]">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-row items-center justify-end gap-2 md:gap-4 w-full md:w-auto">
                <div
                    ref={searchRef}
                    className={clsx(
                        "relative transition-all duration-300 flex items-center justify-end",
                        searchExpanded ? "w-full md:w-64" : "w-10 md:w-64"
                    )}
                >
                    <button
                        onClick={() => setSearchExpanded(!searchExpanded)}
                        className={clsx(
                            "md:hidden flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary transition-colors",
                            searchExpanded && "absolute left-0 z-10"
                        )}
                    >
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </button>

                    <div className={clsx("absolute inset-y-0 left-0 pl-3 hidden md:flex items-center pointer-events-none")}>
                        <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[20px]">search</span>
                    </div>

                    <input
                        className={clsx(
                            "block pr-3 py-2 border border-border-light dark:border-gray-700 rounded-full leading-5 bg-background-light dark:bg-gray-800 placeholder-text-secondary dark:placeholder-gray-500 text-text-main dark:text-white focus:outline-none focus:bg-surface-light dark:focus:bg-gray-900 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all duration-300",
                            searchExpanded ? "w-full pl-10 opacity-100 visible" : "w-0 md:w-full md:pl-10 opacity-0 md:opacity-100 invisible md:visible"
                        )}
                        placeholder="Pesquisar acolhidos..."
                        type="text"
                        autoFocus={searchExpanded}
                    />
                </div>

                <div className={clsx("flex items-center gap-2 md:gap-3", searchExpanded && "hidden md:flex")}>
                    <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary dark:text-gray-400 transition-colors relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                    </button>

                    <div className="h-8 w-[1px] bg-border-light dark:bg-gray-700 mx-1 hidden md:block"></div>

                    {/* Profile Dropdown Container - Visible on both, but styled differently if needed */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-border-light dark:hover:border-gray-700"
                        >
                            <div
                                className="bg-primary/10 flex items-center justify-center rounded-full h-8 w-8 ring-2 ring-white dark:ring-gray-700 shadow-sm text-primary font-bold text-xs"
                            >
                                {userDisplayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden md:flex flex-col items-start mr-1">
                                <span className="text-xs font-bold text-text-main dark:text-white truncate max-w-[100px]">{profile?.full_name || userDisplayName}</span>
                                <span className="text-[10px] text-text-secondary dark:text-gray-400 capitalize">{profile?.role || 'Membro'}</span>
                            </div>
                            <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[18px]">expand_more</span>
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-border-light dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-3 border-b border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-xs font-medium text-text-secondary dark:text-gray-400">Logado como</p>
                                    <p className="text-sm font-bold text-text-main dark:text-white truncate">{user?.email}</p>
                                </div>

                                {['saas_admin', 'admin'].includes(profile?.role || '') && (
                                    <div className="px-4 py-2 border-b border-border-light dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider mb-2">Simular Papel (Dev)</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {['admin', 'technical', 'educator', 'operational'].map((role) => (
                                                <button
                                                    key={role}
                                                    onClick={() => {
                                                        // @ts-ignore
                                                        if (typeof switchRole === 'function') switchRole(role);
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="text-[10px] px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary transition-colors text-center truncate border border-transparent hover:border-primary/20"
                                                >
                                                    {role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="py-1">
                                    <Link
                                        to="/dashboard/profile"
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">person</span>
                                        Meu Perfil
                                    </Link>
                                    <Link
                                        to="/dashboard/settings"
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">settings</span>
                                        Configurações
                                    </Link>
                                    <button
                                        onClick={handleSignOut}
                                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">logout</span>
                                        Sair da conta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
