import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

interface DayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    events: any[];
    onEditEvent: (event: any) => void;
    onCreateEvent: () => void;
}

export function DayDetailsModal({ isOpen, onClose, date, events, onEditEvent, onCreateEvent }: DayDetailsModalProps) {
    if (!isOpen) return null;

    const eventTypeColors: Record<string, string> = {
        medical: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        vaccine: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        school: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        outing: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        meeting: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
        other: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
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

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh] relative">

                {/* Header */}
                <div className="p-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-surface-dark z-10">
                    <div>
                        <h2 className="text-xl font-bold text-text-main dark:text-white font-display capitalize">
                            {format(date, "d 'de' MMMM", { locale: ptBR })}
                        </h2>
                        <p className="text-xs text-text-secondary dark:text-gray-400 font-display">
                            {format(date, "EEEE", { locale: ptBR })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-main dark:text-gray-400 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {events.length === 0 ? (
                        <div className="text-center py-10 text-text-secondary dark:text-gray-400 flex flex-col items-center">
                            <div className="size-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl opacity-50">event_busy</span>
                            </div>
                            <p className="text-sm font-medium">Nenhum evento para este dia.</p>
                            <p className="text-xs opacity-70 mt-1 max-w-[200px]">Toque no botão abaixo para agendar algo novo.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {events.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => onEditEvent(event)}
                                    className="group p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-border-light dark:hover:border-gray-700 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] duration-150"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                                                event.status === 'completed'
                                                    ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                                                    : eventTypeColors[event.type]
                                            )}>
                                                {event.status === 'completed' ? 'Concluído' : eventTypeLabels[event.type]}
                                            </span>
                                            {event.priority && event.priority !== 'normal' && (
                                                <span className={clsx('size-2 rounded-full', priorityDots[event.priority])} title={`Prioridade: ${event.priority}`} />
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-text-secondary dark:text-gray-400 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                            {event.is_all_day ? 'Dia inteiro' : `${format(parseISO(event.start_time), 'HH:mm')} - ${format(parseISO(event.end_time), 'HH:mm')}`}
                                        </span>
                                    </div>

                                    <h4 className={clsx(
                                        "font-bold text-text-main dark:text-white mb-1 group-hover:text-primary transition-colors flex items-center gap-2",
                                        event.status === 'completed' && "line-through text-gray-400 dark:text-gray-500"
                                    )}>
                                        {event.title}
                                    </h4>

                                    {/* Child badge */}
                                    {event.child && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <img
                                                src={event.child.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.child.full_name)}&background=random&color=fff&size=32`}
                                                alt={event.child.full_name}
                                                className="size-5 rounded-full object-cover"
                                            />
                                            <span className="text-xs font-semibold text-primary">{event.child.full_name}</span>
                                        </div>
                                    )}

                                    {event.description && (
                                        <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2 mb-2">
                                            {event.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                        {event.location && (
                                            <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-gray-500">
                                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                {event.location}
                                            </div>
                                        )}
                                        {event.professional && (
                                            <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-gray-500">
                                                <span className="material-symbols-outlined text-[14px]">person</span>
                                                {event.professional.full_name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / FAB */}
                <div className="p-4 border-t border-border-light dark:border-gray-800 bg-gray-50 dark:bg-surface-dark">
                    <button
                        onClick={onCreateEvent}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Adicionar Evento
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
