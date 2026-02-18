import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import { AddProfessionalModal } from '../components/settings/AddProfessionalModal';

interface OrgData {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    cep: string;
    cnpj: string;
    responsible_name: string;
    capacity: string;
}

export function UnitSettings() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'unit' | 'team'>('unit');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [form, setForm] = useState<OrgData>({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        cep: '',
        cnpj: '',
        responsible_name: '',
        capacity: '',
    });

    const [stats, setStats] = useState({ children: 0, staff: 0 });
    const [team, setTeam] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    async function loadData() {
        if (!profile?.organization_id) { setLoading(false); return; }

        // Load organization data
        const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile!.organization_id!)
            .single();

        if (org) {
            setForm({
                name: org.name || '',
                phone: (org as any).phone || '',
                email: (org as any).email || '',
                address: (org as any).address || '',
                city: (org as any).city || '',
                state: (org as any).state || '',
                cep: (org as any).cep || '',
                cnpj: (org as any).cnpj || '',
                responsible_name: (org as any).responsible_name || '',
                capacity: (org as any).capacity?.toString() || '',
            });
        }

        // Load team members
        const { data: teamData } = await supabase
            .from('profiles')
            .select('*')
            .eq('organization_id', profile!.organization_id!);

        if (teamData) setTeam(teamData);

        // Load pending invites
        const { data: inviteData } = await supabase
            .from('invites')
            .select('*')
            .eq('organization_id', profile!.organization_id!)
            .eq('status', 'pending');

        if (inviteData) setInvites(inviteData);

        // Count children and staff
        const { count: childrenCount } = await supabase
            .from('children')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', profile!.organization_id!);

        const { count: staffCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', profile!.organization_id!);

        setStats({
            children: childrenCount || 0,
            staff: staffCount || 0,
        });

        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, [profile?.organization_id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.organization_id) return;
        setSaving(true);
        setSaved(false);

        const { error } = await supabase
            .from('organizations')
            .update({
                name: form.name,
            })
            .eq('id', profile.organization_id);

        setSaving(false);
        if (!error) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    const handleChange = (field: keyof OrgData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
        );
    }

    const fields: { label: string; key: keyof OrgData; type?: string; placeholder: string; span?: number; icon: string }[] = [
        { label: 'Nome da Unidade', key: 'name', placeholder: 'Ex: Casa Lar Esperança', span: 2, icon: 'home' },
        { label: 'Responsável Legal', key: 'responsible_name', placeholder: 'Nome completo', span: 2, icon: 'person' },
        { label: 'CNPJ', key: 'cnpj', placeholder: '00.000.000/0000-00', icon: 'badge' },
        { label: 'Capacidade de Acolhidos', key: 'capacity', type: 'number', placeholder: 'Ex: 20', icon: 'group' },
        { label: 'Telefone', key: 'phone', placeholder: '(00) 00000-0000', icon: 'call' },
        { label: 'E-mail', key: 'email', type: 'email', placeholder: 'contato@unidade.org', icon: 'mail' },
        { label: 'Endereço', key: 'address', placeholder: 'Rua, número, bairro', span: 2, icon: 'location_on' },
        { label: 'Cidade', key: 'city', placeholder: 'Cidade', icon: 'location_city' },
        { label: 'Estado', key: 'state', placeholder: 'UF', icon: 'map' },
        { label: 'CEP', key: 'cep', placeholder: '00000-000', icon: 'pin_drop' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-400">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Configurações da Unidade</h1>
                <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                    Gerencie as informações da sua casa de acolhimento.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { icon: 'child_care', label: 'Acolhidos ativos', value: stats.children, color: 'text-primary bg-primary/10' },
                    { icon: 'groups', label: 'Membros da equipe', value: stats.staff, color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' },
                    { icon: 'verified', label: 'Status do plano', value: 'Ativo', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
                ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800">
                        <div className={`size-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                            <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary dark:text-gray-500 font-medium">{stat.label}</p>
                            <p className="text-lg font-extrabold text-text-main dark:text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('unit')}
                    className={clsx(
                        "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                        activeTab === 'unit'
                            ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                            : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                    )}
                >
                    <span className="material-symbols-outlined text-lg">corporate_fare</span>
                    Unidade
                </button>
                <button
                    onClick={() => setActiveTab('team')}
                    className={clsx(
                        "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                        activeTab === 'team'
                            ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                            : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                    )}
                >
                    <span className="material-symbols-outlined text-lg">groups</span>
                    Profissionais
                </button>
            </div>

            {activeTab === 'unit' ? (
                <>
                    {/* Form Card */}
                    <form onSubmit={handleSave}>
                        <div className="rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 overflow-hidden shadow-sm">
                            <div className="px-6 py-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-lg">corporate_fare</span>
                                    </div>
                                    <h2 className="text-base font-bold text-text-main dark:text-white">Dados da Instituição</h2>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                {fields.map((field) => (
                                    <div key={field.key} className={field.span === 2 ? 'md:col-span-2' : ''}>
                                        <label className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                            {field.label}
                                        </label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">
                                                {field.icon}
                                            </span>
                                            <input
                                                type={field.type || 'text'}
                                                value={form[field.key]}
                                                onChange={(e) => handleChange(field.key, e.target.value)}
                                                placeholder={field.placeholder}
                                                className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-text-main dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Save footer */}
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    {saved && (
                                        <span className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                            Dados salvos com sucesso
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">save</span>
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Danger Zone */}
                    <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-surface-dark overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
                            <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">warning</span>
                                Zona de Perigo
                            </h3>
                        </div>
                        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-text-main dark:text-white">Excluir organização</p>
                                <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">Essa ação é irreversível. Todos os dados serão permanentemente apagados.</p>
                            </div>
                            <button className="px-5 py-2.5 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0">
                                Excluir Organização
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">groups</span>
                            Gestão da Equipe
                        </h2>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            Adicionar Profissional
                        </button>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-border-light dark:border-gray-800">
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Profissional</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Papel / Função</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light dark:divide-gray-800">
                                {/* Invites First */}
                                {invites.map((invite) => (
                                    <tr key={invite.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-colors group italic">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm border border-orange-200 dark:border-orange-800">
                                                    <span className="material-symbols-outlined text-sm">mail</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-main dark:text-white">{invite.full_name || 'Convite Pendente'}</p>
                                                    <p className="text-[11px] text-text-secondary dark:text-gray-400">{invite.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                                {invite.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                                                <span className="size-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                                Aguardando Cadastro
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-text-secondary hover:text-red-500 transition-colors" title="Cancelar Convite">
                                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {/* Active Team */}
                                {team.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {(member.full_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-main dark:text-white">{member.full_name || 'Usuário sem nome'}</p>
                                                    <p className="text-[11px] text-text-secondary dark:text-gray-400">{member.email || 'Sem e-mail'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                                                member.role === 'admin' || member.role === 'org_admin' || member.role === 'saas_admin'
                                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                                    : member.role === 'technician' || member.role === 'pedagogue'
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                            )}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">
                                                <span className="size-1.5 rounded-full bg-green-500"></span>
                                                Ativo
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-text-secondary hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                                </button>
                                                <button className="p-1.5 text-text-secondary hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AddProfessionalModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
}
