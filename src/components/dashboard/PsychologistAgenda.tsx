import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PsychologistSessionModal } from './PsychologistSessionModal';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export function PsychologistAgenda() {
    const { profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<any>(null);
    const [showOnlyMine, setShowOnlyMine] = useState(true);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const { data: events, isLoading } = useQuery({
        queryKey: ['psychologist-calendar-events', currentDate.getMonth(), currentDate.getFullYear(), showOnlyMine],
        queryFn: async () => {
            const fetchStart = new Date(startDate.getTime() - 86400000).toISOString();
            const fetchEnd = new Date(endDate.getTime() + 86400000).toISOString();

            let query = supabase
                .from('calendar_events')
                .select('*, child:children(id, full_name, photo_url), professional:profiles!calendar_events_professional_id_fkey(id, full_name, specialty)')
                .eq('organization_id', profile?.organization_id)
                .gte('start_time', fetchStart)
                .lte('end_time', fetchEnd);

            if (showOnlyMine) {
                query = query.eq('professional_id', profile?.id);
            }

            const { data, error } = await query.order('start_time', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id,
    });

    // Fetch OTHER events for children for conflict detection (only if a child is selected or in general view)
    // For now, we fetch all events in the range to show as "ghost" blocks if showOnlyMine is true
    const { data: ghostEvents } = useQuery({
        queryKey: ['ghost-calendar-events', currentDate.getMonth(), currentDate.getFullYear()],
        queryFn: async () => {
            const fetchStart = new Date(startDate.getTime() - 86400000).toISOString();
            const fetchEnd = new Date(endDate.getTime() + 86400000).toISOString();

            const { data, error } = await supabase
                .from('calendar_events')
                .select('*, child:children(id, full_name)')
                .eq('organization_id', profile?.organization_id)
                .neq('professional_id', profile?.id) // Only others
                .gte('start_time', fetchStart)
                .lte('end_time', fetchEnd);

            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id && showOnlyMine,
    });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getEventsForDay = (day: Date) => {
        if (!events) return [];
        return events.filter(event => isSameDay(parseISO(event.start_time), day));
    };

    const getGhostEventsForDay = (day: Date) => {
        if (!ghostEvents) return [];
        return ghostEvents.filter(event => isSameDay(parseISO(event.start_time), day));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-text-main dark:text-white font-display">Minha Agenda Clínica</h2>
                    {isLoading && (
                        <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    )}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                            onClick={() => setShowOnlyMine(true)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                showOnlyMine ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-text-secondary"
                            )}
                        >
                            Meus Atendimentos
                        </button>
                        <button
                            onClick={() => setShowOnlyMine(false)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                !showOnlyMine ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-text-secondary"
                            )}
                        >
                            Agenda Geral
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => { setEventToEdit(null); setIsEventModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined">add</span>
                    Agendar Sessão
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Mini Calendar / Monthly View */}
                <div className="lg:col-span-3 bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-text-main dark:text-white capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                <span className="material-symbols-outlined text-text-secondary">chevron_left</span>
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Hoje</button>
                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                <span className="material-symbols-outlined text-text-secondary">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px mb-2 text-center">
                        {weekDays.map(day => (
                            <div key={day} className="text-[10px] font-black uppercase text-text-secondary dark:text-gray-500 tracking-widest py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-inner">
                        {calendarDays.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const dayGhosts = getGhostEventsForDay(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isTodayDate = isToday(day);

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={clsx(
                                        "min-h-[110px] bg-white dark:bg-surface-dark p-2 cursor-pointer transition-all relative hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                        !isCurrentMonth && "bg-gray-50/50 dark:bg-gray-900/10 text-gray-300",
                                        isSelected && "ring-2 ring-primary ring-inset z-10 bg-primary/[0.02]",
                                    )}
                                >
                                    <span className={clsx(
                                        "text-xs font-bold size-7 flex items-center justify-center rounded-full mb-1",
                                        isTodayDate
                                            ? "bg-primary text-white shadow-md shadow-primary/30"
                                            : isCurrentMonth ? "text-text-main dark:text-white" : "text-gray-300 dark:text-gray-600"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    <div className="space-y-1">
                                        {dayEvents.map(event => (
                                            <div
                                                key={event.id}
                                                onClick={(e) => { e.stopPropagation(); setEventToEdit(event); setIsEventModalOpen(true); }}
                                                className="text-[9px] px-1.5 py-0.5 rounded truncate border border-primary/20 bg-primary/10 text-primary font-bold flex items-center gap-1 hover:brightness-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[10px]">psychology</span>
                                                {event.title}
                                            </div>
                                        ))}
                                        {showOnlyMine && dayGhosts.length > 0 && (
                                            <div className="flex flex-wrap gap-0.5 opacity-40">
                                                {dayGhosts.map(g => (
                                                    <div key={g.id} className="size-1.5 rounded-full bg-gray-400" title={`Conflito: ${g.title}`} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day Details / Conflicts */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-gray-800 shadow-sm sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-text-main dark:text-white">
                                {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
                            </h4>
                            <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">Sessões</span>
                        </div>

                        <div className="space-y-3">
                            {getEventsForDay(selectedDate).length === 0 && getGhostEventsForDay(selectedDate).length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">calendar_today</span>
                                    <p className="text-xs text-text-secondary">Nenhum compromisso.</p>
                                </div>
                            ) : (
                                <>
                                    {getEventsForDay(selectedDate).map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => { setEventToEdit(event); setIsEventModalOpen(true); }}
                                            className="p-3 bg-primary/5 border-l-4 border-l-primary rounded-xl cursor-pointer hover:bg-primary/10 transition-all"
                                        >
                                            <p className="text-[10px] font-bold text-primary mb-1">
                                                {format(parseISO(event.start_time), 'HH:mm')} - {format(parseISO(event.end_time), 'HH:mm')}
                                            </p>
                                            <h5 className="text-xs font-bold text-text-main dark:text-white truncate">{event.title}</h5>
                                            {event.child && (
                                                <p className="text-[10px] text-text-secondary mt-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">child_care</span>
                                                    {event.child.full_name}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                    {showOnlyMine && getGhostEventsForDay(selectedDate).length > 0 && (
                                        <div className="pt-4 border-t border-dashed border-border-light dark:border-gray-800">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Conflitos de Crianças</p>
                                            <div className="space-y-2">
                                                {getGhostEventsForDay(selectedDate).map(ghost => (
                                                    <div key={ghost.id} className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg opacity-60">
                                                        <p className="text-[9px] font-bold text-gray-500">
                                                            {format(parseISO(ghost.start_time), 'HH:mm')} • {ghost.child?.full_name || 'Geral'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 truncate">{ghost.title}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => { setEventToEdit(null); setIsEventModalOpen(true); }}
                            className="w-full mt-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Novo Agendamento
                        </button>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Horário de Trabalho</p>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
                            Seu expediente configurado é das <strong>08:00 às 18:00</strong>. Compromissos marcados fora deste intervalo serão destacados.
                        </p>
                    </div>
                </div>
            </div>

            <PsychologistSessionModal
                isOpen={isEventModalOpen}
                onClose={() => {
                    setIsEventModalOpen(false);
                    setEventToEdit(null);
                }}
                selectedDate={selectedDate}
                eventToEdit={eventToEdit}
            />
        </div>
    );
}
