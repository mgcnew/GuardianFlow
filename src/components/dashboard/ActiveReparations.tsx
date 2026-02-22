import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

const typeLabels: Record<string, string> = {
    tv_restriction: 'Privação de TV/Eletrônicos',
    outing_restriction: 'Restrição de Saída',
    event_restriction: 'Restrição de Evento',
    educational_task: 'Tarefa Extra',
    other: 'Outro',
};

export function ActiveReparations() {
    const { data: reparations, isLoading } = useQuery({
        queryKey: ['active-reparations'],
        queryFn: async () => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('educational_reparations')
                .select(`
                    *,
                    children (full_name, photo_url)
                `)
                .eq('status', 'active')
                .gt('end_time', now)
                .order('end_time', { ascending: true });

            if (error) throw error;
            return data;
        },
        refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
    });

    if (isLoading || !reparations || reparations.length === 0) return null;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                        Medidas de Reparação Ativas
                    </h3>
                </div>
                <span className="text-[10px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                    {reparations.length} {reparations.length === 1 ? 'pendente' : 'pendentes'}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reparations.map((rep) => {
                    const child = Array.isArray(rep.children) ? rep.children[0] : rep.children;
                    const timeLeft = new Date(rep.end_time).getTime() - new Date().getTime();
                    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

                    return (
                        <div
                            key={rep.id}
                            className="bg-white dark:bg-surface-dark border-l-4 border-rose-500 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group relative overflow-hidden"
                        >
                            {/* Abstract Background element */}
                            <div className="absolute -right-4 -bottom-4 size-20 bg-rose-50 dark:bg-rose-900/10 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />

                            <div className="flex items-start gap-3 relative z-10">
                                <div className="size-10 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                                    <img
                                        src={child?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(child?.full_name || '')}&background=random&color=fff`}
                                        alt={child?.full_name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-text-main dark:text-white truncate">
                                        {child?.full_name}
                                    </h4>
                                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                        {typeLabels[rep.type] || 'Reparação'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                                <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2 italic">
                                    "{rep.reason}"
                                </p>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px] text-gray-400">timer</span>
                                        <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500">
                                            Expira em {format(new Date(rep.end_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <div className={clsx(
                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                        daysLeft <= 1 ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700" : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                                    )}>
                                        {daysLeft <= 1 ? 'Reta Final' : `${daysLeft} dias`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
