import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { TransactionModal } from '../components/finance/TransactionModal';
import { CampaignModal } from '../components/finance/CampaignModal';

type DashboardTab = 'overview' | 'income' | 'expenses' | 'campaigns';

export function FinancialDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

    // Modal States
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

    const { data: financeData, isLoading } = useQuery({
        queryKey: ['financialDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;
            const orgId = profile.organization_id;

            const [transactionsRes, campaignsRes] = await Promise.all([
                supabase.from('financial_transactions')
                    .select('*, profiles(full_name), financial_campaigns(title)')
                    .eq('organization_id', orgId)
                    .order('date', { ascending: false }),
                supabase.from('financial_campaigns')
                    .select('*')
                    .eq('organization_id', orgId)
                    .order('start_date', { ascending: false })
            ]);

            const transactions = transactionsRes.data || [];
            const campaigns = campaignsRes.data || [];

            return {
                transactions,
                campaigns,
            };
        },
        enabled: !!profile?.organization_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    if (isLoading && !financeData) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando dados financeiros...</p>
            </div>
        );
    }

    const TABS = [
        { id: 'overview', label: 'Visão Geral', icon: 'monitoring' },
        { id: 'income', label: 'Receitas & Doações', icon: 'arrow_upward' },
        { id: 'expenses', label: 'Despesas & Folha', icon: 'arrow_downward' },
        { id: 'campaigns', label: 'Vaquinhas', icon: 'volunteer_activism' },
    ];

    const handleNewTransaction = (type: 'income' | 'expense') => {
        setTransactionType(type);
        setSelectedTransaction(null);
        setIsTransactionModalOpen(true);
    };

    const handleEditTransaction = (transaction: any) => {
        setTransactionType(transaction.type);
        setSelectedTransaction(transaction);
        setIsTransactionModalOpen(true);
    };

    const handleNewCampaign = () => {
        setSelectedCampaign(null);
        setIsCampaignModalOpen(true);
    };

    const handleEditCampaign = (campaign: any) => {
        setSelectedCampaign(campaign);
        setIsCampaignModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-text-main dark:text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">account_balance_wallet</span>
                        Painel Financeiro
                    </h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Gestão de receitas, despesas mensais, folha de pagamento e campanhas de doação.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => handleNewTransaction('expense')} className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-base text-red-500">arrow_downward</span>Nova Despesa
                    </button>
                    <button onClick={() => handleNewTransaction('income')} className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 active:scale-95">
                        <span className="material-symbols-outlined text-base">arrow_upward</span>Nova Receita
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-2xl p-1 overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as DashboardTab)}
                        className={clsx("flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id ? "bg-white dark:bg-surface-dark text-text-main dark:text-white shadow-sm" : "text-text-secondary dark:text-gray-500 hover:text-text-main dark:hover:text-white")}>
                        <span className={clsx("material-symbols-outlined text-base", activeTab === tab.id && tab.id === 'income' ? 'text-green-500' : activeTab === tab.id && tab.id === 'expenses' ? 'text-red-500' : '')}>
                            {tab.icon}
                        </span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && <OverviewTab data={financeData} />}
            {activeTab === 'income' && <IncomeTab data={financeData} onEdit={handleEditTransaction} />}
            {activeTab === 'expenses' && <ExpensesTab data={financeData} onEdit={handleEditTransaction} />}
            {activeTab === 'campaigns' && <CampaignsTab data={financeData} onNew={handleNewCampaign} onEdit={handleEditCampaign} />}

            {/* Modals */}
            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                transaction={selectedTransaction}
                type={transactionType}
            />
            <CampaignModal
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
                campaign={selectedCampaign}
            />
        </div>
    );
}

