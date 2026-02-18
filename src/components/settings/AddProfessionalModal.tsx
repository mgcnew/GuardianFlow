import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { type Role } from '../../contexts/AuthContext';

interface AddProfessionalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddProfessionalModal({ isOpen, onClose, onSuccess }: AddProfessionalModalProps) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: '',
        email: '',
        role: 'educator' as Role,
        phone: '',
        cpf: '',
        birth_date: '',
        specialty: '',
        registry_number: '',
        academic_background: '',
        skills: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.organization_id) return;
        setLoading(true);
        setError(null);

        try {
            // In a real system, we would also check if the user already exists in auth.users
            // For now, we create the invite. When the user signs up with this email, 
            // the system should recognize them.

            const { error: inviteError } = await supabase
                .from('invites')
                .insert([{
                    organization_id: profile.organization_id,
                    email: form.email.toLowerCase().trim(),
                    role: form.role,
                    full_name: form.full_name,
                    initial_data: {
                        phone: form.phone,
                        cpf: form.cpf,
                        birth_date: form.birth_date,
                        specialty: form.specialty,
                        registry_number: form.registry_number,
                        academic_background: form.academic_background,
                        skills: form.skills,
                    },
                    created_by: profile.id
                }]);

            if (inviteError) {
                if (inviteError.code === '23505') {
                    throw new Error('Já existe um convite pendente para este e-mail nesta unidade.');
                }
                throw inviteError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error sending invite:', err);
            setError(err.message || 'Erro ao enviar convite');
        } finally {
            setLoading(false);
        }
    };

    const roles: { value: Role; label: string; icon: string }[] = [
        { value: 'educator', label: 'Educador/Cuidador', icon: 'school' },
        { value: 'technician', label: 'Técnico (Psicólogo/AS)', icon: 'psychology' },
        { value: 'pedagogue', label: 'Pedagogo', icon: 'local_library' },
        { value: 'operational', label: 'Operacional/Apoio', icon: 'engineering' },
        { value: 'org_admin', label: 'Administrador da Unidade', icon: 'admin_panel_settings' },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                    <div>
                        <h2 className="text-xl font-extrabold text-text-main dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">person_add</span>
                            Novo Profissional
                        </h2>
                        <p className="text-xs text-text-secondary dark:text-gray-400 font-medium mt-1">
                            Preencha os dados importantes para a competência do profissional.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-text-secondary">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    {/* Section: Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">assignment_ind</span>
                            Identificação Básica
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Nome Completo *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Ex: Carlos Oliveira Santos"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">E-mail Profissional *</label>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="carlos.santos@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Papel / Função *</label>
                                <select
                                    required
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value as Role })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                >
                                    {roles.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">CPF *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.cpf}
                                    onChange={e => setForm({ ...form, cpf: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={form.birth_date}
                                    onChange={e => setForm({ ...form, birth_date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Professional Competence */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">verified</span>
                            Competência Profissional
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Especialidade / Área de Atuação *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.specialty}
                                    onChange={e => setForm({ ...form, specialty: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Ex: Psicólogo Clínico, Educador Social, etc."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Registro Profissional (CRP/CRM/etc)</label>
                                <input
                                    type="text"
                                    value={form.registry_number}
                                    onChange={e => setForm({ ...form, registry_number: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-800 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Ex: CRP 00/0000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Telefone de Contato *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-800 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Formação Acadêmica</label>
                                <textarea
                                    rows={2}
                                    value={form.academic_background}
                                    onChange={e => setForm({ ...form, academic_background: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-800 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    placeholder="Liste as formações e graduações..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 mb-1.5 uppercase ml-1">Habilidades e Competências Técnicas</label>
                                <textarea
                                    rows={3}
                                    value={form.skills}
                                    onChange={e => setForm({ ...form, skills: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-border-light dark:border-gray-800 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    placeholder="Ex: Gestão de conflitos, Atendimento lúdico, Informática básica..."
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Processando...' : 'Enviar Convite'}
                        {!loading && <span className="material-symbols-outlined text-lg">send</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}
