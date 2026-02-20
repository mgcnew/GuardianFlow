import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface InventoryRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InventoryRequestModal({ isOpen, onClose }: InventoryRequestModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        item_name: '',
        quantity: 1,
        unit: 'un',
        priority: 'medium',
        notes: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                organization_id: profile?.organization_id,
                item_name: formData.item_name,
                quantity: formData.quantity,
                unit: formData.unit,
                priority: formData.priority,
                user_id: profile?.id,
                notes: formData.notes,
                status: 'pending'
            };

            const { error } = await supabase.from('inventory_requests').insert([payload]);
            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
            onClose();
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Erro ao criar pedido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-900/10">
                    <h2 className="text-lg font-black text-text-main dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">shopping_cart</span>
                        Fazer Pedido de Reposição
                    </h2>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">O que está faltando?</label>
                        <input
                            required
                            type="text"
                            value={formData.item_name}
                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                            placeholder="Ex: Arroz, Leite, Fralda M..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-amber-500 transition-all text-text-main dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Quantidade</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-amber-500 transition-all text-text-main dark:text-white font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Urgência</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-amber-500 transition-all text-text-main dark:text-white"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta (Urgente)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Notas / Motivo</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Ex: Acaba amanhã, Temos muitos bebês essa semana..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-amber-500 transition-all text-text-main dark:text-white resize-none"
                        />
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
                            className="flex-1 px-6 py-3.5 bg-amber-500 text-white text-xs font-black uppercase rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Enviar Pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
