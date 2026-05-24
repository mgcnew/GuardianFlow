import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileHeaderProps {
    child: any;
    activeTab: 'resumo' | 'prontuario' | 'saude' | 'documentos' | 'diario' | 'evolucao';
    setActiveTab: (tab: 'resumo' | 'prontuario' | 'saude' | 'documentos' | 'diario' | 'evolucao') => void;
    onEdit: () => void;
    onPrintPIA: () => void;
}

interface ProfileComponentProps {
    child: any;
}

const statusConfig = {
    active: { icon: 'check', bg: 'bg-emerald-500', label: 'Ativo' },
    urgent: { icon: 'warning', bg: 'bg-red-500', label: 'Urgente' },
    pending: { icon: 'schedule', bg: 'bg-amber-500', label: 'Pendente' },
};

const tabIcons: Record<string, string> = {
    resumo: 'person',
    diario: 'edit_note',
    evolucao: 'trending_up',
    prontuario: 'clinical_notes',
    saude: 'health_and_safety',
    documentos: 'description',
};

// ─── Shared card header ─────────────────────────────────────
function CardHeader({ icon, label, color = 'bg-primary/10 text-primary' }: { icon: string; label: string; color?: string }) {
    return (
        <div className="flex items-center gap-2.5 mb-4">
            <div className={clsx("size-8 rounded-xl flex items-center justify-center shrink-0", color)}>
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
            </div>
            <h2 className="text-[11px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest">{label}</h2>
        </div>
    );
}

// ─── Field pill used in data grids ──────────────────────────
function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-border-light dark:border-gray-800">
            <p className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className={clsx("text-xs font-bold text-text-main dark:text-white leading-snug truncate", mono && "font-mono")}>
                {value || <span className="text-text-secondary dark:text-gray-600 font-medium">—</span>}
            </p>
        </div>
    );
}

