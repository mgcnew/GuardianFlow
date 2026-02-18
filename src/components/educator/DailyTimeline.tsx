import clsx from 'clsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineItem {
    id: string;
    type: 'log' | 'report';
    created_at: string;
    author_name: string;
    description: string; // Para Logs é a observação, Para Reports é o resumo

    // Log specific
    child_name?: string;
    child_photo?: string;
    category?: string;
    mood?: string;

    // Report specific
    shift?: string;
    occurrences?: string;
}

interface DailyTimelineProps {
    items: TimelineItem[];
    loading?: boolean;
}

const categoryConfig: Record<string, { icon: string, color: string, bg: string }> = {
    behavior: { icon: 'psychology', color: 'text-orange-600', bg: 'bg-orange-100' },
    health: { icon: 'medical_services', color: 'text-blue-600', bg: 'bg-blue-100' },
    education: { icon: 'school', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    meal: { icon: 'restaurant', color: 'text-green-600', bg: 'bg-green-100' },
    incident: { icon: 'warning', color: 'text-red-600', bg: 'bg-red-100' },
    default: { icon: 'article', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const moodConfig: Record<string, string> = {
    very_happy: '😄',
    happy: '🙂',
    neutral: '😐',
    sad: '🙁',
    angry: '😠',
};

export function DailyTimeline({ items, loading }: DailyTimelineProps) {

    if (loading) {
        return (
            <div className="space-y-6 py-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-12 flex flex-col items-center">
                            <div className="size-3 rounded-full bg-gray-200 dark:bg-gray-800" />
                            <div className="w-0.5 flex-1 bg-gray-100 dark:bg-gray-800 my-2" />
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl h-32" />
                    </div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="size-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">history_toggle_off</span>
                </div>
                <h3 className="text-lg font-bold text-text-main dark:text-white">Nenhum registro encontrado</h3>
                <p className="text-sm text-text-secondary dark:text-gray-400">Não há ocorrências ou relatórios para esta data.</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-8 py-4">
            {/* Linha vertical de conexão */}
            <div className="absolute left-[20px] top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-800 z-0 hidden md:block" />

            {items.map((item, index) => {
                const date = new Date(item.created_at);
                const time = format(date, 'HH:mm', { locale: ptBR });

                // Configuração visual baseada no tipo
                let icon = 'article';
                let iconBg = 'bg-gray-100';
                let iconColor = 'text-gray-600';

                if (item.type === 'log') {
                    const cat = categoryConfig[item.category || 'default'] || categoryConfig.default;
                    icon = cat.icon;
                    iconBg = cat.bg;
                    iconColor = cat.color;
                } else {
                    // Report
                    icon = item.shift === 'night' ? 'dark_mode' : item.shift === 'afternoon' ? 'wb_twilight' : 'wb_sunny';
                    iconBg = item.shift === 'night' ? 'bg-indigo-100' : item.shift === 'afternoon' ? 'bg-orange-100' : 'bg-amber-100';
                    iconColor = item.shift === 'night' ? 'text-indigo-600' : item.shift === 'afternoon' ? 'text-orange-600' : 'text-amber-600';
                }

                return (
                    <div key={item.id} className="relative z-10 md:pl-16 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>

                        {/* Marcador de tempo (Desktop) */}
                        <div className="absolute left-0 top-0 w-10 flex flex-col items-center hidden md:flex">
                            <div className={clsx("size-10 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-900 z-10", iconBg, iconColor)}>
                                <span className="material-symbols-outlined text-base">{icon}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 mt-2 bg-white dark:bg-gray-900 px-1 py-0.5 rounded shadow-sm border border-gray-100 dark:border-gray-800">{time}</span>
                        </div>

                        {/* Card de Conteúdo */}
                        <div className={clsx(
                            "rounded-2xl border bg-white dark:bg-surface-dark shadow-sm hover:shadow-md transition-shadow overflow-hidden group",
                            item.type === 'report' ? "border-l-4 border-l-primary/50 dark:border-gray-800 border-y-gray-100 border-r-gray-100" : "border-gray-100 dark:border-gray-800"
                        )}>

                            {/* Header do Card */}
                            <div className="p-4 flex items-start justify-between gap-4 border-b border-gray-50 dark:border-gray-800/50">
                                <div className="flex items-center gap-3">
                                    {/* Mobile: Ícone e Tempo */}
                                    <div className="md:hidden flex items-center gap-2 mr-2">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{time}</span>
                                        <span className={clsx("material-symbols-outlined text-sm p-1 rounded-full", iconBg, iconColor)}>{icon}</span>
                                    </div>

                                    {item.type === 'log' ? (
                                        // Header Log: Foto e Nome do Acolhido
                                        <>
                                            <div className="size-10 rounded-full overflow-hidden bg-gray-200 border border-gray-100">
                                                <img src={item.child_photo || 'https://via.placeholder.com/40'} alt={item.child_name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-main dark:text-white text-sm">{item.child_name}</h4>
                                                <p className="text-xs text-text-secondary dark:text-gray-400">Registrado por {item.author_name}</p>
                                            </div>
                                        </>
                                    ) : (
                                        // Header Report: Título do Relatório
                                        <div>
                                            <h4 className="font-bold text-text-main dark:text-white text-sm flex items-center gap-2">
                                                RELATÓRIO DE TURNO
                                                <span className={clsx("text-[10px] px-2 py-0.5 rounded-full uppercase font-black tracking-wider", iconBg, iconColor)}>
                                                    {item.shift === 'morning' ? 'Manhã' : item.shift === 'afternoon' ? 'Tarde' : 'Noite'}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-text-secondary dark:text-gray-400">Registrado por {item.author_name}</p>
                                        </div>
                                    )}
                                </div>

                                {item.type === 'log' && item.mood && (
                                    <div className="text-2xl" title="Humor do acolhido">
                                        {moodConfig[item.mood] || '😐'}
                                    </div>
                                )}
                            </div>

                            {/* Corpo do Card */}
                            <div className="p-4 space-y-3">
                                {item.type === 'log' && item.category && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={clsx("text-xs font-bold px-2 py-1 rounded uppercase tracking-wider",
                                            categoryConfig[item.category]?.bg || "bg-gray-100",
                                            categoryConfig[item.category]?.color || "text-gray-600"
                                        )}>
                                            {categoryConfig[item.category] ? 'Categoria: ' + item.category : 'Ocorrência'}
                                        </span>
                                    </div>
                                )}

                                <p className="text-sm text-text-main dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                    {item.description}
                                </p>

                                {item.type === 'report' && item.occurrences && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                                        <h5 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            Ocorrências Gerais
                                        </h5>
                                        <p className="text-xs text-red-800 dark:text-red-200">{item.occurrences}</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                );
            })}
        </div>
    );
}
