import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
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
                            className="bg-primary/10 dark:bg-primary/20 rounded-full h-5 w-5 flex items-center justify-center text-[10px] text-primary dark:text-primary font-bold shrink-0"
                        >
                            {user.charAt(0)}
                        </div>
                        <span className="text-[11px] text-text-secondary dark:text-gray-400 font-medium truncate">{user}</span>
                    </div>
                    <span className="hidden sm:block w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
                    <span className={`text-[10px] font-bold ${tagColor} px-2 py-0.5 rounded-full whitespace-nowrap`}>{tag}</span>
                </div>
            </div>
        </div>
    );
}

const CATEGORY_MAP: Record<string, any> = {
    behavior: { icon: 'psychology', color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30', tag: '#Comportamental', tagColor: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' },
    health: { icon: 'medication_liquid', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', tag: '#Saúde', tagColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
    education: { icon: 'school', color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', tag: '#Escolar', tagColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' },
    meal: { icon: 'restaurant', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', tag: '#Alimentação', tagColor: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' },
    incident: { icon: 'warning', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', tag: '#Ocorrência', tagColor: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' },
};

export function ActivityFeed({ logs }: { logs: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter logs based on search term
    const filteredLogs = logs.filter(log =>
        log.children?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    }

    return (
        <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-gray-800 shadow-sm">
                <h2 className="text-text-main dark:text-white text-xl font-bold leading-tight">Feed de Atividades</h2>
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por acolhido..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm text-text-main dark:text-white placeholder-text-secondary focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                <div className="p-6 flex-1">
                    {currentLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                            <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">history</span>
                            <p className="text-text-secondary dark:text-gray-400">
                                {searchTerm ? 'Nenhuma atividade encontrada para esta busca.' : 'Nenhuma atividade registrada.'}
                            </p>
                        </div>
                    ) : (
                        currentLogs.map((log, index) => {
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
                                    isLast={index === currentLogs.length - 1}
                                />
                            );
                        })
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-border-light dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                        <button
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            Anterior
                        </button>

                        <span className="text-sm text-text-secondary dark:text-gray-400">
                            Página <span className="font-bold text-text-main dark:text-white">{currentPage}</span> de <span className="font-bold text-text-main dark:text-white">{totalPages}</span>
                        </span>

                        <button
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Próxima
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
