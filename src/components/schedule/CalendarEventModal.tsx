import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import clsx from 'clsx';
import { createNotification } from '../../lib/notifications';
import { useLogger } from '../../hooks/useLogger';
import { useToast } from '../../contexts/ToastContext';


interface CalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
    eventToEdit?: any;
    initialProfessionalId?: string;
    initialType?: string;
}

// Event types with metadata
const EVENT_TYPES = [
    {
        id: 'medical',
        label: 'Consulta Médica',
        icon: 'local_hospital',
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        requiresChild: true,
        description: 'Consultas, exames e atendimentos médicos',
        outcomeFields: ['prescriptions', 'medications', 'recommendations']
    },
    {
        id: 'vaccine',
        label: 'Vacinação',
        icon: 'vaccines',
        color: 'text-green-600',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        requiresChild: true,
        description: 'Aplicação de vacinas e imunizações',
        outcomeFields: ['medications', 'recommendations', 'reactions']
    },
    {
        id: 'school',
        label: 'Escola / Pedagógico',
        icon: 'school',
        color: 'text-purple-600',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        requiresChild: false,
        description: 'Atividades escolares e pedagógicas',
        outcomeFields: ['behavior', 'participation']
    },
    {
        id: 'outing',
        label: 'Passeio / Lazer',
        icon: 'park',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        requiresChild: false,
        description: 'Passeios, atividades recreativas e lazer',
        outcomeFields: ['behavior', 'incidents']
    },
    {
        id: 'meeting',
        label: 'Reunião',
        icon: 'groups',
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800',
        requiresChild: false,
        description: 'Reuniões de equipe, família ou institucionais',
        outcomeFields: ['notes']
    },
    {
        id: 'other',
        label: 'Outro',
        icon: 'event',
        color: 'text-gray-600',
        bg: 'bg-gray-50 dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
        requiresChild: false,
        description: 'Outros eventos e compromissos',
        outcomeFields: ['notes']
    },
];

const PRIORITY_OPTIONS = [
    { id: 'low', label: 'Baixa', color: 'text-gray-500', dot: 'bg-gray-400' },
    { id: 'normal', label: 'Normal', color: 'text-blue-600', dot: 'bg-blue-500' },
    { id: 'high', label: 'Alta', color: 'text-orange-600', dot: 'bg-orange-500' },
    { id: 'urgent', label: 'Urgente', color: 'text-red-600', dot: 'bg-red-500' },
];

