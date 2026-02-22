import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface FamilyReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    childId: string;
    childName: string;
}

const RELATIONSHIPS = [
    { id: 'mother', label: 'Mãe', icon: 'woman' },
    { id: 'father', label: 'Pai', icon: 'man' },
    { id: 'sibling', label: 'Irmão(ã)', icon: 'group' },
    { id: 'grandparent', label: 'Avô(ó)', icon: 'elderly' },
    { id: 'uncle_aunt', label: 'Tio(a)', icon: 'person' },
    { id: 'godparent', label: 'Padrinho/Madrinha', icon: 'person' },
    { id: 'other', label: 'Outro', icon: 'more_horiz' },
];

const BOND_QUALITIES = [
    { id: 'strong', label: 'Forte', color: 'green', icon: 'favorite' },
    { id: 'moderate', label: 'Moderado', color: 'amber', icon: 'heart_check' },
    { id: 'weak', label: 'Fraco', color: 'orange', icon: 'heart_minus' },
    { id: 'broken', label: 'Rompido', color: 'red', icon: 'heart_broken' },
    { id: 'unknown', label: 'Desconhecido', color: 'gray', icon: 'help' },
];

const STATUSES = [
    { id: 'active', label: 'Ativo/Localizado' },
    { id: 'inactive', label: 'Inativo' },
    { id: 'deceased', label: 'Falecido' },
    { id: 'unknown_location', label: 'Paradeiro Desconhecido' },
];