export function ProfileHeader({ child, activeTab, setActiveTab, onEdit, onPrintPIA }: ProfileHeaderProps) {
    const { profile } = useAuth();
    const age = child.date_of_birth
        ? Math.abs(new Date(Date.now() - new Date(child.date_of_birth).getTime()).getUTCFullYear() - 1970)
        : null;
    const sc = statusConfig[child.status as keyof typeof statusConfig] ?? statusConfig.active;

    const tabs = [
        { id: 'resumo', label: 'Resumo', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator', 'operational'] },
        { id: 'diario', label: 'Diário', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator', 'operational'] },
        { id: 'evolucao', label: 'Evolução', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue'] },
        { id: 'prontuario', label: 'Prontuário', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator', 'operational'] },
        { id: 'saude', label: 'Saúde', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator'] },
        { id: 'documentos', label: 'Documentos', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue'] },
    ].filter(tab => profile && (['saas_admin', 'admin', 'org_admin'].includes(profile.role) || tab.roles.includes(profile.role)));

    return (
        <div className="rounded-2xl bg-white dark:bg-surface-dark shadow-sm ring-1 ring-border-light dark:ring-gray-800 overflow-hidden">
            {/* Status stripe */}
            <div className={clsx("h-1 w-full", sc.bg)} />

            <div className="flex flex-col sm:flex-row gap-5 p-5 sm:p-6">
                {/* Photo */}
                <div className="shrink-0 relative self-center sm:self-start">
                    <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-2xl ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {child.photo_url ? (
                            <img className="h-full w-full object-cover" src={child.photo_url} alt={child.full_name} />
                        ) : (
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl">child_care</span>
                        )}
                    </div>
                    <div className={clsx(
                        "absolute -bottom-1 -right-1 h-6 w-6 sm:h-7 sm:w-7 rounded-lg ring-2 ring-white dark:ring-surface-dark flex items-center justify-center shadow-sm",
                        sc.bg
                    )}>
                        <span className="material-symbols-outlined text-white text-[12px] sm:text-[14px]">{sc.icon}</span>
                    </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between gap-4 text-center sm:text-left min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                            {child.status === 'urgent' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-full mb-1.5">
                                    <span className="material-symbols-outlined text-[11px]">priority_high</span>
                                    Prioridade Alta
                                </span>
                            )}
                            <h1 className="text-lg sm:text-2xl font-black text-text-main dark:text-white tracking-tight leading-tight truncate">
                                {child.full_name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                                {age !== null && (
                                    <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg text-[11px] font-bold text-text-secondary dark:text-gray-400">
                                        <span className="material-symbols-outlined text-[14px] text-primary">cake</span>
                                        {age} anos
                                    </span>
                                )}
                                <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg text-[11px] font-bold text-text-secondary dark:text-gray-400">
                                    <span className="material-symbols-outlined text-[14px] text-primary">calendar_today</span>
                                    {new Date(child.admission_date).toLocaleDateString('pt-BR')}
                                </span>
                                {child.unit && (
                                    <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg text-[11px] font-bold text-text-secondary dark:text-gray-400">
                                        <span className="material-symbols-outlined text-[14px] text-primary">domain</span>
                                        {child.unit}
                                    </span>
                                )}
                                <span className={clsx(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black uppercase",
                                    sc.bg === 'bg-emerald-500' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" :
                                    sc.bg === 'bg-red-500' ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                                    "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                )}>
                                    {sc.label}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={onEdit}
                                className="h-9 flex items-center gap-1.5 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-transparent px-3 text-[11px] font-black uppercase tracking-wider text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                <span className="hidden sm:inline">Editar</span>
                            </button>
                            <button
                                onClick={onPrintPIA}
                                className="h-9 flex items-center gap-1.5 rounded-xl bg-primary px-3 text-[11px] font-black uppercase tracking-wider text-white shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                <span className="hidden sm:inline">PIA</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-5 sm:px-6 py-3 border-t border-border-light dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
                <div className="flex items-center gap-0.5 p-1 bg-gray-100/60 dark:bg-gray-900/50 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-surface-dark text-primary shadow-sm"
                                    : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tabIcons[tab.id] || 'tab'}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function BioSummary({ child }: ProfileComponentProps) {
    const genderMap: Record<string, string> = { M: 'Masculino', F: 'Feminino', O: 'Outro' };
    const ethnicityMap: Record<string, string> = {
        branca: 'Branca', preta: 'Preta', parda: 'Parda',
        amarela: 'Amarela', indigena: 'Indígena', nao_declarado: 'Não declarado',
    };
    const legalStatusMap: Record<string, string> = {
        acolhimento_provisorio: 'Acolhimento Provisório',
        destituicao_familiar: 'Destituição Familiar',
        disponivel_adocao: 'Disponível p/ Adoção',
        em_processo_adocao: 'Em Processo de Adoção',
        reintegracao_familiar: 'Reintegração Familiar',
        guarda_provisoria: 'Guarda Provisória',
        tutela: 'Tutela',
    };

    return (
        <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 shadow-sm ring-1 ring-border-light dark:ring-gray-800">
            <CardHeader icon="menu_book" label="Motivo & Situação" />

            <p className="text-sm text-text-secondary dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-border-light dark:border-gray-800 italic">
                "{child.reason_for_admission || 'Nenhum motivo de acolhimento detalhado no momento.'}"
            </p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Field label="Sexo" value={genderMap[child.gender] ?? child.gender} />
                <Field label="Etnia / Raça" value={ethnicityMap[child.ethnicity] ?? child.ethnicity} />
                <Field label="Religião" value={child.religion} />
                <Field label="Situação Legal" value={legalStatusMap[child.legal_status] ?? child.legal_status} />
                <Field label="Processo Judicial" value={child.judicial_process} mono />
                <Field label="Escolaridade" value={child.schooling} />
            </div>
        </div>
    );
}

export function FamilyContacts({ child }: ProfileComponentProps) {
    const relationshipMap: Record<string, string> = {
        mae: 'Mãe', pai: 'Pai', avo: 'Avó / Avô', tio: 'Tio(a)',
        irmao: 'Irmão(ã)', padrinho: 'Padrinho / Madrinha',
        tutor: 'Tutor Legal', outro: 'Outro', nenhum: 'Nenhum identificado',
    };

    return (
        <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 shadow-sm ring-1 ring-border-light dark:ring-gray-800">
            <CardHeader icon="family_history" label="Família & Responsável" color="bg-indigo-500/10 text-indigo-500" />

            <div className="space-y-2">
                {/* Mother */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="size-9 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-indigo-400 shadow-sm shrink-0 border border-border-light dark:border-gray-700">
                        <span className="material-symbols-outlined text-[18px]">female</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">Mãe</p>
                        <p className="text-xs font-bold text-text-main dark:text-white truncate">{child.mother_name || 'Desconhecida'}</p>
                    </div>
                </div>

                {/* Father */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="size-9 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-blue-400 shadow-sm shrink-0 border border-border-light dark:border-gray-700">
                        <span className="material-symbols-outlined text-[18px]">male</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">Pai</p>
                        <p className="text-xs font-bold text-text-main dark:text-white truncate">{child.father_name || 'Desconhecido'}</p>
                    </div>
                </div>

                {/* Legal guardian */}
                {child.legal_guardian_name && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="size-9 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-purple-400 shadow-sm shrink-0 border border-border-light dark:border-gray-700">
                            <span className="material-symbols-outlined text-[18px]">shield_person</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">
                                Responsável Legal {child.legal_guardian_relationship ? `— ${relationshipMap[child.legal_guardian_relationship] ?? child.legal_guardian_relationship}` : ''}
                            </p>
                            <p className="text-xs font-bold text-text-main dark:text-white truncate">{child.legal_guardian_name}</p>
                        </div>
                        {child.legal_guardian_phone && (
                            <a
                                href={`tel:${child.legal_guardian_phone}`}
                                className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0"
                            >
                                <span className="material-symbols-outlined text-[16px]">call</span>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function HealthOverview({ child }: ProfileComponentProps) {
    const vaccineMap: Record<string, string> = {
        up_to_date: 'Em dia',
        delayed: 'Atrasada',
        unknown: 'Desconhecido',
    };
    const disabilityMap: Record<string, string> = {
        physical: 'Física', intellectual: 'Intelectual', visual: 'Visual',
        hearing: 'Auditiva', autistic_spectrum: 'TEA', multiple: 'Múltipla',
    };

    return (
        <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 shadow-sm ring-1 ring-border-light dark:ring-gray-800">
            <CardHeader icon="health_and_safety" label="Saúde" color="bg-red-500/10 text-red-500" />

            <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[9px] font-black uppercase text-red-500 tracking-widest mb-1">Alergias</p>
                    <p className="text-xs font-bold text-red-900 dark:text-red-300">{child.allergies || 'Nenhuma alergia relatada.'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest mb-1">Medicação Contínua</p>
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-300">{child.medications || 'Sem medicação em uso.'}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Field label="Tipo Sanguíneo" value={child.blood_type || 'Desconhecido'} />
                    <Field label="Cartão SUS" value={child.sus_card} mono />
                    <Field
                        label="Vacinação"
                        value={vaccineMap[child.vaccination_status] ?? child.vaccination_status}
                    />
                    <Field label="Tam. Roupa" value={child.clothes_size} />
                    <Field label="Tam. Calçado" value={child.shoes_size} />
                    {child.has_disability && (
                        <Field label="Deficiência" value={disabilityMap[child.disability_type] ?? 'Sim'} />
                    )}
                </div>

                {child.health_info && (
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-border-light dark:border-gray-800">
                        <p className="text-[9px] font-black uppercase text-text-secondary dark:text-gray-500 tracking-widest mb-1">Observações de Saúde</p>
                        <p className="text-xs text-text-secondary dark:text-gray-400 leading-relaxed">{child.health_info}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export function RecentDocuments() {
    return (
        <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 shadow-sm ring-1 ring-border-light dark:ring-gray-800">
            <CardHeader icon="description" label="Prontuário" color="bg-purple-500/10 text-purple-500" />
            <div className="space-y-2">
                {[
                    { name: 'Guia de Acolhimento.pdf', type: 'PDF' },
                    { name: 'Histórico de Saúde.pdf', type: 'PDF' },
                    { name: 'Documento de Identificação.jpg', type: 'IMG' },
                ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all border border-transparent hover:border-border-light dark:hover:border-gray-700 group cursor-pointer">
                        <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors text-[18px]">description</span>
                            <span className="text-xs font-bold text-text-main dark:text-gray-200 truncate max-w-[150px]">{doc.name}</span>
                        </div>
                        <span className="text-[9px] font-black text-text-secondary dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{doc.type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function QuickNote() {
    return (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 p-4 shadow-sm ring-1 ring-amber-400/20 dark:ring-amber-500/20">
            <div className="flex items-center gap-2.5 mb-3">
                <div className="size-8 rounded-xl bg-amber-400/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]">push_pin</span>
                </div>
                <h2 className="text-[11px] font-black text-amber-900 dark:text-amber-500 uppercase tracking-widest">Anotação Fixada</h2>
            </div>
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                O acolhido demonstra grande facilidade com desenhos. Considerar matriculá-lo na oficina de artes da prefeitura.
            </p>
            <div className="mt-3 flex justify-between items-center bg-amber-100/50 dark:bg-amber-900/40 p-2.5 rounded-lg">
                <span className="text-[9px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest">Coordenadora Sarah</span>
                <span className="text-[9px] font-bold text-amber-700/60 dark:text-amber-500/60">Há 2 dias</span>
            </div>
        </div>
    );
}

// ─── Quick alert flags for the sidebar ──────────────────────
export function AlertFlags({ child }: ProfileComponentProps) {
    const emotionalMap: Record<string, string> = {
        calm: 'Calmo(a)', anxious: 'Ansioso(a)', aggressive: 'Agressivo(a)',
        withdrawn: 'Retraído(a)', scared: 'Assustado(a)', crying: 'Chorando',
        apathetic: 'Apático(a)', confused: 'Confuso(a)',
    };
    const psychMap: Record<string, string> = {
        stable: 'Estável', under_treatment: 'Em tratamento',
        needs_evaluation: 'Necessita avaliação', crisis: 'Em crise',
    };
    const vaccineMap: Record<string, { label: string; color: string }> = {
        up_to_date: { label: 'Vacinação em dia', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' },
        delayed: { label: 'Vacinação atrasada', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40' },
        unknown: { label: 'Vacinação desconhecida', color: 'bg-gray-50 dark:bg-gray-800/40 text-text-secondary dark:text-gray-400 border-border-light dark:border-gray-700' },
    };

    const flags: { label: string; icon: string; color: string }[] = [];

    if (child.has_disability) flags.push({ label: `Deficiência${child.disability_type ? ` — ${child.disability_type}` : ''}`, icon: 'accessibility_new', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40' });
    if (child.has_chronic_disease) flags.push({ label: `Doença crônica${child.chronic_disease_details ? ` — ${child.chronic_disease_details}` : ''}`, icon: 'monitor_heart', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/40' });
    if (child.is_pregnant) flags.push({ label: `Gestante${child.pregnancy_weeks ? ` — ${child.pregnancy_weeks} sem.` : ''}`, icon: 'pregnant_woman', color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800/40' });
    if (child.has_addictions) flags.push({ label: 'Uso de substâncias', icon: 'smoking_rooms', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40' });
    if (child.has_suicidal_ideation) flags.push({ label: 'Ideação suicida', icon: 'crisis_alert', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40' });
    if (child.has_self_harm) flags.push({ label: 'Automutilação', icon: 'warning', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40' });

    const vaccine = vaccineMap[child.vaccination_status as string];

    return (
        <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 shadow-sm ring-1 ring-border-light dark:ring-gray-800">
            <CardHeader icon="emergency" label="Sinalizações" color="bg-rose-500/10 text-rose-500" />

            {flags.length === 0 && !child.psychological_status && !child.initial_emotional_state && !vaccine ? (
                <p className="text-xs text-text-secondary dark:text-gray-500 font-medium">Nenhuma sinalização registrada.</p>
            ) : (
                <div className="space-y-1.5">
                    {flags.map((f, i) => (
                        <div key={i} className={clsx("flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-bold", f.color)}>
                            <span className="material-symbols-outlined text-[14px] shrink-0">{f.icon}</span>
                            <span className="leading-snug">{f.label}</span>
                        </div>
                    ))}

                    {vaccine && (
                        <div className={clsx("flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-bold", vaccine.color)}>
                            <span className="material-symbols-outlined text-[14px] shrink-0">vaccines</span>
                            {vaccine.label}
                        </div>
                    )}

                    {child.initial_emotional_state && (
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-xs font-bold text-text-secondary dark:text-gray-400">
                            <span className="material-symbols-outlined text-[14px] shrink-0">sentiment_neutral</span>
                            Estado: {emotionalMap[child.initial_emotional_state] ?? child.initial_emotional_state}
                        </div>
                    )}

                    {child.psychological_status && (
                        <div className={clsx(
                            "flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-bold",
                            child.psychological_status === 'crisis'
                                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40"
                                : child.psychological_status === 'needs_evaluation'
                                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40"
                                    : "bg-gray-50 dark:bg-gray-800/40 text-text-secondary dark:text-gray-400 border-border-light dark:border-gray-700"
                        )}>
                            <span className="material-symbols-outlined text-[14px] shrink-0">psychology</span>
                            Psicológico: {psychMap[child.psychological_status] ?? child.psychological_status}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Legacy export kept for compatibility
export function DailySchedule() {
    return null;
}
