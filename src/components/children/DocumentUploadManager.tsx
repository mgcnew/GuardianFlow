import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Document {
    id: string;
    name: string;
    url: string;
    type: string;
    created_at: string;
}

interface DocumentUploadManagerProps {
    childId?: string;
    pendingFiles?: { file: File; type: string }[];
    onAddPendingFile?: (file: File, type: string) => void;
    onRemovePendingFile?: (index: number) => void;
}

export function DocumentUploadManager({ childId, pendingFiles = [], onAddPendingFile, onRemovePendingFile }: DocumentUploadManagerProps) {
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedType, setSelectedType] = useState('other');
    const [isMobile, setIsMobile] = useState(false);

    // Preview state
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [viewDoc, setViewDoc] = useState<Document | null>(null);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.innerWidth <= 768;
            setIsMobile(hasTouchScreen && isSmallScreen);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Cleanup preview URL on unmount or change
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // Fetch existing documents if childId is present
    const { data: documents, isLoading } = useQuery({
        queryKey: ['child_documents', childId],
        queryFn: async () => {
            if (!childId) return [];
            const { data, error } = await supabase
                .from('child_documents')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Document[];
        },
        enabled: !!childId,
    });

    const confirmAndUpload = async () => {
        if (!previewFile) return;
        await uploadFile(previewFile);
        clearPreview();
    };

    const clearPreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewFile(null);
        setPreviewUrl(null);
        // Reset file inputs so re-selecting the same file works
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const uploadFile = async (file: File) => {
        if (!childId || !profile?.organization_id) {
            onAddPendingFile?.(file, selectedType);
            setSelectedType('other');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${profile.organization_id}/${childId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('child-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('child-documents')
                .getPublicUrl(filePath);

            const { error: insertError } = await supabase
                .from('child_documents')
                .insert({
                    child_id: childId,
                    organization_id: profile.organization_id,
                    name: file.name,
                    type: selectedType,
                    url: publicUrl,
                    uploaded_by: user?.id,
                });

            if (insertError) throw insertError;

            queryClient.invalidateQueries({ queryKey: ['child_documents', childId] });
            setSelectedType('other');
        } catch (error: any) {
            console.error('Error uploading document:', error);
            alert('Erro ao enviar documento: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const deleteDocument = async (id: string, url: string) => {
        if (!confirm('Tem certeza que deseja excluir este documento?')) return;

        try {
            const path = url.split('/child-documents/')[1];
            if (path) {
                await supabase.storage.from('child-documents').remove([path]);
            }

            const { error } = await supabase
                .from('child_documents')
                .delete()
                .eq('id', id);

            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['child_documents', childId] });
        } catch (error: any) {
            console.error('Error deleting document:', error);
            alert('Erro ao excluir documento: ' + error.message);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPreviewFile(file);

            // Create preview URL for images
            if (file.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            rg: 'RG',
            cpf: 'CPF',
            birth_certificate: 'Certidão de Nascimento',
            vaccine_card: 'Cartão de Vacina',
            medical_report: 'Laudo Médico',
            court_order: 'Decisão Judicial',
            other: 'Outros',
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest block mb-2">Tipo de Documento</label>
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-border-light dark:border-gray-700 rounded-xl outline-none text-text-main dark:text-white transition-all focus:border-primary"
                >
                    <option value="rg">RG</option>
                    <option value="cpf">CPF</option>
                    <option value="birth_certificate">Certidão de Nascimento</option>
                    <option value="vaccine_card">Cartão de Vacina</option>
                    <option value="medical_report">Laudo Médico</option>
                    <option value="court_order">Decisão Judicial</option>
                    <option value="other">Outros</option>
                </select>
            </div>

            {/* Preview / Confirmation Area */}
            {previewFile && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary text-lg">preview</span>
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest">Pré-visualização</h4>
                    </div>

                    {/* Image Preview */}
                    {previewUrl && (
                        <div className="flex justify-center">
                            <img
                                src={previewUrl}
                                alt="Pré-visualização do documento"
                                className="max-h-64 max-w-full rounded-xl object-contain border border-gray-200 dark:border-gray-700 shadow-sm"
                            />
                        </div>
                    )}

                    {/* PDF Preview */}
                    {previewFile && !previewUrl && (
                        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="size-14 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-red-500 text-3xl">picture_as_pdf</span>
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-text-main dark:text-white truncate">{previewFile.name}</p>
                                <p className="text-xs text-text-secondary dark:text-gray-400">
                                    {(previewFile.size / 1024 / 1024).toFixed(2)} MB • PDF
                                </p>
                            </div>
                        </div>
                    )}

                    {/* File Info for images */}
                    {previewUrl && (
                        <div className="text-center">
                            <p className="text-sm font-bold text-text-main dark:text-white truncate">{previewFile.name}</p>
                            <p className="text-xs text-text-secondary dark:text-gray-400">
                                {(previewFile.size / 1024 / 1024).toFixed(2)} MB • Tipo: <span className="font-bold">{getTypeLabel(selectedType)}</span>
                            </p>
                        </div>
                    )}

                    {/* Confirm / Cancel Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={clearPreview}
                            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmAndUpload}
                            disabled={uploading}
                            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                    Confirmar Upload
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Buttons - only show when no preview is active */}
            {!previewFile && (
                <div className="flex gap-3">
                    {/* File Upload Button - always visible */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                        disabled={uploading}
                        className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary mb-2">upload_file</span>
                        <span className="text-xs font-bold uppercase text-gray-500 group-hover:text-primary">Carregar Arquivo</span>
                        <span className="text-[10px] text-gray-400 mt-1">PDF ou Imagens (Max 5MB)</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        className="hidden"
                    />

                    {/* Camera Button - ONLY on mobile */}
                    {isMobile && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    cameraInputRef.current?.click();
                                }}
                                disabled={uploading}
                                className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary mb-2">photo_camera</span>
                                <span className="text-xs font-bold uppercase text-gray-500 group-hover:text-primary">Tirar Foto</span>
                                <span className="text-[10px] text-gray-400 mt-1">Usar Câmera</span>
                            </button>
                            <input
                                type="file"
                                ref={cameraInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                            />
                        </>
                    )}
                </div>
            )}

            {/* List of Existing Documents (DB) */}
            {documents && documents.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-2">Documentos Salvos</h4>
                    {documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="size-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-gray-500">
                                        {doc.type === 'pdf' ? 'picture_as_pdf' : 'image'}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-text-main dark:text-white truncate">{doc.name}</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setViewDoc(doc)}
                                            className="text-xs text-primary hover:underline font-bold"
                                        >
                                            Visualizar
                                        </button>
                                        <span className="uppercase bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold text-text-secondary dark:text-gray-400">
                                            {getTypeLabel(doc.type)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => deleteDocument(doc.id, doc.url)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* List of Pending Files (Local State) */}
            {pendingFiles.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-2">Arquivos para Enviar</h4>
                    {pendingFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-blue-500 dark:text-blue-300">
                                        {file.file.type.includes('pdf') ? 'picture_as_pdf' : 'image'}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-text-main dark:text-white truncate">{file.file.name}</p>
                                    <p className="text-xs text-text-secondary dark:text-gray-400">
                                        {(file.file.size / 1024 / 1024).toFixed(2)} MB •
                                        <span className="uppercase ml-1 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{getTypeLabel(file.type)}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemovePendingFile?.(index)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {(uploading || isLoading) && !previewFile && (
                <div className="text-center py-4">
                    <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="text-xs text-text-secondary mt-2">Carregando...</p>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewDoc && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-5xl h-[95vh] sm:h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-border-light dark:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-5 sm:px-8 py-3 sm:py-4 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="min-w-0 pr-4">
                                <h3 className="text-sm sm:text-lg font-black text-text-main dark:text-white truncate font-display tracking-tight">{viewDoc.name}</h3>
                                <p className="text-[10px] text-text-secondary dark:text-gray-400 font-bold uppercase tracking-widest">{getTypeLabel(viewDoc.type)}</p>
                            </div>
                            <button
                                onClick={() => setViewDoc(null)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors shrink-0 active:scale-90"
                            >
                                <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden relative flex items-center justify-center">
                            {viewDoc.url.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={`${viewDoc.url}#toolbar=0`}
                                    className="w-full h-full border-none"
                                    title={viewDoc.name}
                                />
                            ) : (
                                <img
                                    src={viewDoc.url}
                                    alt={viewDoc.name}
                                    className="max-w-full max-h-full object-contain shadow-lg"
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-t border-border-light dark:border-gray-800 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                            <a
                                href={viewDoc.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-white dark:bg-gray-800 border border-border-light dark:border-gray-700 rounded-xl font-black text-[10px] text-text-secondary dark:text-gray-400 uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">download</span>
                                Baixar Arquivo
                            </a>
                            <button
                                onClick={() => setViewDoc(null)}
                                className="w-full sm:w-auto px-8 py-3.5 sm:py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
