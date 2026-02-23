import { useState, useEffect } from 'react';
import clsx from 'clsx';
import type { Role } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PermissionAction {
    id: string;
    label: string;
    description: string;
}

interface PermissionModule {
    id: string;
    name: string;
    icon: string;
    actions: PermissionAction[];
}

const MODULES: PermissionModule[] = [
    {
        id: 'children',
        name: 'Acolhidos',
        icon: 'child_care',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Permite ver a lista e perfis dos acolhidos' },
            { id: 'create', label: 'Cadastrar', description: 'Permite registrar novos acolhidos' },
            { id: 'edit', label: 'Editar', description: 'Permite alterar dados de acolhidos existentes' },
            { id: 'delete', label: 'Excluir', description: 'Permite remover registros de acolhidos' },
            { id: 'export', label: 'Exportar', description: 'Permite baixar relatórios e planilhas' },
        ]
    },
    {
        id: 'health',
        name: 'Saúde e Medicações',
        icon: 'medical_services',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ver prontuários e medicações' },
            { id: 'administer', label: 'Administrar', description: 'Registrar aplicação de medicamentos' },
            { id: 'prescribe', label: 'Prescrever', description: 'Adicionar novas prescrições médicas' },
        ]
    },
    {
        id: 'psychology',
        name: 'Psicologia',
        icon: 'psychology',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ver registros psicológicos' },
            { id: 'create', label: 'Registrar', description: 'Adicionar novos atendimentos' },
            { id: 'edit_own', label: 'Editar Próprio', description: 'Editar apenas seus registros' },
        ]
    },
    {
        id: 'pedagogy',
        name: 'Pedagogia',
        icon: 'school',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ver registros pedagógicos' },
            { id: 'create', label: 'Registrar', description: 'Adicionar novas avaliações' },
        ]
    },
    {
        id: 'social',
        name: 'Assis. Social',
        icon: 'diversity_3',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ver prontuários sociais' },
            { id: 'create', label: 'Registrar', description: 'Adicionar relatórios sociais' },
        ]
    },
    {
        id: 'logbook',
        name: 'Diário de Turno',
        icon: 'edit_note',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ler ocorrências do diário' },
            { id: 'create', label: 'Registrar', description: 'Adicionar novas ocorrências' },
            { id: 'edit_own', label: 'Editar Próprio', description: 'Editar apenas seus próprios registros' },
        ]
    },
    {
        id: 'agenda',
        name: 'Agenda e Eventos',
        icon: 'calendar_month',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ver compromissos e calendários' },
            { id: 'create', label: 'Criar Evento', description: 'Adicionar novos compromissos' },
            { id: 'manage', label: 'Gerenciar', description: 'Editar e excluir eventos' },
        ]
    },
    {
        id: 'finance',
        name: 'Financeiro',
        icon: 'account_balance_wallet',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ver fluxo de caixa e relatórios' },
            { id: 'create', label: 'Registrar', description: 'Adicionar entradas e saídas' },
            { id: 'approve', label: 'Aprovar', description: 'Aprovar solicitações de verba' },
        ]
    },
    {
        id: 'inventory',
        name: 'Estoque',
        icon: 'inventory_2',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Consultar itens em estoque' },
            { id: 'manage', label: 'Gerenciar', description: 'Dar entrada e saída de itens' },
        ]
    },
    {
        id: 'operational',
        name: 'Operacional',
        icon: 'construction',
        actions: [
            { id: 'view', label: 'Visualizar', description: 'Ver registros operacionais' },
            { id: 'manage', label: 'Gerenciar', description: 'Controlar manutenção e estrutura' },
        ]
    }
];

const ROLES: { id: Role; label: string; icon: string }[] = [
    { id: 'admin', label: 'Gestor da Unidade', icon: 'admin_panel_settings' },
    { id: 'technical', label: 'Equipe Técnica', icon: 'psychology' },
    { id: 'pedagogue', label: 'Pedagogo(a)', icon: 'school' },
    { id: 'educator', label: 'Educador(a)', icon: 'person' },
    { id: 'operational', label: 'Operacional', icon: 'construction' },
];

