import clsx from 'clsx';

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ChildCardProps {
    id: string;
    name: string;
    image: string;
    status: 'active' | 'pending' | 'urgent';
    unit: string;
    age: number;
    timeInCare: string;
    legalStatus: string;
    lastUpdate: string;
    onEditProfile?: () => void;
    onManageMedications?: () => void;
    onViewDetails?: () => void;
}

const statusConfig = {
    active: { color: 'bg-green-500', title: 'Ativo' },
    pending: { color: 'bg-amber-500', title: 'Pendente' },
    urgent: { color: 'bg-red-500', title: 'Urgente' },
};

const legalStatusConfig: Record<string, string> = {
    'Guarda Temporária': 'bg-blue-50 text-blue-700 border-blue-100',
    'Tutela Judicial': 'bg-amber-50 text-amber-700 border-amber-100',
    'Processo de Adoção': 'bg-purple-50 text-purple-700 border-purple-100',
    'Acolhimento Emergencial': 'bg-red-50 text-red-700 border-red-100',
    'Acolhimento Institucional': 'bg-green-50 text-green-700 border-green-100',
};

export function ChildCard({ id, name, image, status, unit, age, timeInCare, legalStatus, lastUpdate, onEditProfile, onManageMedications, onViewDetails }: ChildCardProps) {
    const { profile } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'saas_admin' || profile?.role === 'org_admin';

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full relative">
            <div className="p-5 flex items-start justify-between">
                <div className="flex gap-4">
                    <div className="relative">
                        <div className="size-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden ring-2 ring-white dark:ring-gray-800">
                            <img className="w-full h-full object-cover" src={image} alt={name} />
                        </div>
                        <div
                            className={clsx("absolute -bottom-1 -right-1 size-4 border-2 border-white dark:border-gray-800 rounded-full", statusConfig[status].color)}
                            title={statusConfig[status].title}
                        ></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-text-main dark:text-white text-lg">{name}</h3>
                        <p className="text-sm text-text-secondary dark:text-gray-400 font-medium">Prontuário: #{id.substring(0, 6)}</p>
                    </div>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {isAdmin && (
                                <button
                                    onClick={() => { setIsMenuOpen(false); onEditProfile?.(); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary transition-colors flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    Editar Perfil
                                </button>
                            )}
                            <button
                                onClick={() => { setIsMenuOpen(false); onManageMedications?.(); }}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">medication</span>
                                Medicações
                            </button>
                            <Link
                                to={`/dashboard/children/${id}`}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary transition-colors flex items-center gap-2 border-t border-gray-50 dark:border-gray-700/50"
                            >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                Ver Detalhes
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-5 pb-4 space-y-3 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", legalStatusConfig[legalStatus] || 'bg-gray-50 text-gray-700')}>
                        {legalStatus}
                    </span>
                    <span className="text-xs font-semibold text-text-secondary dark:text-gray-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">home</span>
                        {unit}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-t border-border-light dark:border-gray-800">
                    <div>
                        <p className="text-xs text-text-secondary dark:text-gray-500 uppercase tracking-wide font-semibold">Idade</p>
                        <p className="text-sm font-bold text-text-main dark:text-white mt-0.5">{age} Anos</p>
                    </div>
                    <div>
                        <p className="text-xs text-text-secondary dark:text-gray-500 uppercase tracking-wide font-semibold">Tempo</p>
                        <p className="text-sm font-bold text-text-main dark:text-white mt-0.5">{timeInCare}</p>
                    </div>
                </div>
            </div>

            <div className="mt-auto px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-border-light dark:border-gray-800 rounded-b-xl flex justify-between items-center">
                <span className="text-xs text-text-secondary dark:text-gray-500">{lastUpdate}</span>
                <button
                    onClick={onViewDetails}
                    className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                    Ver Resumo
                </button>
            </div>
        </div>
    );
}
