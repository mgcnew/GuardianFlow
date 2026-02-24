import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface LogEntry {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
    user: {
        id: string;
        full_name: string;
        email: string;
    };
}

export function ActivityLogs() {
    const { profile } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            if (!profile?.organization_id) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('activity_logs')
                .select(`
                    id, action, entity_type, entity_id, details, created_at,
                    user:profiles(id, full_name, email)
                `)
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (data && !error) {
                // Supabase joint types can be arrays sometimes, but typically it returns a single object if 1:1.
                // Cast to any and map if necessary.
                const formattedLogs = data.map((item: any) => ({
                    ...item,
                    user: item.user || { full_name: 'Usuário Desconhecido', email: '' }
                })) as LogEntry[];
                setLogs(formattedLogs);
            }
            setLoading(false);
        }

        fetchLogs();
    }, [profile?.organization_id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
        );
    }

    const translateAction = (action: string) => {
        const dict: Record<string, string> = {
            'CREATE': 'Criou',
            'UPDATE': 'Atualizou',
            'DELETE': 'Excluiu',
            'LOGIN': 'Fez Login',
            'LOGOUT': 'Fez Logout',
            'EXPORT': 'Exportou Dados',
            'VIEW': 'Visualizou',
            'DOSE_ADMINISTRATION': 'Registrou Dose'
        };
        return dict[action.toUpperCase()] || action;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">history</span>
                    Trilha de Auditoria
                </h2>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                {logs.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary dark:text-gray-400">
                        Nenhum registro de atividade encontrado.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-border-light dark:border-gray-800">
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Data/Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Ação</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Módulo/Entidade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light dark:divide-gray-800">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-text-main dark:text-white">
                                            {new Date(log.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="text-xs text-text-secondary dark:text-gray-400">
                                            {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-text-main dark:text-white">
                                            {log.user.full_name}
                                        </div>
                                        <div className="text-xs text-text-secondary dark:text-gray-400">
                                            {log.user.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight",
                                            log.action.toUpperCase() === 'DELETE' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                log.action.toUpperCase() === 'CREATE' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        )}>
                                            {translateAction(log.action)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-text-main dark:text-gray-300 font-medium capitalize">
                                            {log.entity_type}
                                        </div>
                                        <div className="text-[10px] text-text-secondary dark:text-gray-500 font-mono mt-0.5 truncate max-w-[150px]">
                                            ID: {log.entity_id || 'N/A'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
