import { useState } from 'react';
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
    isToday,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

export function Schedule() {
    const { profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<any>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const { data: events } = useQuery({
        queryKey: ['calendar-events', currentDate.getMonth(), currentDate.getFullYear()],
        queryFn: async () => {
            // Use the full view range (including grey days) plus a buffer for timezones
            const fetchStart = new Date(startDate.getTime() - 86400000).toISOString();
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
        // Error handling is handled by TanStack Query default or global handlers, 
        // but we can add local handling if needed.
    });

    const isLoading = !events && !!profile?.organization_id;

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
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
        medical: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        vaccine: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        school: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        outing: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        meeting: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
        other: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
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



    const priorityDots: Record<string, string> = {
        low: 'bg-gray-400',
        normal: 'bg-blue-500',
        high: 'bg-orange-500',
        urgent: 'bg-red-500',
    };

    // Upcoming events (next 7 days)
    const upcomingEvents = events
        ? events
            .filter(e => new Date(e.start_time) > new Date())
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .slice(0, 5)
        : [];

    // Event rendering logic

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-text-main dark:text-white font-display">Agenda</h1>
                        {isLoading && (
                            <span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        )}
                    </div>
                    <p className="text-text-secondary dark:text-gray-400 font-display">Gerencie eventos e compromissos da unidade.</p>
                </div>
                <button
                    onClick={handleCreateEvent}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined">add</span>
                    Novo Evento
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-border-light dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text-main dark:text-white font-display capitalize">
                                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={handlePreviousMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">chevron_left</span>
                                </button>
                                <button
                                    onClick={() => setCurrentDate(new Date())}
                                    className="px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                >
                                    Hoje
                                </button>
                                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-px mb-2 text-center">
                            {weekDays.map(day => (
                                <div key={day} className="text-sm font-medium text-text-secondary dark:text-gray-400 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                            {calendarDays.map((day) => {
                                const dayEvents = getEventsForDay(day);
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isTodayDate = isToday(day);

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => handleDayClick(day)}
                                        className={clsx(
                                            "min-h-[100px] bg-white dark:bg-surface-dark p-2 cursor-pointer transition-colors relative hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                            !isCurrentMonth && "bg-gray-50/50 dark:bg-gray-900/20 text-gray-300 dark:text-gray-600",
                                            isSelected && "ring-2 ring-primary ring-inset z-10",
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={clsx(
                                                "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                                isTodayDate
                                                    ? "bg-primary text-white"
                                                    : isCurrentMonth ? "text-text-main dark:text-white" : "text-gray-300 dark:text-gray-600"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 rounded-full">
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 space-y-1">
                                            {dayEvents.slice(0, 3).map(event => (
                                                <div
                                                    key={event.id}
                                                    onClick={(e) => handleEditEvent(event, e)}
                                                    className={clsx(
                                                        "text-[10px] px-1.5 py-0.5 rounded truncate border flex items-center gap-1",
                                                        eventTypeColors[event.type]
                                                    )}
                                                    title={event.title + (event.child ? ` — ${event.child.full_name}` : '')}
                                                >
                                                    {event.priority === 'urgent' && (
                                                        <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                                                    )}
                                                    {event.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-text-secondary dark:text-gray-500 px-1">
                                                    + {dayEvents.length - 3} mais
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Day Events Panel */}
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-border-light dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-text-main dark:text-white font-display">
                                {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                            </h3>
                            <button
                                onClick={handleCreateEvent}
                                className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Adicionar
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {getEventsForDay(selectedDate).length === 0 ? (
                                <div className="text-center py-8 text-text-secondary dark:text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                                    <p className="text-sm">Nenhum evento neste dia.</p>
                                    <button
                                        onClick={handleCreateEvent}
                                        className="mt-3 text-xs text-primary font-bold hover:underline"
                                    >
                                        Criar evento
                                    </button>
                                </div>
                            ) : (
                                getEventsForDay(selectedDate).map(event => (
                                    <div
                                        key={event.id}
                                        onClick={(e) => handleEditEvent(event, e)}
                                        className={clsx(
                                            "group relative p-3 rounded-xl bg-white dark:bg-gray-800 border border-t border-r border-b border-gray-100 dark:border-gray-700 hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md",
                                            event.status === 'completed' && "opacity-75 grayscale-[0.5]",
                                            eventTypeBorderColors[event.type] || 'border-l-gray-500',
                                            "border-l-[4px]"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-text-secondary dark:text-gray-400 font-mono">
                                                    {event.is_all_day ? 'Dia todo' : `${format(parseISO(event.start_time), 'HH:mm')} - ${format(parseISO(event.end_time), 'HH:mm')}`}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {event.status === 'completed' ? (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">check</span>
                                                        Concluído
                                                    </span>
                                                ) : (
                                                    <span className={clsx(
                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                                                        eventTypeColors[event.type]
                                                    )}>
                                                        {eventTypeLabels[event.type]}
                                                    </span>
                                                )}
                                                {event.priority === 'urgent' && event.status !== 'completed' && (
                                                    <span className={clsx('size-2 rounded-full', priorityDots[event.priority])} title={`Prioridade: ${event.priority}`} />
                                                )}
                                            </div>
                                        </div>

                                        <h4 className={clsx(
                                            "font-bold text-sm text-text-main dark:text-white mb-2 group-hover:text-primary transition-colors line-clamp-2",
                                            event.status === 'completed' && "line-through text-gray-500"
                                        )}>
                                            {event.title}
                                        </h4>

                                        <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                            {event.child && (
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={event.child.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.child.full_name)}&background=random&color=fff&size=32`}
                                                        alt={event.child.full_name}
                                                        className="size-5 rounded-full object-cover border border-gray-100 dark:border-gray-700"
                                                    />
                                                    <span className="text-xs font-medium text-text-secondary dark:text-gray-300 truncate">
                                                        {event.child.full_name}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-gray-500">
                                                {event.location && (
                                                    <div className="flex items-center gap-1 max-w-[50%] truncate">
                                                        <span className="material-symbols-outlined text-[14px] shrink-0">location_on</span>
                                                        <span className="truncate" title={event.location}>{event.location}</span>
                                                    </div>
                                                )}
                                                {event.professional && (
                                                    <div className="flex items-center gap-1 max-w-[50%] truncate">
                                                        <span className="material-symbols-outlined text-[14px] shrink-0">person</span>
                                                        <span className="truncate" title={event.professional.full_name}>{event.professional.full_name.split(' ')[0]}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Upcoming Events */}
                    <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Próximos Eventos</h4>
                        <div className="space-y-3">
                            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                                <div
                                    key={'upcoming-' + event.id}
                                    onClick={(e) => handleEditEvent(event, e)}
                                    className="flex gap-3 items-start cursor-pointer group"
                                >
                                    <div className="flex flex-col items-center bg-white dark:bg-surface-dark p-2 rounded-xl border border-primary/20 min-w-[50px]">
                                        <span className="text-[10px] font-black text-primary uppercase">{format(parseISO(event.start_time), 'MMM', { locale: ptBR })}</span>
                                        <span className="text-lg font-bold text-text-main dark:text-white">{format(parseISO(event.start_time), 'dd')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-bold text-text-main dark:text-white line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h5>
                                        <p className="text-xs text-text-secondary dark:text-gray-400">
                                            {event.is_all_day ? 'Dia inteiro' : format(parseISO(event.start_time), 'HH:mm')} • {eventTypeLabels[event.type]}
                                        </p>
                                        {event.child && (
                                            <p className="text-[10px] font-semibold text-primary mt-0.5 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">child_care</span>
                                                {event.child.full_name}
                                            </p>
                                        )}
                                    </div>
                                    {event.priority === 'urgent' && (
                                        <span className="size-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    )}
                                </div>
                            )) : (
                                <p className="text-xs text-text-secondary dark:text-gray-400">Nenhum evento próximo agendado.</p>
                            )}
                        </div>
                    </div>
                </div>
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
