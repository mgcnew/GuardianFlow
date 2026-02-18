import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CalendarEventModal } from '../schedule/CalendarEventModal';
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

export function PedagogicalAgenda() {
    const { profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<any>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const { data: events, isLoading } = useQuery({
        queryKey: ['pedagogical-calendar-events', currentDate.getMonth(), currentDate.getFullYear()],
        queryFn: async () => {
            const fetchStart = new Date(startDate.getTime() - 86400000).toISOString();
            const fetchEnd = new Date(endDate.getTime() + 86400000).toISOString();

            const { data, error } = await supabase
                .from('calendar_events')
                .select('*, child:children(id, full_name, photo_url)')
                .eq('organization_id', profile?.organization_id)
                .eq('type', 'school')
                .gte('start_time', fetchStart)
                .lte('end_time', fetchEnd);

            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id,
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-text-main dark:text-white font-display">Agenda Pedagógica</h2>
                    {isLoading && (
                        <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Mini Calendar / Monthly View */}
                <div className="lg:col-span-3 bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-text-main dark:text-white capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-text-secondary">chevron_left</span>
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors">Hoje</button>
                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
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
                                                className="text-[9px] px-1.5 py-0.5 rounded truncate border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold flex items-center gap-1 hover:brightness-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[10px]">school</span>
                                                {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day Details */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-gray-800 shadow-sm sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-text-main dark:text-white">
                                {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
                            </h4>
                            <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Escolar</span>
                        </div>

                        <div className="space-y-3">
                            {getEventsForDay(selectedDate).length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">school</span>
                                    <p className="text-xs text-text-secondary">Sem eventos para este dia.</p>
                                </div>
                            ) : (
                                getEventsForDay(selectedDate).map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => { setEventToEdit(event); setIsEventModalOpen(true); }}
                                        className="p-3 bg-green-50/50 dark:bg-green-900/5 border-l-4 border-l-green-500 rounded-xl cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-all shadow-sm"
                                    >
                                        <p className="text-[10px] font-bold text-green-600 mb-1">
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
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => { setEventToEdit(null); setIsEventModalOpen(true); }}
                            className="w-full mt-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Novo Agendamento
                        </button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-blue-600 text-[18px]">info</span>
                            <p className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">Acompanhamento de Metas</p>
                        </div>
                        <p className="text-[11px] text-blue-700 dark:text-blue-500 leading-relaxed">
                            Organize reuniões com escolas e reforços escolares para garantir o cumprimento do plano pedagógico individual.
                        </p>
                    </div>
                </div>
            </div>

            <CalendarEventModal
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
