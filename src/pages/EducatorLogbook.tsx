import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DailyTimeline } from '../components/educator/DailyTimeline';
import { ShiftReportForm } from '../components/educator/ShiftReportForm';
import { IndividualLogForm } from '../components/educator/IndividualLogForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function EducatorLogbook() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeModal, setActiveModal] = useState<'individual' | 'shift' | null>(null);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setShowActionMenu(false);
            }
        }
        if (showActionMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showActionMenu]);

    const { data: timelineData, isLoading: loading } = useQuery({
        queryKey: ['logbook-timeline', viewDate],
        queryFn: async () => {
            if (!user) return { items: [], stats: { logs: 0, reports: 0 } };

            // Fetch Logs
            const { data: logs, error: logsError } = await supabase
                .from('logs')
                .select(`
                    id, 
                    created_at, 
                    description, 
                    category, 
                    mood,
                    children (full_name, photo_url),
                    profiles (full_name)
                `)
                .gte('created_at', `${viewDate}T00:00:00`)
                .lte('created_at', `${viewDate}T23:59:59`);

            if (logsError) throw logsError;

            // Fetch Shift Reports
            const { data: reports, error: reportsError } = await supabase
                .from('shift_reports')
                .select(`
                    id, 
                    created_at, 
                    summary, 
                    occurrences, 
                    shift,
                    profiles (full_name)
                `)
                .eq('report_date', viewDate);

            if (reportsError) {
                console.error('Erro ao buscar relatórios de turno:', reportsError);
            }

            // Map and Merge
            const mappedLogs = (logs || []).map(l => {
                const profile = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
                const child = Array.isArray(l.children) ? l.children[0] : l.children;
                return {
                    id: l.id,
                    type: 'log' as const,
                    created_at: l.created_at,
                    author_name: profile?.full_name || 'Equipe',
                    description: l.description,
                    child_name: child?.full_name,
                    child_photo: child?.photo_url,
                    category: l.category,
                    mood: l.mood
                };
            });

            const mappedReports = (reports || []).map(r => {
                const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                return {
                    id: r.id,
                    type: 'report' as const,
                    created_at: r.created_at,
                    author_name: profile?.full_name || 'Equipe',
                    description: r.summary,
                    shift: r.shift,
                    occurrences: r.occurrences
                };
            });

            const items = [...mappedLogs, ...mappedReports].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            return {
                items,
                stats: {
                    logs: mappedLogs.length,
                    reports: mappedReports.length
                }
            };
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const timelineItems = timelineData?.items || [];
    const stats = timelineData?.stats || { logs: 0, reports: 0 };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-400">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-main dark:text-white font-display">Diário de Bordo</h2>
                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Gestão de ocorrências e troca de plantão</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="date"
                            value={viewDate}
                            onChange={(e) => setViewDate(e.target.value)}
                            className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-primary shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Estatísticas e Ação Rápida */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">

                {/* Stats */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl border border-border-light dark:border-gray-800 shadow-sm flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">event_note</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Ocorrências</p>
                            <p className="text-2xl font-black text-text-main dark:text-white leading-none mt-1">{stats.logs}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl border border-border-light dark:border-gray-800 shadow-sm flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">assignment</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Relatórios</p>
                            <p className="text-2xl font-black text-text-main dark:text-white leading-none mt-1">{stats.reports}</p>
                        </div>
                    </div>
                </div>

                {/* Botão de Ação Unificado */}
                <div className="relative" ref={actionMenuRef}>
                    <button
                        onClick={() => setShowActionMenu(!showActionMenu)}
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-tight px-5 py-3 rounded-xl shadow-md shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[20px]" style={{ transition: 'transform 0.2s', transform: showActionMenu ? 'rotate(45deg)' : 'rotate(0deg)' }}>add</span>
                        Novo Registro
                        <span className="material-symbols-outlined text-[16px] ml-1" style={{ transition: 'transform 0.2s', transform: showActionMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                    </button>

                    {/* Dropdown Menu */}
                    {showActionMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-border-light dark:border-gray-800 overflow-hidden z-50 animate-in fade-in duration-200">
                            <button
                                onClick={() => { setActiveModal('individual'); setShowActionMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group"
                            >
                                <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <span className="material-symbols-outlined text-xl">person_add</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-text-main dark:text-white">Nova Ocorrência</p>
                                    <p className="text-[11px] text-text-secondary dark:text-gray-500">Registrar ocorrência individual</p>
                                </div>
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3" />
                            <button
                                onClick={() => { setActiveModal('shift'); setShowActionMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group"
                            >
                                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <span className="material-symbols-outlined text-xl">clinical_notes</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-text-main dark:text-white">Relatório de Turno</p>
                                    <p className="text-[11px] text-text-secondary dark:text-gray-500">Criar relatório de troca de plantão</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Linha do Tempo */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm p-6 min-h-[400px]">
                <div className="flex items-center gap-2 mb-8">
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-widest">
                        Linha do Tempo: {format(new Date(viewDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                    </h2>
                </div>

                <DailyTimeline items={timelineItems} loading={loading} />
            </div>

            {/* Modais */}
            {activeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-400">
                    <style>
                        {`
                            .scrollbar-hide::-webkit-scrollbar {
                                display: none;
                            }
                            .scrollbar-hide {
                                -ms-overflow-style: none;
                                scrollbar-width: none;
                            }
                        `}
                    </style>
                    <div className={clsx(
                        "bg-white dark:bg-surface-dark w-full rounded-3xl shadow-2xl border border-border-light dark:border-gray-800 overflow-hidden flex flex-col",
                        activeModal === 'individual' ? "max-w-3xl max-h-[90vh]" : "max-w-2xl max-h-[85vh]"
                    )}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "size-9 rounded-xl flex items-center justify-center",
                                    activeModal === 'individual' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600" : "bg-primary/10 text-primary"
                                )}>
                                    <span className="material-symbols-outlined text-xl">{activeModal === 'individual' ? 'person_add' : 'clinical_notes'}</span>
                                </div>
                                <h3 className="text-lg font-black text-text-main dark:text-white uppercase tracking-tight">
                                    {activeModal === 'individual' ? 'Novo Atendimento' : 'Relatório de Turno'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setActiveModal(null)}
                                className="size-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
                            {activeModal === 'individual' ? (
                                <IndividualLogForm
                                    onSuccess={() => { setActiveModal(null); queryClient.invalidateQueries({ queryKey: ['logbook-timeline'] }); }}
                                    onCancel={() => setActiveModal(null)}
                                />
                            ) : (
                                <ShiftReportForm
                                    onSuccess={() => { setActiveModal(null); queryClient.invalidateQueries({ queryKey: ['logbook-timeline'] }); }}
                                    onCancel={() => setActiveModal(null)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
