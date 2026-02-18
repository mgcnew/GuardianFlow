import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface DiaryTabProps {
    childId: string;
}

const MOOD_OPTIONS = [
    { emoji: '😊', label: 'Feliz', value: 'happy' },
    { emoji: '😐', label: 'Neutro', value: 'neutral' },
    { emoji: '😢', label: 'Triste', value: 'sad' },
    { emoji: '😡', label: 'Irritado', value: 'angry' },
    { emoji: '😴', label: 'Sonolento', value: 'sleepy' },
];

const CATEGORY_OPTIONS = [
    { id: 'general', label: 'Geral', icon: 'edit_note', color: 'text-blue-500 bg-blue-50' },
    { id: 'behavior', label: 'Comportamento', icon: 'psychology', color: 'text-purple-500 bg-purple-50' },
    { id: 'food', label: 'Alimentação', icon: 'restaurant', color: 'text-green-500 bg-green-50' },
    { id: 'sleep', label: 'Sono', icon: 'bedtime', color: 'text-indigo-500 bg-indigo-50' },
    { id: 'mood', label: 'Humor', icon: 'mood', color: 'text-yellow-600 bg-yellow-50' },
    { id: 'incident', label: 'Intercorrência', icon: 'warning', color: 'text-red-500 bg-red-50' },
];

