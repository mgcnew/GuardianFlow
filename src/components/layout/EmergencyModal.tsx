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

export function EmergencyModal({ isOpen, onClose }: EmergencyModalProps) {
    const { profile } = useAuth();
    const [type, setType] = useState<'individual' | 'collective' | null>(null);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [reason, setReason] = useState('');
    const [isTriggered, setIsTriggered] = useState(false);

    // Fetch children for selection
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
        // Future logic for notifications would go here
        setTimeout(() => {
            onClose();
            setIsTriggered(false);
            setType(null);
            setSelectedChildId('');
            setReason('');
        }, 3000);
    };

    const emergencyPhones = [
        { name: 'SAMU', phone: '192', icon: 'medical_services', color: 'bg-red-500' },
        { name: 'Bombeiros', phone: '193', icon: 'fire_truck', color: 'bg-orange-600' },
        { name: 'Polícia', phone: '190', icon: 'local_police', color: 'bg-blue-600' },
        { name: 'Conselho Tutelar', phone: '(Clique para ver)', icon: 'gavel', color: 'bg-purple-600' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl border-4 border-red-500/10 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 max-h-[90vh]">

                {/* Compact Header */}
                <div className="p-6 bg-red-600 text-white relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <span className="material-symbols-outlined text-[100px]">emergency</span>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center animate-pulse">
                                <span className="material-symbols-outlined text-2xl">emergency_home</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-tight leading-none">Protocolo de Crise</h1>
                                <p className="text-[10px] text-red-100 font-bold uppercase mt-1 tracking-widest opacity-80">Acionamento de Emergência</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                {isTriggered ? (
                    <div className="p-10 text-center animate-in zoom-in-95">
                        <div className="size-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mx-auto mb-5">
                            <span className="material-symbols-outlined text-4xl animate-ping">priority_high</span>
                        </div>
                        <h3 className="text-xl font-black text-red-600 mb-2 uppercase">ALERTA ENVIADO!</h3>
                        <p className="text-xs text-text-secondary dark:text-gray-400 font-bold mb-8">Protocolo ativado. Contate suporte externo se necessário.</p>

                        <div className="grid grid-cols-2 gap-3">
                            {emergencyPhones.slice(0, 4).map(phone => (
                                <div key={phone.name} className="p-3 rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10 transition-all">
                                    <span className="text-[9px] font-black text-red-700 dark:text-red-400 uppercase block mb-1">{phone.name}</span>
                                    <span className="text-base font-black text-text-main dark:text-white leading-none">{phone.phone}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-y-auto no-scrollbar">
                        <div className="p-6 space-y-6">
                            {/* 1. Escolha do Tipo - More compact cards */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest px-1 block">Tipo de Ocorrência</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setType('individual')}
                                        className={clsx(
                                            "p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                                            type === 'individual'
                                                ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600"
                                                : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-red-200"
                                        )}
                                    >
                                        <div className={clsx("size-10 rounded-xl flex items-center justify-center", type === 'individual' ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400")}>
                                            <span className="material-symbols-outlined text-xl">person</span>
                                        </div>
                                        <span className="font-black uppercase text-[11px] tracking-tight">Individual</span>
                                    </button>
                                    <button
                                        onClick={() => setType('collective')}
                                        className={clsx(
                                            "p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                                            type === 'collective'
                                                ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600"
                                                : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-red-200"
                                        )}
                                    >
                                        <div className={clsx("size-10 rounded-xl flex items-center justify-center", type === 'collective' ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400")}>
                                            <span className="material-symbols-outlined text-xl">groups</span>
                                        </div>
                                        <span className="font-black uppercase text-[11px] tracking-tight">Coletivo</span>
                                    </button>
                                </div>
                            </div>

                            {/* Child Selection for Individual Type */}
                            {type === 'individual' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest px-1 block">Identificar Acolhido</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">person_search</span>
                                        <select
                                            value={selectedChildId}
                                            onChange={(e) => setSelectedChildId(e.target.value)}
                                            className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-red-500/30 rounded-2xl text-xs font-bold outline-none transition-all appearance-none dark:text-white"
                                        >
                                            <option value="">Selecione o acolhido...</option>
                                            {children?.map(child => (
                                                <option key={child.id} value={child.id}>{child.full_name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            )}

                            {/* 2. Motivo - Height limited */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest px-1 block">Descrição da Emergência</label>
                                <textarea
                                    className="w-full h-24 p-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-red-500/30 rounded-2xl text-xs font-medium outline-none transition-all placeholder-gray-400 resize-none dark:text-white"
                                    placeholder="Ex: Fuga, Briga Generalizada, Mal Súbito..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                            {/* 3. Números Diretos - Very compact list */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest px-1 block">Telefones Diretos (Clique para ligar)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {emergencyPhones.slice(0, 2).map(phone => (
                                        <a key={phone.name} href={`tel:${phone.phone}`} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                            <div className={clsx("size-7 rounded-lg flex items-center justify-center text-white shrink-0", phone.color)}>
                                                <span className="material-symbols-outlined text-xs">{phone.icon}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[7px] font-black uppercase text-text-secondary dark:text-gray-500 leading-none mb-0.5">{phone.name}</p>
                                                <p className="text-[11px] font-black text-text-main dark:text-white leading-none">{phone.phone}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    disabled={!type || !reason || (type === 'individual' && !selectedChildId)}
                                    onClick={handleTrigger}
                                    className="w-full py-4 bg-red-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">broadcast_on_home</span>
                                    Disparar Alerta Geral
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 mt-2 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hover:text-text-main transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
