import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    active: {
        stripe: 'bg-emerald-500',
        ring: 'bg-emerald-500/10',
        badge: 'bg-emerald-500',
        title: 'Ativo',
    },
    pending: {
        stripe: 'bg-amber-500',
        ring: 'bg-amber-500/10',
        badge: 'bg-amber-500',
        title: 'Pendente',
    },
    urgent: {
        stripe: 'bg-rose-500',
        ring: 'bg-rose-500/10',
        badge: 'bg-rose-500',
        title: 'Urgente',
    },
};

const legalStatusConfig: Record<string, string> = {
    'Guarda Temporária': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    'Tutela Judicial': 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
    'Processo de Adoção': 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
    'Acolhimento Emergencial': 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    'Acolhimento Institucional': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
};

export function ChildCard({ id, name, image, status, unit, age, timeInCare, legalStatus, onEditProfile, onManageMedications, onViewDetails }: ChildCardProps) {
    const { canAccess } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const cfg = statusConfig[status];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            onClick={() => navigate(`/dashboard/children/${id}`)}
            onMouseLeave={() => setIsMenuOpen(false)}
            className="group relative bg-white dark:bg-surface-dark rounded-[20px] border border-border-light dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden cursor-pointer active:scale-[0.99]"
        >
            {/* Status stripe */}
            <div className={clsx("h-1.5 w-full", cfg.stripe)} />

            {/* Identity */}
            <div className="p-5 pb-3 flex flex-col items-center text-center">
                <div className="relative mb-3">
                    <div className={clsx(
                        "size-[72px] rounded-[18px] overflow-hidden p-0.5 transition-transform duration-300 group-hover:scale-105",
                        cfg.ring
                    )}>
                        <img
                            className="w-full h-full object-cover rounded-[16px] bg-slate-100 dark:bg-slate-800"
                            src={image}
                            alt={name}
                            loading="lazy"
                        />
                    </div>
                    <span className={clsx(
                        "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white ring-2 ring-white dark:ring-surface-dark shadow-sm",
                        cfg.badge
                    )}>
                        {cfg.title}
                    </span>
                </div>
                <h3 className="font-bold text-[15px] text-text-main dark:text-white leading-tight group-hover:text-primary transition-colors">
                    {name}
                </h3>
            </div>

            {/* Actions bar — stops propagation so clicks don't navigate */}
            <div
                className="px-4 py-2.5 border-y border-slate-50 dark:border-gray-800/60 flex items-center justify-between"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-1.5">
                    {canAccess('health', 'view') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onManageMedications?.(); }}
                            className="h-8 px-3 rounded-full bg-slate-50 dark:bg-gray-800 flex items-center gap-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all text-[10px] font-black uppercase tracking-wider"
                            title="Medicações"
                        >
                            <span className="material-symbols-outlined text-[14px]">medication</span>
                            Medicações
                        </button>
                    )}
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                        className={clsx(
                            "size-8 rounded-full flex items-center justify-center transition-all active:scale-90",
                            isMenuOpen
                                ? "bg-primary text-white"
                                : "bg-slate-50 dark:bg-gray-800 text-slate-400 hover:text-primary hover:bg-primary/10"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="p-1.5 space-y-0.5">
                                {canAccess('children', 'edit') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEditProfile?.(); }}
                                        className="w-full text-left px-3 py-2 text-[12px] font-bold text-text-secondary dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-xl transition-all flex items-center gap-2.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                        Editar Perfil
                                    </button>
                                )}
                                {canAccess('agenda', 'create') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); navigate(`/dashboard/agenda?child=${id}`); }}
                                        className="w-full text-left px-3 py-2 text-[12px] font-bold text-text-secondary dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-xl transition-all flex items-center gap-2.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">event</span>
                                        Agendar
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onViewDetails?.(); }}
                                    className="w-full text-left px-3 py-2 text-[12px] font-bold text-text-secondary dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-xl transition-all flex items-center gap-2.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">quick_reference_all</span>
                                    Ver Resumo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info grid */}
            <div className="flex-1 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border truncate max-w-[60%]",
                        legalStatusConfig[legalStatus] || 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                    )}>
                        {legalStatus}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-500 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all shrink-0">
                        <span className="material-symbols-outlined text-[13px]">domain</span>
                        {unit}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-border-light dark:border-gray-800">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-secondary dark:text-gray-500 mb-0.5">Idade</p>
                        <p className="text-[13px] font-bold text-text-main dark:text-white leading-none flex items-baseline gap-1">
                            {age}
                            <span className="text-[9px] font-bold text-slate-400 uppercase">anos</span>
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-border-light dark:border-gray-800">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-secondary dark:text-gray-500 mb-0.5">Acolhimento</p>
                        <p className="text-[13px] font-bold text-text-main dark:text-white leading-none">
                            {timeInCare}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-border-light dark:border-gray-800">
                <span className="text-[9px] font-mono font-bold text-text-secondary dark:text-gray-600 tracking-widest">
                    #{id.substring(0, 8).toUpperCase()}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-primary/50 group-hover:text-primary transition-colors flex items-center gap-0.5">
                    Prontuário
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </span>
            </div>
        </div>
    );
}
