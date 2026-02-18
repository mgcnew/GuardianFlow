import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
    const { user, profile, organization, signOut, switchRole } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
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
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border-light dark:border-gray-800 bg-surface-light dark:bg-surface-dark px-6 py-4 z-40 sticky top-0">
            <div className="flex items-center gap-3">
                <button onClick={onMenuToggle} className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <div className="flex flex-col">
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

            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-[20px]">search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-2 border border-border-light dark:border-gray-700 rounded-lg leading-5 bg-background-light dark:bg-gray-800 placeholder-text-secondary dark:placeholder-gray-500 text-text-main dark:text-white focus:outline-none focus:bg-surface-light dark:focus:bg-gray-900 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                        placeholder="Pesquisar acolhidos..."
                        type="text"
                    />
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary dark:text-gray-400 transition-colors relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                    </button>

                    <div className="h-8 w-[1px] bg-border-light dark:bg-gray-700 mx-1 hidden md:block"></div>

                    {/* Profile Dropdown Container */}
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
