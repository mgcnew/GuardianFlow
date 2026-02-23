import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';
import { format } from 'date-fns';

interface PsychologicalEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
}

// --- Data Structures ---

// Default Categories for Indicators
const DEFAULT_INDICATOR_CATEGORIES = [
    {
        id: 'emocional',
        label: 'Estado Emocional',
        options: ['Ansiedade', 'Tristeza', 'Euforia', 'Apatia', 'Irritabilidade', 'Labilidade', 'Medo']
    },
    {
        id: 'comportamental',
        label: 'Comportamento',
        options: ['Agressividade', 'Isolamento', 'Agitação', 'Hiperatividade', 'Oposição', 'Choro Fácil', 'Regressão']
    },
    {
        id: 'cognitivo',
        label: 'Cognição',
        options: ['Desatenção', 'Confusão', 'Esquecimento', 'Distração', 'Delírio', 'Alucinação']
    },
    {
        id: 'social',
        label: 'Socialização',
        options: ['Cooperação', 'Conflito com Pares', 'Liderança', 'Submissão', 'Interação Positiva']
    }
];

const MOOD_OPTIONS = [
    { value: 'eutimico', label: 'Eutímico (Normal)' },
    { value: 'deprimido', label: 'Deprimido/Triste' },
    { value: 'ansioso', label: 'Ansioso/Tenso' },
    { value: 'euforico', label: 'Eufórico/Exaltado' },
    { value: 'irritavel', label: 'Irritável/Hostil' },
    { value: 'embotado', label: 'Embotado/Indiferente' }
];

const SLEEP_OPTIONS = [
    { value: 'preservado', label: 'Preservado' },
    { value: 'insonia_inicial', label: 'Insônia Inicial' },
    { value: 'insonia_manutencao', label: 'Insônia de Manutenção' },
    { value: 'hipersonia', label: 'Hipersônia' },
    { value: 'agitado', label: 'Sono Agitado/Pesadelos' }
];

const APPETITE_OPTIONS = [
    { value: 'preservado', label: 'Preservado' },
    { value: 'hiporexia', label: 'Hiporexia (Diminuído)' },
    { value: 'hiperfagia', label: 'Hiperfagia (Aumentado)' },
    { value: 'seletivo', label: 'Seletivo' }
];

const ATTENTION_OPTIONS = [
    { value: 'normovigil', label: 'Normovígil' },
    { value: 'hipovigil', label: 'Hipovígil (Disperso)' },
    { value: 'hipervigil', label: 'Hipervígil (Alerta excessivo)' }
];