export function CalendarEventModal({ isOpen, onClose, selectedDate, eventToEdit, initialProfessionalId, initialType }: CalendarEventModalProps) {
    const { profile } = useAuth();
    const { logAction } = useLogger();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [step, setStep] = useState<1 | 2 | 3>(1); // Step 3 represents "Outcome/Completion" mode
    const [activeTab, setActiveTab] = useState<'details' | 'outcome'>('details');
    const [isSuccess, setIsSuccess] = useState(false);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        notes: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        type: 'other',
        location: '',
        child_id: '',
        professional_id: '',
        priority: 'normal',
        is_all_day: false,
        for_all_children: false,
        status: 'scheduled',
        outcome_details: {
            prescriptions: '',
            medications: '',
            recommendations: '',
            behavior: '',
            incidents: '',
            notes: '',
        },
        log_child_id: '', // For logging specific child events in general activities
    });

    // Fetch children for selection
    const { data: children } = useQuery({
        queryKey: ['children-for-event'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('children')
                .select('id, full_name, photo_url, status')
                .eq('organization_id', profile?.organization_id)
                .order('full_name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id && isOpen,
    });

    const filteredChildren = children?.filter(child =>
        child.full_name.toLowerCase().includes(childSearch.toLowerCase())
    ) || [];

    // Fetch professionals for assignment
    const { data: professionals } = useQuery({
        queryKey: ['professionals-for-event'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, specialty, role')
                .eq('organization_id', profile?.organization_id)
                .order('full_name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id && isOpen,
    });

    const selectedEventType = EVENT_TYPES.find(t => t.id === formData.type) || EVENT_TYPES[EVENT_TYPES.length - 1];

    useEffect(() => {
        if (!isOpen) {
            setIsSuccess(false);
            setStep(1);
            setActiveTab('details');
            setChildSearch('');
            setShowChildList(false);
            return;
        }

        if (eventToEdit) {
            const start = new Date(eventToEdit.start_time);
            const end = new Date(eventToEdit.end_time);
            const initialChild = children?.find(c => c.id === eventToEdit.child_id);

            setFormData({
                title: eventToEdit.title || '',
                description: eventToEdit.description || '',
                notes: eventToEdit.notes || '',
                start_date: format(start, 'yyyy-MM-dd'),
                start_time: format(start, 'HH:mm'),
                end_date: format(end, 'yyyy-MM-dd'),
                end_time: format(end, 'HH:mm'),
                type: eventToEdit.type || initialType || 'other',
                location: eventToEdit.location || '',
                child_id: eventToEdit.child_id || '',
                professional_id: eventToEdit.professional_id || '',
                priority: eventToEdit.priority || 'normal',
                is_all_day: eventToEdit.is_all_day || false,
                for_all_children: !eventToEdit.child_id,
                status: eventToEdit.status || 'scheduled',
                outcome_details: {
                    prescriptions: eventToEdit.outcome_details?.prescriptions || '',
                    medications: eventToEdit.outcome_details?.medications || '',
                    recommendations: eventToEdit.outcome_details?.recommendations || '',
                    behavior: eventToEdit.outcome_details?.behavior || '',
                    incidents: eventToEdit.outcome_details?.incidents || '',
                    notes: eventToEdit.outcome_details?.notes || '',
                },
                log_child_id: eventToEdit.child_id || '',
            });

            if (initialChild) {
                setChildSearch(initialChild.full_name);
            } else if (!eventToEdit.child_id) {
                setChildSearch('Toda a Unidade');
            }

            if (eventToEdit.status === 'completed') {
                setActiveTab('outcome');
            }
        } else if (selectedDate) {
            setFormData({
                title: '',
                description: '',
                notes: '',
                start_date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: format(new Date(), 'HH:mm'),
                end_date: format(selectedDate, 'yyyy-MM-dd'),
                end_time: format(new Date(Date.now() + 3600000), 'HH:mm'),
                type: initialType || 'other',
                location: '',
                child_id: '',
                professional_id: initialProfessionalId || '',
                priority: 'normal',
                is_all_day: false,
                for_all_children: false,
                status: 'scheduled',
                outcome_details: { prescriptions: '', medications: '', recommendations: '', behavior: '', incidents: '', notes: '' },
                log_child_id: '',
            });
            setChildSearch('');
        }
    }, [eventToEdit, selectedDate, isOpen, initialProfessionalId, children]);

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const startDateTime = data.is_all_day
                ? new Date(`${data.start_date}T00:00:00`)
                : new Date(`${data.start_date}T${data.start_time}`);
            const endDateTime = data.is_all_day
                ? new Date(`${data.end_date}T23:59:59`)
                : new Date(`${data.end_date}T${data.end_time}`);

            const eventData: any = {
                title: data.title,
                description: data.description || null,
                notes: data.notes || null,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                type: data.type,
                location: data.location || null,
                organization_id: profile?.organization_id,
                child_id: data.for_all_children ? null : (data.child_id || null),
                professional_id: data.professional_id || null,
                priority: data.priority,
                is_all_day: data.is_all_day,
                status: data.status,
                outcome_details: data.outcome_details,
            };

            // 1. Save Event
            if (eventToEdit) {
                const { error } = await supabase
                    .from('calendar_events')
                    .update(eventData)
                    .eq('id', eventToEdit.id);
                if (error) throw error;
                logAction('UPDATE', 'calendar_event', eventToEdit.id, {
                    title: eventData.title,
                    type: eventData.type,
                    child_id: eventData.child_id
                });
            } else {
                eventData.created_by = profile?.id;
                const { data: newEvent, error } = await supabase
                    .from('calendar_events')
                    .insert([eventData])
                    .select()
                    .single();
                if (error) throw error;
                logAction('CREATE', 'calendar_event', newEvent.id, {
                    title: eventData.title,
                    type: eventData.type,
                    child_id: eventData.child_id
                });
            }

            // 2. Create Log Entry if requested (Status completed + outcome details exist)
            if (data.status === 'completed' && activeTab === 'outcome') {
                const logDescription = `
**Registro de Evento: ${data.title}**
${data.outcome_details.prescriptions ? `\n> Receituário: ${data.outcome_details.prescriptions}` : ''}
${data.outcome_details.medications ? `\n> Medicamentos: ${data.outcome_details.medications}` : ''}
${data.outcome_details.recommendations ? `\n> Recomendações: ${data.outcome_details.recommendations}` : ''}
${data.outcome_details.behavior ? `\n> Comportamento: ${data.outcome_details.behavior}` : ''}
${data.outcome_details.incidents ? `\n> Ocorrências: ${data.outcome_details.incidents}` : ''}
${data.outcome_details.notes ? `\n> Observações: ${data.outcome_details.notes}` : ''}
                `.trim();

                // Only create log if there's content and a child selected
                const targetChildId = data.child_id || data.log_child_id;

                if (logDescription && targetChildId) {
                    const { error: logError } = await supabase
                        .from('logs')
                        .insert([{
                            organization_id: profile?.organization_id,
                            child_id: targetChildId,
                            staff_id: profile?.id,
                            category: data.type === 'medical' || data.type === 'vaccine' ? 'health' : 'general',
                            description: logDescription,
                            created_at: new Date().toISOString()
                        }]);

                    if (logError) {
                        console.error('Error creating log:', logError);
                        // Don't throw here to avoid blocking event save, just warn
                        toast('Evento salvo, mas houve um erro ao criar o registro no diário.', 'warning');
                    }
                }
            }
        },
        onSuccess: async (_, variables) => {
            setIsSuccess(true);
            await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });

            // Send notification only for NEW events
            if (!eventToEdit) {
                await createNotification({
                    organization_id: profile?.organization_id!,
                    title: 'Novo Evento na Agenda',
                    content: `${variables.title} agendado para ${variables.start_date} às ${variables.start_time}`,
                    type: 'event',
                    link: '/dashboard/agenda',
                    metadata: { type: variables.type }
                });
            }

            setTimeout(() => {
                onClose();
            }, 1000);
        },
        onError: (error: any) => {
            console.error('Error saving event:', error);
            toast('Erro ao salvar evento: ' + (error.message || 'Verifique sua conexão'), 'error');
        }
    });

    const handleDelete = async () => {
        if (!eventToEdit) return;
        if (!confirm('Tem certeza que deseja excluir este evento?')) return;
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', eventToEdit.id);
        if (error) {
            toast('Erro ao excluir evento', 'error');
        } else {
            logAction('DELETE', 'calendar_event', eventToEdit.id, {
                title: eventToEdit.title,
                child_id: eventToEdit.child_id
            });
            await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            onClose();
        }
    };

    const canProceed = () => {
        if (step === 1) return (formData.child_id || formData.for_all_children) && formData.type;
        if (step === 2) return formData.title.trim().length > 0 && formData.start_date && (formData.is_all_day || formData.start_time);
        return true;
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-xl shadow-xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[92vh]">
                {/* Header with Stepper Dots */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className={clsx("size-10 rounded-xl flex items-center justify-center", selectedEventType.bg)}>
                            <span className={clsx("material-symbols-outlined text-2xl", selectedEventType.color)}>{selectedEventType.icon}</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">
                                {eventToEdit ? 'Gerenciar Evento' : 'Novo Agendamento'}
                            </h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">
                                {activeTab === 'details' ? `Passo ${step} de 3` : 'Registro de Ocorrências'}
                            </p>
                        </div>
                    </div>

                    {/* Navigation/Tabs */}
                    <div className="flex items-center gap-2">
                        {eventToEdit ? (
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-4">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                                        activeTab === 'details' ? "bg-white dark:bg-gray-700 shadow-sm text-text-main dark:text-white" : "text-text-secondary"
                                    )}
                                >
                                    Detalhes
                                </button>
                                <button
                                    onClick={() => setActiveTab('outcome')}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                                        activeTab === 'outcome' ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-text-secondary"
                                    )}
                                >
                                    Relato
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mr-4">
                                {[1, 2, 3].map((s) => (
                                    <div
                                        key={s}
                                        className={clsx(
                                            "h-1.5 transition-all duration-300 rounded-full",
                                            step === s ? "w-6 bg-primary" : "w-1.5 bg-gray-200 dark:bg-gray-700"
                                        )}
                                    />
                                ))}
                            </div>
                        )}
                        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="material-symbols-outlined text-xl text-text-secondary">close</span>
                        </button>
                    </div>
                </div>

                {/* Success Overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-white dark:bg-surface-dark flex flex-col items-center justify-center animate-in fade-in">
                        <div className="size-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 scale-in">
                            <span className="material-symbols-outlined text-4xl">check_rounded</span>
                        </div>
                        <h3 className="text-xl font-bold">Evento {eventToEdit ? 'Atualizado' : 'Agendado'}</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'details' ? (
                        <>
                            {/* Step 1: Who and What */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Selecione o Acolhido ou Unidade</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                            <input
                                                type="text"
                                                placeholder="Pesquisar acolhido..."
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 transition-all font-bold text-sm"
                                                value={childSearch}
                                                onChange={(e) => {
                                                    setChildSearch(e.target.value);
                                                    setShowChildList(true);
                                                }}
                                                onFocus={() => setShowChildList(true)}
                                            />

                                            {showChildList && (
                                                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto z-20">
                                                    <button
                                                        onClick={() => {
                                                            setFormData({ ...formData, child_id: '', for_all_children: true });
                                                            setChildSearch('Toda a Unidade');
                                                            setShowChildList(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors border-b border-gray-50 dark:border-gray-700"
                                                    >
                                                        <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-gray-500 text-sm">groups</span>
                                                        </div>
                                                        <span className="text-sm font-bold">Toda a Unidade</span>
                                                        {formData.for_all_children && <span className="material-symbols-outlined text-primary ml-auto text-sm">check</span>}
                                                    </button>

                                                    {filteredChildren.length > 0 ? filteredChildren.map(child => (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => {
                                                                setFormData({ ...formData, child_id: child.id, for_all_children: false });
                                                                setChildSearch(child.full_name);
                                                                setShowChildList(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                                                        >
                                                            <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}`} className="size-8 rounded-full" />
                                                            <span className="text-sm font-bold">{child.full_name}</span>
                                                            {formData.child_id === child.id && <span className="material-symbols-outlined text-primary ml-auto text-sm">check</span>}
                                                        </button>
                                                    )) : childSearch.length > 0 && (
                                                        <p className="p-4 text-center text-xs text-text-secondary">Nenhum acolhido encontrado</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Tipo de Evento</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {EVENT_TYPES.map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                                    className={clsx(
                                                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-center",
                                                        formData.type === type.id
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-text-secondary hover:bg-gray-100"
                                                    )}
                                                >
                                                    <span className="material-symbols-outlined text-xl">{type.icon}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Date and Time */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Título do Evento</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                            placeholder="Ex: Consulta Médica, Reunião..."
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Data</label>
                                            <input
                                                type="date"
                                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                                value={formData.start_date}
                                                onChange={e => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Início</label>
                                            <input
                                                type="time"
                                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                                value={formData.start_time}
                                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Localização</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">location_on</span>
                                            <input
                                                type="text"
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm"
                                                placeholder="Local do evento..."
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Priority and Professional */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Nível de Prioridade</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {PRIORITY_OPTIONS.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setFormData({ ...formData, priority: p.id })}
                                                    className={clsx(
                                                        "py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                                                        formData.priority === p.id
                                                            ? `border-current ${p.color} bg-gray-50 dark:bg-gray-900`
                                                            : "border-gray-50 dark:border-gray-800 text-text-secondary bg-gray-50 dark:bg-gray-900"
                                                    )}
                                                >
                                                    <div className={clsx("size-1.5 rounded-full mb-1", p.dot)} />
                                                    <span className="text-[10px] font-black uppercase">{p.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Responsável pelo Acompanhamento</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                                            <select
                                                value={formData.professional_id}
                                                onChange={e => setFormData({ ...formData, professional_id: e.target.value })}
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/50 font-bold text-sm appearance-none"
                                            >
                                                <option value="">Nenhum definido</option>
                                                {professionals?.map(p => (
                                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Descrição Adicional</label>
                                        <textarea
                                            rows={3}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 text-sm font-medium resize-none shadow-inner"
                                            placeholder="Detalhes que ajudem a equipe..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                                <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                    Preencha o relato da realização do evento. Ao marcar como concluído, os dados serão enviados ao prontuário do acolhido.
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-text-main uppercase tracking-tight">Status do Evento</span>
                                    <p className="text-[10px] text-text-secondary">O evento já foi realizado?</p>
                                </div>
                                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
                                    <button
                                        onClick={() => setFormData({ ...formData, status: 'scheduled' })}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                            formData.status === 'scheduled' ? "bg-gray-100 text-text-main" : "text-text-secondary"
                                        )}
                                    >
                                        Agendado
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, status: 'completed' })}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                            formData.status === 'completed' ? "bg-green-500 text-white shadow-sm" : "text-text-secondary hover:text-green-500"
                                        )}
                                    >
                                        Concluído
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {(selectedEventType.id === 'medical' || selectedEventType.id === 'vaccine') ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Prescrições / Orientações</label>
                                            <textarea
                                                rows={3}
                                                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 text-sm font-medium resize-none shadow-inner"
                                                value={formData.outcome_details.prescriptions}
                                                onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, prescriptions: e.target.value } })}
                                                placeholder="Dados da receita, recomendações..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Recomendações e Retornos</label>
                                            <textarea
                                                rows={2}
                                                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 text-sm font-medium resize-none shadow-inner"
                                                value={formData.outcome_details.recommendations}
                                                onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, recommendations: e.target.value } })}
                                                placeholder="Quando deve voltar? O que fazer?"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Relato do Evento</label>
                                        <textarea
                                            rows={6}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 text-sm font-medium resize-none shadow-inner"
                                            value={formData.outcome_details.notes}
                                            onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, notes: e.target.value } })}
                                            placeholder="Descreva como foi o evento, behavior, acontecimentos..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                        {eventToEdit && !isSuccess && (
                            <button
                                onClick={handleDelete}
                                className="size-12 rounded-xl border border-gray-100 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                                title="Excluir Evento"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}

                        {(activeTab === 'details' && step > 1) ? (
                            <button
                                onClick={() => setStep((s) => s - 1 as 1 | 2 | 3)}
                                className="px-6 py-3 rounded-xl border border-gray-100 text-sm font-bold text-text-secondary hover:bg-gray-50 transition-all"
                            >
                                Voltar
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl border border-gray-100 text-sm font-bold text-text-secondary hover:bg-gray-50 transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex justify-end">
                        {activeTab === 'details' && step < 3 && !eventToEdit ? (
                            <button
                                onClick={() => setStep((s) => s + 1 as 1 | 2 | 3)}
                                disabled={!canProceed()}
                                className="h-10 px-8 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 active:scale-95 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                Próximo
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => mutation.mutate(formData)}
                                disabled={mutation.isPending || (activeTab === 'details' && step === 1 && !formData.child_id && !formData.for_all_children && !eventToEdit)}
                                className={clsx(
                                    "h-10 px-8 rounded-xl text-white text-sm font-bold hover:brightness-110 active:scale-95 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2",
                                    activeTab === 'outcome' ? "bg-green-600" : "bg-primary"
                                )}
                            >
                                {mutation.isPending ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {eventToEdit ? 'Salvar Alterações' : 'Confirmar Evento'}
                                        <span className="material-symbols-outlined text-lg">{activeTab === 'outcome' ? 'save_as' : 'check'}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