export function PermissionsSettings() {
    const { profile, refreshPermissions } = useAuth();
    const [selectedRole, setSelectedRole] = useState<Role>('educator');
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load ALL permissions for the organization on mount
    useEffect(() => {
        async function loadAllPermissions() {
            if (!profile?.organization_id) return;
            setLoading(true);

            const { data, error } = await supabase
                .from('role_permissions')
                .select('*')
                .eq('organization_id', profile.organization_id);

            if (error) {
                console.error('Error loading permissions:', error);
            } else if (data) {
                const permMap: Record<string, boolean> = {};
                data.forEach(p => {
                    permMap[`${p.role}:${p.module}:${p.action}`] = p.enabled;
                });
                setPermissions(permMap);
            }
            setLoading(false);
        }

        loadAllPermissions();
    }, [profile?.organization_id]);

    const togglePermission = (moduleId: string, actionId: string) => {
        const key = `${selectedRole}:${moduleId}:${actionId}`;
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const toggleAllInModule = (moduleId: string) => {
        const module = MODULES.find(m => m.id === moduleId);
        if (!module) return;

        const allActive = module.actions.every(a => permissions[`${selectedRole}:${moduleId}:${a.id}`]);

        const newBatch: Record<string, boolean> = {};
        module.actions.forEach(a => {
            newBatch[`${selectedRole}:${moduleId}:${a.id}`] = !allActive;
        });

        setPermissions(prev => ({ ...prev, ...newBatch }));
    };

    const handleSave = async () => {
        if (!profile?.organization_id) return;
        setSaving(true);
        setSaved(false);

        try {
            // Prepare data for upsert
            const upsertData = Object.entries(permissions).map(([key, enabled]) => {
                const [role, module, action] = key.split(':');
                return {
                    organization_id: profile.organization_id,
                    role,
                    module,
                    action,
                    enabled,
                };
            });

            const { error } = await supabase
                .from('role_permissions')
                .upsert(upsertData, {
                    onConflict: 'organization_id,role,module,action'
                });

            if (error) throw error;

            setSaved(true);
            await refreshPermissions(); // Update global auth context
            setTimeout(() => setSaved(false), 3000);
        } catch (error: any) {
            console.error('Error saving permissions:', error);
            alert('Erro ao salvar permissões: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Roles Sidebar */}
                <div className="w-full lg:w-72 space-y-2">
                    <h3 className="text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest px-2 mb-4">Papeis do Sistema</h3>
                    {ROLES.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRole(role.id)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all border",
                                selectedRole === role.id
                                    ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                                    : "bg-white dark:bg-surface-dark border-border-light dark:border-gray-800 text-text-secondary dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700"
                            )}
                        >
                            <span className={clsx(
                                "material-symbols-outlined",
                                selectedRole === role.id ? "text-primary" : "text-gray-400"
                            )}>
                                {role.icon}
                            </span>
                            <span className="font-bold text-sm">{role.label}</span>
                            {selectedRole === role.id && (
                                <span className="ml-auto size-2 rounded-full bg-primary animate-pulse"></span>
                            )}
                        </button>
                    ))}

                    <div className="mt-8 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                        <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                            <span className="font-bold block mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Dica do sistema
                            </span>
                            As alterações feitas aqui afetam todos os usuários com o papel <strong>{ROLES.find(r => r.id === selectedRole)?.label}</strong> imediatamente.
                        </p>
                    </div>
                </div>

                {/* Permissions Grid */}
                <div className="flex-1 space-y-4">
                    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                            <div>
                                <h3 className="text-sm font-bold text-text-main dark:text-white">Permissões para {ROLES.find(r => r.id === selectedRole)?.label}</h3>
                                <p className="text-[11px] text-text-secondary dark:text-gray-400 mt-0.5">Defina o que este papel pode acessar e realizar no sistema.</p>
                            </div>
                            <button className="text-xs font-bold text-primary hover:underline">Marcar todas</button>
                        </div>

                        <div className="divide-y divide-border-light dark:divide-gray-800">
                            {MODULES.map((module) => (
                                <div key={module.id} className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-secondary dark:text-gray-400">
                                                <span className="material-symbols-outlined text-lg">{module.icon}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-text-main dark:text-white">{module.name}</h4>
                                        </div>
                                        <button
                                            onClick={() => toggleAllInModule(module.id)}
                                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-2 py-1 rounded"
                                        >
                                            {module.actions.every(a => permissions[`${selectedRole}:${module.id}:${a.id}`]) ? 'Desmarcar Tudo' : 'Marcar Tudo'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pl-11">
                                        {module.actions.map((action) => {
                                            const isChecked = permissions[`${selectedRole}:${module.id}:${action.id}`] || false;
                                            return (
                                                <label
                                                    key={action.id}
                                                    className={clsx(
                                                        "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                                        isChecked
                                                            ? "bg-primary/5 border-primary/20"
                                                            : "bg-gray-50/30 dark:bg-gray-800/10 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                                    )}
                                                >
                                                    <div className="relative flex items-center h-5">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={isChecked}
                                                            onChange={() => togglePermission(module.id, action.id)}
                                                        />
                                                        <div className={clsx(
                                                            "size-5 rounded border-2 transition-all flex items-center justify-center",
                                                            isChecked
                                                                ? "bg-primary border-primary"
                                                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                                        )}>
                                                            {isChecked && (
                                                                <span className="material-symbols-outlined text-white text-sm font-bold">check</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className={clsx(
                                                            "text-[13px] font-bold leading-none",
                                                            isChecked ? "text-primary" : "text-text-main dark:text-white"
                                                        )}>
                                                            {action.label}
                                                        </p>
                                                        <p className="text-[11px] text-text-secondary dark:text-gray-500 mt-1 leading-tight">
                                                            {action.description}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        {saved && (
                            <span className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-right-4">
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                Permissões salvas com sucesso
                            </span>
                        )}
                        <button
                            onClick={() => window.location.reload()} // Simple discard
                            className="h-10 px-6 text-sm font-bold text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white transition-colors"
                        >
                            Descartar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="h-10 px-8 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">save</span>
                                    Salvar Permissões
                                </>
                            )}
                        </button>
                    </div>

                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
