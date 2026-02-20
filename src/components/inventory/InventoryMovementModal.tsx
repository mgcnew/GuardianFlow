import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

interface InventoryMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: any[];
    type: 'in' | 'out';
}

export function InventoryMovementModal({ isOpen, onClose, items, type }: InventoryMovementModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        item_id: '',
        quantity: 1,
        notes: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.item_id) return;
        setLoading(true);

        try {
            const selectedItem = items.find(i => i.id === formData.item_id);

            const payload = {
                organization_id: profile?.organization_id,
                item_id: formData.item_id,
                item_name: selectedItem?.name || 'Unknown',
                type,
                quantity: formData.quantity,
                user_id: profile?.id,
                notes: formData.notes,
            };

            const { error } = await supabase.from('inventory_movements').insert([payload]);
            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
            onClose();
        } catch (error) {
            console.error('Error recording movement:', error);
            alert('Erro ao registrar movimentação.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={clsx("size-10 rounded-xl flex items-center justify-center",
                            type === 'in' ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                        )}>
                            <span className={clsx("material-symbols-outlined text-2xl", type === 'in' ? "text-green-500" : "text-red-500")}>
                                {type === 'in' ? 'add_circle' : 'remove_circle'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">
                                {type === 'in' ? 'Registrar Entrada' : 'Registrar Saída'}
                            </h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Movimentação de Estoque</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto no-scrollbar">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Selecionar Item</label>
                        <select
                            required
                            value={formData.item_id}
                            onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                        >
                            <option value="">Selecione um item...</option>
                            {items.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.quantity} {item.unit} em estoque)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Quantidade</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                                className="size-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200"
                            >
                                <span className="material-symbols-outlined">remove</span>
                            </button>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-center text-lg font-black outline-none focus:border-primary transition-all text-text-main dark:text-white font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                                className="size-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200"
                            >
                                <span className="material-symbols-outlined">add</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Observações / Quem pegou?</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Ex: Refeitório Almoço, Doação recebida de X, etc..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white resize-none"
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
                            disabled={loading || !formData.item_id}
                            className={clsx(
                                "flex-1 px-6 py-3.5 text-white text-xs font-black uppercase rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50",
                                type === 'in' ? "bg-green-600 hover:bg-green-700 shadow-green-500/25" : "bg-red-600 hover:bg-red-700 shadow-red-500/25"
                            )}
                        >
                            {loading ? 'Processando...' : (type === 'in' ? 'Confirmar Entrada' : 'Confirmar Saída')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
