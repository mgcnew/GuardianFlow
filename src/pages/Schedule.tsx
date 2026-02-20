import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CalendarEventModal } from '../components/schedule/CalendarEventModal';
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
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    isToday,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

type ViewType = 'month' | 'week' | 'day';

export function Schedule() {
    const { profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<ViewType>('month');
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<any>(null);

    // Calculate dynamic date ranges based on view
    const { startDate, endDate } = useMemo(() => {
        let start, end;
        if (view === 'month') {
            start = startOfWeek(startOfMonth(currentDate));
            end = endOfWeek(endOfMonth(startOfMonth(currentDate)));
        } else if (view === 'week') {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
        } else {
            start = startOfDay(currentDate);
            end = endOfDay(currentDate);
        }
        return { startDate: start, endDate: end };
    }, [currentDate, view]);

    const { data: events, isLoading } = useQuery({
        queryKey: ['calendar-events', view, startDate.toISOString(), endDate.toISOString()],
        queryFn: async () => {
            const fetchStart = new Date(startDate.getTime() - 86400000).toISOString(); // Buffer
            const fetchEnd = new Date(endDate.getTime() + 86400000).toISOString();

            const { data, error } = await supabase
                .from('calendar_events')
                .select('*, child:children(id, full_name, photo_url), professional:profiles!calendar_events_professional_id_fkey(id, full_name, specialty)')
                .eq('organization_id', profile?.organization_id)
                .gte('start_time', fetchStart)
                .lte('end_time', fetchEnd)
                .order('start_time', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id,
    });

    const calendarDays = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const handlePrevious = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subDays(currentDate, 1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        if (view === 'month') {
            // Optional: Switch to day view on click? 
            // For now just select the day for the sidebar
        }
    };

    const handleCreateEvent = () => {
        setEventToEdit(null);
        setIsEventModalOpen(true);
    };

    const handleEditEvent = (event: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEventToEdit(event);
        setIsEventModalOpen(true);
    };

    const getEventsForDay = (day: Date) => {
        if (!events) return [];
        return events.filter(event => isSameDay(parseISO(event.start_time), day));
    };

    const eventTypeColors: Record<string, string> = {
        medical: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        vaccine: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        school: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
        outing: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
        meeting: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
        other: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    };

    const eventTypeBorderColors: Record<string, string> = {
        medical: 'border-l-blue-500',
        vaccine: 'border-l-green-500',
        school: 'border-l-purple-500',
        outing: 'border-l-yellow-500',
        meeting: 'border-l-indigo-500',
        other: 'border-l-gray-500',
    };

    const eventTypeLabels: Record<string, string> = {
        medical: 'Médico',
        vaccine: 'Vacina',
        school: 'Escola',
        outing: 'Passeio',
        meeting: 'Reunião',
        other: 'Outro',
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.32))] animate-in fade-in duration-400 gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-text-main dark:text-white font-display">Agenda</h1>
                        {isLoading && (
                            <span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
                    {(['month', 'week', 'day'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                                view === v
                                    ? "bg-white dark:bg-gray-700 text-text-main dark:text-white shadow-sm"
                                    : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                            )}
                        >
                            {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleCreateEvent}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Novo Evento
                </button>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Calendar View */}
                <div className={clsx("flex flex-col bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-border-light dark:border-gray-800 overflow-hidden", view === 'day' ? 'lg:col-span-3' : 'lg:col-span-2')}>
                    {/* Calendar Controls */}
                    <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-gray-800">
                        <h2 className="text-lg font-bold text-text-main dark:text-white font-display capitalize">
                            {view === 'day'
                                ? format(currentDate, "d 'de' MMMM, yyyy", { locale: ptBR })
                                : format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrevious} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">chevron_left</span>
                            </button>
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                            >
                                Hoje
                            </button>
                            <button onClick={handleNext} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {view === 'month' && (
                            <div className="h-full flex flex-col">
                                <div className="grid grid-cols-7 border-b border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                    {weekDays.map(day => (
                                        <div key={day} className="py-3 text-center text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                                    {calendarDays.map((day, i) => {
                                        const dayEvents = getEventsForDay(day);
                                        const isSelected = isSameDay(day, selectedDate);
                                        const isCurrentMonth = isSameMonth(day, currentDate);

                                        return (
                                            <div
                                                key={day.toString()}
                                                onClick={() => handleDayClick(day)}
                                                className={clsx(
                                                    "min-h-[100px] p-2 border-b border-r border-border-light dark:border-gray-800 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                                                    !isCurrentMonth && "bg-gray-50/30 dark:bg-gray-900/10",
                                                    (i + 1) % 7 === 0 && "border-r-0", // No right border for last column
                                                    isSelected && "bg-primary/5 dark:bg-primary/10"
                                                )}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={clsx(
                                                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                                                        isToday(day)
                                                            ? "bg-primary text-white"
                                                            : isCurrentMonth ? "text-text-main dark:text-white" : "text-gray-300 dark:text-gray-600"
                                                    )}>
                                                        {format(day, 'd')}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {dayEvents.slice(0, 3).map(event => (
                                                        <div key={event.id} className={clsx("h-1.5 rounded-full w-full", eventTypeColors[event.type].split(' ')[0])} title={event.title} />
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className="text-[10px] text-text-secondary dark:text-gray-500 block text-right">+{dayEvents.length - 3}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {view === 'week' && (
                            <div className="h-full flex flex-col min-w-[600px]">
                                <div className="grid grid-cols-7 border-b border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                    {calendarDays.map((day) => (
                                        <div key={day.toString()} className={clsx(
                                            "py-3 text-center border-r border-border-light dark:border-gray-800 last:border-r-0",
                                            isToday(day) && "bg-primary/5"
                                        )}>
                                            <div className="text-xs font-medium text-text-secondary dark:text-gray-400 capitalize mb-1">{format(day, 'EEE', { locale: ptBR })}</div>
                                            <div className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-bold",
                                                isToday(day) ? "bg-primary text-white" : "text-text-main dark:text-white"
                                            )}>
                                                {format(day, 'd')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 grid grid-cols-7">
                                    {calendarDays.map((day) => {
                                        const dayEvents = getEventsForDay(day);
                                        return (
                                            <div
                                                key={day.toString()}
                                                className={clsx(
                                                    "border-r border-border-light dark:border-gray-800 last:border-r-0 p-2 space-y-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors",
                                                    isSameDay(day, selectedDate) && "bg-primary/5 dark:bg-primary/10"
                                                )}
                                                onClick={() => handleDayClick(day)}
                                            >
                                                {dayEvents.map(event => (
                                                    <div
                                                        key={event.id}
                                                        onClick={(e) => handleEditEvent(event, e)}
                                                        className={clsx(
                                                            "text-[10px] p-2 rounded-lg border border-l-[3px] cursor-pointer hover:brightness-95 transition-all shadow-sm",
                                                            eventTypeColors[event.type],
                                                            eventTypeBorderColors[event.type]
                                                        )}
                                                    >
                                                        <div className="font-bold truncate mb-0.5">{event.title}</div>
                                                        <div className="opacity-75 truncate">{format(parseISO(event.start_time), 'HH:mm')}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {view === 'day' && (
                            <div className="h-full p-6 space-y-4">
                                {getEventsForDay(currentDate).length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-text-secondary dark:text-gray-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-30">event_busy</span>
                                        <p>Nenhum evento para este dia.</p>
                                    </div>
                                ) : (
                                    getEventsForDay(currentDate).map(event => (
                                        <div
                                            key={event.id}
                                            onClick={(e) => handleEditEvent(event, e)}
                                            className={clsx(
                                                "flex gap-4 p-4 rounded-xl border bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-pointer",
                                                eventTypeBorderColors[event.type],
                                                "border-l-[4px] border-gray-100 dark:border-gray-700"
                                            )}
                                        >
                                            <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-gray-100 dark:border-gray-700 pr-4">
                                                <span className="text-lg font-bold text-text-main dark:text-white">{format(parseISO(event.start_time), 'HH:mm')}</span>
                                                <span className="text-xs text-text-secondary dark:text-gray-500">{format(parseISO(event.end_time), 'HH:mm')}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={clsx("text-[10px] uppercase font-bold px-1.5 py-0.5 rounded", eventTypeColors[event.type])}>
                                                        {eventTypeLabels[event.type]}
                                                    </span>
                                                    {event.child && (
                                                        <span className="text-xs text-text-secondary dark:text-gray-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">child_care</span>
                                                            {event.child.full_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-base font-bold text-text-main dark:text-white">{event.title}</h3>
                                                {event.location && (
                                                    <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-gray-500 mt-1">
                                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                        {event.location}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar - Visible on Month and Week views */}
                {view !== 'day' && (
                    <div className="space-y-6 flex flex-col h-full overflow-hidden">
                        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-border-light dark:border-gray-800 flex flex-col h-full overflow-hidden">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h3 className="text-lg font-bold text-text-main dark:text-white font-display">
                                    {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                                </h3>
                                <button
                                    onClick={handleCreateEvent}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-primary"
                                    title="Adicionar evento"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                {getEventsForDay(selectedDate).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-text-secondary dark:text-gray-400">
                                        <p className="text-sm">Sem eventos.</p>
                                        <button onClick={handleCreateEvent} className="text-xs text-primary font-bold hover:underline mt-1">Adicionar</button>
                                    </div>
                                ) : (
                                    getEventsForDay(selectedDate).map(event => (
                                        <div
                                            key={event.id}
                                            onClick={(e) => handleEditEvent(event, e)}
                                            className={clsx(
                                                "group relative p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 hover:border-primary/30 transition-all cursor-pointer",
                                                eventTypeBorderColors[event.type],
                                                "border-l-[3px]"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-mono font-bold text-text-secondary dark:text-gray-400">
                                                    {format(parseISO(event.start_time), 'HH:mm')}
                                                </span>
                                                <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase", eventTypeColors[event.type])}>
                                                    {eventTypeLabels[event.type]}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-bold text-text-main dark:text-white line-clamp-2">{event.title}</h4>
                                            {event.child && (
                                                <p className="text-xs text-text-secondary dark:text-gray-500 mt-1 truncate">
                                                    {event.child.full_name}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <CalendarEventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                selectedDate={selectedDate}
                eventToEdit={eventToEdit}
            />
        </div>
    );
}
