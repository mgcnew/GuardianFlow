import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import clsx from 'clsx';
import { createNotification } from '../../lib/notifications';

interface PedagogicalEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
    eventToEdit?: any;
    initialType?: string;
}

const PEDAGOGICAL_EVENT_TYPES = [
    {
        id: 'tutoring',
        label: 'Reforço Escolar',
        icon: 'menu_book',
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        description: 'Apoio pedagógico individual ou em grupo em disciplinas específicas',
    },
    {
        id: 'homework',
        label: 'Apoio ao Dever',
        icon: 'edit_note',
        color: 'text-teal-600',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border-teal-200 dark:border-teal-800',
        description: 'Acompanhamento na realização de tarefas de casa e estudos',
    },
    {
        id: 'evaluation',
        label: 'Avaliação Pedagógica',
        icon: 'analytics',
        color: 'text-purple-600',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        description: 'Testes de nível, sondagens e avaliações de desenvolvimento',
    },
    {
        id: 'school_meeting',
        label: 'Reunião de Escola',
        icon: 'groups',
        color: 'text-amber-600',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        description: 'Reuniões com professores, diretores ou equipe técnica escolar',
    },
    {
        id: 'activity',
        label: 'Atividade Lúdica',
        icon: 'interests',
        color: 'text-rose-600',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-200 dark:border-rose-800',
        description: 'Jogos educativos, oficinas de artes e atividades de socialização',
    },
    {
        id: 'external_course',
        label: 'Curso / Oficina',
        icon: 'school',
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800',
        description: 'Cursos externos, treinamentos ou oficinas profissionalizantes',
    },
];

const ENGAGEMENT_LEVELS = [
    { value: 1, label: 'Baixo', icon: 'sentiment_very_dissatisfied', color: 'text-red-500' },
    { value: 2, label: 'Regular', icon: 'sentiment_dissatisfied', color: 'text-orange-500' },
    { value: 3, label: 'Bom', icon: 'sentiment_neutral', color: 'text-yellow-500' },
    { value: 4, label: 'Muito Bom', icon: 'sentiment_satisfied', color: 'text-green-500' },
    { value: 5, label: 'Excelente', icon: 'sentiment_very_satisfied', color: 'text-emerald-500' },
];

