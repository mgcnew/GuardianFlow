import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type TabId = 'overview' | 'organizations' | 'plans' | 'trials' | 'leads';

export function SuperAdmin() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const { profile, signOut } = useAuth();
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

    const { data: trials, refetch: refetchTrials } = useQuery({
        queryKey: ['admin-trials'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    organization:organizations!profiles_organization_id_fkey(*)
                `)
                .not('trial_expires_at', 'is', null)
                .order('trial_expires_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    const { data: demoInvites, refetch: refetchInvites } = useQuery({
        queryKey: ['admin-demo-invites'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invites')
                .select('*')
                .eq('role', 'org_admin')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: leads, refetch: refetchLeads } = useQuery({
        queryKey: ['admin-leads'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('demo_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const handleProcessLead = async (lead: any) => {
        setInviteEmail(lead.email);
        setInviteName(lead.full_name);
        setActiveTab('trials');
        // Optional: mark lead as approved/processed
        await supabase.from('demo_requests').update({ status: 'approved' }).eq('id', lead.id);
        refetchLeads();
    };

    const handleDeleteLead = async (id: string) => {
        if (!confirm('Deseja excluir esta solicitação?')) return;
        const { error } = await supabase.from('demo_requests').delete().eq('id', id);
        if (error) alert('Erro ao deletar');
        else refetchLeads();
    };

    const activeOrgs = orgs?.filter(o => o.subscriptions?.[0]?.status === 'active').length || 0;
    const totalOrgs = orgs?.length || 0;

    const filteredOrgs = orgs?.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || !inviteName) return;

        setIsInviting(true);
        try {
            // 1. Get Demo Org ID
            const { data: demoOrg } = await supabase
                .from('organizations')
                .select('id')
                .eq('is_demo', true)
                .single();

            if (!demoOrg) throw new Error('Unidade de demonstração não configurada.');

            // 2. Create Invite
            const { error } = await supabase
                .from('invites')
                .insert({
                    email: inviteEmail,
                    full_name: inviteName,
                    role: 'org_admin',
                    organization_id: demoOrg.id,
                    created_by: profile?.id
                });

            if (error) throw error;

            setInviteEmail('');
            setInviteName('');
            refetchInvites();
            alert('Convite de demonstração enviado com sucesso!');
        } catch (error: any) {
            console.error('Erro ao convidar:', error);
            alert(error.message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleDeleteInvite = async (id: string) => {
        if (!confirm('Deseja cancelar este convite?')) return;
        const { error } = await supabase.from('invites').delete().eq('id', id);
        if (error) alert('Erro ao deletar');
        else refetchInvites();
    };

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
        { id: 'organizations', label: 'Organizações', icon: 'corporate_fare' },
        { id: 'plans', label: 'Planos', icon: 'payments' },
        { id: 'trials', label: 'Demos Ativas', icon: 'timer' },
        { id: 'leads', label: 'Leads / Interesses', icon: 'contact_mail' },
    ];

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
            {/* Top Header */}
            <header className="bg-white dark:bg-surface-dark border-b border-border-light dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" className="h-10 md:h-12 w-auto" />
                        <div className="flex flex-col">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Painel SaaS</p>
                            <p className="text-xs font-bold text-text-main dark:text-white">Admin Master</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">dashboard</span>
                            Ir para o Dashboard
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-semibold text-text-secondary dark:text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">logout</span>
                            Sair
                        </button>
                    </div>
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
                                            <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider">Usuários</th>
                                            <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider">Cadastro</th>
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
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[16px] text-text-secondary">group</span>
                                                            <span className="text-sm font-bold text-text-main dark:text-white">--</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-text-secondary dark:text-gray-400 font-medium">
                                                        {new Date(org.created_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={async () => {
                                                                    const { error } = await supabase
                                                                        .from('organizations')
                                                                        .update({ is_demo: !org.is_demo })
                                                                        .eq('id', org.id);
                                                                    if (error) alert('Erro ao atualizar');
                                                                    else window.location.reload(); // Simple refresh to update state
                                                                }}
                                                                className={clsx(
                                                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                                    org.is_demo
                                                                        ? "bg-primary text-white"
                                                                        : "bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                )}
                                                                title={org.is_demo ? "Desativar modo Demo" : "Ativar modo Demo"}
                                                            >
                                                                {org.is_demo ? 'É Demo' : 'Set Demo'}
                                                            </button>
                                                            <button className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-primary hover:text-white transition-all">
                                                                <span className="material-symbols-outlined text-lg">more_horiz</span>
                                                            </button>
                                                        </div>
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
                {activeTab === 'trials' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Invite Form */}
                        <div className="lg:col-span-1 border border-primary/20 bg-primary/5 rounded-[32px] p-8">
                            <h3 className="text-xl font-black text-text-main dark:text-white mb-2">Convidar para Demo</h3>
                            <p className="text-sm text-text-secondary dark:text-gray-400 mb-6 font-medium">
                                O convidado terá acesso de **Gestor (org_admin)** à unidade de demonstração por 7 dias.
                            </p>

                            <form onSubmit={handleSendInvite} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        value={inviteName}
                                        onChange={e => setInviteName(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
                                    <input
                                        required
                                        type="email"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-border-light dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <button
                                    disabled={isInviting}
                                    className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                                >
                                    {isInviting ? 'Enviando...' : 'Gerar Convite de 7 Dias'}
                                </button>
                            </form>
                        </div>

                        {/* Recent Trials List */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="rounded-[32px] bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 overflow-hidden shadow-sm">
                                <div className="px-8 py-6 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-lg font-black text-text-main dark:text-white">Demos Ativas</h3>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => refetchTrials()}
                                            className="text-text-secondary hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">refresh</span>
                                            Atualizar
                                        </button>
                                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase">7 Dias Máx.</span>
                                    </div>
                                </div>
                                <div className="divide-y divide-border-light dark:divide-gray-800">
                                    {trials?.length === 0 ? (
                                        <div className="px-8 py-12 text-center text-text-secondary dark:text-gray-500 font-medium">
                                            Nenhum teste ativo no momento.
                                        </div>
                                    ) : (
                                        trials?.map((trial: any) => {
                                            const daysLeft = Math.ceil((new Date(trial.trial_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            return (
                                                <div key={trial.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-text-secondary dark:text-gray-400">
                                                            <span className="material-symbols-outlined">person</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-text-main dark:text-white leading-tight">{trial.full_name}</p>
                                                            <p className="text-xs text-text-secondary dark:text-gray-500 font-medium">{trial.email || 'Usuário Trial'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={clsx(
                                                            "text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest",
                                                            daysLeft > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                        )}>
                                                            {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Expirado'}
                                                        </span>
                                                        <p className="text-[10px] text-text-secondary dark:text-gray-500 mt-1 font-bold">Expira: {new Date(trial.trial_expires_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Pending Invites */}
                            <div className="rounded-[32px] bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 overflow-hidden shadow-sm">
                                <div className="px-8 py-6 border-b border-border-light dark:border-gray-800">
                                    <h3 className="text-lg font-black text-text-main dark:text-white">Convites Pendentes</h3>
                                </div>
                                <div className="divide-y divide-border-light dark:divide-gray-800">
                                    {(demoInvites || []).filter((inv: any) => inv.status === 'pending').length === 0 ? (
                                        <div className="px-8 py-12 text-center text-text-secondary dark:text-gray-500 font-medium">
                                            Nenhum convite pendente.
                                        </div>
                                    ) : (
                                        (demoInvites || []).filter((inv: any) => inv.status === 'pending').map((invite: any) => (
                                            <div key={invite.id} className="px-8 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all">
                                                <div>
                                                    <p className="text-sm font-black text-text-main dark:text-white">{invite.full_name}</p>
                                                    <p className="text-xs text-text-secondary dark:text-gray-500 font-mono">{invite.email}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteInvite(invite.id)}
                                                    className="size-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'leads' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-black text-text-main dark:text-white uppercase tracking-tight">Novas Solicitações</h3>
                                <p className="text-sm text-text-secondary dark:text-gray-400 font-medium leading-none mt-1">Contatos interessados na demonstração via Landing Page.</p>
                            </div>
                            <button
                                onClick={() => refetchLeads()}
                                className="size-11 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 flex items-center justify-center text-text-secondary hover:text-primary transition-all shadow-sm active:scale-95"
                            >
                                <span className="material-symbols-outlined">refresh</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {leads?.length === 0 ? (
                                <div className="bg-white dark:bg-surface-dark rounded-[32px] p-20 border border-border-light dark:border-gray-800 text-center shadow-sm">
                                    <div className="size-20 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-text-secondary">
                                        <span className="material-symbols-outlined text-4xl">inbox_customize</span>
                                    </div>
                                    <p className="text-lg font-black text-text-main dark:text-white uppercase tracking-wide">Caixa de entrada vazia</p>
                                    <p className="text-sm text-text-secondary dark:text-gray-500 font-medium mt-2 max-w-xs mx-auto leading-relaxed">
                                        Assim que alguém solicitar uma demonstração no site, os dados aparecerão aqui em tempo real.
                                    </p>
                                </div>
                            ) : (
                                leads?.map((lead: any) => (
                                    <div key={lead.id} className="bg-white dark:bg-surface-dark rounded-[32px] p-8 border border-border-light dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden relative">
                                        {lead.status === 'pending' && (
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
                                        )}

                                        <div className="flex items-start gap-6">
                                            <div className="size-16 rounded-[24px] bg-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                                <span className="material-symbols-outlined text-4xl">contact_page</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-xl font-black text-text-main dark:text-white tracking-tight leading-none uppercase">{lead.full_name}</h4>
                                                    {lead.status === 'pending' && (
                                                        <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">Pendente</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                                                    <span className="flex items-center gap-2 text-[13px] text-text-secondary dark:text-gray-400 font-bold">
                                                        <span className="material-symbols-outlined text-lg text-primary">mail</span>
                                                        {lead.email}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-[13px] text-text-secondary dark:text-gray-400 font-bold">
                                                        <span className="material-symbols-outlined text-lg text-primary">phone</span>
                                                        {lead.phone}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-[13px] text-text-secondary dark:text-gray-400 font-bold">
                                                        <span className="material-symbols-outlined text-lg text-primary">apartment</span>
                                                        {lead.institution}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] mt-2">
                                                    Registrado: {new Date(lead.created_at).toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 border-t md:border-t-0 pt-6 md:pt-0">
                                            <button
                                                onClick={() => handleDeleteLead(lead.id)}
                                                className="size-12 rounded-2xl hover:bg-red-50 hover:text-red-500 text-text-secondary dark:text-gray-500 transition-all flex items-center justify-center"
                                                title="Rejeitar solicitação"
                                            >
                                                <span className="material-symbols-outlined">delete_sweep</span>
                                            </button>
                                            <button
                                                onClick={() => handleProcessLead(lead)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 dark:bg-primary text-white rounded-[20px] font-black text-xs uppercase tracking-widest hover:brightness-110 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] group/btn"
                                            >
                                                <span>Liberar Acesso Demo</span>
                                                <span className="material-symbols-outlined text-xl transition-transform group-hover/btn:translate-x-1">rocket_launch</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
