import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityItemProps {
    icon: string;
    iconColor: string;
    iconBg: string;
    title: string;
    time: string;
    description: React.ReactNode;
    user: string;
    tag: string;
    tagColor: string;
    isLast?: boolean;
}

function ActivityItem({ icon, iconColor, iconBg, title, time, description, user, tag, tagColor, isLast }: ActivityItemProps) {
    return (
        <div className="flex gap-4 relative pb-8 group">
            {!isLast && <div className="absolute left-[19px] top-8 bottom-0 w-[2px] bg-gray-100 dark:bg-gray-800 group-last:hidden"></div>}
            <div className="relative z-10 flex-shrink-0">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${iconBg} ${iconColor} border-2 border-white dark:border-surface-dark shadow-sm`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
            </div>
            <div className="flex-1 pt-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                    <p className="text-text-main dark:text-white font-bold text-sm truncate">{title}</p>
                    <span className="text-[10px] sm:text-xs text-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md w-fit">{time}</span>
                </div>
                <div className="text-text-secondary dark:text-gray-300 text-sm mb-2">{description}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div
                            className="bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center text-[10px] text-primary font-bold shrink-0"
                        >
                            {user.charAt(0)}
                        </div>
                        <span className="text-[11px] text-text-secondary dark:text-gray-400 font-medium truncate">{user}</span>
                    </div>
                    <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className={`text-[10px] font-bold ${tagColor} px-2 py-0.5 rounded-full bg-opacity-10 whitespace-nowrap`}>{tag}</span>
                </div>
            </div>
        </div>
    );
}

const CATEGORY_MAP: Record<string, any> = {
    behavior: { icon: 'psychology', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', tag: '#Comportamental', tagColor: 'text-orange-600 bg-orange-50' },
    health: { icon: 'medication_liquid', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', tag: '#Saúde', tagColor: 'text-blue-600 bg-blue-50' },
    education: { icon: 'school', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', tag: '#Escolar', tagColor: 'text-purple-600 bg-purple-50' },
    meal: { icon: 'restaurant', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', tag: '#Alimentação', tagColor: 'text-green-600 bg-green-50' },
    incident: { icon: 'warning', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', tag: '#Ocorrência', tagColor: 'text-red-600 bg-red-50' },
};

export function ActivityFeed({ logs }: { logs: any[] }) {
    return (
        <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-text-main dark:text-white text-xl font-bold leading-tight">Feed de Atividades</h2>
                <button className="flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-blue-600 transition-all shadow-sm shadow-blue-200 dark:shadow-none w-full sm:w-auto active:scale-95">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    <span>Nova Entrada</span>
                </button>
            </div>
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-6">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">history</span>
                            <p className="text-text-secondary dark:text-gray-400">Nenhuma atividade registrada hoje.</p>
                        </div>
                    ) : (
                        logs.map((log, index) => {
                            const config = CATEGORY_MAP[log.category] || CATEGORY_MAP.behavior;
                            return (
                                <ActivityItem
                                    key={log.id}
                                    icon={config.icon}
                                    iconColor={config.color}
                                    iconBg={config.bg}
                                    title={log.category === 'behavior' ? 'Atualização Comportamental' :
                                        log.category === 'health' ? 'Registro de Saúde' :
                                            log.category === 'education' ? 'Boletim Escolar' :
                                                log.category === 'meal' ? 'Registro de Refeição' : 'Ocorrência'}
                                    time={formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                    description={<>Registro para <span className="font-medium text-gray-900 dark:text-white">{log.children?.full_name}</span>: {log.description}</>}
                                    user={`Registrado por ${log.profiles?.full_name || 'Equipe'}`}
                                    tag={config.tag}
                                    tagColor={config.tagColor}
                                    isLast={index === logs.length - 1}
                                />
                            );
                        })
                    )}
                </div>
                {logs.length > 0 && (
                    <div className="p-4 border-t border-border-light dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-center">
                        <button className="text-primary text-sm font-semibold hover:text-blue-700 transition-colors">Ver Toda a Atividade</button>
                    </div>
                )}
            </div>
        </div>
    );
}
