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

export function ProfileHeader({ child, activeTab, setActiveTab, onEdit, onPrintPIA }: ProfileHeaderProps) {
    const { profile } = useAuth();
    const age = child.date_of_birth ? Math.abs(new Date(Date.now() - new Date(child.date_of_birth).getTime()).getUTCFullYear() - 1970) : 'N/A';

    const tabs = [
        { id: 'resumo', label: 'Resumo', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator', 'operational'] },
        { id: 'diario', label: 'Diário', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator', 'operational'] },
        { id: 'evolucao', label: 'Evolução', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue'] },
        { id: 'prontuario', label: 'Prontuário', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator', 'operational'] },
        { id: 'saude', label: 'Saúde', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue', 'educator'] },
        { id: 'documentos', label: 'Documentos', roles: ['saas_admin', 'admin', 'org_admin', 'technical', 'technician', 'pedagogue'] }
    ].filter(tab => profile && (['saas_admin', 'admin', 'org_admin'].includes(profile.role) || tab.roles.includes(profile.role)));

    const tabIcons: Record<string, string> = {
        resumo: 'person',
        diario: 'edit_note',
        atendimentos: 'diversity_3',
        evolucao: 'trending_up',
        prontuario: 'clinical_notes',
        saude: 'health_and_safety',
        documentos: 'description',
    };

    return (
        <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800 overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 p-5 md:p-8">
                <div className="shrink-0 relative self-center md:self-start">
                    <div className="h-24 w-24 md:h-40 md:w-40 rounded-2xl md:rounded-[2.5rem] ring-4 md:ring-8 ring-gray-50 dark:ring-gray-800/50 shadow-inner overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {child.photo_url ? (
                            <img className="h-full w-full object-cover" src={child.photo_url} alt={child.full_name} />
                        ) : (
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl md:text-6xl">child_care</span>
                        )}
                    </div>
                    <div className={clsx(
                        "absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 h-7 w-7 md:h-10 md:w-10 rounded-xl md:rounded-2xl ring-2 md:ring-4 ring-white dark:ring-surface-dark flex items-center justify-center shadow-lg",
                        child.status === 'active' ? "bg-green-500" : child.status === 'urgent' ? "bg-red-500" : "bg-orange-500"
                    )}>
                        <span className="material-symbols-outlined text-white text-[14px] md:text-[20px]">
                            {child.status === 'active' ? 'check' : child.status === 'urgent' ? 'warning' : 'schedule'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-1 flex-col justify-center text-center md:text-left">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-1 md:mb-2">
                                {child.status === 'urgent' && (
                                    <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                                        Prioridade Alta
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl md:text-4xl font-black text-text-main dark:text-white font-display tracking-tight">{child.full_name}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 mt-2 md:mt-3 text-text-secondary dark:text-gray-400 font-display font-medium">
                                <p className="flex items-center gap-1 md:gap-1.5 bg-gray-50 dark:bg-gray-800 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-xs">
                                    <span className="material-symbols-outlined text-[16px] md:text-[18px] text-primary">cake</span> {age} anos
                                </p>
                                <p className="flex items-center gap-1 md:gap-1.5 bg-gray-50 dark:bg-gray-800 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-xs">
                                    <span className="material-symbols-outlined text-[16px] md:text-[18px] text-primary">calendar_today</span>
                                    <span className="hidden sm:inline">Admitido:</span> {new Date(child.admission_date).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="flex items-center gap-1 md:gap-1.5 bg-gray-50 dark:bg-gray-800 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-xs">
                                    <span className="material-symbols-outlined text-[16px] md:text-[18px] text-primary">location_on</span> {child.unit || 'Sem Unidade'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2 md:mt-0 w-full md:w-auto">
                            <button
                                onClick={onEdit}
                                className="h-10 flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-transparent px-4 text-[11px] md:text-xs font-black uppercase tracking-wider md:tracking-widest text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-display active:scale-95 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                <span className="hidden sm:inline">Editar Tudo</span>
                                <span className="sm:hidden">Editar</span>
                            </button>
                            <button
                                onClick={onPrintPIA}
                                className="h-10 flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[11px] md:text-xs font-black uppercase tracking-wider md:tracking-widest text-white shadow-sm hover:bg-primary/90 transition-all font-display active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                <span className="hidden sm:inline">Relatório PIA</span>
                                <span className="sm:hidden">PIA</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="px-5 md:px-8 py-4 bg-gray-50/30 dark:bg-gray-800/20 border-t border-border-light dark:border-gray-800">
                <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-900/40 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-surface-dark text-primary shadow-sm"
                                    : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                            )}
                        >
                            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{tabIcons[tab.id] || 'tab'}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}


export function BioSummary({ child }: ProfileComponentProps) {
    return (
        <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark p-5 md:p-8 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">menu_book</span>
                    </div>
                    <h2 className="text-xl font-black text-text-main dark:text-white font-display tracking-tight">Motivo & Situação</h2>
                </div>
            </div>
            <p className="text-text-secondary dark:text-gray-300 leading-relaxed font-display text-sm bg-gray-50 dark:bg-gray-800/40 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 italic">
                "{child.reason_for_admission || 'Nenhum motivo de acolhimento detalhado no momento.'}"
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/20 border border-border-light dark:border-gray-800">
                    <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-1 font-display">Escolaridade</p>
                    <p className="text-sm font-bold text-text-main dark:text-white font-display">{child.schooling || 'Não informada'}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/20 border border-border-light dark:border-gray-800">
                    <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-1 font-display">Processo Judicial</p>
                    <p className="text-sm font-bold text-primary font-display">{child.judicial_process || 'Em andamento'}</p>
                </div>
            </div>
        </div>
    )
}

export function FamilyContacts({ child }: ProfileComponentProps) {
    return (
        <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark p-5 md:p-8 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">family_history</span>
                    </div>
                    <h2 className="text-xl font-black text-text-main dark:text-white font-display tracking-tight">Família Biológica</h2>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-indigo-500 shadow-sm">
                            <span className="material-symbols-outlined">female</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest font-display">Mãe</p>
                            <p className="text-base font-bold text-text-main dark:text-white font-display">{child.mother_name || 'Desconhecida'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-blue-500 shadow-sm">
                            <span className="material-symbols-outlined">male</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest font-display">Pai</p>
                            <p className="text-base font-bold text-text-main dark:text-white font-display">{child.father_name || 'Desconhecido'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function DailySchedule() {
    return (
        <div className="rounded-3xl bg-white dark:bg-surface-dark p-8 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">history</span>
                    </div>
                    <h2 className="text-xl font-black text-text-main dark:text-white font-display tracking-tight">Rotina & Evolução</h2>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 font-display">Abrir Diário</button>
            </div>

            <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-10">
                <div className="relative">
                    <div className="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-4 border-white dark:border-surface-dark bg-gray-300 dark:bg-gray-700"></div>
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-1 font-display">Manhã</p>
                        <p className="text-sm font-bold text-text-main dark:text-white font-display">Frequência Escolar: Regular</p>
                        <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 font-display">Sem intercorrências registradas pelo transporte.</p>
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-4 border-white dark:border-surface-dark bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 font-display">15:00 • Agora</p>
                        <p className="text-sm font-bold text-text-main dark:text-white font-display">Atendimento Psicológico</p>
                        <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 font-display">Sessão semanal com Dra. Mariana.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function HealthOverview({ child }: ProfileComponentProps) {
    return (
        <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark p-5 md:p-8 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
            <div className="flex items-center gap-3 mb-8">
                <div className="size-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">health_and_safety</span>
                </div>
                <h2 className="text-xl font-black text-text-main dark:text-white font-display tracking-tight">Saúde</h2>
            </div>

            <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] mb-2 font-display">Alergias Críticas</p>
                    <p className="text-sm font-bold text-red-900 dark:text-red-300 font-display">{child.allergies || 'Nenhuma alergia relatada.'}</p>
                </div>

                <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-2 font-display">Medicação Contínua</p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300 font-display">{child.medications || 'Sem medicação em uso.'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl md:rounded-2xl text-center">
                        <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase mb-1 font-display">Tamanho Roupa</p>
                        <p className="text-base font-bold text-text-main dark:text-white font-display">{child.clothes_size || '--'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl md:rounded-2xl text-center">
                        <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase mb-1 font-display">Calçado</p>
                        <p className="text-base font-bold text-text-main dark:text-white font-display">{child.shoes_size || '--'}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function RecentDocuments() {
    return (
        <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark p-4 md:p-8 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">description</span>
                    </div>
                    <h2 className="text-xl font-black text-text-main dark:text-white font-display tracking-tight">Prontuário</h2>
                </div>
                <button className="material-symbols-outlined text-text-secondary dark:text-gray-500 hover:text-primary transition-colors">add_circle</button>
            </div>
            <div className="space-y-3">
                {[
                    { name: 'Guia de Acolhimento.pdf', type: 'PDF' },
                    { name: 'Histórico de Saúde.pdf', type: 'PDF' },
                    { name: 'Documento de Identificação.jpg', type: 'IMG' },
                ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all border border-transparent hover:border-border-light dark:hover:border-gray-700 group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors">description</span>
                            <span className="text-xs font-bold text-text-main dark:text-gray-200 font-display truncate max-w-[150px]">{doc.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-text-secondary dark:text-gray-500">{doc.type}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function QuickNote() {
    return (
        <div className="rounded-2xl md:rounded-3xl bg-yellow-50 dark:bg-yellow-900/10 p-4 md:p-8 shadow-xl shadow-yellow-500/5 ring-1 ring-yellow-400/20 dark:ring-yellow-500/20">
            <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-2xl bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 flex items-center justify-center">
                    <span className="material-symbols-outlined">push_pin</span>
                </div>
                <h2 className="text-sm font-black text-yellow-900 dark:text-yellow-500 uppercase tracking-widest font-display">Anotação Fixada</h2>
            </div>
            <p className="text-base font-medium text-yellow-900 dark:text-yellow-200 leading-snug font-display">
                O acolhido demonstra grande facilidade com desenhos. Considerar matriculá-lo na oficina de artes da prefeitura.
            </p>
            <div className="mt-6 flex justify-between items-center bg-yellow-100/50 dark:bg-yellow-900/40 p-3 rounded-xl">
                <span className="text-[10px] font-black text-yellow-800 dark:text-yellow-500 uppercase tracking-widest font-display">Coordenadora Sarah</span>
                <span className="text-[10px] font-bold text-yellow-700/60 dark:text-yellow-500/60 font-display">Há 2 dias</span>
            </div>
        </div>
    )
}
