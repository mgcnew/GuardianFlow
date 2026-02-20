import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface InventoryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item?: any; // If editing
}

export function InventoryItemModal({ isOpen, onClose, item }: InventoryItemModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: item?.name || '',
        category: item?.category || 'Alimentos',
        min_quantity: item?.min_quantity || 0,
        unit: item?.unit || 'un',
        quantity: item?.quantity || 0,
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                organization_id: profile?.organization_id,
            };

            if (item?.id) {
                await supabase.from('inventory_items').update(payload).eq('id', item.id);
            } else {
                await supabase.from('inventory_items').insert([payload]);
            }

            queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
            onClose();
        } catch (error) {
            console.error('Error saving item:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <h2 className="text-lg font-black text-text-main dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">{item ? 'edit' : 'add_box'}</span>
                        {item ? 'Editar Item' : 'Novo Item no Estoque'}
                    </h2>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Nome do Item</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Arroz Branco 5kg, Fralda G, etc..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Categoria</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                            >
                                <option value="Alimentos">Alimentos</option>
                                <option value="Higiene">Higiene</option>
                                <option value="Limpeza">Limpeza</option>
                                <option value="Saúde">Saúde</option>
                                <option value="Geral">Geral</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Unidade</label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="Ex: kg, pct, cx, un"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Qtd. Inicial</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Mínimo Alerta</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.min_quantity}
                                onChange={(e) => setFormData({ ...formData, min_quantity: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white font-mono"
                            />
                        </div>
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
                            {loading ? 'Salvando...' : 'Salvar Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
