import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parseISO, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function StaffList({ staff }: { staff: any[] }) {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-text-main dark:text-white text-base font-bold">Equipe em Plantão</h3>
                <button className="text-primary text-xs font-semibold hover:underline">Ver Todos</button>
            </div>
            <div className="flex flex-col gap-3">
                {staff.length === 0 ? (
                    <p className="text-xs text-text-secondary dark:text-gray-400 italic">Carregando equipe...</p>
                ) : (
                    staff.map((member) => (
                        <StaffMember
                            key={member.id}
                            name={member.full_name}
                            role={member.role === 'pedagogue' ? 'Pedagogo' :
                                member.role === 'technician' ? 'Técnico' :
                                    member.role === 'educator' ? 'Educador' :
                                        member.role === 'org_admin' ? 'Coordenador' : 'Operacional'}
                            image={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random`}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function StaffMember({ name, role, image }: { name: string, role: string, image: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="relative">
                <div
                    className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 ring-2 ring-green-100 dark:ring-green-900"
                    style={{ backgroundImage: `url("${image}")` }}
                ></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-surface-dark rounded-full translate-x-1 translate-y-1"></div>
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-text-main dark:text-white">{name}</p>
                <p className="text-xs text-text-secondary dark:text-gray-400">{role}</p>
            </div>
            <a href="tel:555" className="p-2 text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">call</span>
            </a>
        </div>
    );
}

export function AgendaWidget() {
    const { profile } = useAuth();
    const today = new Date();

    const { data: events, isLoading } = useQuery({
        queryKey: ['dashboard-agenda-today', format(today, 'yyyy-MM-dd')],
        queryFn: async () => {
            // Get range for "Today" in UTC to cover all timezones safely
            // A safer bet is to fetch a bit wider range and filter in JS using local time
            const start = new Date(today);
            start.setHours(0, 0, 0, 0);
            const end = new Date(today);
            end.setHours(23, 59, 59, 999);

            // Subtract/Add buffer to ensure timezone coverage
            const fetchStart = new Date(start.getTime() - 86400000).toISOString();
            const fetchEnd = new Date(end.getTime() + 86400000).toISOString();

            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('organization_id', profile?.organization_id)
                .gte('start_time', fetchStart)
                .lte('end_time', fetchEnd)
                .order('start_time', { ascending: true });

            if (error) throw error;

            // STRICTLY Filter in JS for "isSameDay" in LOCAL TIME
            return (data || []).filter(e => isSameDay(parseISO(e.start_time), today));
        },
        enabled: !!profile?.organization_id,
    });

    return (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-gray-800 shadow-sm p-5 h-full flex flex-col">
            <h3 className="text-text-main dark:text-white text-base font-bold mb-4 flex items-center justify-between">
                <span>Agenda de Hoje</span>
                <span className="text-xs font-normal text-text-secondary dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                    {format(today, "d 'de' MMM", { locale: ptBR })}
                </span>
            </h3>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : !events || events.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">event_available</span>
                    <p className="text-sm font-medium text-text-secondary dark:text-gray-400">Tudo livre por hoje!</p>
                </div>
            ) : (
                <div className="relative pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-6 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {events.map(event => (
                        <AgendaItem
                            key={event.id}
                            time={event.is_all_day ? 'Dia todo' : format(parseISO(event.start_time), 'HH:mm')}
                            title={event.title}
                            subtitle={event.location || event.type}
                            status={new Date() > new Date(event.end_time) ? 'completed' : new Date() >= new Date(event.start_time) ? 'current' : 'upcoming'}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function AgendaItem({ time, title, subtitle, status }: { time: string, title: string, subtitle?: string, status: 'completed' | 'current' | 'upcoming' }) {
    const isCompleted = status === 'completed';
    const isCurrent = status === 'current';

    return (
        <div className="relative group">
            <div className={clsx(
                "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-surface-dark transition-all",
                isCurrent ? "bg-primary ring-2 ring-blue-100 dark:ring-blue-900 scale-125" :
                    isCompleted ? "bg-gray-300 dark:bg-gray-600" : "bg-primary/50"
            )}></div>
            <p className={clsx("text-xs mb-0.5", isCurrent ? "text-primary font-bold" : "text-text-secondary dark:text-gray-500")}>{time}</p>
            <p className={clsx(
                "text-sm line-clamp-1",
                isCurrent ? "font-bold text-text-main dark:text-white" : "font-medium",
                isCompleted ? "text-text-secondary dark:text-gray-600 line-through decoration-gray-400" : "text-text-main dark:text-white group-hover:text-primary transition-colors"
            )}>{title}</p>
            {subtitle && <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-1">{subtitle}</p>}
        </div>
    );
}
