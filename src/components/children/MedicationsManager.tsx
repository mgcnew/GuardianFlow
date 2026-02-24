import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { useLogger } from '../../hooks/useLogger';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    frequency_interval: number | null;
    last_administration: string | null;
    start_date: string;
    end_date: string | null;
    instructions: string | null;
    prescribed_by: string | null;
    type: 'continuous' | 'temporary' | 'sos';
    side_effects: string | null;
    storage_instructions: string | null;
}

interface MedicationsManagerProps {
    childId: string;
}

export function MedicationsManager({ childId }: MedicationsManagerProps) {
    const { profile } = useAuth(); // profile needed for organization_id
    const { logAction } = useLogger();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        frequency: '',
        frequency_interval: '' as string | number,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        instructions: '',
        prescribed_by: '',
        type: 'continuous',
        side_effects: '',
        storage_instructions: '',
    });

    const { data: medications, isLoading } = useQuery({
        queryKey: ['medications', childId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('medications')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Medication[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (newMedication: any) => {
            const { error } = await supabase
                .from('medications')
                .insert([{
                    ...newMedication,
                    child_id: childId,
                    organization_id: profile?.organization_id, // Ensure profile.organization_id is used
                }]);
            if (error) throw error;
            logAction('CREATE', 'medication', undefined, {
                child_id: childId,
                name: newMedication.name,
                dosage: newMedication.dosage
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medications', childId] });
            setIsFormOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (medication: any) => {
            const { error } = await supabase
                .from('medications')
                .update(medication)
                .eq('id', editingMedication?.id);
            if (error) throw error;
            logAction('UPDATE', 'medication', editingMedication?.id, {
                child_id: childId,
                name: medication.name
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medications', childId] });
            setIsFormOpen(false);
            setEditingMedication(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('medications').delete().eq('id', id);
            if (error) throw error;
            logAction('DELETE', 'medication', id, {
                child_id: childId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medications', childId] });
        },
    });

    const registerDoseMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('medications')
                .update({ last_administration: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            logAction('DOSE_ADMINISTRATION', 'medication', id, {
                child_id: childId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medications', childId] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = { ...formData };
        if (payload.end_date === '') payload.end_date = null;
        if (payload.frequency_interval === '') payload.frequency_interval = null;
        else payload.frequency_interval = Number(payload.frequency_interval);

        if (editingMedication) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleEdit = (medication: Medication) => {
        setEditingMedication(medication);
        setFormData({
            name: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            frequency_interval: medication.frequency_interval || '',
            start_date: medication.start_date,
            end_date: medication.end_date || '',
            instructions: medication.instructions || '',
            prescribed_by: medication.prescribed_by || '',
            type: medication.type,
            side_effects: medication.side_effects || '',
            storage_instructions: medication.storage_instructions || '',
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este medicamento?')) {
            deleteMutation.mutate(id);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            dosage: '',
            frequency: '',
            frequency_interval: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            instructions: '',
            prescribed_by: '',
            type: 'continuous',
            side_effects: '',
            storage_instructions: '',
        });
        setEditingMedication(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Add Button */}
            {!isFormOpen && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div>
                        <h4 className="font-bold text-blue-900 dark:text-blue-100">Controle de Medicação</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Gerencie medicamentos ativos e histórico.</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        Adicionar Novo
                    </button>
                </div>
            )}

            {isFormOpen ? (
                <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/50 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <h5 className="font-black text-lg text-text-main dark:text-white mb-4 uppercase tracking-tight">
                        {editingMedication ? 'Editar Medicamento' : 'Novo Medicamento'}
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Nome do Medicamento *</label>
                            <input required type="text" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Dipirona Gotas" />
                        </div>
                        <div>
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Dosagem *</label>
                            <input required type="text" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} placeholder="Ex: 500mg ou 20 gotas" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Frequência (Texto) *</label>
                                <input required type="text" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                    value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} placeholder="Ex: 8/8 horas" />
                            </div>
                            <div>
                                <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Intervalo (Horas)</label>
                                <input type="number" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                    value={formData.frequency_interval} onChange={e => setFormData({ ...formData, frequency_interval: e.target.value })} placeholder="Ex: 8" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Tipo *</label>
                            <select className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                                <option value="continuous">Contínuo</option>
                                <option value="temporary">Temporário</option>
                                <option value="sos">SOS (Se necessário)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Data Início *</label>
                            <input required type="date" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Data Fim</label>
                            <input type="date" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Instruções / Como tomar</label>
                            <textarea className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none min-h-[80px]"
                                value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} placeholder="Ex: Tomar após as refeições..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Efeitos Colaterais / Observações</label>
                            <textarea className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none min-h-[60px]"
                                value={formData.side_effects} onChange={e => setFormData({ ...formData, side_effects: e.target.value })} placeholder="Registro de reações adversas..." />
                        </div>
                        <div>
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Prescrito Por (Médico/CRM)</label>
                            <input type="text" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                value={formData.prescribed_by} onChange={e => setFormData({ ...formData, prescribed_by: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-black text-text-secondary uppercase tracking-widest block mb-1">Instruções de Armazenamento</label>
                            <input type="text" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary outline-none"
                                value={formData.storage_instructions} onChange={e => setFormData({ ...formData, storage_instructions: e.target.value })} placeholder="Ex: Manter na geladeira" />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white active:scale-95 text-xs sm:text-sm uppercase sm:normal-case tracking-widest sm:tracking-normal">Cancelar</button>
                        <button type="submit" className="px-6 py-3.5 sm:py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 text-xs sm:text-sm uppercase sm:normal-case tracking-widest sm:tracking-normal">
                            {editingMedication ? 'Atualizar Dados' : 'Salvar Medicamento'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2 w-full">
                                            <div className="flex gap-2">
                                                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700/50 rounded-lg"></div>
                                            </div>
                                            <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                                            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="w-full h-16 bg-gray-200 dark:bg-gray-700/50 rounded-xl"></div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                        <div className="w-full h-12 bg-gray-200 dark:bg-gray-700/50 rounded-lg"></div>
                                        <div className="w-full h-12 bg-gray-200 dark:bg-gray-700/50 rounded-lg"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : medications?.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">medication</span>
                            <p className="text-gray-500 font-medium">Nenhum medicamento cadastrado.</p>
                        </div>
                    ) : (
                        medications?.map(med => (
                            <div key={med.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative group">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(med)} className="p-2 sm:p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-all active:scale-90" title="Editar">
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(med.id)} className="p-2 sm:p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-all active:scale-90" title="Excluir">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>

                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                                med.type === 'continuous' ? "bg-red-100 text-red-700 border border-red-200" :
                                                    med.type === 'temporary' ? "bg-blue-100 text-blue-700 border border-blue-200" :
                                                        "bg-amber-100 text-amber-700 border border-amber-200"
                                            )}>
                                                {med.type === 'continuous' ? 'Uso Contínuo' : med.type === 'temporary' ? 'Temporário' : 'SOS / Se Necessário'}
                                            </span>
                                            {med.end_date && new Date(med.end_date) < new Date() && (
                                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-gray-200">Finalizado</span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-lg text-text-main dark:text-white">{med.name}</h3>
                                        <p className="text-sm font-medium text-text-secondary dark:text-gray-400">{med.dosage} • {med.frequency}</p>

                                        {med.frequency_interval && (
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                                                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Próxima Dose</p>
                                                    <p className="text-sm font-black text-blue-900 dark:text-blue-100">
                                                        {med.last_administration ? (
                                                            format(new Date(new Date(med.last_administration).getTime() + (med.frequency_interval * 60 * 60 * 1000)), "HH:mm 'de' dd/MM", { locale: ptBR })
                                                        ) : (
                                                            'Não registrada'
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => registerDoseMutation.mutate(med.id)}
                                                    disabled={registerDoseMutation.isPending}
                                                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                                    Registrar Dose
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                    {med.instructions && (
                                        <div className="col-span-full">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Instruções</p>
                                            <p className="text-sm text-text-secondary dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">{med.instructions}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Período</p>
                                        <p className="text-xs text-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg inline-block border border-gray-100 dark:border-gray-700">
                                            {format(new Date(med.start_date), "dd/MM/yy", { locale: ptBR })}
                                            {med.end_date ? ` até ${format(new Date(med.end_date), "dd/MM/yy", { locale: ptBR })}` : ' (Indeterminado)'}
                                        </p>
                                    </div>
                                    {med.prescribed_by && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Prescrito por</p>
                                            <p className="text-xs text-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg inline-block border border-gray-100 dark:border-gray-700">{med.prescribed_by}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
