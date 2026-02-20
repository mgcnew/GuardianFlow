import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { DocumentUploadManager } from './DocumentUploadManager';

interface AddChildModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'basic' | 'origin' | 'docs' | 'health' | 'institutional';

// ─── Reusable styled components ──────────────────────────
const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white font-medium";
const labelClass = "text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest";
const sectionTitle = "text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10";

export function AddChildModal({ isOpen, onClose }: AddChildModalProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('basic');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [pendingDocuments, setPendingDocuments] = useState<{ file: File; type: string }[]>([]);

    const [formData, setFormData] = useState({
        // ── Basic ──
        full_name: '',
        date_of_birth: '',
        gender: '',
        ethnicity: '',

        // ── Origin ──
        origin_type: '',
        origin_name: '',
        origin_reason: '',
        origin_city: '',
        referred_by: '',

        // ── Institutional ──
        admission_date: new Date().toISOString().split('T')[0],
        status: 'active',
        unit: '',
        judicial_process: '',
        reason_for_admission: '',
        legal_status: '',

        // ── Docs ──
        mother_name: '',
        father_name: '',
        nis: '',
        cpf: '',
        rg: '',

        // ── Health ──
        health_info: '',
        allergies: '',
        medications: '',
        blood_type: '',
        sus_card: '',
        has_disability: false,
        disability_type: '',
        has_chronic_disease: false,
        chronic_disease_details: '',
        has_addictions: false,
        addiction_details: '',
        is_pregnant: false,
        pregnancy_weeks: '',
        vaccination_status: 'unknown',
        psychological_status: '',
        special_dietary_needs: '',
        physical_marks: '',
        has_suicidal_ideation: false,
        has_self_harm: false,
        initial_emotional_state: '',
        behavioral_observations: '',
        diet_details: '',
        psychologist_indications: '',
        pedagogue_indications: '',

        // ── Care ──
        schooling: '',
        religion: '',
        clothes_size: '',
        shoes_size: '',

        // ── Guardian ──
        legal_guardian_name: '',
        legal_guardian_phone: '',
        legal_guardian_relationship: '',
    });

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
        if (!user) return;

        if (!formData.full_name || !formData.date_of_birth || !formData.unit) {
            alert('Por favor, preencha todos os campos obrigatórios (*)');
            setActiveTab('basic');
            return;
        }

        setLoading(true);
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            if (!profile?.organization_id) throw new Error('Organização não encontrada.');

            let photoUrl = '';

            if (photoFile) {
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

            // Build clean payload
            const payload = {
                ...formData,
                pregnancy_weeks: formData.pregnancy_weeks ? parseInt(formData.pregnancy_weeks as string) : null,
                organization_id: profile.organization_id,
                photo_url: photoUrl || null,
            };

            const { data: newChild, error: insertError } = await supabase
                .from('children')
                .insert(payload)
                .select()
                .single();

            if (insertError) throw insertError;

            // Upload pending documents
            if (pendingDocuments.length > 0 && newChild) {
                for (const doc of pendingDocuments) {
                    const docFile = doc.file;
                    const docType = doc.type;
                    const fileExt = docFile.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `${profile.organization_id}/${newChild.id}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('child-documents')
                        .upload(filePath, docFile);

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('child-documents')
                            .getPublicUrl(filePath);

                        await supabase.from('child_documents').insert({
                            child_id: newChild.id,
                            organization_id: profile.organization_id,
                            name: docFile.name,
                            type: docType,
                            url: publicUrl,
                            uploaded_by: user.id
                        });
                    }
                }
            }

            queryClient.invalidateQueries({ queryKey: ['children'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            onClose();
            resetForm();
        } catch (error: any) {
            console.error(error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            full_name: '', date_of_birth: '', gender: '', ethnicity: '',
            origin_type: '', origin_name: '', origin_reason: '', origin_city: '', referred_by: '',
            admission_date: new Date().toISOString().split('T')[0], status: 'active', unit: '',
            judicial_process: '', reason_for_admission: '', legal_status: '',
            mother_name: '', father_name: '', nis: '', cpf: '', rg: '',
            health_info: '', allergies: '', medications: '', blood_type: '', sus_card: '',
            has_disability: false, disability_type: '', has_chronic_disease: false, chronic_disease_details: '',
            has_addictions: false, addiction_details: '', is_pregnant: false, pregnancy_weeks: '',
            vaccination_status: 'unknown', psychological_status: '', special_dietary_needs: '',
            physical_marks: '', has_suicidal_ideation: false, has_self_harm: false,
            initial_emotional_state: '', behavioral_observations: '',
            diet_details: '', psychologist_indications: '', pedagogue_indications: '',
            schooling: '', religion: '', clothes_size: '', shoes_size: '',
            legal_guardian_name: '', legal_guardian_phone: '', legal_guardian_relationship: '',
        });
        setPhotoFile(null);
        setPhotoPreview(null);
        setPendingDocuments([]);
        setActiveTab('basic');
    };

    // Helper: does origin_type need detail fields?
    const originNeedsDetails = ['transfer', 'hospital', 'street', 'police', 'council', 'other'].includes(formData.origin_type);

    const originTypeLabels: Record<string, string> = {
        transfer: 'Transferência de outra unidade',
        hospital: 'Encaminhamento hospitalar',
        street: 'Situação de rua',
        family: 'Entrega familiar voluntária',
        court_order: 'Ordem judicial',
        police: 'Apreensão policial',
        council: 'Conselho Tutelar',
        other: 'Outro',
    };

    const originDetailLabel: Record<string, string> = {
        transfer: 'Nome da Unidade de Origem',
        hospital: 'Nome do Hospital',
        street: 'Local onde foi encontrado',
        police: 'Delegacia / Unidade Policial',
        council: 'Conselho Tutelar',
        other: 'Local / Instituição de Origem',
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-none sm:border sm:border-border-light dark:sm:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="flex-shrink-0 px-4 sm:px-8 py-3 sm:py-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <h3 className="text-base sm:text-2xl font-black text-text-main dark:text-white font-display tracking-tight truncate">Novo Acolhimento</h3>
                        <p className="text-[9px] sm:text-sm text-text-secondary dark:text-gray-400 font-display">Informações completas do prontuário.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95">
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
                            { id: 'docs', label: 'Documentos', icon: 'folder' },
                            { id: 'institutional', label: 'Institucional', icon: 'account_balance' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap py-3.5 px-3 text-[9px] sm:text-[10px] font-black transition-all border-b-2 uppercase tracking-widest font-display active:scale-95",
                                    activeTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-text-secondary dark:text-gray-500 hover:text-text-main dark:hover:text-white hover:border-gray-200 dark:hover:border-gray-700"
                                )}
                            >
                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 no-scrollbar scroll-smooth">
                    <form id="add-child-form" onSubmit={handleSubmit} className="space-y-8">

                        {/* ═══════ TAB: BASIC ═══════ */}
                        {activeTab === 'basic' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    {/* Photo */}
                                    <div className="flex flex-col items-center sm:items-start gap-4">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 cursor-pointer hover:border-primary transition-all group relative"
                                        >
                                            {photoPreview ? (
                                                <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                                            ) : (
                                                <div className="flex flex-col items-center text-gray-400 group-hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                                    <span className="text-[10px] font-bold uppercase mt-1">Foto</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <span className="text-white text-[10px] font-bold uppercase">Trocar</span>
                                            </div>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                        <p className="text-[10px] text-text-secondary dark:text-gray-500 font-bold uppercase">Tamanho máx: 2MB</p>
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

                                {/* Guardian Info */}
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
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-display">
                                            <span className="font-black">Importante:</span> Informações sobre a procedência do acolhido são fundamentais para traçar o perfil de acolhimento e darão base para o Plano Individual de Atendimento (PIA).
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>De onde veio o acolhido? *</label>
                                    <select className={inputClass} value={formData.origin_type} onChange={(e) => updateField('origin_type', e.target.value)}>
                                        <option value="">Selecione a procedência</option>
                                        {Object.entries(originTypeLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Conditional Detail Fields */}
                                {originNeedsDetails && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                                        <h4 className={sectionTitle}>
                                            <span className="material-symbols-outlined text-sm">location_city</span>
                                            Detalhes da Procedência
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className={labelClass}>{originDetailLabel[formData.origin_type] || 'Local de Origem'}</label>
                                                <input type="text" className={inputClass} placeholder="Nome completo" value={formData.origin_name} onChange={(e) => updateField('origin_name', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className={labelClass}>Cidade de Origem</label>
                                                <input type="text" className={inputClass} value={formData.origin_city} onChange={(e) => updateField('origin_city', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Motivo / Situação da Procedência</label>
                                            <textarea
                                                className={`${inputClass} min-h-[100px]`}
                                                placeholder={
                                                    formData.origin_type === 'transfer' ? 'Ex: Transferido por superlotação, fechamento da unidade, proximidade familiar...'
                                                        : formData.origin_type === 'hospital' ? 'Ex: Criança nascida com substâncias, mãe abandonou após parto, alta médica sem responsável...'
                                                            : formData.origin_type === 'street' ? 'Ex: Encontrado em situação de rua, sem acompanhamento familiar...'
                                                                : 'Descreva a situação detalhadamente...'
                                                }
                                                value={formData.origin_reason}
                                                onChange={(e) => updateField('origin_reason', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.origin_type === 'family' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                                        <h4 className={sectionTitle}>
                                            <span className="material-symbols-outlined text-sm">family_restroom</span>
                                            Detalhes da Entrega Familiar
                                        </h4>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Motivo da Entrega</label>
                                            <textarea
                                                className={`${inputClass} min-h-[100px]`}
                                                placeholder="Descreva o motivo da entrega voluntária pela família..."
                                                value={formData.origin_reason}
                                                onChange={(e) => updateField('origin_reason', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.origin_type === 'court_order' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                                        <h4 className={sectionTitle}>
                                            <span className="material-symbols-outlined text-sm">gavel</span>
                                            Detalhes da Ordem Judicial
                                        </h4>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Detalhes da Decisão Judicial</label>
                                            <textarea
                                                className={`${inputClass} min-h-[100px]`}
                                                placeholder="Descreva a situação que levou à decisão judicial..."
                                                value={formData.origin_reason}
                                                onChange={(e) => updateField('origin_reason', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className={labelClass}>Encaminhado por</label>
                                    <input type="text" className={inputClass} placeholder="Nome da pessoa ou entidade que encaminhou" value={formData.referred_by} onChange={(e) => updateField('referred_by', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {/* ═══════ TAB: HEALTH ═══════ */}
                        {activeTab === 'health' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                                {/* Medical Info */}
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
                                        <input type="text" className={inputClass} placeholder="Nº do cartão" value={formData.sus_card} onChange={(e) => updateField('sus_card', e.target.value)} />
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
                                        <input type="text" className={inputClass} placeholder="Medicamentos, alimentos, etc." value={formData.allergies} onChange={(e) => updateField('allergies', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Medicamentos em Uso</label>
                                        <input type="text" className={inputClass} placeholder="Nome, dosagem" value={formData.medications} onChange={(e) => updateField('medications', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Necessidades Alimentares Especiais</label>
                                    <select className={inputClass} value={formData.special_dietary_needs} onChange={(e) => updateField('special_dietary_needs', e.target.value)}>
                                        <option value="">Nenhuma</option>
                                        <option value="vegetarian">Vegetariano</option>
                                        <option value="vegan">Vegano</option>
                                        <option value="lactose_intolerant">Intolerante à Lactose</option>
                                        <option value="gluten_free">Sem Glúten (Celíaco)</option>
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

                                <div className="md:col-span-2 space-y-1">
                                    <label className={labelClass}>Condições de Saúde / Deficiências</label>
                                    <textarea className={`${inputClass} min-h-[70px]`} placeholder="Descreva condições de saúde relevantes..." value={formData.health_info} onChange={(e) => updateField('health_info', e.target.value)} />
                                </div>

                                {/* Disabilities */}
                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">accessibility_new</span>
                                    Condições Especiais
                                </h4>

                                {/* Disability */}
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
                                            <option value="autistic_spectrum">Transtorno do Espectro Autista (TEA)</option>
                                            <option value="multiple">Múltipla</option>
                                        </select>
                                    )}
                                </div>

                                {/* Chronic Disease */}
                                <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" checked={formData.has_chronic_disease} onChange={(e) => updateField('has_chronic_disease', e.target.checked)} />
                                        <span className="text-sm font-bold text-text-main dark:text-white font-display">Doença Crônica</span>
                                    </label>
                                    {formData.has_chronic_disease && (
                                        <input type="text" className={`${inputClass} animate-in fade-in duration-200`} placeholder="Descreva a doença..." value={formData.chronic_disease_details} onChange={(e) => updateField('chronic_disease_details', e.target.value)} />
                                    )}
                                </div>

                                {/* Pregnancy */}
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

                                {/* Addictions */}
                                <h4 className={sectionTitle}>
                                    <span className="material-symbols-outlined text-sm">smoking_rooms</span>
                                    Vícios & Substâncias
                                </h4>
                                <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-gray-300" checked={formData.has_addictions} onChange={(e) => updateField('has_addictions', e.target.checked)} />
                                        <span className="text-sm font-bold text-text-main dark:text-white font-display">Uso de Substâncias / Vícios</span>
                                    </label>
                                    {formData.has_addictions && (
                                        <div className="space-y-3 animate-in fade-in duration-200">
                                            <select className={inputClass} value={formData.addiction_details} onChange={(e) => updateField('addiction_details', e.target.value)}>
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
                                        </div>
                                    )}
                                </div>

                                {/* Emotional / Psychological */}
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
                                    <textarea className={`${inputClass} min-h-[80px]`} placeholder="Comportamento na chegada, interação com outros, medos, traumas identificados..." value={formData.behavioral_observations} onChange={(e) => updateField('behavioral_observations', e.target.value)} />
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Marcas Físicas (Cicatrizes, tatuagens, marcas de nascença)</label>
                                    <textarea className={`${inputClass} min-h-[60px]`} placeholder="Descreva marcas físicas relevantes..." value={formData.physical_marks} onChange={(e) => updateField('physical_marks', e.target.value)} />
                                </div>

                                {/* Professional Indications */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h4 className={sectionTitle}>
                                        <span className="material-symbols-outlined text-sm">assignment_ind</span>
                                        Indicações Profissionais
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                        <div className="space-y-1">
                                            <label className={labelClass}>Indicações do Psicólogo</label>
                                            <textarea className={`${inputClass} min-h-[80px]`} placeholder="Avaliações, recomendações..." value={formData.psychologist_indications} onChange={(e) => updateField('psychologist_indications', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Indicações do Pedagogo</label>
                                            <textarea className={`${inputClass} min-h-[80px]`} placeholder="Acompanhamento escolar, necessidades pedagógicas..." value={formData.pedagogue_indications} onChange={(e) => updateField('pedagogue_indications', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Care Info */}
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
                                            <option value="fundamental_1">Fundamental I (1º-5º)</option>
                                            <option value="fundamental_2">Fundamental II (6º-9º)</option>
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
                                    <DocumentUploadManager
                                        pendingFiles={pendingDocuments}
                                        onAddPendingFile={(file, type) => setPendingDocuments([...pendingDocuments, { file, type }])}
                                        onRemovePendingFile={(index) => setPendingDocuments(pendingDocuments.filter((_, i) => i !== index))}
                                    />
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
                                    <input required type="text" placeholder="Ex: Unidade 01 - Centro" className={inputClass} value={formData.unit} onChange={(e) => updateField('unit', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Status de Acolhimento *</label>
                                    <select className={inputClass} value={formData.status} onChange={(e) => updateField('status', e.target.value)}>
                                        <option value="active">Caso Ativo (Normal)</option>
                                        <option value="urgent">Caso Urgente (Alerta)</option>
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
                                    <textarea
                                        className={`${inputClass} min-h-[80px]`}
                                        placeholder="Ex: Negligência familiar, Abandono..."
                                        value={formData.reason_for_admission}
                                        onChange={(e) => updateField('reason_for_admission', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-4 sm:px-8 py-4 sm:py-5 border-t border-border-light dark:border-gray-800 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-3 sm:px-6 text-[10px] sm:text-xs font-black uppercase tracking-widest text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <div className="flex items-center gap-2 sm:gap-3">
                        {activeTab !== 'basic' && (
                            <button
                                type="button"
                                onClick={() => {
                                    const tabs: TabType[] = ['basic', 'origin', 'health', 'docs', 'institutional'];
                                    const currentIdx = tabs.indexOf(activeTab);
                                    if (currentIdx > 0) setActiveTab(tabs[currentIdx - 1]);
                                }}
                                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-text-main dark:text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                <span className="hidden sm:inline">Anterior</span>
                            </button>
                        )}

                        {activeTab !== 'institutional' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    const tabs: TabType[] = ['basic', 'origin', 'health', 'docs', 'institutional'];
                                    const currentIdx = tabs.indexOf(activeTab);
                                    if (currentIdx < tabs.length - 1) setActiveTab(tabs[currentIdx + 1]);
                                }}
                                className="px-6 py-3 bg-primary/10 text-primary text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center gap-2"
                            >
                                Próximo
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                form="add-child-form"
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-primary text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                        Concluir
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
