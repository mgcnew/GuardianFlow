import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotifications, type Notification } from '../../hooks/useNotifications';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
    const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
        onClose();
    };

    const getTypeStyles = (type: Notification['type']) => {
        switch (type) {
            case 'resident': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case 'event': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
            case 'success': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
            case 'warning': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'error': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getTypeIcon = (type: Notification['type']) => {
        switch (type) {
            case 'resident': return 'child_care';
            case 'event': return 'calendar_month';
            case 'success': return 'check_circle';
            case 'warning': return 'warning';
            case 'error': return 'error';
            default: return 'notifications';
        }
    };

    return (
        <div
            ref={dropdownRef}
            className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl border border-border-light dark:border-gray-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
            <div className="p-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/10">
                <div>
                    <h3 className="text-sm font-bold text-text-main dark:text-white">Notificações</h3>
                    <p className="text-[10px] text-text-secondary dark:text-gray-400 font-medium">
                        {unreadCount > 0 ? `Você tem ${unreadCount} novas mensagens` : 'Nenhuma notificação nova'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-bold text-primary hover:underline"
                    >
                        Ler todas
                    </button>
                )}
            </div>

            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="divide-y divide-border-light dark:divide-gray-800">
                        {notifications.map((notif) => (
                            <button
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={clsx(
                                    "w-full p-4 flex gap-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 relative group",
                                    !notif.is_read && "bg-primary/5 border-l-2 border-primary"
                                )}
                            >
                                <div className={clsx(
                                    "size-10 rounded-xl flex items-center justify-center shrink-0",
                                    getTypeStyles(notif.type)
                                )}>
                                    <span className="material-symbols-outlined text-lg">{getTypeIcon(notif.type)}</span>
                                </div>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <h4 className={clsx(
                                        "text-sm leading-tight truncate",
                                        notif.is_read ? "text-text-main dark:text-white" : "text-text-main dark:text-white font-bold"
                                    )}>
                                        {notif.title}
                                    </h4>
                                    <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2 leading-normal">
                                        {notif.content}
                                    </p>
                                    <p className="text-[10px] text-text-secondary/60 dark:text-gray-500 font-medium uppercase tracking-wider">
                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                                    </p>
                                </div>
                                {!notif.is_read && (
                                    <div className="absolute top-4 right-4 size-2 bg-primary rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center space-y-3">
                        <div className="inline-flex size-16 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center text-gray-400 mb-2">
                            <span className="material-symbols-outlined text-3xl">notifications_off</span>
                        </div>
                        <p className="text-sm text-text-secondary dark:text-gray-400 font-medium">Tudo limpo por aqui!</p>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 text-center">
                <button className="text-[11px] font-bold text-text-secondary dark:text-gray-400 hover:text-primary transition-colors uppercase tracking-widest">
                    Ver histórico completo
                </button>
            </div>
        </div>
    );
}
