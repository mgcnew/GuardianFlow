import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { MedicationsManager } from './MedicationsManager';
import { DocumentUploadManager } from './DocumentUploadManager';
import { useLogger } from '../../hooks/useLogger';
import { useToast } from '../../contexts/ToastContext';

interface EditChildModalProps {
    isOpen: boolean;
    onClose: () => void;
    child: any;
    initialTab?: TabType;
}

type TabType = 'basic' | 'origin' | 'docs' | 'health' | 'medications' | 'institutional';

const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white font-medium";
const labelClass = "text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest";
const sectionTitle = "text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10";

export function EditChildModal({ isOpen, onClose, child, initialTab = 'basic' }: EditChildModalProps) {
    const { user } = useAuth();
    const { logAction } = useLogger();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(child?.photo_url || null);

    const [formData, setFormData] = useState({
        // Basic
        full_name: '', date_of_birth: '', gender: '', ethnicity: '', religion: '',
        // Origin
        origin_type: '', origin_name: '', origin_reason: '', origin_city: '', referred_by: '',
        // Institutional
        admission_date: '', status: 'active', unit: '', judicial_process: '', reason_for_admission: '', legal_status: '',
        // Docs
        mother_name: '', father_name: '', nis: '', cpf: '', rg: '',
        // Health
        health_info: '', allergies: '', medications: '', blood_type: '', sus_card: '',
        has_disability: false, disability_type: '',
        has_chronic_disease: false, chronic_disease_details: '',
        has_addictions: false, addiction_details: '',
        is_pregnant: false, pregnancy_weeks: '' as string | number,
        vaccination_status: 'unknown', psychological_status: '', special_dietary_needs: '',
        physical_marks: '', has_suicidal_ideation: false, has_self_harm: false,
        initial_emotional_state: '', behavioral_observations: '',
        diet_details: '', psychologist_indications: '', pedagogue_indications: '',
        // Care
        schooling: '', clothes_size: '', shoes_size: '',
        // Guardian
        legal_guardian_name: '', legal_guardian_phone: '', legal_guardian_relationship: '',
    });

    useEffect(() => {
        if (child) {
            setFormData({
                full_name: child.full_name || '', date_of_birth: child.date_of_birth || '',
                gender: child.gender || '', ethnicity: child.ethnicity || '', religion: child.religion || '',
                origin_type: child.origin_type || '', origin_name: child.origin_name || '',
                origin_reason: child.origin_reason || '', origin_city: child.origin_city || '',
                referred_by: child.referred_by || '',
                admission_date: child.admission_date || '', status: child.status || 'active',
                unit: child.unit || '', judicial_process: child.judicial_process || '',
                reason_for_admission: child.reason_for_admission || '', legal_status: child.legal_status || '',
                mother_name: child.mother_name || '', father_name: child.father_name || '',
                nis: child.nis || '', cpf: child.cpf || '', rg: child.rg || '',
                health_info: child.health_info || '', allergies: child.allergies || '',
                medications: child.medications || '', blood_type: child.blood_type || '',
                sus_card: child.sus_card || '',
                has_disability: child.has_disability || false, disability_type: child.disability_type || '',
                has_chronic_disease: child.has_chronic_disease || false, chronic_disease_details: child.chronic_disease_details || '',
                has_addictions: child.has_addictions || false, addiction_details: child.addiction_details || '',
                is_pregnant: child.is_pregnant || false, pregnancy_weeks: child.pregnancy_weeks || '',
                vaccination_status: child.vaccination_status || 'unknown',
                psychological_status: child.psychological_status || '',
                special_dietary_needs: child.special_dietary_needs || '',
                physical_marks: child.physical_marks || '',
                has_suicidal_ideation: child.has_suicidal_ideation || false,
                has_self_harm: child.has_self_harm || false,
                initial_emotional_state: child.initial_emotional_state || '',
                behavioral_observations: child.behavioral_observations || '',
                diet_details: child.diet_details || '',
                psychologist_indications: child.psychologist_indications || '',
                pedagogue_indications: child.pedagogue_indications || '',
                schooling: child.schooling || '', clothes_size: child.clothes_size || '',
                shoes_size: child.shoes_size || '',
                legal_guardian_name: child.legal_guardian_name || '',
                legal_guardian_phone: child.legal_guardian_phone || '',
                legal_guardian_relationship: child.legal_guardian_relationship || '',
            });
            setPhotoPreview(child.photo_url || null);
            if (isOpen) setActiveTab(initialTab);
        }
    }, [child, isOpen, initialTab]);

    if (!isOpen) return null;

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !child) return;

        if (!formData.full_name || !formData.date_of_birth || !formData.unit) {
            toast('Preencha todos os campos obrigatórios (*)', 'warning');
            setActiveTab('basic');
            return;
        }

        setLoading(true);
        try {
            let photoUrl = child.photo_url;

            if (photoFile) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                if (!profile?.organization_id) throw new Error('Organização não encontrada.');

                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${profile.organization_id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('children-photos')
                    .upload(filePath, photoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('children-photos')
                    .getPublicUrl(filePath);

                photoUrl = publicUrl;
            }

            const payload = {
                ...formData,
                pregnancy_weeks: formData.pregnancy_weeks ? parseInt(formData.pregnancy_weeks as string) : null,
                photo_url: photoUrl,
            };

            const { error: updateError } = await supabase
                .from('children')
                .update(payload)
                .eq('id', child.id);

            if (updateError) throw updateError;

            logAction('UPDATE', 'child', child.id, {
                full_name: formData.full_name,
                updated_fields: Object.keys(payload)
            });

            queryClient.invalidateQueries({ queryKey: ['child', child.id] });
            queryClient.invalidateQueries({ queryKey: ['children'] });
            onClose();
        } catch (error: any) {
            console.error(error);
            toast('Erro ao atualizar: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const originNeedsDetails = ['transfer', 'hospital', 'street', 'police', 'council', 'other'].includes(formData.origin_type);

    const originTypeLabels: Record<string, string> = {
        transfer: 'Transferência de outra unidade', hospital: 'Encaminhamento hospitalar',
        street: 'Situação de rua', family: 'Entrega familiar voluntária',
        court_order: 'Ordem judicial', police: 'Apreensão policial',
        council: 'Conselho Tutelar', other: 'Outro',
    };

    const originDetailLabel: Record<string, string> = {
        transfer: 'Nome da Unidade de Origem', hospital: 'Nome do Hospital',
        street: 'Local onde foi encontrado', police: 'Delegacia / Unidade Policial',
        council: 'Conselho Tutelar', other: 'Local / Instituição de Origem',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-border-light dark:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex-shrink-0 px-5 sm:px-8 py-4 sm:py-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="text-lg sm:text-2xl font-black text-text-main dark:text-white font-display tracking-tight">Editar Prontuário</h3>
                        <p className="text-[10px] sm:text-sm text-text-secondary dark:text-gray-400 font-display">Atualize as informações de {child.full_name}.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90">
                        <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 flex border-b border-border-light dark:border-gray-800 px-4 sm:px-8 bg-white dark:bg-surface-dark overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex min-w-max sm:min-w-full">
                        {[
                            { id: 'basic', label: 'Dados Pessoais', icon: 'person' },
                            { id: 'origin', label: 'Procedência', icon: 'location_on' },
                            { id: 'health', label: 'Saúde & Perfil', icon: 'health_and_safety' },
                            { id: 'medications', label: 'Medicamentos', icon: 'medication' },
                            { id: 'docs', label: 'Documentos', icon: 'folder' },
                            { id: 'institutional', label: 'Institucional', icon: 'account_balance' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap py-4 px-4 sm:px-3 text-[10px] font-black transition-all border-b-2 uppercase tracking-[0.15em] font-display active:scale-95",
                                    activeTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-text-secondary dark:text-gray-500 hover:text-text-main dark:hover:text-white"
                                )}
                            >
                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 custom-scrollbar">
                    <form id="edit-child-form" onSubmit={handleSubmit} className="space-y-8">

                        {/* ═══════ TAB: BASIC ═══════ */}
                        {activeTab === 'basic' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="flex flex-col items-center gap-3">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 cursor-pointer hover:border-primary transition-all group relative"
                                        >
                                            {photoPreview ? (
                                                <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                                            ) : (
                                                <div className="flex flex-col items-center text-gray-400">
                                                    <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <span className="text-white text-[10px] font-bold uppercase">Trocar</span>
                                            </div>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2 space-y-1">
                                            <label className={labelClass}>Nome Completo *</label>
                                            <input required type="text" className={inputClass} value={formData.full_name} onChange={(e) => updateField('full_name', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Data de Nascimento *</label>
                                            <input required type="date" className={inputClass} value={formData.date_of_birth} onChange={(e) => updateField('date_of_birth', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Sexo</label>
                                            <select className={inputClass} value={formData.gender} onChange={(e) => updateField('gender', e.target.value)}>
                                                <option value="">Selecione</option>
                                                <option value="M">Masculino</option>
                                                <option value="F">Feminino</option>
                                                <option value="O">Outro</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Etnia / Raça</label>
                                            <select className={inputClass} value={formData.ethnicity} onChange={(e) => updateField('ethnicity', e.target.value)}>
                                                <option value="">Selecione</option>
                                                <option value="branca">Branca</option>
                                                <option value="preta">Preta</option>
                                                <option value="parda">Parda</option>
                                                <option value="amarela">Amarela</option>
                                                <option value="indigena">Indígena</option>
                                                <option value="nao_declarado">Não declarado</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Religião</label>
                                            <select className={inputClass} value={formData.religion} onChange={(e) => updateField('religion', e.target.value)}>
                                                <option value="">Selecione</option>
                                                <option value="catolica">Católica</option>
                                                <option value="evangelica">Evangélica</option>
                                                <option value="espirita">Espírita</option>
                                                <option value="umbanda">Umbanda</option>
                                                <option value="candomble">Candomblé</option>
                                                <option value="sem_religiao">Sem religião</option>
                                                <option value="outra">Outra</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Guardian */}
                                <div className="pt-4">
                                    <h4 className={sectionTitle}>
                                        <span className="material-symbols-outlined text-sm">family_restroom</span>
                                        Responsável Legal / Contato
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                        <div className="space-y-1">
                                            <label className={labelClass}>Nome do Responsável</label>
                                            <input type="text" className={inputClass} value={formData.legal_guardian_name} onChange={(e) => updateField('legal_guardian_name', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Telefone</label>
                                            <input type="tel" className={inputClass} placeholder="(00) 00000-0000" value={formData.legal_guardian_phone} onChange={(e) => updateField('legal_guardian_phone', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Grau de Parentesco</label>
                                            <select className={inputClass} value={formData.legal_guardian_relationship} onChange={(e) => updateField('legal_guardian_relationship', e.target.value)}>
                                                <option value="">Selecione</option>
                                                <option value="mae">Mãe</option>
                                                <option value="pai">Pai</option>
                                                <option value="avo">Avó / Avô</option>
                                                <option value="tio">Tio(a)</option>
                                                <option value="irmao">Irmão(ã)</option>
                                                <option value="padrinho">Padrinho / Madrinha</option>
                                                <option value="tutor">Tutor Legal</option>
                                                <option value="outro">Outro</option>
                                                <option value="nenhum">Nenhum identificado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════ TAB: ORIGIN ═══════ */}
                        {activeTab === 'origin' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-1">
                                    <label className={labelClass}>De onde veio o acolhido?</label>
                                    <select className={inputClass} value={formData.origin_type} onChange={(e) => updateField('origin_type', e.target.value)}>
                                        <option value="">Selecione a procedência</option>
                                        {Object.entries(originTypeLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {originNeedsDetails && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                                        <h4 className={sectionTitle}>
                                            <span className="material-symbols-outlined text-sm">location_city</span>
                                            Detalhes da Procedência
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className={labelClass}>{originDetailLabel[formData.origin_type] || 'Local de Origem'}</label>
                                                <input type="text" className={inputClass} value={formData.origin_name} onChange={(e) => updateField('origin_name', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className={labelClass}>Cidade de Origem</label>
                                                <input type="text" className={inputClass} value={formData.origin_city} onChange={(e) => updateField('origin_city', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Motivo / Situação</label>
                                            <textarea className={`${inputClass} min-h-[100px]`} value={formData.origin_reason} onChange={(e) => updateField('origin_reason', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {(formData.origin_type === 'family' || formData.origin_type === 'court_order') && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                                        <div className="space-y-1">
                                            <label className={labelClass}>Detalhes / Motivo</label>
                                            <textarea className={`${inputClass} min-h-[100px]`} value={formData.origin_reason} onChange={(e) => updateField('origin_reason', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className={labelClass}>Encaminhado por</label>
                                    <input type="text" className={inputClass} placeholder="Nome da pessoa ou entidade" value={formData.referred_by} onChange={(e) => updateField('referred_by', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {/* ═══════ TAB: HEALTH ═══════ */}
                        {activeTab === 'health' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">medical_services</span>
                                    Informações Médicas
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Tipo Sanguíneo</label>
                                        <select className={inputClass} value={formData.blood_type} onChange={(e) => updateField('blood_type', e.target.value)}>
                                            <option value="">Desconhecido</option>
                                            <option value="A+">A+</option><option value="A-">A-</option>
                                            <option value="B+">B+</option><option value="B-">B-</option>
                                            <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                            <option value="O+">O+</option><option value="O-">O-</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Cartão SUS</label>
                                        <input type="text" className={inputClass} value={formData.sus_card} onChange={(e) => updateField('sus_card', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Vacinação</label>
                                        <select className={inputClass} value={formData.vaccination_status} onChange={(e) => updateField('vaccination_status', e.target.value)}>
                                            <option value="unknown">Desconhecido</option>
                                            <option value="up_to_date">Em dia</option>
                                            <option value="delayed">Atrasada</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Alergias</label>
                                        <input type="text" className={inputClass} value={formData.allergies} onChange={(e) => updateField('allergies', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Medicamentos em Uso</label>
                                        <input type="text" className={inputClass} value={formData.medications} onChange={(e) => updateField('medications', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Necessidades Alimentares</label>
                                    <select className={inputClass} value={formData.special_dietary_needs} onChange={(e) => updateField('special_dietary_needs', e.target.value)}>
                                        <option value="">Nenhuma</option>
                                        <option value="vegetarian">Vegetariano</option>
                                        <option value="vegan">Vegano</option>
                                        <option value="lactose_intolerant">Intolerante à Lactose</option>
                                        <option value="gluten_free">Sem Glúten</option>
                                        <option value="diabetic">Diabético</option>
                                        <option value="other">Outro</option>
                                    </select>
                                    {(formData.special_dietary_needs && formData.special_dietary_needs !== '') && (
                                        <div className="mt-2 animate-in fade-in duration-200">
                                            <input
                                                type="text"
                                                className={inputClass}
                                                placeholder="Descreva os detalhes da dieta..."
                                                value={formData.diet_details}
                                                onChange={(e) => updateField('diet_details', e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Condições de Saúde</label>
                                    <textarea className={`${inputClass} min-h-[70px]`} value={formData.health_info} onChange={(e) => updateField('health_info', e.target.value)} />
                                </div>

                                {/* Toggleable sections */}
                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">accessibility_new</span>
                                    Condições Especiais
                                </h4>

                                <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" checked={formData.has_disability} onChange={(e) => updateField('has_disability', e.target.checked)} />
                                        <span className="text-sm font-bold text-text-main dark:text-white font-display">Possui Deficiência</span>
                                    </label>
                                    {formData.has_disability && (
                                        <select className={`${inputClass} animate-in fade-in duration-200`} value={formData.disability_type} onChange={(e) => updateField('disability_type', e.target.value)}>
                                            <option value="">Selecione o tipo</option>
                                            <option value="physical">Física</option>
                                            <option value="intellectual">Intelectual</option>
                                            <option value="visual">Visual</option>
                                            <option value="hearing">Auditiva</option>
                                            <option value="autistic_spectrum">TEA</option>
                                            <option value="multiple">Múltipla</option>
                                        </select>
                                    )}
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" checked={formData.has_chronic_disease} onChange={(e) => updateField('has_chronic_disease', e.target.checked)} />
                                        <span className="text-sm font-bold text-text-main dark:text-white font-display">Doença Crônica</span>
                                    </label>
                                    {formData.has_chronic_disease && (
                                        <input type="text" className={`${inputClass} animate-in fade-in duration-200`} placeholder="Descreva..." value={formData.chronic_disease_details} onChange={(e) => updateField('chronic_disease_details', e.target.value)} />
                                    )}
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" checked={formData.is_pregnant} onChange={(e) => updateField('is_pregnant', e.target.checked)} />
                                        <span className="text-sm font-bold text-text-main dark:text-white font-display">Gestante</span>
                                    </label>
                                    {formData.is_pregnant && (
                                        <div className="space-y-1 animate-in fade-in duration-200">
                                            <label className={labelClass}>Semanas de Gestação</label>
                                            <input type="number" min="1" max="42" className={inputClass} value={formData.pregnancy_weeks} onChange={(e) => updateField('pregnancy_weeks', e.target.value)} />
                                        </div>
                                    )}
                                </div>

                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">smoking_rooms</span>
                                    Vícios & Substâncias
                                </h4>
                                <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-gray-300" checked={formData.has_addictions} onChange={(e) => updateField('has_addictions', e.target.checked)} />
                                        <span className="text-sm font-bold text-text-main dark:text-white font-display">Uso de Substâncias</span>
                                    </label>
                                    {formData.has_addictions && (
                                        <select className={`${inputClass} animate-in fade-in duration-200`} value={formData.addiction_details} onChange={(e) => updateField('addiction_details', e.target.value)}>
                                            <option value="">Selecione</option>
                                            <option value="alcohol">Álcool</option>
                                            <option value="tobacco">Tabaco</option>
                                            <option value="marijuana">Maconha</option>
                                            <option value="crack">Crack</option>
                                            <option value="cocaine">Cocaína</option>
                                            <option value="solvents">Solventes / Cola</option>
                                            <option value="multiple">Múltiplas substâncias</option>
                                            <option value="other">Outra</option>
                                        </select>
                                    )}
                                </div>

                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">psychology</span>
                                    Estado Emocional & Psicológico
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Estado Emocional Inicial</label>
                                        <select className={inputClass} value={formData.initial_emotional_state} onChange={(e) => updateField('initial_emotional_state', e.target.value)}>
                                            <option value="">Não avaliado</option>
                                            <option value="calm">Calmo(a)</option>
                                            <option value="anxious">Ansioso(a)</option>
                                            <option value="aggressive">Agressivo(a)</option>
                                            <option value="withdrawn">Retraído(a)</option>
                                            <option value="scared">Assustado(a)</option>
                                            <option value="crying">Chorando</option>
                                            <option value="apathetic">Apático(a)</option>
                                            <option value="confused">Confuso(a)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Acompanhamento Psicológico</label>
                                        <select className={inputClass} value={formData.psychological_status} onChange={(e) => updateField('psychological_status', e.target.value)}>
                                            <option value="">Não avaliado</option>
                                            <option value="stable">Estável</option>
                                            <option value="under_treatment">Em tratamento</option>
                                            <option value="needs_evaluation">Necessita avaliação</option>
                                            <option value="crisis">Em crise</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-gray-300" checked={formData.has_suicidal_ideation} onChange={(e) => updateField('has_suicidal_ideation', e.target.checked)} />
                                            <span className="text-sm font-bold text-text-main dark:text-white font-display">Ideação Suicida</span>
                                        </label>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-gray-300" checked={formData.has_self_harm} onChange={(e) => updateField('has_self_harm', e.target.checked)} />
                                            <span className="text-sm font-bold text-text-main dark:text-white font-display">Automutilação</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Observações Comportamentais</label>
                                    <textarea className={`${inputClass} min-h-[80px]`} value={formData.behavioral_observations} onChange={(e) => updateField('behavioral_observations', e.target.value)} />
                                </div>

                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">assignment_ind</span>
                                    Indicações Profissionais
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Indicações do Psicólogo</label>
                                        <textarea className={`${inputClass} min-h-[80px]`} placeholder="Avaliações, recomendações..." value={formData.psychologist_indications} onChange={(e) => updateField('psychologist_indications', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Indicações do Pedagogo</label>
                                        <textarea className={`${inputClass} min-h-[80px]`} placeholder="Acompanhamento escolar, necessidades pedagógicas..." value={formData.pedagogue_indications} onChange={(e) => updateField('pedagogue_indications', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Marcas Físicas</label>
                                    <textarea className={`${inputClass} min-h-[60px]`} value={formData.physical_marks} onChange={(e) => updateField('physical_marks', e.target.value)} />
                                </div>

                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">checkroom</span>
                                    Informações de Cuidado
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Escolaridade</label>
                                        <select className={inputClass} value={formData.schooling} onChange={(e) => updateField('schooling', e.target.value)}>
                                            <option value="">Selecione</option>
                                            <option value="nao_alfabetizado">Não alfabetizado</option>
                                            <option value="creche">Creche</option>
                                            <option value="pre_escola">Pré-escola</option>
                                            <option value="fundamental_1">Fundamental I</option>
                                            <option value="fundamental_2">Fundamental II</option>
                                            <option value="medio">Ensino Médio</option>
                                            <option value="eja">EJA</option>
                                            <option value="nao_frequenta">Não frequenta escola</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Tam. Roupa</label>
                                        <input type="text" placeholder="Ex: 8, P, M" className={inputClass} value={formData.clothes_size} onChange={(e) => updateField('clothes_size', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Tam. Calçado</label>
                                        <input type="text" placeholder="Ex: 32" className={inputClass} value={formData.shoes_size} onChange={(e) => updateField('shoes_size', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════ TAB: MEDICATIONS ═══════ */}
                        {activeTab === 'medications' && (
                            <MedicationsManager childId={child.id} />
                        )}

                        {/* ═══════ TAB: DOCS ═══════ */}
                        {activeTab === 'docs' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="md:col-span-2 space-y-1">
                                    <label className={labelClass}>Nome da Mãe</label>
                                    <input type="text" className={inputClass} value={formData.mother_name} onChange={(e) => updateField('mother_name', e.target.value)} />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className={labelClass}>Nome do Pai</label>
                                    <input type="text" className={inputClass} value={formData.father_name} onChange={(e) => updateField('father_name', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>CPF</label>
                                    <input type="text" className={inputClass} value={formData.cpf} onChange={(e) => updateField('cpf', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>RG</label>
                                    <input type="text" className={inputClass} value={formData.rg} onChange={(e) => updateField('rg', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>NIS (Bolsa Família)</label>
                                    <input type="text" className={inputClass} value={formData.nis} onChange={(e) => updateField('nis', e.target.value)} />
                                </div>
                                <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <h4 className="text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest mb-4">Documentos Digitalizados</h4>
                                    <DocumentUploadManager childId={child.id} />
                                </div>
                            </div>
                        )}

                        {/* ═══════ TAB: INSTITUTIONAL ═══════ */}
                        {activeTab === 'institutional' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-1">
                                    <label className={labelClass}>Data de Admissão *</label>
                                    <input required type="date" className={inputClass} value={formData.admission_date} onChange={(e) => updateField('admission_date', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Unidade Responsável *</label>
                                    <input required type="text" className={inputClass} value={formData.unit} onChange={(e) => updateField('unit', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Status *</label>
                                    <select className={inputClass} value={formData.status} onChange={(e) => updateField('status', e.target.value)}>
                                        <option value="active">Caso Ativo</option>
                                        <option value="urgent">Caso Urgente</option>
                                        <option value="pending">Aguardando Documentação</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Situação Legal</label>
                                    <select className={inputClass} value={formData.legal_status} onChange={(e) => updateField('legal_status', e.target.value)}>
                                        <option value="">Selecione</option>
                                        <option value="acolhimento_provisorio">Acolhimento Provisório</option>
                                        <option value="destituicao_familiar">Destituição Familiar</option>
                                        <option value="disponivel_adocao">Disponível para Adoção</option>
                                        <option value="em_processo_adocao">Em Processo de Adoção</option>
                                        <option value="reintegracao_familiar">Reintegração Familiar</option>
                                        <option value="guarda_provisoria">Guarda Provisória</option>
                                        <option value="tutela">Tutela</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Nº Processo Judicial</label>
                                    <input type="text" className={inputClass} value={formData.judicial_process} onChange={(e) => updateField('judicial_process', e.target.value)} />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className={labelClass}>Motivo do Acolhimento</label>
                                    <textarea className={`${inputClass} min-h-[80px]`} value={formData.reason_for_admission} onChange={(e) => updateField('reason_for_admission', e.target.value)} />
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-5 sm:p-8 border-t border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-text-secondary dark:text-gray-500 uppercase tracking-[0.2em] w-full sm:w-auto text-center sm:text-left">
                        * Campos obrigatórios
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-3.5 border border-border-light dark:border-gray-700 rounded-2xl font-black text-text-secondary dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 transition-all font-display uppercase text-[10px] sm:text-xs tracking-widest active:scale-95">
                            Cancelar
                        </button>
                        <button form="edit-child-form" type="submit" disabled={loading} className="h-12 flex-1 sm:flex-none px-8 sm:px-12 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 font-display uppercase text-[10px] sm:text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95">
                            {loading ? (
                                <>
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="hidden sm:inline">Salvando...</span>
                                    <span className="sm:hidden">Gravando</span>
                                </>
                            ) : (
                                <>
                                    <span className="hidden sm:inline">Salvar Alterações</span>
                                    <span className="sm:hidden">Salvar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
