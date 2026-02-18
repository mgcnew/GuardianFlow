import { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface IndividualLogFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const categories = [
    { id: 'behavior', label: 'Comportamento', icon: 'psychology', color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400', activeRing: 'ring-orange-300' },
    { id: 'health', label: 'Saúde', icon: 'medical_services', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', activeRing: 'ring-blue-300' },
    { id: 'education', label: 'Educação', icon: 'school', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400', activeRing: 'ring-indigo-300' },
    { id: 'meal', label: 'Alimentação', icon: 'restaurant', color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400', activeRing: 'ring-green-300' },
    { id: 'incident', label: 'Incidente', icon: 'warning', color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400', activeRing: 'ring-red-300' },
    { id: 'emotional', label: 'Emocional', icon: 'favorite', color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400', activeRing: 'ring-pink-300' },
    { id: 'social', label: 'Social', icon: 'groups', color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400', activeRing: 'ring-teal-300' },
    { id: 'hygiene', label: 'Higiene', icon: 'wash', color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400', activeRing: 'ring-cyan-300' },
];

const moods = [
    { id: 'very_happy', emoji: '😄', label: 'Muito Feliz' },
    { id: 'happy', emoji: '🙂', label: 'Feliz' },
    { id: 'neutral', emoji: '😐', label: 'Neutro' },
    { id: 'sad', emoji: '🙁', label: 'Triste' },
    { id: 'angry', emoji: '😠', label: 'Irritado' },
    { id: 'anxious', emoji: '😰', label: 'Ansioso' },
    { id: 'fearful', emoji: '😨', label: 'Medo' },
    { id: 'sleepy', emoji: '😴', label: 'Sonolento' },
];

const severityLevels = [
    { id: 'low', label: 'Baixa', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dotColor: 'bg-green-500' },
    { id: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', dotColor: 'bg-yellow-500' },
    { id: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dotColor: 'bg-orange-500' },
    { id: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dotColor: 'bg-red-500' },
];

type TabId = 'assessment' | 'intervention' | 'vitals' | 'followup';

const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'assessment', label: 'Avaliação', icon: 'rate_review' },
    { id: 'intervention', label: 'Intervenção', icon: 'medical_information' },
    { id: 'vitals', label: 'Sinais Vitais', icon: 'monitor_heart' },
    { id: 'followup', label: 'Acompanhamento', icon: 'event_upcoming' },
];

export function IndividualLogForm({ onSuccess, onCancel }: IndividualLogFormProps) {
    const { user } = useAuth();
    const [residents, setResidents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedResident, setSelectedResident] = useState<any | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(categories[0].id);
    const [selectedMood, setSelectedMood] = useState('neutral');
    const [severity, setSeverity] = useState('low');
    const [description, setDescription] = useState('');
    const [intervention, setIntervention] = useState('');
    const [prescription, setPrescription] = useState('');
    const [vitalSigns, setVitalSigns] = useState({
        temperature: '',
        blood_pressure: '',
        heart_rate: '',
        weight: '',
    });
    const [followUpRequired, setFollowUpRequired] = useState(false);
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [activeTab, setActiveTab] = useState<TabId>('assessment');
    const [loading, setLoading] = useState(false);

    const filteredResidents = useMemo(() => {
        if (!searchQuery.trim()) return residents;
        return residents.filter(r =>
            r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [residents, searchQuery]);

    useEffect(() => {
        async function loadResidents() {
            if (!user) return;
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            if (profile?.organization_id) {
                const { data } = await supabase.from('children').select('*').order('full_name');
                if (data) {
                    setResidents(data);
                    if (data.length > 0) setSelectedResident(data[0]);
                }
            }
        }
        loadResidents();
    }, [user]);

    const handleSubmit = async () => {
        if (!selectedResident || !user) return;
        if (!description.trim()) { alert('Adicione uma observação.'); return; }

        setLoading(true);
        try {
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

            // Build vital signs JSON (only include non-empty values)
            const vitals: Record<string, string> = {};
            if (vitalSigns.temperature) vitals.temperature = vitalSigns.temperature;
            if (vitalSigns.blood_pressure) vitals.blood_pressure = vitalSigns.blood_pressure;
            if (vitalSigns.heart_rate) vitals.heart_rate = vitalSigns.heart_rate;
            if (vitalSigns.weight) vitals.weight = vitalSigns.weight;

            const { error } = await supabase.from('logs').insert({
                organization_id: profile?.organization_id,
                child_id: selectedResident.id,
                staff_id: user.id,
                category: selectedCategory,
                mood: selectedMood,
                description,
                severity,
                intervention: intervention || null,
                prescription: prescription || null,
                vital_signs: Object.keys(vitals).length > 0 ? vitals : null,
                follow_up_required: followUpRequired,
                follow_up_date: followUpRequired && followUpDate ? followUpDate : null,
                follow_up_notes: followUpRequired && followUpNotes ? followUpNotes : null,
            });

            if (error) throw error;
            onSuccess();
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (residents.length === 0) return <div className="p-8 text-center text-gray-500">Nenhum acolhido disponível.</div>;

    return (
        <div className="space-y-5">
            <p className="text-sm text-text-secondary dark:text-gray-400 -mt-2">
                Registre uma avaliação detalhada para um acolhido. Preencha as informações necessárias em cada seção.
            </p>

            {/* ── Resident Selection with Search ── */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    Acolhido
                </label>
                {residents.length > 4 && (
                    <div className="relative">
                        <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                        <input
                            type="text"
                            placeholder="Buscar acolhido..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                    {filteredResidents.map((resident) => (
                        <button
                            key={resident.id}
                            onClick={() => setSelectedResident(resident)}
                            className={clsx(
                                "flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left",
                                selectedResident?.id === resident.id
                                    ? "bg-primary/5 border-primary ring-1 ring-primary shadow-sm"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/40"
                            )}
                        >
                            <img
                                src={resident.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(resident.full_name)}&background=random&size=40`}
                                alt={resident.full_name}
                                className="size-8 rounded-full object-cover flex-shrink-0"
                            />
                            <span className={clsx("text-xs font-semibold truncate", selectedResident?.id === resident.id ? "text-primary" : "text-text-main dark:text-white")}>
                                {resident.full_name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Category + Severity Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Category */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">category</span>
                        Categoria
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-semibold",
                                    selectedCategory === cat.id
                                        ? `${cat.color} ring-1 ${cat.activeRing} border-transparent`
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Severity */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">priority_high</span>
                        Gravidade
                    </label>
                    <div className="flex gap-2">
                        {severityLevels.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSeverity(s.id)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-xs font-bold flex-1 justify-center",
                                    severity === s.id
                                        ? `${s.color} border-transparent ring-1 ring-current/20`
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50"
                                )}
                            >
                                <span className={clsx("size-2 rounded-full", s.dotColor)} />
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Mood Assessment ── */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">mood</span>
                    Estado Emocional
                </label>
                <div className="flex gap-1.5 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-x-auto">
                    {moods.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setSelectedMood(m.id)}
                            className={clsx(
                                "flex flex-col items-center gap-1 min-w-[56px] p-2 rounded-lg transition-all",
                                selectedMood === m.id ? "bg-white dark:bg-gray-700 shadow-sm scale-105 ring-1 ring-primary/20" : "hover:bg-white/50 dark:hover:bg-gray-700/50 opacity-50 hover:opacity-80"
                            )}
                        >
                            <span className="text-xl">{m.emoji}</span>
                            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tabs for Detailed Sections ── */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800/30">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border-b-2 -mb-px",
                                activeTab === tab.id
                                    ? "text-primary border-primary bg-white dark:bg-gray-800"
                                    : "text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-300"
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-4">
                    {/* ── Assessment Tab ── */}
                    {activeTab === 'assessment' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                                    Observação Detalhada *
                                </label>
                                <textarea
                                    className="w-full min-h-[140px] p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none"
                                    placeholder="Descreva detalhadamente a situação observada, incluindo contexto, comportamento, reações e qualquer informação relevante..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">{description.length} caracteres</p>
                            </div>
                        </div>
                    )}

                    {/* ── Intervention Tab ── */}
                    {activeTab === 'intervention' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                                    Intervenção Realizada
                                </label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none"
                                    placeholder="Descreva as ações tomadas pelo profissional: orientações dadas, procedimentos realizados, encaminhamentos feitos..."
                                    value={intervention}
                                    onChange={(e) => setIntervention(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">prescriptions</span>
                                    Prescrição / Recomendação
                                </label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl focus:ring-2 focus:ring-amber-300/30 focus:border-amber-400 outline-none text-sm resize-none"
                                    placeholder="Prescrições médicas, recomendações terapêuticas, orientações de cuidado, medicações indicadas..."
                                    value={prescription}
                                    onChange={(e) => setPrescription(e.target.value)}
                                />
                                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/50 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">info</span>
                                    Este campo é visível apenas para profissionais autorizados
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Vital Signs Tab ── */}
                    {activeTab === 'vitals' && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-400 mb-2">Preencha apenas os campos relevantes para este atendimento.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-secondary dark:text-gray-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px] text-red-400">thermostat</span>
                                        Temperatura (°C)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="36.5"
                                        value={vitalSigns.temperature}
                                        onChange={(e) => setVitalSigns(v => ({ ...v, temperature: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-secondary dark:text-gray-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px] text-blue-400">bloodtype</span>
                                        Pressão Arterial
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="120/80"
                                        value={vitalSigns.blood_pressure}
                                        onChange={(e) => setVitalSigns(v => ({ ...v, blood_pressure: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-secondary dark:text-gray-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px] text-pink-400">monitor_heart</span>
                                        Freq. Cardíaca (bpm)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="80"
                                        value={vitalSigns.heart_rate}
                                        onChange={(e) => setVitalSigns(v => ({ ...v, heart_rate: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-secondary dark:text-gray-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px] text-green-400">scale</span>
                                        Peso (kg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="45.0"
                                        value={vitalSigns.weight}
                                        onChange={(e) => setVitalSigns(v => ({ ...v, weight: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Follow-up Tab ── */}
                    {activeTab === 'followup' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px] text-primary">event_repeat</span>
                                    <div>
                                        <p className="text-sm font-bold text-text-main dark:text-white">Requer Acompanhamento?</p>
                                        <p className="text-[10px] text-gray-400">Marque se esta ocorrência necessita de retorno</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFollowUpRequired(!followUpRequired)}
                                    className={clsx(
                                        "relative w-11 h-6 rounded-full transition-colors",
                                        followUpRequired ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                                            followUpRequired ? "translate-x-[22px]" : "translate-x-0.5"
                                        )}
                                    />
                                </button>
                            </div>

                            {followUpRequired && (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary dark:text-gray-400">
                                            Data do Acompanhamento
                                        </label>
                                        <input
                                            type="date"
                                            value={followUpDate}
                                            onChange={(e) => setFollowUpDate(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary dark:text-gray-400">
                                            Notas sobre o Acompanhamento
                                        </label>
                                        <textarea
                                            className="w-full min-h-[80px] p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none"
                                            placeholder="O que deve ser verificado no retorno? Quais pontos de atenção?"
                                            value={followUpNotes}
                                            onChange={(e) => setFollowUpNotes(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer Actions ── */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    {severity !== 'low' && (
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold", severityLevels.find(s => s.id === severity)?.color)}>
                            {severityLevels.find(s => s.id === severity)?.label}
                        </span>
                    )}
                    {followUpRequired && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            Acompanhamento
                        </span>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !description.trim()}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Salvando...
                            </span>
                        ) : 'Salvar Registro'}
                    </button>
                </div>
            </div>
        </div>
    );
}
