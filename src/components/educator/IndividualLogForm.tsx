import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createNotification } from '../../lib/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLogger } from '../../hooks/useLogger';

interface IndividualLogFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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

export function IndividualLogForm({ isOpen, onClose, onSuccess }: IndividualLogFormProps) {
    const { user, profile } = useAuth();
    const { logAction } = useLogger();
    const queryClient = useQueryClient();
    const [residents, setResidents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedResident, setSelectedResident] = useState<any | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(categories[0].id);
    const [selectedMood, setSelectedMood] = useState('neutral');
    const [severity, setSeverity] = useState('low');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSelectedResident(null);
            setDescription('');
            setIsSuccess(false);
            return;
        }

        async function loadResidents() {
            const { data } = await supabase.from('children').select('*').order('full_name');
            if (data) setResidents(data);
        }
        loadResidents();
    }, [isOpen]);

    const filteredResidents = useMemo(() => {
        if (!searchQuery.trim()) return residents;
        return residents.filter(r =>
            r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [residents, searchQuery]);

    const refineWithAI = () => {
        if (!description) return;
        setIsGenerating(true);
        setTimeout(() => {
            const refined = `Acolhido(a) ${selectedResident?.full_name || 'sob observação'} apresenta quadro de "${description}". No contexto observacional, denota-se a necessidade de acompanhamento técnico-pedagógico para mediação documental e institucional. Documento registrado para fins de acompanhamento de rotina.`;
            setDescription(refined);
            setIsGenerating(false);
        }, 1500);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedResident || !user || !profile?.organization_id) return;

            const { error } = await supabase.from('logs').insert({
                organization_id: profile.organization_id,
                child_id: selectedResident.id,
                staff_id: user.id,
                category: selectedCategory,
                mood: selectedMood,
                description,
                severity,
            });

            if (error) throw error;

            logAction('CREATE', 'log', selectedResident.id, {
                category: selectedCategory,
                severity,
                description: description.substring(0, 50) + '...'
            });

            if (severity === 'critical' || severity === 'high' || selectedCategory === 'incident') {
                await createNotification({
                    organization_id: profile.organization_id,
                    title: 'Nova Ocorrência',
                    content: `${selectedResident.full_name}: ${description.substring(0, 100)}`,
                    type: 'warning',
                    link: '/dashboard/logbook',
                });
            }
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['logbook-timeline'] });
            setTimeout(onSuccess, 1000);
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col relative max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">person_add</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Nova Ocorrência</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Registro Individual</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-xl text-text-secondary">close</span>
                    </button>
                </div>

                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-white dark:bg-surface-dark flex flex-col items-center justify-center animate-in fade-in">
                        <div className="size-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 scale-in">
                            <span className="material-symbols-outlined text-4xl">check_rounded</span>
                        </div>
                        <h3 className="text-xl font-bold">Ocorrência Salva</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Child Search & Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1">Selecione o Acolhido</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                            <input
                                type="text"
                                className="w-full h-12 pl-12 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-orange-200 transition-all font-bold text-sm"
                                placeholder="Buscar por nome..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {filteredResidents.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setSelectedResident(r)}
                                    className={clsx(
                                        "flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all w-24",
                                        selectedResident?.id === r.id
                                            ? "bg-white border-orange-200 shadow-lg shadow-orange-500/5 ring-1 ring-orange-200"
                                            : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                                    )}
                                >
                                    <img src={r.photo_url || `https://ui-avatars.com/api/?name=${r.full_name}`} className="size-12 rounded-xl object-cover" alt="" />
                                    <span className="text-[9px] font-black uppercase text-center truncate w-full">{r.full_name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Category */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1">Categoria</label>
                            <div className="grid grid-cols-2 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={clsx(
                                            "flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left group",
                                            selectedCategory === cat.id
                                                ? "bg-white border-orange-200 shadow-sm ring-1 ring-orange-100"
                                                : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                                        )}
                                    >
                                        <div className={clsx("size-8 rounded-lg flex items-center justify-center", cat.color)}>
                                            <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-text-main dark:text-white uppercase truncate">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mood & Severity */}
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1 mb-3">Estado Emocional</label>
                                <div className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-x-auto no-scrollbar">
                                    {moods.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedMood(m.id)}
                                            className={clsx(
                                                "size-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all",
                                                selectedMood === m.id ? "bg-white shadow-md scale-110" : "opacity-40 hover:opacity-100"
                                            )}
                                        >
                                            <span className="text-xl">{m.emoji}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1 mb-3">Gravidade</label>
                                <div className="flex gap-2">
                                    {severityLevels.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSeverity(s.id)}
                                            className={clsx(
                                                "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border",
                                                severity === s.id ? s.color + " border-transparent shadow-sm" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400"
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block px-1 mb-2">Observação</label>
                        <textarea
                            className="w-full min-h-[120px] p-5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] outline-none focus:border-orange-200 transition-all text-sm font-medium resize-none shadow-inner leading-relaxed"
                            placeholder="Descreva o ocorrido com detalhes..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <button
                            onClick={refineWithAI}
                            disabled={!description || isGenerating}
                            className="absolute bottom-4 right-4 bg-orange-500 text-white size-10 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-0"
                            title="IA: Refinar Linguagem"
                        >
                            {isGenerating ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-white active:scale-95 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !selectedResident || !description}
                        className="h-12 px-10 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                    >
                        {saveMutation.isPending ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined">send</span>
                        )}
                        Salvar Ocorrência
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
