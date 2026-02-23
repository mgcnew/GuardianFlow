import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        color: 'bg-emerald-500',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600',
        title: 'Ativo'
    },
    pending: {
        color: 'bg-amber-500',
        bg: 'bg-amber-500/10',
        text: 'text-amber-600',
        title: 'Pendente'
    },
    urgent: {
        color: 'bg-rose-500',
        bg: 'bg-rose-500/10',
        text: 'text-rose-600',
        title: 'Urgente'
    },
};

const legalStatusConfig: Record<string, string> = {
    'Guarda Temporária': 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    'Tutela Judicial': 'bg-orange-50/50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
    'Processo de Adoção': 'bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
    'Acolhimento Emergencial': 'bg-rose-50/50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    'Acolhimento Institucional': 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
};

export function ChildCard({ id, name, image, status, unit, age, timeInCare, legalStatus, lastUpdate, onEditProfile, onManageMedications, onViewDetails }: ChildCardProps) {
    const { profile, canAccess } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'saas_admin' || profile?.role === 'org_admin';

    return (
        <div
            className="group relative bg-white dark:bg-surface-dark rounded-[20px] border border-border-light dark:border-gray-800 shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col h-full overflow-hidden"
            onMouseLeave={() => setIsMenuOpen(false)}
        >
            {/* Top Pattern Decor */}
            <div className={clsx(
                "absolute top-0 left-0 right-0 h-1 opacity-40",
                statusConfig[status].color
            )} />

            {/* Header / Identity Section - Scaled down 10% */}
            <div className="p-5 pb-3 flex flex-col items-center text-center">
                <div className="relative mb-3">
                    {/* Avatar with dynamic ring */}
                    <div className={clsx(
                        "size-[72px] rounded-[18px] overflow-hidden p-0.5 transition-transform duration-500 group-hover:scale-105",
                        statusConfig[status].bg
                    )}>
                        <img
                            className="w-full h-full object-cover rounded-[16px] bg-slate-100 dark:bg-slate-800"
                            src={image}
                            alt={name}
                            loading="lazy"
                        />
                    </div>
                    {/* Floating Status Label */}
                    <div className={clsx(
                        "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white ring-2 ring-white dark:ring-surface-dark shadow-sm",
                        statusConfig[status].color
                    )}>
                        {statusConfig[status].title}
                    </div>
                </div>

                <div className="space-y-0.5">
                    <h3 className="font-display font-bold text-text-main dark:text-white text-[16px] leading-tight group-hover:text-primary transition-colors">
                        {name}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-500 opacity-60">
                        Prontuário #{id.substring(0, 6)}
                    </p>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 flex items-center justify-between py-2 border-y border-slate-50 dark:border-gray-800/50">
                <div className="flex -space-x-1">
                    {canAccess('children', 'view') && (
                        <button
                            onClick={onViewDetails}
                            className="size-7 rounded-full bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                            title="Ver Resumo"
                        >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                    )}
                    {canAccess('health', 'view') && (
                        <button
                            onClick={onManageMedications}
                            className="size-7 rounded-full bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                            title="Medicações"
                        >
                            <span className="material-symbols-outlined text-[16px]">medication</span>
                        </button>
                    )}
                    {(canAccess('children', 'view') || canAccess('health', 'view') || canAccess('pedagogy', 'view')) && (
                        <Link
                            to={`/dashboard/children/${id}`}
                            className="size-7 rounded-full bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all active:scale-90"
                            title="Prontuário Completo"
                        >
                            <span className="material-symbols-outlined text-[16px]">person_book</span>
                        </Link>
                    )}
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={clsx(
                            "size-7 rounded-full flex items-center justify-center transition-all active:scale-90",
                            isMenuOpen ? "bg-primary text-white" : "bg-slate-50 dark:bg-gray-800 text-slate-400 hover:text-primary"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-800 rounded-[16px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                            <div className="p-1.5 space-y-1">
                                {canAccess('children', 'edit') && (
                                    <button
                                        onClick={() => { setIsMenuOpen(false); onEditProfile?.(); }}
                                        className="w-full text-left px-3 py-2 text-[12px] font-bold text-text-secondary dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-lg transition-all flex items-center gap-2.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                        Editar Perfil
                                    </button>
                                )}
                                {canAccess('agenda', 'create') && (
                                    <button
                                        onClick={() => navigate(`/dashboard/agenda?child=${id}`)}
                                        className="w-full text-left px-3 py-2 text-[12px] font-bold text-text-secondary dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-lg transition-all flex items-center gap-2.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">event</span>
                                        Agendar
                                    </button>
                                )}
                                <button
                                    className="w-full text-left px-3 py-2 text-[12px] font-bold text-text-secondary dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-lg transition-all flex items-center gap-2.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">description</span>
                                    Relatório
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Grid - Scaled down 10% */}
            <div className="flex-1 p-5 flex flex-col gap-4 bg-slate-50/20 dark:bg-transparent">
                <div className="flex items-center justify-between gap-2">
                    <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                        legalStatusConfig[legalStatus] || 'bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 border-gray-200 dark:border-gray-700'
                    )}>
                        {legalStatus}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-500 flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                        <span className="material-symbols-outlined text-[14px]">domain</span>
                        {unit}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white dark:bg-gray-800/40 p-2.5 rounded-xl border border-border-light dark:border-gray-800 transition-transform duration-500 group-hover:translate-x-0.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-secondary dark:text-gray-500 mb-0.5">Crescimento</p>
                        <p className="text-[13px] font-bold text-text-main dark:text-white leading-none flex items-baseline gap-1">
                            {age} <span className="text-[9px] uppercase font-bold text-slate-400">Anos</span>
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800/40 p-2.5 rounded-xl border border-border-light dark:border-gray-800 transition-transform duration-500 group-hover:-translate-x-0.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-secondary dark:text-gray-500 mb-0.5">Acolhimento</p>
                        <p className="text-[13px] font-bold text-text-main dark:text-white leading-none">
                            {timeInCare}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer / Meta */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-border-light dark:border-gray-800 mt-auto">
                <div className="flex items-center gap-1.5">
                    <div className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-text-secondary dark:text-gray-500 tracking-tight">{lastUpdate}</span>
                </div>
                <button
                    onClick={onViewDetails}
                    className="group/btn relative px-3 py-1.5 overflow-hidden rounded-full transition-all active:scale-95 bg-primary/5 hover:bg-primary transition-colors"
                >
                    <span className="relative z-10 text-[10px] font-black uppercase tracking-widest text-primary group-hover/btn:text-white transition-colors duration-300">Resumo</span>
                </button>
            </div>
        </div>
    );
}
