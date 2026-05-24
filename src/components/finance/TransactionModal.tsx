import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useLogger } from '../../hooks/useLogger';
import { useToast } from '../../contexts/ToastContext';
import clsx from 'clsx';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: any; // If editing
    type?: 'income' | 'expense'; // Initial type context
}

export function TransactionModal({ isOpen, onClose, transaction, type = 'expense' }: TransactionModalProps) {
    const { profile } = useAuth();
    const { logAction } = useLogger();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        type: transaction?.type || type,
        description: transaction?.description || '',
        amount: transaction?.amount || '',
        category: transaction?.category || (type === 'income' ? 'Doação' : 'Despesas Operacionais'),
        date: transaction?.date || new Date().toISOString().split('T')[0],
        status: transaction?.status || 'paid',
        payment_method: transaction?.payment_method || 'PIX',
    });

    if (!isOpen) return null;

    const isIncome = formData.type === 'income';

    const incomeCategories = ['Doação', 'Doação Recorrente', 'Repasse Público', 'Rendimento', 'Outros'];
    const expenseCategories = ['Folha de Pagamento', 'Despesas Operacionais', 'Alimentação', 'Saúde', 'Manutenção', 'Transporte', 'Impostos', 'Outros'];

    const categories = isIncome ? incomeCategories : expenseCategories;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                amount: Number(formData.amount),
                organization_id: profile?.organization_id,
                created_by: profile?.id,
            };

            if (transaction?.id) {
                await supabase.from('financial_transactions').update(payload).eq('id', transaction.id);
                logAction('UPDATE', 'financial_transaction', transaction.id, {
                    description: formData.description,
                    amount: payload.amount,
                    type: formData.type
                });
            } else {
                const { data, error } = await supabase.from('financial_transactions').insert([payload]).select().single();
                if (!error && data) {
                    logAction('CREATE', 'financial_transaction', data.id, {
                        description: formData.description,
                        amount: payload.amount,
                        type: formData.type
                    });
                }
            }

            queryClient.invalidateQueries({ queryKey: ['financialDashboard'] });
            onClose();
        } catch (error) {
            console.error('Error saving transaction:', error);
            toast('Erro ao salvar transação financeira.', 'error');
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
                            isIncome ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                        )}>
                            <span className={clsx("material-symbols-outlined text-2xl", isIncome ? "text-green-500" : "text-red-500")}>
                                {transaction ? 'edit' : (isIncome ? 'arrow_upward' : 'arrow_downward')}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">
                                {transaction ? 'Editar Transação' : (isIncome ? 'Nova Entrada / Receita' : 'Nova Saída / Despesa')}
                            </h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Gestão Financeira</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto no-scrollbar">
                    {/* Toggle Type if not editing */}
                    {!transaction && (
                        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mb-2">
                            <button type="button" onClick={() => setFormData({ ...formData, type: 'income', category: 'Doação' })}
                                className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", isIncome ? "bg-white dark:bg-surface-dark text-green-600 dark:text-green-400 shadow-sm" : "text-gray-500")}>
                                Entrada
                            </button>
                            <button type="button" onClick={() => setFormData({ ...formData, type: 'expense', category: 'Despesas Operacionais' })}
                                className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", !isIncome ? "bg-white dark:bg-surface-dark text-red-600 dark:text-red-400 shadow-sm" : "text-gray-500")}>
                                Saída
                            </button>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Descrição</label>
                        <input
                            required
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ex: Conta de Luz, Salário, Doação João..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                className={clsx("w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-lg font-black outline-none transition-all font-mono",
                                    isIncome ? "text-green-600 dark:text-green-400 focus:border-green-500" : "text-red-600 dark:text-red-400 focus:border-red-500")}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Data</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Categoria</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Método de Pagto</label>
                            <select
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                            >
                                <option value="PIX">PIX</option>
                                <option value="Transferência">Transferência</option>
                                <option value="Boleto">Boleto</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Cartão de Débito">Cartão de Débito</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all text-text-main dark:text-white"
                        >
                            <option value="paid">{isIncome ? 'Recebido' : 'Pago'}</option>
                            <option value="pending">{isIncome ? 'A Receber' : 'A Pagar'}</option>
                            <option value="cancelled">Cancelado</option>
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
                            className={clsx("flex-1 px-6 py-3.5 text-white text-xs font-black uppercase rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50",
                                isIncome ? "bg-green-600 hover:bg-green-700 shadow-green-500/25" : "bg-red-600 hover:bg-red-700 shadow-red-500/25"
                            )}
                        >
                            {loading ? 'Salvando...' : 'Salvar Transação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