/* ==================== OVERVIEW TAB ==================== */
function OverviewTab({ data }: { data: any }) {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    // Calculate current month's totals
    const currentMonthTransactions = data.transactions.filter((t: any) => isWithinInterval(parseISO(t.date), { start: currentMonthStart, end: currentMonthEnd }));

    const totalIncome = currentMonthTransactions.filter((t: any) => t.type === 'income' && t.status === 'paid').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const totalExpense = currentMonthTransactions.filter((t: any) => t.type === 'expense' && t.status === 'paid').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const pendingIncome = currentMonthTransactions.filter((t: any) => t.type === 'income' && t.status === 'pending').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const pendingExpense = currentMonthTransactions.filter((t: any) => t.type === 'expense' && t.status === 'pending').reduce((acc: number, t: any) => acc + Number(t.amount), 0);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Balance */}
                <div className="bg-blue-50/50 dark:bg-surface-dark rounded-3xl border border-blue-100 dark:border-gray-800 p-6 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className="size-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-4xl">account_balance</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-600 dark:text-gray-500 uppercase tracking-widest">Saldo Atual do Mês</p>
                        <h3 className="text-3xl font-black text-text-main dark:text-white mt-1">
                            {formatCurrency(totalIncome - totalExpense)}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-green-500"></span>
                                <span className="text-[10px] font-bold text-green-600">{formatCurrency(pendingIncome)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-red-500"></span>
                                <span className="text-[10px] font-bold text-red-600">{formatCurrency(pendingExpense)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Income Card */}
                <div className="bg-emerald-50/50 dark:bg-surface-dark rounded-3xl border border-emerald-100 dark:border-gray-800 p-6 shadow-sm flex items-center gap-4">
                    <div className="size-14 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-emerald-600 text-3xl">arrow_upward</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-text-main dark:text-white">{formatCurrency(totalIncome)}</p>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-gray-500 uppercase tracking-widest mt-1">Receitas Recebidas</p>
                    </div>
                </div>

                {/* Expense Card */}
                <div className="bg-red-50/50 dark:bg-surface-dark rounded-3xl border border-red-100 dark:border-gray-800 p-6 shadow-sm flex items-center gap-4">
                    <div className="size-14 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-red-600 text-3xl">arrow_downward</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-text-main dark:text-white">{formatCurrency(totalExpense)}</p>
                        <p className="text-[10px] font-black text-red-600 dark:text-gray-500 uppercase tracking-widest mt-1">Despesas Pagas</p>
                    </div>
                </div>
            </div>

            {/* List of Latest Transactions */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                        <span className="material-symbols-outlined text-primary">history</span>Últimas Transações
                    </h2>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800 flex-1">
                    {data.transactions.length === 0 ? (
                        <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl mb-2 block">receipt_long</span>
                            <p className="text-sm text-text-secondary dark:text-gray-500">Nenhuma transação registrada.</p>
                        </div>
                    ) : data.transactions.slice(0, 10).map((t: any) => (
                        <div key={t.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors flex justify-between items-center sm:items-start group">
                            <div className="flex gap-4 items-center sm:items-start">
                                <div className={clsx("size-10 shrink-0 rounded-full flex items-center justify-center",
                                    t.type === 'income' ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-500"
                                )}>
                                    <span className="material-symbols-outlined text-[20px]">{t.type === 'income' ? 'arrow_upward' : 'arrow_downward'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-sm font-bold text-text-main dark:text-white flex items-center gap-2">
                                        {t.description}
                                        {t.financial_campaigns?.title && (
                                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase bg-primary/10 text-primary">
                                                <span className="material-symbols-outlined text-[10px]">volunteer_activism</span>Vaquinha
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-text-secondary dark:text-gray-500 flex items-center gap-2 mt-0.5">
                                        <span>{format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                                        <span className="uppercase text-[10px] font-bold">{t.category}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className={clsx("text-sm sm:text-base font-black font-mono", t.type === 'income' ? "text-green-500" : "text-text-main dark:text-white")}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </p>
                                <span className={clsx("mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                    t.status === 'paid' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        t.status === 'pending' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-500"
                                )}>
                                    {t.status === 'paid' ? (t.type === 'income' ? 'Recebido' : 'Pago') : t.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ==================== INCOME TAB ==================== */
function IncomeTab({ data, onEdit }: { data: any, onEdit: (t: any) => void }) {
    const incomes = data.transactions.filter((t: any) => t.type === 'income');
    return <TransactionList transactions={incomes} title="Receitas & Doações Recebidas" icon="arrow_upward" iconColor="text-green-500" onEdit={onEdit} />;
}

/* ==================== EXPENSES TAB ==================== */
function ExpensesTab({ data, onEdit }: { data: any, onEdit: (t: any) => void }) {
    const expenses = data.transactions.filter((t: any) => t.type === 'expense');
    return <TransactionList transactions={expenses} title="Despesas & Folha de Pagamento" icon="arrow_downward" iconColor="text-red-500" onEdit={onEdit} />;
}

/* Helper Component for Transaction Lists (Income & Expense) */
function TransactionList({ transactions, title, icon, iconColor, onEdit }: { transactions: any[], title: string, icon: string, iconColor: string, onEdit: (t: any) => void }) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                        <span className={clsx("material-symbols-outlined", iconColor)}>{icon}</span>{title} ({transactions.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest min-w-[50px]">Status</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest min-w-[100px]">Data</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest w-1/3">Descrição / Categoria</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Método</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-right">Valor</th>
                                <th className="px-6 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {transactions.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-secondary text-sm">Nenhuma transação encontrada.</td></tr>
                            ) : transactions.map((t: any) => (
                                <tr key={t.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className={clsx("size-6 rounded-full flex items-center justify-center",
                                            t.status === 'paid' ? "bg-green-100 dark:bg-green-900/30 text-green-600" :
                                                t.status === 'pending' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" : "bg-gray-100 text-gray-400"
                                        )} title={t.status}>
                                            <span className="material-symbols-outlined text-[14px]">
                                                {t.status === 'paid' ? 'check' : t.status === 'pending' ? 'schedule' : 'close'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs font-bold text-text-secondary dark:text-gray-400">
                                        {format(parseISO(t.date), 'dd/MM/yyyy')}
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-bold text-text-main dark:text-white">{t.description}</p>
                                        <p className="text-[10px] font-medium text-text-secondary dark:text-gray-500 uppercase mt-0.5">{t.category}</p>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-text-secondary dark:text-gray-400">
                                        {t.payment_method}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <p className="text-sm font-black font-mono text-text-main dark:text-white">
                                            {formatCurrency(t.amount)}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onEdit(t)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ==================== CAMPAIGNS TAB ==================== */
function CampaignsTab({ data, onNew, onEdit }: { data: any, onNew: () => void, onEdit: (c: any) => void }) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-gray-800 shadow-sm">
                <div>
                    <h2 className="text-lg font-black text-text-main dark:text-white flex items-center gap-2">
                        Vaquinhas & Campanhas
                    </h2>
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                        Gerencie metas de arrecadação e acompanhe as doações vinculadas.
                    </p>
                </div>
                <button onClick={onNew} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-xs hover:bg-primary/20 transition-all flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">add</span>Nova Meta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.campaigns.length === 0 ? (
                    <div className="md:col-span-2 lg:col-span-3 p-12 text-center bg-white dark:bg-surface-dark border rounded-3xl border-border-light dark:border-gray-800 border-dashed">
                        <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3 block">volunteer_activism</span>
                        <p className="text-sm text-text-secondary dark:text-gray-500 font-medium">Você ainda não criou nenhuma vaquinha ou campanha de arrecadação.</p>
                    </div>
                ) : data.campaigns.map((c: any) => {
                    const percent = c.goal_amount > 0 ? Math.min(100, (c.raised_amount / c.goal_amount) * 100) : 0;
                    return (
                        <div key={c.id} className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 p-6 shadow-sm flex flex-col relative group">
                            <button onClick={() => onEdit(c)} className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={clsx("px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                    c.status === 'active' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        c.status === 'completed' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-500"
                                )}>
                                    {c.status === 'active' ? 'Em andamento' : c.status === 'completed' ? 'Concluída' : 'Cancelada'}
                                </span>
                            </div>
                            <h3 className="text-lg font-black text-text-main dark:text-white leading-tight mb-1">{c.title}</h3>
                            <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2 min-h-[32px]">{c.description || 'Sem descrição.'}</p>

                            <div className="mt-6 mb-2 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-1">Arrecadado</p>
                                    <p className="text-xl font-black text-primary">{formatCurrency(c.raised_amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-1">Meta</p>
                                    <p className="text-sm font-bold text-text-main dark:text-white">{formatCurrency(c.goal_amount)}</p>
                                </div>
                            </div>

                            <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${percent}%` }}>
                                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>

                            <p className="text-xs font-bold text-text-secondary dark:text-gray-400 text-center uppercase tracking-wider mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
                                {percent.toFixed(0)}% da meta atingida
                            </p>
                        </div>
                    );
                })}
            </div>
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
