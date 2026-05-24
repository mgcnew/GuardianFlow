import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface EmergencyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const inputClass = "w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all dark:text-white font-medium text-base sm:text-sm";
const labelClass = "text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest";

const emergencyPhones = [
    { name: 'SAMU', phone: '192', icon: 'medical_services', color: 'bg-red-500' },
    { name: 'Bombeiros', phone: '193', icon: 'local_fire_department', color: 'bg-orange-500' },
    { name: 'Polícia', phone: '190', icon: 'local_police', color: 'bg-blue-600' },
    { name: 'Cons. Tutelar', phone: '(ver sistema)', icon: 'gavel', color: 'bg-purple-600' },
];

export function EmergencyModal({ isOpen, onClose }: EmergencyModalProps) {
    const { profile } = useAuth();
    const [type, setType] = useState<'individual' | 'collective' | null>(null);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [reason, setReason] = useState('');
    const [isTriggered, setIsTriggered] = useState(false);

    const { data: children } = useQuery({
        queryKey: ['children-emergency', profile?.organization_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('children')
                .select('id, full_name')
                .eq('organization_id', profile?.organization_id)
                .order('full_name');
            if (error) throw error;
            return data;
        },
        enabled: isOpen && !!profile?.organization_id
    });

    if (!isOpen) return null;

    const handleTrigger = () => {
        setIsTriggered(true);
        setTimeout(() => {
            onClose();
            setIsTriggered(false);
            setType(null);
            setSelectedChildId('');
            setReason('');
        }, 4000);
    };

    const canTrigger = !!type && !!reason && (type !== 'individual' || !!selectedChildId);

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl sm:border sm:border-border-light dark:sm:border-gray-800 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 max-h-[90vh]">

                {/* Red accent stripe */}
                <div className="h-1 w-full bg-red-500 flex-shrink-0" />

                {/* Header */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-border-light dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center relative">
                            <span className="material-symbols-outlined text-[20px] text-red-600 dark:text-red-400">emergency_home</span>
                            <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white tracking-tight leading-none">Protocolo de Crise</h2>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-0.5">Acionamento de Emergência</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px] text-text-secondary dark:text-gray-400">close</span>
                    </button>
                </div>

                {/* Content */}
                {isTriggered ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300 gap-5">
                        <div className="size-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-red-600">check_circle</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-text-main dark:text-white mb-1">Alerta Ativado</h3>
                            <p className="text-xs text-text-secondary dark:text-gray-400 font-medium">Protocolo registrado. Contate suporte externo se necessário.</p>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-2">
                            {emergencyPhones.map(phone => (
                                <a
                                    key={phone.name}
                                    href={`tel:${phone.phone}`}
                                    className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-border-light dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                                >
                                    <div className={clsx("size-7 rounded-lg flex items-center justify-center text-white shrink-0", phone.color)}>
                                        <span className="material-symbols-outlined text-[14px]">{phone.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className={labelClass + " mb-0.5"}>{phone.name}</p>
                                        <p className="text-xs font-black text-text-main dark:text-white leading-none">{phone.phone}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="p-5 space-y-5">

                            {/* Tipo */}
                            <div className="space-y-2">
                                <label className={labelClass}>Tipo de Ocorrência</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'individual', label: 'Individual', icon: 'person', desc: 'Envolve um acolhido' },
                                        { id: 'collective', label: 'Coletivo', icon: 'groups', desc: 'Envolve a unidade' },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setType(opt.id as 'individual' | 'collective')}
                                            className={clsx(
                                                "p-3.5 rounded-xl border-2 transition-all text-left flex flex-col gap-2",
                                                type === opt.id
                                                    ? "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600"
                                                    : "bg-gray-50 dark:bg-gray-800/50 border-border-light dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800"
                                            )}
                                        >
                                            <div className={clsx(
                                                "size-9 rounded-xl flex items-center justify-center transition-colors",
                                                type === opt.id
                                                    ? "bg-red-500 text-white"
                                                    : "bg-white dark:bg-gray-700 text-text-secondary dark:text-gray-400"
                                            )}>
                                                <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                                            </div>
                                            <div>
                                                <p className={clsx("text-xs font-black uppercase tracking-tight", type === opt.id ? "text-red-600 dark:text-red-400" : "text-text-main dark:text-white")}>{opt.label}</p>
                                                <p className="text-[10px] text-text-secondary dark:text-gray-500 font-medium mt-0.5">{opt.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Identificar acolhido */}
                            {type === 'individual' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className={labelClass}>Identificar Acolhido</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">person_search</span>
                                        <select
                                            value={selectedChildId}
                                            onChange={(e) => setSelectedChildId(e.target.value)}
                                            className={inputClass + " pl-10 appearance-none"}
                                        >
                                            <option value="">Selecione o acolhido...</option>
                                            {children?.map(child => (
                                                <option key={child.id} value={child.id}>{child.full_name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[18px]">expand_more</span>
                                    </div>
                                </div>
                            )}

                            {/* Descrição */}
                            <div className="space-y-2">
                                <label className={labelClass}>Descrição da Emergência</label>
                                <textarea
                                    className={inputClass + " min-h-[96px] resize-none"}
                                    placeholder="Ex: Fuga, briga generalizada, mal súbito..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                            {/* Telefones */}
                            <div className="space-y-2">
                                <label className={labelClass}>Telefones de Emergência</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {emergencyPhones.map(phone => (
                                        <a
                                            key={phone.name}
                                            href={`tel:${phone.phone}`}
                                            className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-border-light dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 transition-colors active:scale-95"
                                        >
                                            <div className={clsx("size-7 rounded-lg flex items-center justify-center text-white shrink-0", phone.color)}>
                                                <span className="material-symbols-outlined text-[14px]">{phone.icon}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className={labelClass + " mb-0.5"}>{phone.name}</p>
                                                <p className="text-xs font-black text-text-main dark:text-white leading-none">{phone.phone}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {!isTriggered && (
                    <div className="flex-shrink-0 px-5 py-4 border-t border-border-light dark:border-gray-800 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md space-y-2">
                        <button
                            disabled={!canTrigger}
                            onClick={handleTrigger}
                            className="w-full h-12 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-red-500/20"
                        >
                            <span className="material-symbols-outlined text-[18px]">broadcast_on_home</span>
                            Disparar Alerta Geral
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hover:text-text-main dark:hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
