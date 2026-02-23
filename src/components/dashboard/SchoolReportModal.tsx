import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

interface SchoolReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChildId?: string;
    childrenList: any[];
}

export function SchoolReportModal({ isOpen, onClose, initialChildId, childrenList }: SchoolReportModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);

    const [childSearch, setChildSearch] = useState('');
    const [showChildList, setShowChildList] = useState(false);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [showSubjectList, setShowSubjectList] = useState(false);
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubject, setNewSubject] = useState('');

    const [form, setForm] = useState({
        child_id: initialChildId || '',
        subject: '',
        period: '1º Bimestre',
        grade: '',
        year: new Date().getFullYear(),
        frequency: '100',
        teacher_name: '',
        notes: ''
    });

    // Fetch existing subjects for this organization to provide as options
    const { data: existingSubjects } = useQuery({
        queryKey: ['pedagogy-subjects', profile?.organization_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('school_reports')
                .select('subject')
                .eq('organization_id', profile?.organization_id);

            if (error) throw error;
            const subjects = Array.from(new Set(data?.map(d => d.subject) || []));

            try {
                const { data: lookupData } = await supabase
                    .from('pedagogy_lookup_values')
                    .select('value')
                    .eq('organization_id', profile?.organization_id)
                    .eq('type', 'subject');
                if (lookupData) {
                    lookupData.forEach(l => {
                        if (!subjects.includes(l.value)) subjects.push(l.value);
                    });
                }
            } catch (e) { }

            return subjects.sort();
        },
        enabled: !!profile?.organization_id && isOpen
    });

    const addSubjectMutation = useMutation({
        mutationFn: async (val: string) => {
            if (!profile?.organization_id) return;
            try {
                await supabase.from('pedagogy_lookup_values').insert({
                    organization_id: profile.organization_id,
                    type: 'subject',
                    value: val
                });
            } catch (e) { }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedagogy-subjects'] });
        }
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

    const filteredSubjects = useMemo(() => {
        return (existingSubjects || []).filter(s => s.toLowerCase().includes(subjectSearch.toLowerCase()));
    }, [existingSubjects, subjectSearch]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile?.organization_id) throw new Error('Unauthorized');

            const { error } = await supabase
                .from('school_reports')
                .insert([{
                    ...form,
                    grade: parseFloat(form.grade),
                    frequency: parseFloat(form.frequency),
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
        if (!form.child_id || !form.subject || !form.grade) return;
        saveMutation.mutate();
    };

    const periods = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre', 'Recuperação', 'Final'];

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">analytics</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Lançamento de Nota</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">Histórico Acadêmico</p>
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
                        <h3 className="text-xl font-bold">Nota Registrada</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Aluno Selection */}
                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block px-1">Acolhido</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Pesquisar aluno..."
                                className="w-full h-12 pl-11 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 transition-all font-bold text-sm"
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Subject Selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Disciplina</label>
                                <button onClick={() => setIsAddingSubject(!isAddingSubject)} className="text-[9px] font-black text-blue-500 hover:underline uppercase">
                                    {isAddingSubject ? 'Voltar' : '+ Nova'}
                                </button>
                            </div>

                            {isAddingSubject ? (
                                <div className="flex gap-2 animate-in slide-in-from-right-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Nome..."
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        className="flex-1 h-12 px-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl outline-none font-bold text-sm"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newSubject) {
                                                setForm({ ...form, subject: newSubject });
                                                setSubjectSearch(newSubject);
                                                addSubjectMutation.mutate(newSubject);
                                                setIsAddingSubject(false);
                                                setNewSubject('');
                                            }
                                        }}
                                        className="h-12 w-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20"
                                    >
                                        <span className="material-symbols-outlined">check</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ex: Matemática..."
                                        value={subjectSearch || form.subject}
                                        onChange={(e) => {
                                            setSubjectSearch(e.target.value);
                                            setForm({ ...form, subject: e.target.value });
                                            setShowSubjectList(true);
                                        }}
                                        onFocus={() => setShowSubjectList(true)}
                                        className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 font-bold text-sm"
                                    />
                                    {showSubjectList && filteredSubjects.length > 0 && (
                                        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-40 overflow-y-auto z-20">
                                            {filteredSubjects.map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => {
                                                        setForm({ ...form, subject: sub });
                                                        setSubjectSearch(sub);
                                                        setShowSubjectList(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 text-xs font-bold border-b border-gray-50 dark:border-gray-800 last:border-0"
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Period Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Período</label>
                            <select
                                value={form.period}
                                onChange={(e) => setForm({ ...form, period: e.target.value })}
                                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 font-bold text-sm appearance-none"
                            >
                                {periods.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Nota</label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                value={form.grade}
                                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                className="w-full h-14 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 font-black text-xl text-blue-500 text-center"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Freq. (%)</label>
                            <input
                                type="number"
                                placeholder="100"
                                value={form.frequency}
                                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                                className="w-full h-14 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 font-black text-xl text-center"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Ano</label>
                            <input
                                type="number"
                                value={form.year}
                                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                                className="w-full h-14 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 font-bold text-sm text-center"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Notas do Professor / Observações</label>
                        <textarea
                            placeholder="Descreva o desempenho..."
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500/30 text-sm font-medium resize-none shadow-inner"
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
                        disabled={saveMutation.isPending || !form.subject || !form.grade || !form.child_id}
                        className="h-12 px-10 rounded-xl bg-blue-500 text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                    >
                        {saveMutation.isPending ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined">check_circle</span>
                        )}
                        Registrar Nota
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
