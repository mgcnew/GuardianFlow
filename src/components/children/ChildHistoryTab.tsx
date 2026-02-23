import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface ChildHistoryTabProps {
    childId: string;
    child: any;
}

interface TimelineEvent {
    id: string;
    source: 'entry' | 'log' | 'event' | 'medication' | 'document' | 'goal' | 'reparacao';
    icon: string;
    iconColor: string;
    bgColor: string;
    title: string;
    description: string;
    category: string;
    date: string;
    mood?: string;
    urgency?: string;
    status?: string;
    author?: string;
    referral?: string;
    type?: string;
    metadata?: any;
}

type FilterCategory = 'all' | 'entry' | 'log' | 'event' | 'medication' | 'document' | 'goal' | 'reparacao';

// ─── Score calculation ────────────────────────────────────────
function computeProfileScore(
    entries: any[],
    logs: any[],
    events: any[],
    medications: any[],
    goals: any[],
    child: any
) {
    const scores: Record<string, { value: number; max: number; label: string; icon: string }> = {
        behavior: { value: 0, max: 100, label: 'Comportamento', icon: 'sentiment_satisfied' },
        health: { value: 0, max: 100, label: 'Saúde', icon: 'favorite' },
        engagement: { value: 0, max: 100, label: 'Engajamento', icon: 'groups' },
        education: { value: 0, max: 100, label: 'Educação', icon: 'school' },
        documentation: { value: 0, max: 100, label: 'Documentação', icon: 'folder' },
    };

    // ── Behavior score ───
    const behaviorEntries = entries.filter(e => e.category === 'behavior' || e.category === 'mood' || e.type === 'psychological');
    const moodPositive = [...entries, ...logs].filter(r => ['happy', 'calm', 'positive', 'good'].includes(r.mood?.toLowerCase?.() || '')).length;
    const moodNegative = [...entries, ...logs].filter(r => ['angry', 'sad', 'aggressive', 'negative', 'bad'].includes(r.mood?.toLowerCase?.() || '')).length;
    const referrals = entries.filter(e => !!e.referral).length;

    const totalMood = moodPositive + moodNegative;
    let behaviorBase = 50;
    if (totalMood > 0) {
        behaviorBase = (moodPositive / totalMood) * 100;
    } else if (behaviorEntries.length > 0) {
        behaviorBase = 70;
    }

    // Impact of referrals (reparations/provisions count positively as care taken)
    behaviorBase += Math.min(15, referrals * 3);
    scores.behavior.value = Math.min(100, Math.round(behaviorBase));

    // ── Health score ───
    const healthEntries = entries.filter(e => e.category === 'food' || e.category === 'sleep' || e.type === 'psychological');
    const healthEvents = events.filter(e => e.type === 'medical' || e.type === 'vaccine');
    const completedHealthEvents = healthEvents.filter(e => e.status === 'completed').length;
    const totalHealthEvents = healthEvents.length;
    const activeMeds = medications.filter(m => !m.end_date || new Date(m.end_date) >= new Date()).length;

    let healthBase = 60;
    if (totalHealthEvents > 0) healthBase += (completedHealthEvents / totalHealthEvents) * 20;
    if (healthEntries.length > 0) healthBase += Math.min(15, healthEntries.length * 3);
    if (activeMeds > 0) healthBase += 5;
    if (child.allergies) healthBase += 5;
    scores.health.value = Math.min(100, Math.round(healthBase));

    // ── Engagement score ───
    const totalEntries = entries.length;
    const totalLogs = logs.length;
    const totalEvents = events.length;
    const completedEvents = events.filter(e => e.status === 'completed').length;
    const missedEvents = events.filter(e => e.status === 'missed' || e.status === 'cancelled').length;

    let engagementBase = 50;
    if (totalEntries > 0) engagementBase += Math.min(25, totalEntries * 3);
    if (totalLogs > 0) engagementBase += Math.min(10, totalLogs * 1.5);
    if (referrals > 0) engagementBase += Math.min(10, referrals * 2); // Provisions increase engagement score

    if (totalEvents > 0) {
        engagementBase += (completedEvents / totalEvents) * 15;
        engagementBase -= (missedEvents / totalEvents) * 15;
    }
    scores.engagement.value = Math.min(100, Math.max(0, Math.round(engagementBase)));

    // ── Education score ───
    const educationEntries = entries.filter(e => e.type === 'pedagogical' || e.type === 'social_work');
    const schoolEvents = events.filter(e => e.type === 'school');
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const totalGoals = goals.length;

    // Check for educational engagement stars in metadata
    const avgEngagement = educationEntries.reduce((acc, curr) => acc + (curr.metadata?.engagement || 0), 0) / (educationEntries.length || 1);

    let eduBase = 40;
    if (educationEntries.length > 0) eduBase += Math.min(20, educationEntries.length * 4);
    if (avgEngagement > 0) eduBase += (avgEngagement / 5) * 20;
    if (schoolEvents.length > 0) eduBase += Math.min(10, schoolEvents.length * 2.5);
    if (totalGoals > 0) eduBase += (completedGoals / totalGoals) * 20;
    if (child.schooling) eduBase += 10;
    scores.education.value = Math.min(100, Math.round(eduBase));

    // ── Documentation score ───
    let docBase = 20;
    if (child.cpf) docBase += 10;
    if (child.rg) docBase += 10;
    if (child.judicial_process) docBase += 15;
    if (child.nis) docBase += 10;
    if (child.mother_name || child.father_name) docBase += 10;
    if (child.date_of_birth) docBase += 5;
    if (child.photo_url) docBase += 5;
    if (child.legal_status) docBase += 15;
    scores.documentation.value = Math.min(100, Math.round(docBase));

    // Overall score
    const overall = Math.round(
        (scores.behavior.value * 0.25) +
        (scores.health.value * 0.20) +
        (scores.engagement.value * 0.15) +
        (scores.education.value * 0.25) +
        (scores.documentation.value * 0.15)
    );

    return { scores, overall };
}

