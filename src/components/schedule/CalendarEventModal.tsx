import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import clsx from 'clsx';

interface CalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
    eventToEdit?: any;
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

export function CalendarEventModal({ isOpen, onClose, selectedDate, eventToEdit }: CalendarEventModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    const [step, setStep] = useState<1 | 2 | 3>(1); // Step 3 represents "Outcome/Completion" mode
    const [activeTab, setActiveTab] = useState<'details' | 'outcome'>('details');
    const [isSuccess, setIsSuccess] = useState(false);
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
            return;
        }

        if (eventToEdit) {
            const start = new Date(eventToEdit.start_time);
            const end = new Date(eventToEdit.end_time);
            setFormData({
                title: eventToEdit.title || '',
                description: eventToEdit.description || '',
                notes: eventToEdit.notes || '',
                start_date: format(start, 'yyyy-MM-dd'),
                start_time: format(start, 'HH:mm'),
                end_date: format(end, 'yyyy-MM-dd'),
                end_time: format(end, 'HH:mm'),
                type: eventToEdit.type || 'other',
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
                log_child_id: eventToEdit.child_id || '', // Default to event child if exists
            });
            // If editing, we can view outcome directly
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
                type: 'other',
                location: '',
                child_id: '',
                professional_id: '',
                priority: 'normal',
                is_all_day: false,
                for_all_children: true,
                status: 'scheduled',
                outcome_details: { prescriptions: '', medications: '', recommendations: '', behavior: '', incidents: '', notes: '' },
                log_child_id: '',
            });
        }
    }, [eventToEdit, selectedDate, isOpen]);

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
            } else {
                eventData.created_by = profile?.id;
                const { error } = await supabase
                    .from('calendar_events')
                    .insert([eventData]);
                if (error) throw error;
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
                        alert('Evento salvo, mas houve um erro ao criar o registro no diário.');
                    }
                }
            }
        },
        onSuccess: async () => {
            setIsSuccess(true);
            await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        },
        onError: (error: any) => {
            console.error('Error saving event:', error);
            alert('Erro ao salvar evento: ' + (error.message || 'Verifique sua conexão'));
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
            alert('Erro ao excluir evento');
        } else {
            await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            onClose();
        }
    };

    const canProceedStep1 = formData.title.trim().length > 0 && formData.start_date && (formData.is_all_day || formData.start_time);

    if (!isOpen) return null;

    const selectedChild = children?.find(c => c.id === formData.child_id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[92vh] relative">

                {/* Success Overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-[60] bg-white/90 dark:bg-surface-dark/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <div className="size-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 animate-in zoom-in duration-500">
                            <span className="material-symbols-outlined text-5xl">check_circle</span>
                        </div>
                        <h3 className="text-xl font-bold text-text-main dark:text-white">
                            {formData.status === 'completed' && activeTab === 'outcome' ? 'Evento Registrado!' : 'Evento Salvo!'}
                        </h3>
                        <p className="text-text-secondary dark:text-gray-400">
                            {formData.status === 'completed' && activeTab === 'outcome'
                                ? 'Os detalhes também foram adicionados ao diário.'
                                : 'A agenda foi atualizada.'}
                        </p>
                    </div>
                )}

                {/* Header */}
                <div className={clsx(
                    'flex items-center justify-between px-6 py-5 border-b border-border-light dark:border-gray-800',
                )}>
                    <div className="flex items-center gap-3">
                        <div className={clsx('size-10 rounded-2xl flex items-center justify-center', selectedEventType.bg)}>
                            <span className={clsx('material-symbols-outlined text-[20px]', selectedEventType.color)}>
                                {selectedEventType.icon}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-main dark:text-white font-display">
                                {eventToEdit ? 'Gerenciar Evento' : 'Novo Evento'}
                            </h2>
                            <p className="text-xs text-text-secondary dark:text-gray-400">
                                {selectedEventType.label}
                                {selectedChild && !formData.for_all_children && (
                                    <span className="ml-1 text-primary font-semibold">• {selectedChild.full_name}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {eventToEdit && (
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                    activeTab === 'details' ? "bg-white dark:bg-gray-700 shadow-sm text-text-main dark:text-white" : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                                )}
                            >
                                Detalhes
                            </button>
                            <button
                                onClick={() => setActiveTab('outcome')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1",
                                    activeTab === 'outcome' ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white"
                                )}
                            >
                                <span className="material-symbols-outlined text-[14px]">assignment</span>
                                Ocorrências
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {!eventToEdit && (
                            <div className="flex items-center gap-1.5 mr-2">
                                <div className={clsx('size-2 rounded-full transition-all', step === 1 ? 'bg-primary w-5' : 'bg-gray-300 dark:bg-gray-600')} />
                                <div className={clsx('size-2 rounded-full transition-all', step === 2 ? 'bg-primary w-5' : 'bg-gray-300 dark:bg-gray-600')} />
                            </div>
                        )}
                        <button onClick={onClose} className="text-text-secondary hover:text-text-main dark:text-gray-400 dark:hover:text-white transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {/* DETAILS TAB (Step 1 & 2 content combined logic for Edit mode split) */}
                    {activeTab === 'details' && (step === 1 ? (
                        <div className="p-6 space-y-5">
                            {/* EVENT TYPE */}
                            <div>
                                <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-3">
                                    Tipo de Evento
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {EVENT_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setFormData({ ...formData, type: type.id, child_id: '', for_all_children: !type.requiresChild })}
                                            className={clsx(
                                                'flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-center',
                                                formData.type === type.id
                                                    ? `${type.bg} ${type.border} border-2`
                                                    : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            )}
                                        >
                                            <div className={clsx('size-9 rounded-xl flex items-center justify-center', type.bg)}>
                                                <span className={clsx('material-symbols-outlined text-[18px]', type.color)}>{type.icon}</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-text-main dark:text-white leading-tight">
                                                {type.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* TITLE */}
                            <div>
                                <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-1.5">
                                    Título do Evento <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                                    placeholder={selectedEventType.id === 'vaccine' ? 'Ex: Vacina Hepatite B - 2ª dose' : selectedEventType.id === 'medical' ? 'Ex: Consulta Pediatra Dr. Silva' : 'Ex: Reunião de equipe mensal'}
                                />
                            </div>

                            {/* DATE & TIME */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest">
                                        Data e Horário <span className="text-red-500">*</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <span className="text-xs font-semibold text-text-secondary dark:text-gray-400">Dia inteiro</span>
                                        <div
                                            onClick={() => setFormData({ ...formData, is_all_day: !formData.is_all_day })}
                                            className={clsx(
                                                'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
                                                formData.is_all_day ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                            )}
                                        >
                                            <div className={clsx(
                                                'absolute top-0.5 size-4 bg-white rounded-full shadow transition-transform',
                                                formData.is_all_day ? 'translate-x-4' : 'translate-x-0.5'
                                            )} />
                                        </div>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase">Início</label>
                                        <div className={clsx('flex gap-2', formData.is_all_day && 'opacity-60')}>
                                            <input
                                                type="date"
                                                value={formData.start_date}
                                                onChange={e => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })}
                                                className="flex-1 px-3 py-2.5 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                                            />
                                            {!formData.is_all_day && (
                                                <input
                                                    type="time"
                                                    value={formData.start_time}
                                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                                    className="w-24 px-3 py-2.5 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase">Fim</label>
                                        <div className={clsx('flex gap-2', formData.is_all_day && 'opacity-60')}>
                                            <input
                                                type="date"
                                                value={formData.end_date}
                                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                                className="flex-1 px-3 py-2.5 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                                            />
                                            {!formData.is_all_day && (
                                                <input
                                                    type="time"
                                                    value={formData.end_time}
                                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                                    className="w-24 px-3 py-2.5 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LOCATION */}
                            <div>
                                <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-1.5">
                                    Local
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-500 text-[18px]">location_on</span>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                                        placeholder="Ex: UBS Centro, Escola Municipal..."
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-5">
                            {/* CHILD SELECTION */}
                            <div>
                                <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-3">
                                    {selectedEventType.requiresChild ? (
                                        <span className="flex items-center gap-1.5">
                                            <span className={clsx('material-symbols-outlined text-[14px]', selectedEventType.color)}>{selectedEventType.icon}</span>
                                            Participantes
                                        </span>
                                    ) : (
                                        'Criança Envolvida (opcional)'
                                    )}
                                </label>

                                {/* All children toggle */}
                                <div
                                    onClick={() => setFormData({ ...formData, for_all_children: !formData.for_all_children, child_id: '' })}
                                    className={clsx(
                                        'flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all mb-3',
                                        formData.for_all_children
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300'
                                    )}
                                >
                                    <div className={clsx(
                                        'size-10 rounded-xl flex items-center justify-center transition-colors',
                                        formData.for_all_children ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    )}>
                                        <span className="material-symbols-outlined text-[20px]">groups</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-text-main dark:text-white">Para toda a unidade</p>
                                        <p className="text-xs text-text-secondary dark:text-gray-400">Evento geral, sem criança específica</p>
                                    </div>
                                    <div className={clsx(
                                        'size-5 rounded-full border-2 flex items-center justify-center transition-all',
                                        formData.for_all_children ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'
                                    )}>
                                        {formData.for_all_children && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                    </div>
                                </div>

                                {/* Children list */}
                                {!formData.for_all_children && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                        {children && children.length > 0 ? children.map(child => (
                                            <div
                                                key={child.id}
                                                onClick={() => setFormData({ ...formData, child_id: child.id })}
                                                className={clsx(
                                                    'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                                                    formData.child_id === child.id
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                                )}
                                            >
                                                <img
                                                    src={child.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(child.full_name)}&background=random&color=fff&size=64`}
                                                    alt={child.full_name}
                                                    className="size-9 rounded-full object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-text-main dark:text-white truncate">{child.full_name}</p>
                                                </div>
                                                <div className={clsx(
                                                    'size-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                                                    formData.child_id === child.id ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'
                                                )}>
                                                    {formData.child_id === child.id && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-6 text-text-secondary dark:text-gray-400">
                                                <span className="material-symbols-outlined text-3xl mb-1 opacity-40">child_care</span>
                                                <p className="text-sm">Nenhum acolhido cadastrado</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* PROFESSIONAL */}
                            <div>
                                <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-2">
                                    Quem vai acompanhar? (opcional)
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-500 text-[18px]">person_search</span>
                                    <select
                                        value={formData.professional_id}
                                        onChange={e => setFormData({ ...formData, professional_id: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm appearance-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    >
                                        <option value="">Nenhum definido (pode ser atribuído depois)</option>
                                        {professionals?.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.full_name}{p.specialty ? ` — ${p.specialty}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-[18px]">expand_more</span>
                                </div>
                            </div>

                            {/* PRIORITY & DESCRIPTION */}
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-2">Prioridade</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {PRIORITY_OPTIONS.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setFormData({ ...formData, priority: p.id })}
                                                className={clsx(
                                                    'flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all text-sm font-bold',
                                                    formData.priority === p.id
                                                        ? `border-current ${p.color} bg-current/5`
                                                        : 'border-border-light dark:border-gray-700 text-text-secondary dark:text-gray-400 hover:border-gray-300'
                                                )}
                                            >
                                                <div className={clsx('size-2 rounded-full', p.dot)} />
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none h-20 text-sm"
                                    placeholder="Detalhes adicionais..."
                                />
                            </div>
                        </div>
                    ))}

                    {/* OUTCOME TAB (New Section) */}
                    {activeTab === 'outcome' && (
                        <div className="p-6 space-y-6 animate-in slide-in-from-right-5 duration-200">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl mt-0.5">info</span>
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    Preencha os detalhes da realização do evento. Ao marcar como concluído, um registro será criado automaticamente no diário.
                                </p>
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-border-light dark:border-gray-700">
                                <div>
                                    <p className="font-bold text-text-main dark:text-white">Status do Evento</p>
                                    <p className="text-xs text-text-secondary dark:text-gray-400">Marque como concluído após realização</p>
                                </div>
                                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-border-light dark:border-gray-700">
                                    <button
                                        onClick={() => setFormData({ ...formData, status: 'scheduled' })}
                                        className={clsx(
                                            "px-4 py-2 rounded-md text-sm font-bold transition-all",
                                            formData.status === 'scheduled' ? "bg-gray-200 dark:bg-gray-700 text-text-main dark:text-white" : "text-text-secondary hover:text-text-main"
                                        )}
                                    >
                                        Agendado
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, status: 'completed' })}
                                        className={clsx(
                                            "px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2",
                                            formData.status === 'completed' ? "bg-green-500 text-white shadow-md" : "text-text-secondary hover:text-green-600"
                                        )}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                        Concluído
                                    </button>
                                </div>
                            </div>

                            {/* Who executed? */}
                            <div>
                                <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-2">
                                    Responsável pela Execução
                                </label>
                                <select
                                    value={formData.professional_id}
                                    onChange={e => setFormData({ ...formData, professional_id: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm appearance-none"
                                >
                                    <option value="">Selecione quem realizou/acompanhou...</option>
                                    {professionals?.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.full_name}{p.specialty ? ` — ${p.specialty}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="border-t border-border-light dark:border-gray-800 my-4" />

                            {/* Dynamic Fields */}
                            {(selectedEventType.id === 'medical' || selectedEventType.id === 'vaccine') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-1.5">Receituário / Prescrições</label>
                                        <textarea
                                            value={formData.outcome_details.prescriptions}
                                            onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, prescriptions: e.target.value } })}
                                            className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none h-24 text-sm"
                                            placeholder="Descreva as receitas médicas..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-1.5">Medicamentos Administrados</label>
                                        <textarea
                                            value={formData.outcome_details.medications}
                                            onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, medications: e.target.value } })}
                                            className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none h-20 text-sm"
                                            placeholder="Liste medicamentos aplicados na hora..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-1.5">Recomendações Médicas</label>
                                        <textarea
                                            value={formData.outcome_details.recommendations}
                                            onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, recommendations: e.target.value } })}
                                            className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none h-24 text-sm"
                                            placeholder="Cuidados pós-consulta, retornos..."
                                        />
                                    </div>
                                </>
                            )}

                            {!['medical', 'vaccine'].includes(selectedEventType.id) && (
                                <div>
                                    <label className="block text-xs font-black text-text-secondary dark:text-gray-400 uppercase tracking-widest mb-1.5">Ocorrências / Observações</label>
                                    <textarea
                                        value={formData.outcome_details.notes}
                                        onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, notes: e.target.value } })}
                                        className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none h-32 text-sm"
                                        placeholder="Relate como foi o evento, incidentes, comportamentos..."
                                    />
                                </div>
                            )}

                            {/* Specific Child for General Events */}
                            {formData.for_all_children && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                    <label className="block text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-2">
                                        Registrar para criança específica?
                                    </label>
                                    <select
                                        value={formData.log_child_id}
                                        onChange={e => setFormData({ ...formData, log_child_id: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all outline-none text-sm appearance-none"
                                    >
                                        <option value="">Não, registro geral apenas no evento</option>
                                        {children?.map(c => (
                                            <option key={c.id} value={c.id}>{c.full_name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-2">
                                        Ao selecionar uma criança, uma cópia dessas anotações será criada no prontuário dela.
                                    </p>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border-light dark:border-gray-800 bg-gray-50 dark:bg-black/20 flex justify-between items-center gap-3">
                    <div>
                        {eventToEdit && step === 1 && activeTab === 'details' && (
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold text-sm flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Excluir
                            </button>
                        )}
                        {step === 2 && activeTab === 'details' && (
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2.5 text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-bold text-sm flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                Voltar
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={mutation.isPending}
                            className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-bold transition-all text-sm disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        {activeTab === 'details' && step === 1 ? (
                            <button
                                onClick={() => setStep(2)}
                                disabled={!canProceedStep1}
                                className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                                Próximo
                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        ) : activeTab === 'details' && step === 2 ? (
                            <button
                                onClick={() => mutation.mutate(formData)}
                                disabled={mutation.isPending || (selectedEventType.requiresChild && !formData.for_all_children && !formData.child_id)}
                                className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                                {mutation.isPending ? (
                                    <>
                                        <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">check</span>
                                        <span>{eventToEdit ? 'Salvar Alterações' : 'Criar Evento'}</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            // OUTCOME TAB BUTTON
                            <button
                                onClick={() => mutation.mutate(formData)}
                                disabled={mutation.isPending}
                                className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                                {mutation.isPending ? (
                                    <>
                                        <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Registrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">save_as</span>
                                        <span>Salvar Registro</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
