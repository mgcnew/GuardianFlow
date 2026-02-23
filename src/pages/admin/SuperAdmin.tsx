import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type TabId = 'overview' | 'organizations' | 'plans';

export function SuperAdmin() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const { data: orgs, isLoading: orgsLoading } = useQuery({
        queryKey: ['admin-organizations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('organizations')
                .select(`
                    *,
                    subscriptions (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    const { data: plans } = useQuery({
        queryKey: ['admin-plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('price_monthly', { ascending: true });
            if (error) throw error;
            return data;
        }
    });

    const activeOrgs = orgs?.filter(o => o.subscriptions?.[0]?.status === 'active').length || 0;
    const totalOrgs = orgs?.length || 0;

    const filteredOrgs = orgs?.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
        { id: 'organizations', label: 'Organizações', icon: 'corporate_fare' },
        { id: 'plans', label: 'Planos', icon: 'payments' },
    ];

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
            {/* Top Header */}
            <header className="bg-white dark:bg-surface-dark border-b border-border-light dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/src/assets/logo.png" alt="Logo" className="h-12 md:h-14 w-auto" />
                        <div className="hidden sm:block">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Painel Administrativo</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm font-semibold text-text-secondary dark:text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Sair
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h2 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Painel de Controle</h2>
                    <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                        Gerencie organizações, planos e acompanhe o crescimento do Guardião Amigo.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-8 border-b border-border-light dark:border-gray-800">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px',
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white'
                            )}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total de Organizações', value: totalOrgs, icon: 'corporate_fare', color: 'text-primary bg-primary/10' },
                                { label: 'Assinaturas Ativas', value: activeOrgs, icon: 'check_circle', color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' },
                                { label: 'Receita Mensal Est.', value: `R$ ${((activeOrgs * 199.9).toFixed(2)).replace('.', ',')}`, icon: 'payments', color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30' },
                                { label: 'Taxa de Conversão', value: totalOrgs > 0 ? `${Math.round((activeOrgs / totalOrgs) * 100)}%` : '0%', icon: 'trending_up', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
                            ].map((stat, i) => (
                                <div key={i} className="p-5 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                                            <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-text-secondary dark:text-gray-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                                    <h3 className="text-2xl font-extrabold text-text-main dark:text-white mt-1">{stat.value}</h3>
                                </div>
                            ))}
                        </div>

                        {/* Recent organizations */}
                        <div className="rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 overflow-hidden">
                            <div className="px-6 py-5 border-b border-border-light dark:border-gray-800">
                                <h3 className="text-base font-bold text-text-main dark:text-white">Organizações Recentes</h3>
                            </div>
                            {orgsLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                                </div>
                            ) : (
                                <div className="divide-y divide-border-light dark:divide-gray-800">
                                    {(orgs || []).slice(0, 5).map((org: any) => (
                                        <div key={org.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-extrabold uppercase">
                                                    {org.name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-main dark:text-white">{org.name}</p>
                                                    <p className="text-xs text-text-secondary dark:text-gray-500">
                                                        Cadastro: {new Date(org.created_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={clsx(
                                                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                org.subscriptions?.[0]?.status === 'active'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                            )}>
                                                {org.subscriptions?.[0]?.status === 'active' ? 'Ativo' : 'Sem assinatura'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'organizations' && (
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar organização..."
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-surface-dark border border-border-light dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="text-sm font-medium text-text-secondary dark:text-gray-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">filter_list</span>
                                {filteredOrgs.length} resultado{filteredOrgs.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border-light dark:border-gray-800">
                                            <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider">Organização</th>
                                            <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider">Plano</th>
                                            <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider">Data de Cadastro</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light dark:divide-gray-800">
                                        {orgsLoading ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
                                                </td>
                                            </tr>
                                        ) : filteredOrgs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12 text-sm text-text-secondary dark:text-gray-500">
                                                    Nenhuma organização encontrada.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOrgs.map((org: any) => (
                                                <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-extrabold uppercase flex-shrink-0">
                                                                {org.name.substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-text-main dark:text-white">{org.name}</p>
                                                                <p className="text-xs text-text-secondary dark:text-gray-500 font-mono">
                                                                    {org.id.substring(0, 8)}...
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={clsx(
                                                            'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                            org.subscriptions?.[0]?.status === 'active'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : org.subscriptions?.[0]?.status === 'trialing'
                                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        )}>
                                                            {org.subscriptions?.[0]?.status === 'active' ? 'Ativo'
                                                                : org.subscriptions?.[0]?.status === 'trialing' ? 'Trial'
                                                                    : org.subscriptions?.[0]?.status || 'Sem assinatura'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-semibold text-text-main dark:text-white">
                                                            {org.subscriptions?.[0]?.plan_id ? 'Profissional' : 'Social'}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-text-secondary dark:text-gray-400 font-medium">
                                                        {new Date(org.created_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-secondary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white">
                                                            <span className="material-symbols-outlined text-lg">more_horiz</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {(plans || []).map((plan: any) => (
                                <div key={plan.id} className="rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 p-6">
                                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-1">{plan.name}</h3>
                                    <p className="text-xs text-text-secondary dark:text-gray-400 mb-4">{plan.description || 'Sem descrição'}</p>
                                    <div className="flex items-baseline gap-1 mb-5">
                                        <span className="text-3xl font-extrabold text-text-main dark:text-white">
                                            R$ {plan.price_monthly.toFixed(2).replace('.', ',')}
                                        </span>
                                        <span className="text-sm text-text-secondary dark:text-gray-400 font-medium">/mês</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between py-2 border-t border-border-light dark:border-gray-800">
                                            <span className="text-text-secondary dark:text-gray-400">Máx. acolhidos</span>
                                            <span className="font-bold text-text-main dark:text-white">{plan.max_children || '∞'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-t border-border-light dark:border-gray-800">
                                            <span className="text-text-secondary dark:text-gray-400">Máx. usuários</span>
                                            <span className="font-bold text-text-main dark:text-white">{plan.max_users || '∞'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!plans || plans.length === 0) && !orgsLoading && (
                                <div className="md:col-span-3 text-center py-12 text-sm text-text-secondary dark:text-gray-500">
                                    Nenhum plano cadastrado ainda.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