export function DiaryTab({ childId }: DiaryTabProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const [form, setForm] = useState({
        category: 'general',
        title: '',
        content: '',
        mood: '',
        urgency: 'low',
    });

    const { data: entries, isLoading } = useQuery({
        queryKey: ['child-diary', childId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('child_entries')
                .select('*, author:profiles(full_name)')
                .eq('child_id', childId)
                .eq('type', 'diary')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const createEntry = useMutation({
        mutationFn: async () => {
            if (!profile) throw new Error('Perfil não carregado');
            const { error } = await supabase.from('child_entries').insert({
                child_id: childId,
                organization_id: profile.organization_id,
                author_id: profile.id,
                type: 'diary',
                category: form.category,
                title: form.title,
                content: form.content,
                mood: form.mood || null,
                urgency: form.urgency,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['child-diary', childId] });
            setForm({ category: 'general', title: '', content: '', mood: '', urgency: 'low' });
            setIsFormOpen(false);
        },
        onError: (err: any) => alert('Erro ao salvar: ' + err.message),
    });

    const filteredEntries = (entries || []).filter(
        (e: any) => filterCategory === 'all' || e.category === filterCategory
    );

    const getCategoryMeta = (cat: string) =>
        CATEGORY_OPTIONS.find((c) => c.id === cat) || CATEGORY_OPTIONS[0];

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Agora';
        if (diffMin < 60) return `Há ${diffMin} min`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `Há ${diffHours}h`;
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="space-y-6">
            {/* Quick Mood Registration */}
            <div className="rounded-3xl bg-white dark:bg-surface-dark p-6 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
                <h3 className="text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-4 font-display">Humor de Hoje</h3>
                <div className="flex gap-3 justify-center">
                    {MOOD_OPTIONS.map((m) => (
                        <button
                            key={m.value}
                            onClick={async () => {
                                if (!profile) return;
                                await supabase.from('child_entries').insert({
                                    child_id: childId,
                                    organization_id: profile.organization_id,
                                    author_id: profile.id,
                                    type: 'diary',
                                    category: 'mood',
                                    title: `Humor: ${m.label}`,
                                    content: `Humor registrado como ${m.label}.`,
                                    mood: m.value,
                                    urgency: 'low',
                                });
                                queryClient.invalidateQueries({ queryKey: ['child-diary', childId] });
                            }}
                            className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                        >
                            <span className="text-3xl group-hover:scale-125 transition-transform">{m.emoji}</span>
                            <span className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* New Entry Form */}
            <div className="rounded-3xl bg-white dark:bg-surface-dark p-6 shadow-xl shadow-black/5 ring-1 ring-border-light dark:ring-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-text-main dark:text-white font-display tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">edit_note</span>
                        Diário do Acolhido
                    </h3>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-[16px]">{isFormOpen ? 'close' : 'add'}</span>
                        {isFormOpen ? 'Fechar' : 'Nova Entrada'}
                    </button>
                </div>

                {isFormOpen && (
                    <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-border-light dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
                        {/* Category */}
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">Categoria</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORY_OPTIONS.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setForm({ ...form, category: cat.id })}
                                        className={clsx(
                                            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                                            form.category === cat.id
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-transparent bg-white dark:bg-gray-800 text-text-secondary hover:border-gray-200'
                                        )}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title & Content */}
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Título</label>
                            <input
                                type="text"
                                placeholder="Ex: Apresentou melhora na socialização..."
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 block">Descrição</label>
                            <textarea
                                rows={3}
                                placeholder="Descreva a observação em detalhes..."
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl outline-none focus:border-primary text-sm resize-none"
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                            />
                        </div>

                        {/* Urgency */}
                        <div className="flex items-center gap-4">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Urgência:</label>
                            {['low', 'medium', 'high'].map((u) => (
                                <button
                                    key={u}
                                    onClick={() => setForm({ ...form, urgency: u })}
                                    className={clsx(
                                        'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                                        form.urgency === u
                                            ? u === 'high' ? 'bg-red-500 text-white' : u === 'medium' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-text-secondary'
                                    )}
                                >
                                    {u === 'low' ? 'Baixa' : u === 'medium' ? 'Média' : 'Alta'}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => createEntry.mutate()}
                            disabled={!form.title || createEntry.isPending}
                            className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {createEntry.isPending ? 'Salvando...' : 'Registrar Entrada'}
                        </button>
                    </div>
                )}
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                    onClick={() => setFilterCategory('all')}
                    className={clsx('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 transition-all', filterCategory === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-text-secondary ring-1 ring-border-light dark:ring-gray-800')}
                >
                    Todas
                </button>
                {CATEGORY_OPTIONS.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setFilterCategory(cat.id)}
                        className={clsx('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 transition-all', filterCategory === cat.id ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-text-secondary ring-1 ring-border-light dark:ring-gray-800')}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Timeline */}
            {isLoading ? (
                <div className="flex justify-center py-12"><div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-surface-dark rounded-3xl ring-1 ring-border-light dark:ring-gray-800">
                    <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-3 block">history_edu</span>
                    <p className="text-sm font-bold text-text-main dark:text-white font-display">Nenhum registro ainda</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">Comece registrando o humor ou uma observação do dia.</p>
                </div>
            ) : (
                <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-6">
                    {filteredEntries.map((entry: any) => {
                        const catMeta = getCategoryMeta(entry.category);
                        const moodEmoji = MOOD_OPTIONS.find((m) => m.value === entry.mood)?.emoji;
                        return (
                            <div key={entry.id} className="relative group">
                                <div className={clsx(
                                    'absolute -left-[33px] top-2 h-4 w-4 rounded-full border-4 border-white dark:border-[#1a1a2e]',
                                    entry.urgency === 'high' ? 'bg-red-500' : entry.urgency === 'medium' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                                )}></div>
                                <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 ring-1 ring-border-light dark:ring-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={clsx('size-8 rounded-xl flex items-center justify-center', catMeta.color)}>
                                                <span className="material-symbols-outlined text-[18px]">{catMeta.icon}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-text-main dark:text-white font-display">{entry.title}</p>
                                                <p className="text-[10px] font-bold text-text-secondary dark:text-gray-500 uppercase tracking-widest">
                                                    {catMeta.label} • {formatDate(entry.created_at)} {moodEmoji && `• ${moodEmoji}`}
                                                </p>
                                            </div>
                                        </div>
                                        {entry.urgency === 'high' && (
                                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-full animate-pulse">Urgente</span>
                                        )}
                                    </div>
                                    {entry.content && (
                                        <p className="mt-3 text-sm text-text-secondary dark:text-gray-300 leading-relaxed">{entry.content}</p>
                                    )}
                                    <p className="mt-3 text-[10px] text-text-secondary/60 dark:text-gray-600 font-bold">
                                        por {entry.author?.full_name || 'Educador'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
