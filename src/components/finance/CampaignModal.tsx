import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useLogger } from '../../hooks/useLogger';

interface CampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign?: any;
}

export function CampaignModal({ isOpen, onClose, campaign }: CampaignModalProps) {
    const { profile } = useAuth();
    const { logAction } = useLogger();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: campaign?.title || '',
        description: campaign?.description || '',
        goal_amount: campaign?.goal_amount || '',
        start_date: campaign?.start_date || new Date().toISOString().split('T')[0],
        end_date: campaign?.end_date || '',
        status: campaign?.status || 'active',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                goal_amount: Number(formData.goal_amount),
                organization_id: profile?.organization_id,
            };

            if (campaign?.id) {
                await supabase.from('financial_campaigns').update(payload).eq('id', campaign.id);
                logAction('UPDATE', 'financial_campaign', campaign.id, {
                    title: formData.title,
                    goal_amount: payload.goal_amount
                });
            } else {
                const { data, error } = await supabase.from('financial_campaigns').insert([payload]).select().single();
                if (!error && data) {
                    logAction('CREATE', 'financial_campaign', data.id, {
                        title: formData.title,
                        goal_amount: payload.goal_amount
                    });
                }
            }

            queryClient.invalidateQueries({ queryKey: ['financialDashboard'] });
            onClose();
        } catch (error) {
            console.error('Error saving campaign:', error);
            alert('Erro ao salvar campanha.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-2xl">volunteer_activism</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">
                                {campaign ? 'Editar Campanha' : 'Nova Campanha/Vaquinha'}
                            </h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Captação de Recursos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto no-scrollbar">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Título da Campanha</label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Reforma do Telhado, Natal Solidário..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Meta de Arrecadação (R$)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            value={formData.goal_amount}
                            onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-lg font-black outline-none focus:border-primary transition-all text-text-main dark:text-white font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Data de Início</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Data Prevista de Fim</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Descrição</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white resize-none"
                            placeholder="Descrição completa do motivo da doação..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                        >
                            <option value="active">Ativa (Recebendo doações)</option>
                            <option value="completed">Concluída (Meta atingida ou encerrada)</option>
                            <option value="cancelled">Cancelada</option>
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 bg-gray-100 dark:bg-gray-800 text-text-main dark:text-white text-xs font-black uppercase rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3.5 bg-primary text-white text-xs font-black uppercase rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Campanha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