export function PsychologicalEntryModal({ isOpen, onClose, initialChildId }: PsychologicalEntryModalProps) {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    // Custom Categories Management (Persisted in localStorage in a real app, here state for demo)
    const [indicatorCategories, setIndicatorCategories] = useState(DEFAULT_INDICATOR_CATEGORIES);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newOptionName, setNewOptionName] = useState('');
    const [activeCategoryForAdd, setActiveCategoryForAdd] = useState<string | null>(null);
    const [mobileTab, setMobileTab] = useState<'info' | 'evolution'>('info');

    const [form, setForm] = useState({
        child_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        title: '',
        content: '',
        urgency: 'low' as 'low' | 'medium' | 'high',
        next_appointment: '',

        // MSE (Mental Status Exam) Fields
        mood: 'eutimico',
        sleep: 'preservado',
        appetite: 'preservado',
        attention: 'normovigil',
        orientation: 'orientado',
        memory: 'preservada',

        // Indicators
        indicators: [] as string[]
    });

    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const [hasMoreLeft, setHasMoreLeft] = useState(false);
    const [hasMoreRight, setHasMoreRight] = useState(false);

    const checkScroll = (ref: React.RefObject<HTMLDivElement | null>, setState: (val: boolean) => void) => {
        if (ref.current) {
            const { scrollTop, scrollHeight, clientHeight } = ref.current;
            const canScroll = scrollHeight > clientHeight + scrollTop + 20;
            setState(canScroll);
        }
    };

    useEffect(() => {
        const left = leftPanelRef.current;
        const right = rightPanelRef.current;

        const onScrollLeft = () => checkScroll(leftPanelRef, setHasMoreLeft);
        const onScrollRight = () => checkScroll(rightPanelRef, setHasMoreRight);

        if (isOpen && !isSuccess) {
            setTimeout(() => {
                checkScroll(leftPanelRef, setHasMoreLeft);
                checkScroll(rightPanelRef, setHasMoreRight);
            }, 100);

            left?.addEventListener('scroll', onScrollLeft);
            right?.addEventListener('scroll', onScrollRight);
        }

        return () => {
            left?.removeEventListener('scroll', onScrollLeft);
            right?.removeEventListener('scroll', onScrollRight);
        };
    }, [isOpen, isSuccess, indicatorCategories, form.content]);

    const { data: children } = useQuery({
        queryKey: ['children-for-psych-entry'],
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

    useEffect(() => {
        if (!isOpen) {
            setIsSuccess(false);
            setChildSearch('');
            return;
        }

        // Load custom categories from localStorage if available
        const savedCats = localStorage.getItem('psych_indicator_categories');
        if (savedCats) {
            try {
                setIndicatorCategories(JSON.parse(savedCats));
            } catch (e) {
                console.error("Failed to parse saved categories", e);
            }
        }

        setForm({
            child_id: initialChildId || '',
            date: format(new Date(), 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm'),
            title: '',
            content: '',
            urgency: 'low',
            next_appointment: '',
            mood: 'eutimico',
            sleep: 'preservado',
            appetite: 'preservado',
            attention: 'normovigil',
            orientation: 'orientado',
            memory: 'preservada',
            indicators: []
        });

        if (initialChildId && children) {
            const child = children.find(c => c.id === initialChildId);
            if (child) setChildSearch(child.full_name);
        } else {
            setChildSearch('');
        }
    }, [isOpen, initialChildId, children]);

    const filteredChildren = useMemo(() => children?.filter(c =>
        c.full_name.toLowerCase().includes(childSearch.toLowerCase())
    ) || [], [children, childSearch]);

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCat = {
            id: newCategoryName.toLowerCase().replace(/\s+/g, '_'),
            label: newCategoryName,
            options: []
        };
        const updated = [...indicatorCategories, newCat];
        setIndicatorCategories(updated);
        localStorage.setItem('psych_indicator_categories', JSON.stringify(updated));
        setNewCategoryName('');
        setShowAddCategory(false);
    };

    const handleAddOption = (categoryId: string) => {
        if (!newOptionName.trim()) return;
        const updated = indicatorCategories.map(cat => {
            if (cat.id === categoryId) {
                return { ...cat, options: [...cat.options, newOptionName] };
            }
            return cat;
        });
        setIndicatorCategories(updated);
        localStorage.setItem('psych_indicator_categories', JSON.stringify(updated));
        setNewOptionName('');
        setActiveCategoryForAdd(null);

        // Auto-select the new option
        setForm(prev => ({
            ...prev,
            indicators: [...prev.indicators, newOptionName]
        }));
    };

    const toggleIndicator = (indicator: string) => {
        setForm(prev => {
            const exists = prev.indicators.includes(indicator);
            return {
                ...prev,
                indicators: exists
                    ? prev.indicators.filter(i => i !== indicator)
                    : [...prev.indicators, indicator]
            };
        });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile || !form.child_id) throw new Error('Dados incompletos. Certifique-se de selecionar um paciente.');

            const { error } = await supabase.from('child_entries').insert({
                child_id: form.child_id,
                organization_id: profile.organization_id,
                author_id: profile.id,
                type: 'psychological',
                title: form.title || 'Evolução Psicológica',
                content: form.content,
                urgency: form.urgency,
                mood: form.mood, // Added top-level mood
                next_appointment: form.next_appointment || null,
                metadata: {
                    mood: form.mood,
                    sleep: form.sleep,
                    appetite: form.appetite,
                    attention: form.attention,
                    indicators: form.indicators,
                    entry_date: form.date,
                    entry_time: form.time
                }
            });

            if (error) throw error;
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['psychDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['child_entries'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        },
        onError: (error: any) => {
            console.error('Error saving psychological entry:', error);
            alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center sm:p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">

                {/* Header Professional */}
                <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm ring-4 ring-white dark:ring-surface-dark">
                            <span className="material-symbols-outlined text-2xl">clinical_notes</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-text-main dark:text-white uppercase tracking-tight leading-none mb-1">Registro de Evolução</h2>
                            <p className="text-xs text-text-secondary font-medium tracking-wide">Prontuário Psicológico Digital</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-bold border border-yellow-100 dark:border-yellow-900/30">
                            <span className="material-symbols-outlined text-sm">lock</span>
                            <span>Registro Confidencial</span>
                        </div>
                        <button onClick={onClose} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-secondary">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {isSuccess ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="size-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mb-6 animate-bounce">
                            <span className="material-symbols-outlined text-5xl">check_circle</span>
                        </div>
                        <h3 className="text-2xl font-black text-text-main dark:text-white mb-2">Evolução Registrada</h3>
                        <p className="text-text-secondary">O registro foi salvo com sucesso no prontuário do paciente.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">

                        {/* Mobile Tabs Header */}
                        <div className="md:hidden flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark shrink-0">
                            <button
                                onClick={() => setMobileTab('info')}
                                className={clsx(
                                    "flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
                                    mobileTab === 'info'
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-text-secondary hover:text-text-main"
                                )}
                            >
                                Informações
                            </button>
                            <button
                                onClick={() => setMobileTab('evolution')}
                                className={clsx(
                                    "flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
                                    mobileTab === 'evolution'
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-text-secondary hover:text-text-main"
                                )}
                            >
                                Evolução
                            </button>
                        </div>

                        {/* Left Panel: Context & Indicators */}
                        <div
                            ref={leftPanelRef}
                            className={clsx(
                                "w-full md:w-1/3 border-r border-gray-100 dark:border-gray-800 overflow-y-auto no-scrollbar bg-gray-50/30 dark:bg-gray-900/10 p-4 sm:p-6 space-y-6 sm:space-y-8 pb-20 md:pb-6 relative",
                                mobileTab === 'info' ? "block" : "hidden md:block"
                            )}>

                            {/* 1. Patient Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Identificação do Paciente</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="Buscar paciente..."
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                                        value={childSearch}
                                        onChange={(e) => {
                                            setChildSearch(e.target.value);
                                            setShowChildList(true);
                                        }}
                                        onFocus={() => setShowChildList(true)}
                                    />
                                    {showChildList && childSearch && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto z-20">
                                            {filteredChildren.map(child => (
                                                <button
                                                    key={child.id}
                                                    onClick={() => {
                                                        setForm({ ...form, child_id: child.id });
                                                        setChildSearch(child.full_name);
                                                        setShowChildList(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 text-left"
                                                >
                                                    <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}`} className="size-8 rounded-full" />
                                                    <span className="text-sm font-bold text-text-main dark:text-white">{child.full_name}</span>
                                                    {form.child_id === child.id && <span className="material-symbols-outlined text-primary ml-auto text-sm">check</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Date & Urgency */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Data</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Nível de Risco</label>
                                    <select
                                        className={clsx(
                                            "w-full px-3 py-2 border rounded-lg text-xs font-black uppercase outline-none appearance-none cursor-pointer",
                                            form.urgency === 'high' ? "bg-red-50 text-red-600 border-red-200" :
                                                form.urgency === 'medium' ? "bg-orange-50 text-orange-600 border-orange-200" :
                                                    "bg-green-50 text-green-600 border-green-200"
                                        )}
                                        value={form.urgency}
                                        onChange={e => setForm({ ...form, urgency: e.target.value as any })}
                                    >
                                        <option value="low">Baixo (Rotina)</option>
                                        <option value="medium">Médio (Atenção)</option>
                                        <option value="high">Alto (Crítico)</option>
                                    </select>
                                </div>
                            </div>

                            {/* 3. Indicators System */}
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Indicadores Observados</label>
                                    <button
                                        onClick={() => setShowAddCategory(!showAddCategory)}
                                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Nova Categoria
                                    </button>
                                </div>

                                {showAddCategory && (
                                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            placeholder="Nome da categoria..."
                                            className="flex-1 px-3 py-2 bg-white border border-primary/30 rounded-lg text-xs"
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleAddCategory}
                                            className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {indicatorCategories.map(category => (
                                        <div key={category.id} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-text-main dark:text-white flex items-center gap-2">
                                                    <span className="size-1.5 rounded-full bg-primary/40"></span>
                                                    {category.label}
                                                </h4>
                                                <button
                                                    onClick={() => setActiveCategoryForAdd(activeCategoryForAdd === category.id ? null : category.id)}
                                                    className="text-[10px] text-text-secondary hover:text-primary transition-colors"
                                                    title="Adicionar opção"
                                                >
                                                    <span className="material-symbols-outlined text-sm">add_circle</span>
                                                </button>
                                            </div>

                                            {activeCategoryForAdd === category.id && (
                                                <div className="flex gap-2 mb-2 animate-in fade-in">
                                                    <input
                                                        type="text"
                                                        placeholder="Nova opção..."
                                                        className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                                                        value={newOptionName}
                                                        onChange={e => setNewOptionName(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddOption(category.id)}
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleAddOption(category.id)} className="text-primary text-xs font-bold">OK</button>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-1.5">
                                                {category.options.map(option => (
                                                    <button
                                                        key={option}
                                                        onClick={() => toggleIndicator(option)}
                                                        className={clsx(
                                                            "px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all",
                                                            form.indicators.includes(option)
                                                                ? "bg-primary text-white border-primary shadow-sm"
                                                                : "bg-white dark:bg-gray-800 text-text-secondary border-gray-200 dark:border-gray-700 hover:border-primary/30 hover:text-primary"
                                                        )}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setMobileTab('evolution')}
                                className="w-full py-3.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 md:hidden mt-8"
                            >
                                Continuar para Evolução
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>

                            {/* Scroll Indicator Left */}
                            {hasMoreLeft && (
                                <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 flex-col items-center gap-1 animate-bounce text-primary/60 pointer-events-none">
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Mais</span>
                                    <span className="material-symbols-outlined text-sm">keyboard_double_arrow_down</span>
                                </div>
                            )}
                        </div>

                        {/* Right Panel: Exam & Evolution */}
                        <div className={clsx(
                            "flex-1 flex flex-col overflow-hidden bg-white dark:bg-surface-dark relative",
                            mobileTab === 'evolution' ? "block" : "hidden md:flex"
                        )}>
                            <div
                                ref={rightPanelRef}
                                className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6 sm:space-y-8 pb-20 md:pb-6"
                            >

                                {/* 1. Exam (MSE) */}
                                <div className="p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">psychology</span>
                                        Exame Psíquico (MSE)
                                    </h3>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-text-secondary">Humor (Afeto)</label>
                                            <select
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                value={form.mood}
                                                onChange={e => setForm({ ...form, mood: e.target.value })}
                                            >
                                                {MOOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-text-secondary">Sono</label>
                                            <select
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                value={form.sleep}
                                                onChange={e => setForm({ ...form, sleep: e.target.value })}
                                            >
                                                {SLEEP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-text-secondary">Apetite</label>
                                            <select
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                value={form.appetite}
                                                onChange={e => setForm({ ...form, appetite: e.target.value })}
                                            >
                                                {APPETITE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-text-secondary">Atenção</label>
                                            <select
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                value={form.attention}
                                                onChange={e => setForm({ ...form, attention: e.target.value })}
                                            >
                                                {ATTENTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        {/* Add more MSE fields as needed */}
                                    </div>
                                </div>

                                {/* 2. Evolution Content */}
                                <div className="space-y-3">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Título do Registro (Ex: Sessão de Acolhimento, Atendimento de Rotina)"
                                            className="w-full text-lg font-bold text-text-main dark:text-white placeholder-text-secondary/50 bg-transparent outline-none border-b border-gray-100 dark:border-gray-800 pb-2 focus:border-primary transition-colors"
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="relative">
                                        <textarea
                                            className="w-full h-64 p-4 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm leading-relaxed text-text-main dark:text-gray-300 focus:bg-white dark:focus:bg-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all placeholder-text-secondary/40"
                                            placeholder="Descreva a evolução detalhada, intervenções realizadas, discurso do paciente e observações relevantes..."
                                            value={form.content}
                                            onChange={e => setForm({ ...form, content: e.target.value })}
                                        ></textarea>
                                        <div className="absolute bottom-3 right-3 text-[10px] font-bold text-text-secondary bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-md backdrop-blur-sm border border-gray-100 dark:border-gray-700">
                                            {form.content.length} caracteres
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Next Steps */}
                                <div className="flex items-center gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                    <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                        <span className="material-symbols-outlined">calendar_clock</span>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Próximo Agendamento (Sugestão)</label>
                                        <input
                                            type="date"
                                            className="mt-1 bg-transparent border-b border-blue-200 dark:border-blue-800 text-sm font-bold text-blue-900 dark:text-blue-100 focus:outline-none w-full max-w-xs"
                                            value={form.next_appointment}
                                            onChange={e => setForm({ ...form, next_appointment: e.target.value })}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className={clsx(
                                "p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark items-center justify-end gap-3 rounded-none sm:rounded-b-3xl md:relative fixed bottom-0 left-0 right-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none",
                                mobileTab === 'evolution' ? "flex" : "hidden md:flex"
                            )}>
                                <div className="mr-auto text-xs text-text-secondary">
                                    <span className="font-bold">{profile?.full_name}</span> &bull; {user?.email}
                                </div>

                                <button
                                    onClick={onClose}
                                    className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all font-display"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={!form.child_id || !form.content || saveMutation.isPending}
                                    className="h-12 px-8 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                                >
                                    {saveMutation.isPending ? (
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">save</span>
                                            Salvar Evolução
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Scroll Indicator Right */}
                            {hasMoreRight && (
                                <div className="hidden md:flex absolute bottom-20 left-1/2 -translate-x-1/2 flex-col items-center gap-1 animate-bounce text-primary/60 pointer-events-none">
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Mais</span>
                                    <span className="material-symbols-outlined text-sm">keyboard_double_arrow_down</span>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