function getScoreColor(score: number) {
    if (score >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-500', label: 'Excelente' };
    if (score >= 60) return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', ring: 'ring-blue-500', label: 'Bom' };
    if (score >= 40) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-500', label: 'Regular' };
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', ring: 'ring-red-500', label: 'Atenção' };
}

// ─── Helpers ────────────────────────────────────────
function mapEntryToTimeline(entry: any): TimelineEvent {
    const typeMap: Record<string, { icon: string; iconColor: string; bgColor: string; cat: string }> = {
        diary: { icon: 'edit_note', iconColor: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', cat: 'Diário' },
        psychological: { icon: 'psychology', iconColor: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', cat: 'Evolução Psicológica' },
        pedagogical: { icon: 'school', iconColor: 'text-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-900/20', cat: 'Relato Pedagógico' },
        social_work: { icon: 'diversity_3', iconColor: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-900/20', cat: 'Serviço Social' },
    };
    const mapped = typeMap[entry.type] || typeMap.diary;
    return {
        id: `entry-${entry.id}`,
        source: 'entry',
        icon: mapped.icon,
        iconColor: mapped.iconColor,
        bgColor: mapped.bgColor,
        title: entry.title || mapped.cat,
        description: entry.content || 'Sem descrição',
        category: mapped.cat,
        date: entry.created_at,
        mood: entry.mood,
        urgency: entry.urgency,
        author: entry.author?.full_name,
        referral: entry.referral,
        type: entry.type,
        metadata: entry.metadata,
    };
}

function mapLogToTimeline(log: any): TimelineEvent {
    const catMap: Record<string, { icon: string; iconColor: string; bgColor: string; label: string }> = {
        behavior: { icon: 'emoji_emotions', iconColor: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', label: 'Comportamento' },
        health: { icon: 'medical_services', iconColor: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20', label: 'Saúde' },
        education: { icon: 'menu_book', iconColor: 'text-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-900/20', label: 'Educação' },
        meal: { icon: 'restaurant', iconColor: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20', label: 'Alimentação' },
        incident: { icon: 'warning', iconColor: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', label: 'Incidente' },
    };
    const mapped = catMap[log.category] || catMap.behavior;
    return {
        id: `log-${log.id}`,
        source: 'log',
        icon: mapped.icon,
        iconColor: mapped.iconColor,
        bgColor: mapped.bgColor,
        title: mapped.label,
        description: log.description || 'Registro sem descrição',
        category: mapped.label,
        date: log.created_at,
        mood: log.mood,
    };
}

function mapEventToTimeline(event: any): TimelineEvent {
    const typeMap: Record<string, { icon: string; iconColor: string; bgColor: string; label: string }> = {
        medical: { icon: 'local_hospital', iconColor: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20', label: 'Médico' },
        vaccine: { icon: 'vaccines', iconColor: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20', label: 'Vacina' },
        school: { icon: 'school', iconColor: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', label: 'Escolar' },
        outing: { icon: 'directions_walk', iconColor: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', label: 'Saída' },
        other: { icon: 'event', iconColor: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-800/20', label: 'Evento' },
    };
    const mapped = typeMap[event.type] || typeMap.other;
    return {
        id: `event-${event.id}`,
        source: 'event',
        icon: mapped.icon,
        iconColor: mapped.iconColor,
        bgColor: mapped.bgColor,
        title: event.title || mapped.label,
        description: event.description || event.notes || `${mapped.label}${event.location ? ` em ${event.location}` : ''}`,
        category: 'Agenda',
        date: event.start_time || event.created_at,
        status: event.status,
    };
}

function mapMedicationToTimeline(med: any): TimelineEvent {
    return {
        id: `med-${med.id}`,
        source: 'medication',
        icon: 'medication',
        iconColor: 'text-rose-500',
        bgColor: 'bg-rose-50 dark:bg-rose-900/20',
        title: med.name,
        description: `${med.dosage} — ${med.frequency}${med.instructions ? ` • ${med.instructions}` : ''}`,
        category: 'Medicamento',
        date: med.created_at,
        status: (!med.end_date || new Date(med.end_date) >= new Date()) ? 'active' : 'completed',
    };
}

function mapDocumentToTimeline(doc: any): TimelineEvent {
    const typeLabels: Record<string, string> = {
        rg: 'RG', cpf: 'CPF', birth_certificate: 'Certidão de Nascimento',
        vaccine_card: 'Cartão de Vacina', medical_report: 'Laudo Médico',
        court_order: 'Decisão Judicial', other: 'Outros',
    };
    return {
        id: `doc-${doc.id}`,
        source: 'document',
        icon: 'description',
        iconColor: 'text-indigo-500',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        title: `Documento: ${typeLabels[doc.type] || doc.type}`,
        description: doc.name,
        category: 'Documento',
        date: doc.created_at,
    };
}

function mapGoalToTimeline(goal: any): TimelineEvent {
    const statusMap: Record<string, { icon: string; label: string }> = {
        pending: { icon: 'pending', label: 'Pendente' },
        in_progress: { icon: 'trending_up', label: 'Em Progresso' },
        completed: { icon: 'check_circle', label: 'Concluída' },
    };
    const mapped = statusMap[goal.status] || statusMap.pending;
    return {
        id: `goal-${goal.id}`,
        source: 'goal',
        icon: 'flag',
        iconColor: 'text-cyan-500',
        bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        title: `Meta: ${goal.title}`,
        description: `Status: ${mapped.label}${goal.due_date ? ` • Prazo: ${new Date(goal.due_date).toLocaleDateString('pt-BR')}` : ''}`,
        category: 'Meta',
        date: goal.created_at,
        status: goal.status,
    };
}

function mapReparationToTimeline(rep: any): TimelineEvent {
    const typeMap: Record<string, { icon: string; label: string }> = {
        tv_restriction: { icon: 'tv_off', label: 'Privação de TV/Eletrônicos' },
        outing_restriction: { icon: 'block', label: 'Restrição de Saída' },
        event_restriction: { icon: 'event_busy', label: 'Restrição de Evento' },
        educational_task: { icon: 'menu_book', label: 'Tarefa Pedagógica' },
        other: { icon: 'more_horiz', label: 'Reparação' },
    };
    const mapped = typeMap[rep.type] || typeMap.other;
    return {
        id: `rep-${rep.id}`,
        source: 'reparacao',
        icon: mapped.icon,
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        title: mapped.label,
        description: rep.reason,
        category: 'Reparação',
        date: rep.created_at,
        status: rep.status,
        author: rep.author?.full_name,
        metadata: {
            notes: rep.notes,
            start_time: rep.start_time,
            end_time: rep.end_time,
            type: rep.type
        }
    };
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

// ─── Component ────────────────────────────────────────
export function ChildHistoryTab({ childId, child }: ChildHistoryTabProps) {
    const [filter, setFilter] = useState<FilterCategory>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showArrows, setShowArrows] = useState({ left: false, right: false });

    const checkScroll = () => {
        const el = scrollContainerRef.current;
        if (el) {
            setShowArrows({
                left: el.scrollLeft > 0,
                right: el.scrollLeft < el.scrollWidth - el.clientWidth - 5
            });
        }
    };

    const handleScroll = (dir: 'left' | 'right') => {
        const el = scrollContainerRef.current;
        if (el) {
            const scrollAmount = el.clientWidth * 0.7;
            el.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    // Fetch all data sources in parallel
    const { data, isLoading } = useQuery({
        queryKey: ['child_timeline', childId],
        queryFn: async () => {
            const [
                { data: entries },
                { data: logs },
                { data: events },
                { data: medications },
                { data: documents },
                { data: goals },
                { data: reparations }
            ] = await Promise.all([
                supabase.from('child_entries').select('*, author:profiles!child_entries_author_id_fkey(full_name)').eq('child_id', childId).order('created_at', { ascending: false }),
                supabase.from('logs').select('*, staff:profiles!logs_staff_id_fkey(full_name)').eq('child_id', childId).order('created_at', { ascending: false }),
                supabase.from('calendar_events').select('*').eq('child_id', childId).order('start_time', { ascending: false }),
                supabase.from('medications').select('*').eq('child_id', childId).order('created_at', { ascending: false }),
                supabase.from('child_documents').select('*').eq('child_id', childId).order('created_at', { ascending: false }),
                supabase.from('child_goals').select('*').eq('child_id', childId).order('created_at', { ascending: false }),
                supabase.from('educational_reparations').select('*, author:profiles!educational_reparations_created_by_fkey(full_name)').eq('child_id', childId).order('created_at', { ascending: false })
            ]);

            return {
                entries: entries || [],
                logs: logs || [],
                events: events || [],
                medications: medications || [],
                documents: documents || [],
                goals: goals || [],
                reparations: reparations || []
            };
        },
        enabled: !!childId,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [data]);

    const entries = data?.entries || [];
    const logs = data?.logs || [];
    const events = data?.events || [];
    const medications = data?.medications || [];
    const documents = data?.documents || [];
    const goals = data?.goals || [];
    const reparations = data?.reparations || [];

    // Build unified timeline
    const timeline = useMemo(() => {
        const all: TimelineEvent[] = [
            ...entries.map(mapEntryToTimeline),
            ...logs.map(mapLogToTimeline),
            ...events.map(mapEventToTimeline),
            ...medications.map(mapMedicationToTimeline),
            ...documents.map(mapDocumentToTimeline),
            ...goals.map(mapGoalToTimeline),
            ...reparations.map(mapReparationToTimeline),
        ];
        all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return all;
    }, [entries, logs, events, medications, documents, goals]);

    // Compute profile score
    const profileScore = useMemo(() => {
        return computeProfileScore(entries, logs, events, medications, goals, child);
    }, [entries, logs, events, medications, goals, child]);

    const filteredTimeline = filter === 'all' ? timeline : timeline.filter(t => t.source === filter);

    const filterChips: { key: FilterCategory; label: string; icon: string; count: number }[] = [
        { key: 'all', label: 'Histórico Completo', icon: 'list', count: timeline.length },
        { key: 'entry', label: 'Prontuário Técnico', icon: 'clinical_notes', count: entries.length },
        { key: 'log', label: 'Registros', icon: 'receipt_long', count: logs.length },
        { key: 'event', label: 'Agenda', icon: 'event', count: events.length },
        { key: 'medication', label: 'Medicamentos', icon: 'medication', count: medications.length },
        { key: 'document', label: 'Documentos', icon: 'description', count: documents.length },
        { key: 'goal', label: 'Metas', icon: 'flag', count: goals.length },
        { key: 'reparacao', label: 'Reparações', icon: 'rebase_edit', count: reparations.length },
    ];

    const overallColor = getScoreColor(profileScore.overall);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Score Card Skeleton */}
                <div className="rounded-3xl bg-white dark:bg-surface-dark p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-10 rounded-2xl bg-gray-200 dark:bg-gray-700/50"></div>
                        <div className="space-y-2">
                            <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                            <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="size-36 rounded-full bg-gray-200 dark:bg-gray-700/50 shrink-0"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800/50 rounded-2xl"></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Timeline Skeleton */}
                <div className="rounded-3xl bg-white dark:bg-surface-dark p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-24 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 relative">
                                <div className="absolute -left-[33px] top-3 size-4 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ════════ PROFILE SCORE CARD ════════ */}
            <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark p-4 md:p-8 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <div className="size-8 md:size-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] md:text-[24px]">analytics</span>
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-text-main dark:text-white font-display tracking-tight">Nota Geral do Perfil</h2>
                        <p className="text-[10px] md:text-xs text-text-secondary dark:text-gray-400 font-display">Baseada em todo o histórico da criança</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    {/* Overall Score Circle */}
                    <div className="relative flex-shrink-0">
                        <svg className="size-24 md:size-36 -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="10" />
                            <circle
                                cx="60" cy="60" r="52" fill="none"
                                className={overallColor.text}
                                stroke="currentColor"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${(profileScore.overall / 100) * 327} 327`}
                                style={{ transition: 'stroke-dasharray 1s ease-out' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-xl md:text-3xl font-black font-display ${overallColor.text}`}>{profileScore.overall}</span>
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-text-secondary dark:text-gray-500">{overallColor.label}</span>
                        </div>
                    </div>

                    {/* Category Scores */}
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.values(profileScore.scores).map(score => {
                            const color = getScoreColor(score.value);
                            return (
                                <div key={score.label} className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                                    <div className={`size-8 md:size-9 rounded-lg md:rounded-xl flex items-center justify-center ${color.bg}/10`}>
                                        <span className={`material-symbols-outlined text-[16px] md:text-lg ${color.text}`}>{score.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] md:text-xs font-bold text-text-main dark:text-white font-display">{score.label}</span>
                                            <span className={`text-[10px] md:text-xs font-black font-display ${color.text}`}>{score.value}%</span>
                                        </div>
                                        <div className="h-1 md:h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${color.bg} transition-all duration-1000 ease-out`}
                                                style={{ width: `${score.value}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Summary Text */}
                <div className="mt-6 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-text-secondary dark:text-gray-400 leading-relaxed font-display">
                        <span className="font-black text-text-main dark:text-white">Resumo: </span>
                        Esta nota é calculada automaticamente com base em {timeline.length} registros no histórico, incluindo
                        {entries.length > 0 && ` ${entries.length} entrada(s) de diário,`}
                        {logs.length > 0 && ` ${logs.length} registro(s),`}
                        {events.length > 0 && ` ${events.length} evento(s),`}
                        {medications.length > 0 && ` ${medications.length} medicamento(s),`}
                        {goals.length > 0 && ` ${goals.length} meta(s),`}
                        {reparations.length > 0 && ` ${reparations.length} reparação(ões),`}
                        {documents.length > 0 && ` ${documents.length} documento(s)`}
                        . A nota reflete o acompanhamento geral — quanto mais registros positivos, maior a nota.
                    </p>
                </div>
            </div>

            {/* ════════ FILTER CHIPS ════════ */}
            <div className="relative group/filters">
                {showArrows.left && (
                    <button
                        onClick={() => handleScroll('left')}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all md:flex hidden"
                    >
                        <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>
                )}

                <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 -mx-4 sm:mx-0 sm:px-0 scroll-smooth items-center"
                >
                    <div className="flex gap-2 px-4 sm:px-0">
                        {filterChips.map(chip => (
                            <button
                                key={chip.key}
                                type="button"
                                onClick={() => setFilter(chip.key)}
                                className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all font-display shrink-0 active:scale-95 ${filter === chip.key
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white dark:bg-surface-dark text-text-secondary dark:text-gray-400 ring-1 ring-border-light dark:ring-gray-800 hover:ring-primary hover:text-primary'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm md:text-base">{chip.icon}</span>
                                {chip.label}
                                <span className={`px-1.5 py-0.5 rounded-lg text-[9px] md:text-[10px] ${filter === chip.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                    {chip.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {showArrows.right && (
                    <button
                        onClick={() => handleScroll('right')}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all md:flex hidden"
                    >
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                )}
            </div>

            {/* ════════ TIMELINE ════════ */}
            <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-surface-dark p-4 md:p-8 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <div className="size-8 md:size-10 rounded-xl md:rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg md:text-[24px]">timeline</span>
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-text-main dark:text-white font-display tracking-tight">
                            Linha do Tempo
                        </h2>
                        <p className="text-[10px] md:text-xs text-text-secondary dark:text-gray-400 font-display">
                            {filteredTimeline.length} registro(s) encontrado(s)
                        </p>
                    </div>
                </div>

                {filteredTimeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="size-20 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl">history</span>
                        </div>
                        <h3 className="text-lg font-black text-text-main dark:text-white font-display mb-2">Nenhum registro encontrado</h3>
                        <p className="text-sm text-text-secondary dark:text-gray-400 font-display max-w-sm">
                            O histórico desta criança ficará disponível conforme novos registros forem adicionados.
                        </p>
                    </div>
                ) : (
                    <div className="relative pl-4 md:pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-4 md:space-y-6">
                        {filteredTimeline.map((event) => {
                            const isExpanded = expandedId === event.id;
                            return (
                                <div key={event.id} className="relative group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[23px] md:-left-[33px] top-3 size-3 md:size-4 rounded-full border-[3px] md:border-4 border-white dark:border-surface-dark ${event.urgency === 'high' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                        : event.source === 'event' && event.status === 'completed' ? 'bg-emerald-400'
                                            : event.source === 'goal' && event.status === 'completed' ? 'bg-emerald-400'
                                                : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-primary'
                                        } transition-colors`}></div>

                                    {/* Card */}
                                    <div
                                        className={`${event.bgColor} p-4 rounded-2xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md transition-all ${isExpanded ? 'ring-2 ring-primary/30' : ''}`}
                                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/10`}>
                                                <span className={`material-symbols-outlined text-lg ${event.iconColor}`}>{event.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h4 className="text-sm font-black text-text-main dark:text-white font-display truncate">{event.title}</h4>
                                                    <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 whitespace-nowrap font-display">{formatDate(event.date)}</span>
                                                </div>
                                                <p className={`text-xs text-text-secondary dark:text-gray-400 font-display ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                    {event.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-lg bg-white/60 dark:bg-black/10 text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase tracking-widest">
                                                        {event.category}
                                                    </span>
                                                    {event.mood && (
                                                        <span className="px-2 py-0.5 rounded-lg bg-white/60 dark:bg-black/10 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                                            Humor: {event.mood}
                                                        </span>
                                                    )}
                                                    {event.urgency && event.urgency !== 'low' && (
                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${event.urgency === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                            }`}>
                                                            {event.urgency === 'high' ? 'Urgente' : 'Média'}
                                                        </span>
                                                    )}
                                                    {event.status && (
                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${event.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                            : event.status === 'cancelled' || event.status === 'missed' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                                : event.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                            }`}>
                                                            {event.status === 'completed' ? 'Concluído'
                                                                : event.status === 'cancelled' ? 'Cancelado'
                                                                    : event.status === 'missed' ? 'Perdido'
                                                                        : event.status === 'active' ? 'Ativo'
                                                                            : event.status === 'scheduled' ? 'Agendado'
                                                                                : event.status === 'in_progress' ? 'Em Progresso'
                                                                                    : event.status === 'pending' ? 'Pendente'
                                                                                        : event.status}
                                                        </span>
                                                    )}
                                                </div>
                                                {isExpanded && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
                                                        {/* Detailed Metadata for specific types */}
                                                        {event.source === 'entry' && event.type === 'psychological' && event.metadata && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {['mood', 'sleep', 'appetite', 'attention'].map(key => (
                                                                    event.metadata[key] && (
                                                                        <div key={key} className="bg-white/40 dark:bg-black/20 p-2 rounded-lg">
                                                                            <span className="text-[10px] font-black uppercase text-text-secondary block">{key === 'mood' ? 'Humor' : key === 'sleep' ? 'Sono' : key === 'appetite' ? 'Apetite' : 'Atenção'}</span>
                                                                            <span className="text-xs font-bold">{event.metadata[key]}</span>
                                                                        </div>
                                                                    )
                                                                ))}
                                                            </div>
                                                        )}

                                                        {event.source === 'entry' && event.type === 'pedagogical' && event.metadata && (
                                                            <div className="bg-white/40 dark:bg-black/20 p-3 rounded-lg flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase text-text-secondary">Engajamento Escolar</span>
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3, 4, 5].map(star => (
                                                                        <span key={star} className={`material-symbols-outlined text-sm ${star <= (event.metadata.engagement || 0) ? 'text-amber-500 fill-1' : 'text-gray-300'}`}>star</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Reparation Details */}
                                                        {event.source === 'reparacao' && event.metadata && (
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="bg-white/40 dark:bg-black/20 p-2 rounded-lg">
                                                                        <span className="text-[10px] font-black uppercase text-text-secondary block">Início</span>
                                                                        <span className="text-xs font-bold">{new Date(event.metadata.start_time).toLocaleString('pt-BR')}</span>
                                                                    </div>
                                                                    <div className="bg-white/40 dark:bg-black/20 p-2 rounded-lg">
                                                                        <span className="text-[10px] font-black uppercase text-text-secondary block">Término Previsto</span>
                                                                        <span className="text-xs font-bold">{new Date(event.metadata.end_time).toLocaleString('pt-BR')}</span>
                                                                    </div>
                                                                </div>
                                                                {event.metadata.notes && (
                                                                    <div className="p-3 bg-white/30 dark:bg-black/10 rounded-xl border border-white/20">
                                                                        <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">Como foi conversado</span>
                                                                        <p className="text-xs leading-relaxed italic">"{event.metadata.notes}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Full Content */}
                                                        <div className="text-sm text-text-main dark:text-gray-100 whitespace-pre-wrap leading-relaxed italic bg-white/30 dark:bg-black/10 p-4 rounded-xl border border-white/20">
                                                            "{event.description}"
                                                        </div>

                                                        {/* Referral / Corrective actions (Reparações/Providências) */}
                                                        {event.referral && event.source !== 'reparacao' && (
                                                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <span className="material-symbols-outlined text-amber-600 text-lg">rebase_edit</span>
                                                                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-widest">Encaminhamentos / Providências</span>
                                                                </div>
                                                                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                                                                    {event.referral}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between mt-4 text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase tracking-widest">
                                                            <span>por {event.author || 'Sistema'}</span>
                                                            <span>{formatFullDate(event.date)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
