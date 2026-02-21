import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

import clsx from 'clsx';

// Modals
import { InventoryItemModal } from '../components/inventory/InventoryItemModal';
import { InventoryMovementModal } from '../components/inventory/InventoryMovementModal';
import { InventoryRequestModal } from '../components/inventory/InventoryRequestModal';

type DashboardTab = 'overview' | 'stock' | 'movements' | 'requests';

export function InventoryPage() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

    // Modal States
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementType, setMovementType] = useState<'in' | 'out'>('out');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['inventoryDashboard', profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;
            const orgId = profile.organization_id;

            const [itemsRes, movementsRes, requestsRes] = await Promise.all([
                supabase.from('inventory_items').select('*').eq('organization_id', orgId).order('name'),
                supabase.from('inventory_movements').select('*, profiles(full_name)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20),
                supabase.from('inventory_requests').select('*, profiles(full_name)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20),
            ]);

            const items = itemsRes.data || [];
            const movements = movementsRes.data || [];
            const requests = requestsRes.data || [];

            return {
                items,
                movements,
                requests,
                stats: {
                    totalItems: items.length,
                    lowStock: items.filter((i: any) => Number(i.quantity) <= Number(i.min_quantity)).length,
                    pendingRequests: requests.filter((r: any) => r.status === 'pending').length,
                }
            };
        },
        enabled: !!profile?.organization_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Mutations
    const resolveRequestMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase
                .from('inventory_requests')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
        }
    });

    if (isLoading && !dashboardData) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-medium animate-pulse">Carregando estoque real...</p>
            </div>
        );
    }

    const TABS = [
        { id: 'overview', label: 'Painel', icon: 'dashboard' },
        { id: 'stock', label: 'Estoque', icon: 'inventory_2' },
        { id: 'movements', label: 'Movimentações', icon: 'sync_alt' },
        { id: 'requests', label: 'Pedidos', icon: 'shopping_cart' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-text-main dark:text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">inventory_2</span>
                        Gestão de Estoque
                    </h1>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Controle de alimentos, itens de higiene, limpeza e necessidades dos acolhidos.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => { setMovementType('out'); setIsMovementModalOpen(true); }}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-base text-red-500">remove</span>Retirar Itens
                    </button>
                    <button
                        onClick={() => { setMovementType('in'); setIsMovementModalOpen(true); }}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 text-text-main dark:text-white text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-base text-green-500">add</span>Entrada
                    </button>
                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 active:scale-95">
                        <span className="material-symbols-outlined text-base">shopping_cart</span>Fazer Pedido
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-2xl p-1 overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as DashboardTab)}
                        className={clsx("flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id ? "bg-white dark:bg-surface-dark text-text-main dark:text-white shadow-sm" : "text-text-secondary dark:text-gray-500 hover:text-text-main dark:hover:text-white")}>
                        <span className="material-symbols-outlined text-base">{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </div>

            {/* Content Based on Tab */}
            {activeTab === 'overview' && <OverviewTab data={dashboardData} />}
            {activeTab === 'stock' && <StockTab data={dashboardData} onEdit={(item: any) => { setSelectedItem(item); setIsItemModalOpen(true); }} onNew={() => { setSelectedItem(null); setIsItemModalOpen(true); }} />}
            {activeTab === 'movements' && <MovementsTab data={dashboardData} />}
            {activeTab === 'requests' && <RequestsTab data={dashboardData} onResolve={(id, status) => resolveRequestMutation.mutate({ id, status })} />}

            {/* Modals */}
            <InventoryItemModal
                isOpen={isItemModalOpen}
                onClose={() => { setIsItemModalOpen(false); setSelectedItem(null); }}
                item={selectedItem}
            />
            <InventoryMovementModal
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
                items={dashboardData.items}
                type={movementType}
            />
            <InventoryRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
            />
        </div>
    );
}

/* ==================== OVERVIEW TAB ==================== */
function OverviewTab({ data }: { data: any }) {
    const lowStockItems = data.items.filter((i: any) => Number(i.quantity) <= Number(i.min_quantity));

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50/50 dark:bg-surface-dark rounded-3xl border border-blue-100 dark:border-gray-800 p-6 shadow-sm flex items-center gap-4">
                    <div className="size-14 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600 text-3xl">inventory_2</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-text-main dark:text-white">{data.stats.totalItems}</p>
                        <p className="text-[10px] font-black text-blue-600 dark:text-gray-500 uppercase tracking-widest mt-1">Itens no Catálogo</p>
                    </div>
                </div>
                <div className="bg-red-50/50 dark:bg-surface-dark rounded-3xl border border-red-100 dark:border-gray-800 p-6 shadow-sm flex items-center gap-4">
                    <div className="size-14 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-text-main dark:text-white">{data.stats.lowStock}</p>
                        <p className="text-[10px] font-black text-red-600 dark:text-gray-500 uppercase tracking-widest mt-1">Estoque Crítico</p>
                    </div>
                </div>
                <div className="bg-amber-50/50 dark:bg-surface-dark rounded-3xl border border-amber-100 dark:border-gray-800 p-6 shadow-sm flex items-center gap-4">
                    <div className="size-14 bg-amber-100 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-amber-600 text-3xl">shopping_cart</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-text-main dark:text-white">{data.stats.pendingRequests}</p>
                        <p className="text-[10px] font-black text-amber-600 dark:text-gray-500 uppercase tracking-widest mt-1">Pedidos Pendentes</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alerts */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-red-500">error</span>Atenção Necessária
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 flex-1">
                        {lowStockItems.length === 0 ? (
                            <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-green-500 text-4xl mb-2 block">check_circle</span>
                                <p className="text-sm text-text-secondary dark:text-gray-500 font-medium">Estoque em dia!</p>
                            </div>
                        ) : lowStockItems.map((item: any) => {
                            const percent = item.min_quantity > 0 ? Math.max(0, Math.min(100, (item.quantity / item.min_quantity) * 100)) : 0;
                            return (
                                <div key={item.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-sm font-bold text-text-main dark:text-white">{item.name}</p>
                                            <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">{item.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-red-500">{item.quantity} <span className="text-[10px]">{item.unit}</span></p>
                                            <p className="text-[10px] text-text-secondary dark:text-gray-400 font-bold">Mín: {item.min_quantity}</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className={clsx("h-full rounded-full transition-all", percent < 30 ? "bg-red-500" : "bg-primary")} style={{ width: `${percent || 5}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Requests */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-primary">notifications_active</span>Últimos Pedidos
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 flex-1">
                        {data.requests.length === 0 ? (
                            <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl mb-2 block">inbox</span>
                                <p className="text-sm text-text-secondary dark:text-gray-500">Nenhum pedido recente.</p>
                            </div>
                        ) : data.requests.slice(0, 5).map((req: any) => (
                            <div key={req.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-text-main dark:text-white capitalize truncate max-w-[120px]">{req.profiles?.full_name || 'Usuário'}</span>
                                        <span className={clsx("px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                            req.priority === 'high' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                                "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                        )}>{req.priority === 'high' ? 'Urgente' : 'Normal'}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">{format(parseISO(req.created_at), "dd/MM HH:mm")}</span>
                                </div>
                                <p className="text-sm font-bold text-text-main dark:text-white">
                                    {req.quantity} {req.unit} de {req.item_name}
                                </p>
                                {req.notes && <p className="text-xs text-text-secondary dark:text-gray-400 truncate mt-0.5 italic">"{req.notes}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ==================== STOCK TAB ==================== */
function StockTab({ data, onEdit, onNew }: { data: any; onEdit: (i: any) => void; onNew: () => void }) {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const categories = Array.from(new Set(data.items.map((i: any) => i.category)));

    const filtered = data.items.filter((item: any) => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
        return matchSearch && matchCat;
    });

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-primary">list_alt</span>Catálogo ({filtered.length})
                        </h2>
                        <button onClick={onNew} className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">add</span>Novo Item
                        </button>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input type="text" placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all" />
                        </div>
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-primary/50">
                            <option value="all">Categorias</option>
                            {categories.map((c: any) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest min-w-[200px]">Item</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hidden sm:table-cell">Categoria</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-center">Quantidade</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-center hidden md:table-cell">Mínimo</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary text-sm font-medium">Nenhum item encontrado no banco de dados.</td></tr>
                            ) : filtered.map((item: any) => {
                                const isLowStock = Number(item.quantity) <= Number(item.min_quantity);
                                return (
                                    <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-text-main dark:text-white">{item.name}</p>
                                        </td>
                                        <td className="px-4 py-4 hidden sm:table-cell">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-bold uppercase">{item.category}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={clsx("text-sm font-black px-2 py-1 rounded-lg", isLowStock ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "text-text-main dark:text-white")}>
                                                {item.quantity} <span className="text-[10px] text-text-secondary dark:text-gray-500">{item.unit}</span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center hidden md:table-cell">
                                            <span className="text-xs font-medium text-text-secondary dark:text-gray-400">{item.min_quantity}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onEdit(item)} className="size-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-all flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ==================== MOVEMENTS TAB ==================== */
function MovementsTab({ data }: { data: any }) {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800">
                    <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                        <span className="material-symbols-outlined text-primary">sync_alt</span>Histórico de Atividades
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Data</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest text-center">Tipo</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">Item / Qtd</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hidden md:table-cell">Responsável</th>
                                <th className="px-4 py-3 text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest hidden sm:table-cell">Observação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {data.movements.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary text-sm">Ainda não há registros de movimentação.</td></tr>
                            ) : data.movements.map((mov: any) => (
                                <tr key={mov.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-text-main dark:text-white">{format(parseISO(mov.created_at), 'dd/MM/yy')}</p>
                                        <p className="text-[10px] font-bold text-text-secondary dark:text-gray-500">{format(parseISO(mov.created_at), 'HH:mm')}</p>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={clsx("px-2 py-1 rounded text-[9px] font-black uppercase inline-flex items-center justify-center min-w-[60px]", mov.type === 'in' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                                            {mov.type === 'in' ? 'Entrada' : 'Saída'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-bold text-text-main dark:text-white">
                                            <span className={clsx("font-black", mov.type === 'in' ? "text-green-500" : "text-red-500")}>{mov.type === 'in' ? '+' : '-'}{mov.quantity}</span> {mov.item_name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-4 hidden md:table-cell">
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                                {mov.profiles?.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <span className="text-xs font-bold text-text-secondary dark:text-gray-400">{mov.profiles?.full_name || 'Sistema'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 hidden sm:table-cell">
                                        <span className="text-xs text-text-secondary dark:text-gray-400 line-clamp-1 max-w-[150px] italic">{mov.notes || 'Sem observações'}</span>
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

/* ==================== REQUESTS TAB ==================== */
function RequestsTab({ data, onResolve }: { data: any; onResolve: (id: string, status: string) => void }) {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-sm font-black text-text-main dark:text-white flex items-center gap-2 uppercase tracking-wide">
                        <span className="material-symbols-outlined text-primary">list_alt</span>Pedidos de Compras/Reposição
                    </h2>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {data.requests.length === 0 ? (
                        <div className="p-12 text-center">
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3 block">inbox</span>
                            <p className="text-sm text-text-secondary dark:text-gray-500 font-medium">Nenhum pedido registrado.</p>
                        </div>
                    ) : data.requests.map((req: any) => (
                        <div key={req.id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={clsx("px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                        req.status === 'pending' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                            req.status === 'approved' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                    )}>
                                        {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Atendido' : 'Cancelado'}
                                    </span>
                                    {req.priority === 'high' && <span className="text-[10px] font-bold text-red-500 flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">priority_high</span>Urgente</span>}
                                    <span className="text-[10px] font-black text-text-secondary dark:text-gray-500 ml-auto md:ml-2 uppercase tracking-tight">
                                        {format(parseISO(req.created_at), "dd/MM 'às' HH:mm")}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-text-main dark:text-white">
                                    {req.quantity} {req.unit} de {req.item_name}
                                </h3>
                                <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">person</span> {req.profiles?.full_name || 'Usuário'} solicitou
                                </p>
                                {req.notes && (
                                    <div className="mt-2 text-xs text-text-main dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="font-black text-[10px] text-gray-400 uppercase mb-0.5 tracking-widest">Observação</p>
                                        {req.notes}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {req.status === 'pending' && (
                                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-3 md:pt-0 md:pl-4">
                                    <button
                                        onClick={() => onResolve(req.id, 'approved')}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/40 text-xs font-bold rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">check</span> Marcar Atendido
                                    </button>
                                    <button
                                        onClick={() => onResolve(req.id, 'rejected')}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">block</span> Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

