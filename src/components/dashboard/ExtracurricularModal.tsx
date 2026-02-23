import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import clsx from 'clsx';

interface ExtracurricularModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
    childrenList: any[];
}

export function ExtracurricularModal({ isOpen, onClose, initialChildId, childrenList }: ExtracurricularModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);

    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);

    const [form, setForm] = useState({
        child_id: initialChildId || '',
        name: '',
        category: 'esporte' as 'esporte' | 'arte' | 'musica' | 'informatica' | 'idiomas' | 'outro',
        schedule: '',
        status: 'active' as 'active' | 'completed' | 'dropped',
        notes: ''
    });

    useEffect(() => {
        if (!isOpen) {
            setIsSuccess(false);
            return;
        }
        setForm(prev => ({ ...prev, child_id: initialChildId || '' }));
        const child = childrenList.find(c => c.id === (initialChildId || form.child_id));
        if (child) setChildSearch(child.full_name);
        else setChildSearch('');
    }, [isOpen, initialChildId, childrenList]);

    const filteredChildren = useMemo(() => {
        return childrenList.filter(c => c.full_name.toLowerCase().includes(childSearch.toLowerCase()));
    }, [childrenList, childSearch]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!profile?.organization_id) throw new Error('Unauthorized');

            const { error } = await supabase
                .from('extracurricular_activities')
                .insert([{
                    ...data,
                    organization_id: profile.organization_id
                }]);

            if (error) throw error;
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['pedagogueDashboard'] });
            setTimeout(() => {
                onClose();
            }, 1000);
        }
    });

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!form.child_id || !form.name) return;
        saveMutation.mutate(form);
    };

    const categories = [
        { id: 'esporte', label: 'Esporte', icon: 'sports_soccer', color: 'bg-orange-500' },
        { id: 'arte', label: 'Arte', icon: 'palette', color: 'bg-pink-500' },
        { id: 'musica', label: 'Música', icon: 'music_note', color: 'bg-purple-500' },
        { id: 'informatica', label: 'Infor.', icon: 'computer', color: 'bg-blue-500' },
        { id: 'idiomas', label: 'Idiomas', icon: 'language', color: 'bg-green-500' },
        { id: 'outro', label: 'Outro', icon: 'extension', color: 'bg-gray-500' }
    ];

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600 text-2xl">stars</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Atividade Extra</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Complemento Pedagógico</p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-xl text-text-secondary">close</span>
                    </button>
                </div>

                {/* Success Overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-white dark:bg-surface-dark flex flex-col items-center justify-center animate-in fade-in">
                        <div className="size-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 scale-in">
                            <span className="material-symbols-outlined text-4xl">check_rounded</span>
                        </div>
                        <h3 className="text-xl font-bold">Atividade Ativada</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Aluno Selection */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Participante</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Pesquisar aluno..."
                                className="w-full h-12 pl-11 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/30 transition-all font-bold text-sm"
                                value={childSearch}
                                onChange={(e) => {
                                    setChildSearch(e.target.value);
                                    setShowChildList(true);
                                }}
                                onFocus={() => setShowChildList(true)}
                            />
                            {showChildList && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto z-20">
                                    {filteredChildren.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                setForm({ ...form, child_id: child.id });
                                                setChildSearch(child.full_name);
                                                setShowChildList(false);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 text-left"
                                        >
                                            <img src={child.photo_url || `https://ui-avatars.com/api/?name=${child.full_name}`} className="size-8 rounded-full" />
                                            <span className="text-sm font-bold">{child.full_name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Categoria</label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setForm({ ...form, category: cat.id as any })}
                                    className={clsx(
                                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1 group",
                                        form.category === cat.id
                                            ? "bg-white border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20"
                                            : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-text-secondary hover:border-amber-500/50"
                                    )}
                                >
                                    <div className={clsx(
                                        "size-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                                        form.category === cat.id ? cat.color + " text-white" : "bg-white dark:bg-gray-800 text-text-secondary shadow-sm"
                                    )}>
                                        <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                                    </div>
                                    <span className={clsx(
                                        "text-[8px] font-black uppercase tracking-tighter",
                                        form.category === cat.id ? "text-amber-600" : "text-text-secondary"
                                    )}>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Nome da Atividade</label>
                            <input
                                type="text"
                                placeholder="Ex: Natação..."
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/30 font-bold text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Local / Instituição</label>
                            <input
                                type="text"
                                placeholder="Ex: SESC..."
                                value={form.schedule}
                                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/30 font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Observações</label>
                        <textarea
                            placeholder="Dias, horários ou observações gerais..."
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500/30 text-sm font-medium resize-none shadow-inner"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saveMutation.isPending || !form.name || !form.child_id}
                        className="h-12 px-10 rounded-xl bg-amber-500 text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                    >
                        {saveMutation.isPending ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined">bolt</span>
                        )}
                        Ativar Atividade
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