export function PedagogicalEventModal({ isOpen, onClose, selectedDate, eventToEdit, initialType }: PedagogicalEventModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [activeTab, setActiveTab] = useState<'details' | 'outcome'>('details');
    const [isSuccess, setIsSuccess] = useState(false);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        type: 'tutoring',
        location: '',
        child_id: '',
        for_all_children: false,
        status: 'scheduled',
        outcome_details: {
            subject: '',
            content_worked: '',
            objectives_met: '',
            difficulties_observed: '',
            engagement_level: 3,
            notes: '',
        },
    });

    const { data: children } = useQuery({
        queryKey: ['children-for-pedagogical-event'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('children')
                .select('id, full_name, photo_url')
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

    const selectedEventType = PEDAGOGICAL_EVENT_TYPES.find(t => t.id === formData.type) || PEDAGOGICAL_EVENT_TYPES[0];

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
                start_date: format(start, 'yyyy-MM-dd'),
                start_time: format(start, 'HH:mm'),
                end_date: format(end, 'yyyy-MM-dd'),
                end_time: format(end, 'HH:mm'),
                type: eventToEdit.metadata?.pedagogical_type || eventToEdit.type || 'tutoring',
                location: eventToEdit.location || '',
                child_id: eventToEdit.child_id || '',
                for_all_children: !eventToEdit.child_id,
                status: eventToEdit.status || 'scheduled',
                outcome_details: {
                    subject: eventToEdit.outcome_details?.subject || '',
                    content_worked: eventToEdit.outcome_details?.content_worked || '',
                    objectives_met: eventToEdit.outcome_details?.objectives_met || '',
                    difficulties_observed: eventToEdit.outcome_details?.difficulties_observed || '',
                    engagement_level: eventToEdit.outcome_details?.engagement_level || 3,
                    notes: eventToEdit.outcome_details?.notes || '',
                },
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
            const now = new Date();
            const startHour = now.getHours();
            const startTimeString = `${String(startHour).padStart(2, '0')}:00`;
            const endTimeString = `${String(startHour + 1).padStart(2, '0')}:00`;

            setFormData({
                title: '',
                description: '',
                start_date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: startTimeString,
                end_date: format(selectedDate, 'yyyy-MM-dd'),
                end_time: endTimeString,
                type: initialType || 'tutoring',
                location: '',
                child_id: '',
                for_all_children: false,
                status: 'scheduled',
                outcome_details: {
                    subject: '',
                    content_worked: '',
                    objectives_met: '',
                    difficulties_observed: '',
                    engagement_level: 3,
                    notes: '',
                },
            });
            setChildSearch('');
        }
    }, [eventToEdit, selectedDate, isOpen, children, initialType]);

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const startDateTime = new Date(`${data.start_date}T${data.start_time}`);
            const endDateTime = new Date(`${data.end_date}T${data.end_time}`);

            const eventData: any = {
                title: data.title,
                description: data.description || null,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                type: 'school', // Keep 'school' as base type for system compatibility
                location: data.location || null,
                organization_id: profile?.organization_id,
                child_id: data.for_all_children ? null : (data.child_id || null),
                professional_id: profile?.id,
                status: data.status,
                outcome_details: data.outcome_details,
                metadata: {
                    pedagogical_type: data.type,
                    is_pedagogical_custom: true
                }
            };

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

            // Create specific Log Entry for Pedagogy if completed
            if (data.status === 'completed' && activeTab === 'outcome') {
                const logDescription = `
**[Atendimento Pedagógico: ${selectedEventType.label}]**
**Título:** ${data.title}
${data.outcome_details.subject ? `\n- **Disciplina:** ${data.outcome_details.subject}` : ''}
${data.outcome_details.content_worked ? `\n- **Conteúdo:** ${data.outcome_details.content_worked}` : ''}
${data.outcome_details.objectives_met ? `\n- **Objetivos:** ${data.outcome_details.objectives_met}` : ''}
${data.outcome_details.difficulties_observed ? `\n- **Dificuldades:** ${data.outcome_details.difficulties_observed}` : ''}
- **Engajamento:** ${ENGAGEMENT_LEVELS.find(l => l.value === data.outcome_details.engagement_level)?.label}
\n**Observações:**
${data.outcome_details.notes || 'Nenhuma observação adicional.'}
                `.trim();

                const targetChildId = data.child_id;

                if (logDescription && targetChildId) {
                    await supabase.from('child_entries').insert([{
                        organization_id: profile?.organization_id,
                        child_id: targetChildId,
                        author_id: profile?.id,
                        type: 'pedagogical',
                        category: data.type,
                        title: `Finalização de Agenda: ${data.title}`,
                        content: logDescription,
                        metadata: {
                            source: 'calendar_event',
                            event_id: eventToEdit?.id,
                            engagement: data.outcome_details.engagement_level
                        }
                    }]);
                }
            }
        },
        onSuccess: async (_, variables) => {
            setIsSuccess(true);
            await queryClient.invalidateQueries({ queryKey: ['pedagogical-calendar-events'] });
            await queryClient.invalidateQueries({ queryKey: ['pedagogueDashboard'] });

            if (!eventToEdit) {
                await createNotification({
                    organization_id: profile?.organization_id!,
                    title: 'Nova Atividade Pedagógica',
                    content: `${variables.title} agendada para ${variables.start_date}`,
                    type: 'event',
                    link: '/dashboard/pedagogy/agenda',
                    metadata: { type: 'pedagogical' }
                });
            }

            setTimeout(() => {
                onClose();
            }, 1000);
        },
        onError: (error: any) => {
            console.error('Error saving pedagogical event:', error);
            alert('Erro ao salvar atividade: ' + (error.message || 'Tente novamente'));
        }
    });

    const handleDelete = async () => {
        if (!eventToEdit || !confirm('Deseja excluir esta atividade da agenda?')) return;
        const { error } = await supabase.from('calendar_events').delete().eq('id', eventToEdit.id);
        if (error) alert('Erro ao excluir');
        else {
            await queryClient.invalidateQueries({ queryKey: ['pedagogical-calendar-events'] });
            onClose();
        }
    };

    if (!isOpen) return null;

    const canProceed = () => {
        if (step === 1) return (formData.child_id || formData.for_all_children) && formData.type;
        if (step === 2) return formData.title.trim().length > 0 && formData.start_date && formData.start_time;
        return true;
    };

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-[32px] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[92vh]">

                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                        <div className={clsx("size-12 rounded-2xl flex items-center justify-center shadow-sm", selectedEventType.bg)}>
                            <span className={clsx("material-symbols-outlined text-2xl", selectedEventType.color)}>{selectedEventType.icon}</span>
                        </div>
                        <div>
                            <h2 className="text-base font-black text-text-main dark:text-white uppercase tracking-tight leading-none mb-1">
                                {eventToEdit ? 'Editar Atividade' : 'Nova Atividade Pedagógica'}
                            </h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold opacity-70">
                                {activeTab === 'details' ? `Fase ${step} de 3` : 'Relatório de Finalização'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {eventToEdit && (
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                        activeTab === 'details' ? "bg-white dark:bg-gray-700 shadow-sm text-text-main dark:text-white" : "text-text-secondary"
                                    )}
                                >
                                    Agendamento
                                </button>
                                <button
                                    onClick={() => setActiveTab('outcome')}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                        activeTab === 'outcome' ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-text-secondary"
                                    )}
                                >
                                    Finalização
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="material-symbols-outlined text-xl text-text-secondary">close</span>
                        </button>
                    </div>
                </div>

                {/* Success Overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-white dark:bg-surface-dark flex flex-col items-center justify-center animate-in fade-in">
                        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 scale-in">
                            <span className="material-symbols-outlined text-4xl">verified</span>
                        </div>
                        <h3 className="text-xl font-black text-text-main">Atividade {eventToEdit ? 'Atualizada' : 'Confirmada'}!</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                    {activeTab === 'details' ? (
                        <>
                            {step === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex gap-3">
                                        <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                        <p className="text-xs text-primary/80 font-medium leading-relaxed">
                                            Olá! Vamos organizar sua agenda. Primeiro, selecione o acolhido e o tipo de atividade que deseja realizar.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4 block px-1">Aluno / Acolhido</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                            <input
                                                type="text"
                                                placeholder="Para quem é esta atividade?"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none transition-all font-bold text-sm"
                                                value={childSearch}
                                                onChange={(e) => {
                                                    setChildSearch(e.target.value);
                                                    setShowChildList(true);
                                                }}
                                                onFocus={() => setShowChildList(true)}
                                            />
                                            {showChildList && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto z-50">
                                                    <button
                                                        onClick={() => {
                                                            setFormData({ ...formData, child_id: '', for_all_children: true });
                                                            setChildSearch('Toda a Unidade');
                                                            setShowChildList(false);
                                                        }}
                                                        className="w-full flex items-center gap-4 p-4 hover:bg-primary/5 transition-colors border-b border-gray-50 dark:border-gray-700"
                                                    >
                                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-primary text-xl">groups</span>
                                                        </div>
                                                        <span className="text-sm font-black">Toda a Unidade (Atividade Coletiva)</span>
                                                        {formData.for_all_children && <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>}
                                                    </button>
                                                    {filteredChildren.map(child => (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => {
                                                                setFormData({ ...formData, child_id: child.id, for_all_children: false });
                                                                setChildSearch(child.full_name);
                                                                setShowChildList(false);
                                                            }}
                                                            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                                                        >
                                                            <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}`} className="size-10 rounded-full border-2 border-white shadow-sm" />
                                                            <span className="text-sm font-bold">{child.full_name}</span>
                                                            {formData.child_id === child.id && <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4 block px-1">Natureza da Atividade</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {PEDAGOGICAL_EVENT_TYPES.map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                                    className={clsx(
                                                        "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group",
                                                        formData.type === type.id
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-text-secondary hover:border-gray-100"
                                                    )}
                                                >
                                                    <span className={clsx("material-symbols-outlined text-2xl group-hover:scale-110 transition-transform", formData.type === type.id ? type.color : "")}>
                                                        {type.icon}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 block px-1">Título ou Objetivo Central</label>
                                        <input
                                            type="text"
                                            className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold text-sm"
                                            placeholder="Ex: Alfabetização Inicial, Reforço de Matemática..."
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1 text-center block">Data Prevista</label>
                                            <input
                                                type="date"
                                                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold text-sm"
                                                value={formData.start_date}
                                                onChange={e => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1 text-center block">Horário</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold text-sm text-center"
                                                    value={formData.start_time}
                                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 block px-1 text-center">Local / Ambiente</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">meeting_room</span>
                                            <input
                                                type="text"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold text-sm"
                                                placeholder="Sala de estudos, pátio, escola..."
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex gap-3">
                                        <span className="material-symbols-outlined text-amber-600">tips_and_updates</span>
                                        <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                                            Dica: Você pode adicionar observações iniciais ou materiais necessários no campo de descrição abaixo.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4 block px-1 text-center">Descrição do Planejamento</label>
                                        <textarea
                                            rows={8}
                                            className="w-full p-6 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-3xl outline-none text-sm font-medium resize-none shadow-inner"
                                            placeholder="Descreva o que será trabalhado, materiais necessários ou qualquer observação relevante..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800 items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-xs font-black text-text-main uppercase tracking-tight">Status da Atividade</span>
                                    <p className="text-[10px] text-text-secondary font-medium">Marque como concluído para registrar o relato.</p>
                                </div>
                                <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-xl">
                                    <button
                                        onClick={() => setFormData({ ...formData, status: 'scheduled' })}
                                        className={clsx(
                                            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                                            formData.status === 'scheduled' ? "bg-gray-100 text-text-main shadow-inner" : "text-text-secondary"
                                        )}
                                    >
                                        Aguardando
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, status: 'completed' })}
                                        className={clsx(
                                            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                                            formData.status === 'completed' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-text-secondary hover:text-emerald-500"
                                        )}
                                    >
                                        Concluído
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] mb-2 block px-1">Disciplina / Matéria</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl outline-none font-bold text-xs"
                                        placeholder="Ex: Português, Artes..."
                                        value={formData.outcome_details.subject}
                                        onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, subject: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] mb-2 block px-1">Nível de Engajamento</label>
                                    <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800 justify-between gap-1">
                                        {ENGAGEMENT_LEVELS.map(level => (
                                            <button
                                                key={level.value}
                                                onClick={() => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, engagement_level: level.value } })}
                                                className={clsx(
                                                    "flex-1 py-1.5 rounded-lg transition-all",
                                                    formData.outcome_details.engagement_level === level.value ? "bg-white dark:bg-gray-800 shadow-sm" : "opacity-30 hover:opacity-100"
                                                )}
                                                title={level.label}
                                            >
                                                <span className={clsx("material-symbols-outlined text-[20px]", level.color)}>{level.icon}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] mb-2 block px-1">Conteúdo Trabalhado</label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none text-xs font-medium resize-none shadow-inner"
                                        placeholder="O que foi visto durante a sessão?"
                                        value={formData.outcome_details.content_worked}
                                        onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, content_worked: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] mb-2 block px-1">Dificuldades Observadas</label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none text-xs font-medium resize-none shadow-inner"
                                        placeholder="Onde o acolhido teve mais dificuldade?"
                                        value={formData.outcome_details.difficulties_observed}
                                        onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, difficulties_observed: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] mb-2 block px-1">Considerações Finais</label>
                                    <textarea
                                        rows={4}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none text-xs font-medium resize-none shadow-inner"
                                        placeholder="Notas gerais sobre o atendimento..."
                                        value={formData.outcome_details.notes}
                                        onChange={e => setFormData({ ...formData, outcome_details: { ...formData.outcome_details, notes: e.target.value } })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-4 bg-gray-50/30 dark:bg-gray-900/20">
                    <div className="flex gap-2">
                        {eventToEdit && !isSuccess && (
                            <button
                                onClick={handleDelete}
                                className="size-14 rounded-2xl border border-gray-100 dark:border-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center group"
                                title="Excluir Atividade"
                            >
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">delete</span>
                            </button>
                        )}

                        <button
                            onClick={(activeTab === 'details' && step > 1) ? () => setStep(s => s - 1 as 1 | 2 | 3) : onClose}
                            className="px-8 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-sm font-black text-text-secondary uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
                        >
                            {(activeTab === 'details' && step > 1) ? 'Anterior' : 'Sair'}
                        </button>
                    </div>

                    <div className="flex-1 flex justify-end">
                        {activeTab === 'details' && step < 3 && !eventToEdit ? (
                            <button
                                onClick={() => setStep(s => s + 1 as 1 | 2 | 3)}
                                disabled={!canProceed()}
                                className="h-14 px-10 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-[0.1em] hover:brightness-110 active:scale-95 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 flex items-center gap-3"
                            >
                                Próximo
                                <span className="material-symbols-outlined text-xl">east</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => mutation.mutate(formData)}
                                disabled={mutation.isPending || (activeTab === 'details' && step === 1 && !formData.child_id && !formData.for_all_children && !eventToEdit)}
                                className={clsx(
                                    "h-14 px-10 rounded-2xl text-white text-sm font-black uppercase tracking-[0.1em] hover:brightness-110 active:scale-95 shadow-xl transition-all disabled:opacity-50 flex items-center gap-3",
                                    activeTab === 'outcome' ? "bg-emerald-600 shadow-emerald-500/20" : "bg-primary shadow-primary/20"
                                )}
                            >
                                {mutation.isPending ? (
                                    <div className="size-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {eventToEdit ? 'Salvar Mudanças' : 'Agendar Atividade'}
                                        <span className="material-symbols-outlined text-xl">{activeTab === 'outcome' ? 'fact_check' : 'event_available'}</span>
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