export function FamilyReferenceModal({ isOpen, onClose, childId, childName }: FamilyReferenceModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: '',
        relationship: 'mother',
        phone: '',
        address: '',
        city: '',
        notes: '',
        bond_quality: 'unknown',
        has_visitation_rights: false,
        is_reference_contact: false,
        status: 'active',
    });

    const { data: references, isLoading } = useQuery({
        queryKey: ['family-references', childId],
        queryFn: async () => {
            const { data } = await supabase
                .from('family_references')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false });
            return data || [];
        },
        enabled: isOpen && !!childId,
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!profile || !form.full_name) throw new Error('Dados incompletos');
            const payload = {
                child_id: childId,
                organization_id: profile.organization_id,
                full_name: form.full_name,
                relationship: form.relationship,
                phone: form.phone || null,
                address: form.address || null,
                city: form.city || null,
                notes: form.notes || null,
                bond_quality: form.bond_quality,
                has_visitation_rights: form.has_visitation_rights,
                is_reference_contact: form.is_reference_contact,
                status: form.status,
            };

            if (editingId) {
                const { error } = await supabase.from('family_references').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('family_references').insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['family-references', childId] });
            resetForm();
            setView('list');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('family_references').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['family-references', childId] });
        }
    });

    const resetForm = () => {
        setForm({ full_name: '', relationship: 'mother', phone: '', address: '', city: '', notes: '', bond_quality: 'unknown', has_visitation_rights: false, is_reference_contact: false, status: 'active' });
        setEditingId(null);
    };

    const startEdit = (ref: any) => {
        setForm({
            full_name: ref.full_name, relationship: ref.relationship, phone: ref.phone || '',
            address: ref.address || '', city: ref.city || '', notes: ref.notes || '',
            bond_quality: ref.bond_quality || 'unknown', has_visitation_rights: ref.has_visitation_rights || false,
            is_reference_contact: ref.is_reference_contact || false, status: ref.status || 'active',
        });
        setEditingId(ref.id);
        setView('form');
    };

    useEffect(() => { if (!isOpen) { resetForm(); setView('list'); } }, [isOpen]);

    if (!isOpen) return null;

    const bondQ = (id: string) => BOND_QUALITIES.find(b => b.id === id);
    const relLabel = (id: string) => RELATIONSHIPS.find(r => r.id === id)?.label || id;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2rem] sm:rounded-3xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-teal-600 text-2xl">family_restroom</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Referências Familiares</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">{childName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {view === 'list' && (
                            <button onClick={() => { resetForm(); setView('form'); }}
                                className="px-3 py-1.5 bg-teal-500 text-white text-[10px] font-bold rounded-lg hover:bg-teal-600 transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span>Adicionar
                            </button>
                        )}
                        <button onClick={onClose} className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {view === 'list' ? (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {isLoading ? (
                                <div className="p-12 text-center">
                                    <div className="size-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                    <p className="text-sm text-text-secondary">Carregando...</p>
                                </div>
                            ) : (references || []).length === 0 ? (
                                <div className="p-12 text-center">
                                    <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl mb-3 block">group_off</span>
                                    <p className="text-sm text-text-secondary dark:text-gray-500 font-medium">Nenhuma referência familiar cadastrada.</p>
                                    <button onClick={() => { resetForm(); setView('form'); }}
                                        className="mt-4 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 text-xs font-bold rounded-xl hover:bg-teal-100 transition-all">
                                        Cadastrar Primeira Referência
                                    </button>
                                </div>
                            ) : (references || []).map((ref: any) => {
                                const bond = bondQ(ref.bond_quality);
                                return (
                                    <div key={ref.id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className="size-11 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="material-symbols-outlined text-gray-500 text-xl">{RELATIONSHIPS.find(r => r.id === ref.relationship)?.icon || 'person'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <p className="text-sm font-bold text-text-main dark:text-white">{ref.full_name}</p>
                                                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 rounded">{relLabel(ref.relationship)}</span>
                                                    {bond && <span className={`px-1.5 py-0.5 bg-${bond.color}-50 dark:bg-${bond.color}-900/20 text-${bond.color}-600 text-[9px] font-black uppercase rounded flex items-center gap-0.5`}><span className="material-symbols-outlined text-[10px]">{bond.icon}</span>{bond.label}</span>}
                                                    {ref.has_visitation_rights && <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[9px] font-black uppercase rounded">Visita</span>}
                                                    {ref.is_reference_contact && <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[9px] font-black uppercase rounded">Contato Ref.</span>}
                                                    {ref.status === 'unknown_location' && <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 text-[9px] font-black uppercase rounded">Desconhecido</span>}
                                                    {ref.status === 'deceased' && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[9px] font-black uppercase rounded">Falecido</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-text-secondary dark:text-gray-500">
                                                    {ref.phone && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">call</span>{ref.phone}</span>}
                                                    {ref.city && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">location_on</span>{ref.city}</span>}
                                                </div>
                                                {ref.notes && <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 line-clamp-2">{ref.notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEdit(ref)} className="size-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center" title="Editar">
                                                    <span className="material-symbols-outlined text-gray-400 text-sm">edit</span>
                                                </button>
                                                <button onClick={() => { if (confirm(`Remover ${ref.full_name}?`)) deleteMutation.mutate(ref.id); }}
                                                    className="size-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center" title="Remover">
                                                    <span className="material-symbols-outlined text-red-400 text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* FORM VIEW */
                        <div className="p-6 space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => { setView('list'); resetForm(); }} className="size-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                                </button>
                                <h3 className="text-sm font-black text-text-main dark:text-white">{editingId ? 'Editar Referência' : 'Nova Referência Familiar'}</h3>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Nome Completo *</label>
                                <input type="text" placeholder="Nome da referência familiar..." value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-teal-500/50 transition-all" />
                            </div>

                            {/* Relationship + Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Parentesco *</label>
                                    <select value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-teal-500/50">
                                        {RELATIONSHIPS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Situação</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-teal-500/50">
                                        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Phone + City */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Telefone</label>
                                    <input type="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-teal-500/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Cidade</label>
                                    <input type="text" placeholder="Cidade / UF" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-teal-500/50 transition-all" />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Endereço</label>
                                <input type="text" placeholder="Rua, nº, bairro..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-teal-500/50 transition-all" />
                            </div>

                            {/* Bond Quality */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">Qualidade do Vínculo</label>
                                <div className="flex gap-2">
                                    {BOND_QUALITIES.map(b => (
                                        <button key={b.id} type="button" onClick={() => setForm(f => ({ ...f, bond_quality: b.id }))}
                                            className={clsx("flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-[10px] font-bold",
                                                form.bond_quality === b.id ? `border-${b.color}-500 bg-${b.color}-50 dark:bg-${b.color}-900/20 text-${b.color}-600` : "border-gray-100 dark:border-gray-700 text-text-secondary hover:border-gray-300")}>
                                            <span className="material-symbols-outlined text-lg">{b.icon}</span>
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.has_visitation_rights} onChange={e => setForm(f => ({ ...f, has_visitation_rights: e.target.checked }))}
                                        className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500" />
                                    <span className="text-xs font-bold text-text-main dark:text-white">Direito de Visita</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_reference_contact} onChange={e => setForm(f => ({ ...f, is_reference_contact: e.target.checked }))}
                                        className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500" />
                                    <span className="text-xs font-bold text-text-main dark:text-white">Contato de Referência</span>
                                </label>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Observações</label>
                                <textarea rows={3} placeholder="Informações relevantes sobre o vínculo, histórico, etc." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-teal-500/50 transition-all resize-none" />
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={() => { setView('list'); resetForm(); }}
                                    className="h-12 flex-1 text-sm font-bold text-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-display">Cancelar</button>
                                <button onClick={() => saveMutation.mutate()} disabled={!form.full_name || saveMutation.isPending}
                                    className="h-12 flex-1 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {saveMutation.isPending ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-outlined text-lg">save</span>{editingId ? 'Atualizar' : 'Salvar'}</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>, document.body
    );
}
