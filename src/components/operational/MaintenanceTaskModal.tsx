import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

interface MaintenanceTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: any;
}

export function MaintenanceTaskModal({ isOpen, onClose, task }: MaintenanceTaskModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: task?.title || '',
        description: task?.description || '',
        task_type: task?.task_type || 'preventive',
        location: task?.location || '',
        scheduled_date: task?.scheduled_date ? format(parseISO(task.scheduled_date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: task?.status || 'pending',
    });

    const [materials, setMaterials] = useState<any[]>(task?.materials_used || []);
    const [newMaterial, setNewMaterial] = useState({ name: '', quantity: 1 });

    // Photo states
    const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
    const [beforePreview, setBeforePreview] = useState<string | null>(task?.photos?.find((p: any) => p.photo_type === 'before')?.photo_url || null);
    const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
    const [afterPreview, setAfterPreview] = useState<string | null>(task?.photos?.find((p: any) => p.photo_type === 'after')?.photo_url || null);

    const beforeInputRef = useRef<HTMLInputElement>(null);
    const afterInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (type === 'before') {
                setBeforePhoto(file);
                setBeforePreview(URL.createObjectURL(file));
            } else {
                setAfterPhoto(file);
                setAfterPreview(URL.createObjectURL(file));
            }
        }
    };

    const addMaterial = () => {
        if (!newMaterial.name) return;
        setMaterials([...materials, { ...newMaterial, id: Date.now().toString() }]);
        setNewMaterial({ name: '', quantity: 1 });
    };

    const removeMaterial = (id: string) => {
        setMaterials(materials.filter(m => m.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.organization_id) return;

        setLoading(true);
        try {
            let taskId = task?.id;

            // 1. Save/Update Task
            const taskPayload = {
                ...formData,
                organization_id: profile.organization_id,
                materials_used: materials,
                assigned_to: profile.id,
                completed_at: formData.status === 'completed' ? new Date().toISOString() : null
            };

            if (taskId) {
                const { error } = await supabase
                    .from('maintenance_tasks')
                    .update(taskPayload)
                    .eq('id', taskId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('maintenance_tasks')
                    .insert([taskPayload])
                    .select()
                    .single();
                if (error) throw error;
                taskId = data.id;
            }

            // 2. Upload Photos if any
            const uploadPhoto = async (file: File, type: 'before' | 'after') => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${taskId}_${type}_${Date.now()}.${fileExt}`;
                const filePath = `maintenance/${profile.organization_id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('maintenance-photos')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('maintenance-photos')
                    .getPublicUrl(filePath);

                const { error: dbError } = await supabase
                    .from('maintenance_photos')
                    .insert([{
                        task_id: taskId,
                        photo_url: publicUrl,
                        photo_type: type
                    }]);

                if (dbError) throw dbError;
            };

            if (beforePhoto) await uploadPhoto(beforePhoto, 'before');
            if (afterPhoto) await uploadPhoto(afterPhoto, 'after');

            queryClient.invalidateQueries({ queryKey: ['maintenanceTasks'] });
            onClose();
        } catch (error: any) {
            alert('Erro ao salvar tarefa: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-gray-800">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">construction</span>
                        </div>
                        <h2 className="text-xl font-black text-text-main dark:text-white uppercase tracking-tight font-display">
                            {task ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar font-sans">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-1.5 block">Título da Tarefa</label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                                placeholder="Ex: Reparo na fiação do dormitório 2"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-1.5 block">Tipo</label>
                            <select
                                value={formData.task_type}
                                onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                            >
                                <option value="preventive">Preventiva</option>
                                <option value="corrective">Corretiva</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-1.5 block">Local</label>
                            <input
                                required
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                                placeholder="Dormitório, Cozinha, etc."
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-1.5 block">Data/Hora Agendada</label>
                            <input
                                required
                                type="datetime-local"
                                value={formData.scheduled_date}
                                onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-1.5 block">Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white font-bold"
                            >
                                <option value="pending">Pendente</option>
                                <option value="in_progress">Em Andamento</option>
                                <option value="completed">Concluída</option>
                                <option value="cancelled">Cancelada</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-1.5 block">Descrição do Serviço</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white h-24 resize-none"
                            placeholder="Descreva o que precisa ser feito..."
                        />
                    </div>

                    {/* Materials Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest block">Materiais Utilizados</label>
                        <div className="flex gap-2">
                            <input
                                value={newMaterial.name}
                                onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })}
                                className="flex-1 bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none dark:text-white"
                                placeholder="Nome do material"
                            />
                            <input
                                type="number"
                                value={newMaterial.quantity}
                                onChange={e => setNewMaterial({ ...newMaterial, quantity: Number(e.target.value) })}
                                className="w-20 bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none dark:text-white text-center"
                            />
                            <button
                                type="button"
                                onClick={addMaterial}
                                className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                            >
                                <span className="material-symbols-outlined">add</span>
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {materials.map(m => (
                                <div key={m.id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold text-text-main dark:text-white border border-border-light dark:border-gray-700 animate-in slide-in-from-left duration-200">
                                    <span>{m.name} ({m.quantity}x)</span>
                                    <button
                                        type="button"
                                        onClick={() => removeMaterial(m.id)}
                                        className="text-red-500 hover:text-red-600 ml-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Photo Capture Section */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Before Photo */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest block text-center">Foto: Antes (Problema)</label>
                            <div
                                onClick={() => beforeInputRef.current?.click()}
                                className="aspect-video bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-border-light dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                            >
                                {beforePreview ? (
                                    <>
                                        <img src={beforePreview} className="w-full h-full object-cover" alt="Antes" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">Alterar Foto</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-gray-400 text-3xl mb-1">camera_alt</span>
                                        <span className="text-[10px] font-bold text-text-secondary uppercase">Capturar</span>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={beforeInputRef}
                                className="hidden"
                                onChange={e => handlePhotoChange(e, 'before')}
                            />
                        </div>

                        {/* After Photo */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest block text-center">Foto: Depois (Solução)</label>
                            <div
                                onClick={() => afterInputRef.current?.click()}
                                className="aspect-video bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-border-light dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                            >
                                {afterPreview ? (
                                    <>
                                        <img src={afterPreview} className="w-full h-full object-cover" alt="Depois" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">Alterar Foto</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-gray-400 text-3xl mb-1">done_all</span>
                                        <span className="text-[10px] font-bold text-text-secondary uppercase">Conclusão</span>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={afterInputRef}
                                className="hidden"
                                onChange={e => handlePhotoChange(e, 'after')}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl font-bold text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all uppercase text-[10px] tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading}
                            className="flex-[2] bg-primary hover:bg-primary/90 text-white font-bold px-6 py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
                        >
                            {loading ? (
                                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-base">save</span>
                            )}
                            {task ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
