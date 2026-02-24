import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLogger } from '../../hooks/useLogger';
import clsx from 'clsx';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftReportFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ShiftReportForm({ isOpen, onClose, onSuccess }: ShiftReportFormProps) {
    const { profile, user } = useAuth();
    const { logAction } = useLogger();
    const queryClient = useQueryClient();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'write' | 'canvas'>('write');

    const [formData, setFormData] = useState({
        shift: 'morning' as 'morning' | 'afternoon' | 'night',
        summary: '',
        staff_present: '',
        // Toggle-based sections
        hasOccurrences: false,
        occurrencesDetail: '',
        hasEscapes: false,
        escapesDetail: '',
        hasConflicts: false,
        conflictsDetail: '',
        hasMaintenance: false,
        maintenanceDetail: '',
        hasChildrenInvolved: false,
        involvedChildrenIds: [] as string[],
    });

    const [formalReport, setFormalReport] = useState('');
    const [childSearch, setChildSearch] = useState('');

    const { data: childrenList = [] } = useQuery({
        queryKey: ['children-simple-list'],
        queryFn: async () => {
            const { data } = await supabase.from('children').select('id, full_name, photo_url').order('full_name');
            return data || [];
        },
        enabled: isOpen
    });

    const filteredChildren = useMemo(() => {
        return childrenList.filter(c =>
            c.full_name.toLowerCase().includes(childSearch.toLowerCase()) &&
            !formData.involvedChildrenIds.includes(c.id)
        );
    }, [childrenList, childSearch, formData.involvedChildrenIds]);

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                shift: 'morning', summary: '', staff_present: '',
                hasOccurrences: false, occurrencesDetail: '',
                hasEscapes: false, escapesDetail: '',
                hasConflicts: false, conflictsDetail: '',
                hasMaintenance: false, maintenanceDetail: '',
                hasChildrenInvolved: false, involvedChildrenIds: [],
            });
            setFormalReport('');
            setIsSuccess(false);
            setActiveTab('write');
        }
    }, [isOpen]);

    const shiftOptions = [
        { id: 'morning', label: 'Manhã', icon: 'wb_sunny' },
        { id: 'afternoon', label: 'Tarde', icon: 'wb_twilight' },
        { id: 'night', label: 'Noite', icon: 'dark_mode' },
    ];

    const generateAIReport = () => {
        if (!formData.summary) return;
        setIsGenerating(true);

        setTimeout(() => {
            const shiftLabel = shiftOptions.find(o => o.id === formData.shift)?.label;
            const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

            let text = `RELATÓRIO TÉCNICO DE TRANSIÇÃO DE TURNO\n`;
            text += `INSTITUIÇÃO: GuardianFlow Shelter System\n`;
            text += `DATA: ${dateStr} | PERÍODO: ${shiftLabel?.toUpperCase()}\n`;
            text += `EQUIPE RESPONSÁVEL: ${formData.staff_present || 'Técnicos de Plantão'}\n\n`;

            text += `I. SÍNTESE DO PLANTÃO\n`;
            text += `No decorrer deste período, as atividades institucionais foram conduzidas conforme o cronograma estabelecido. `;
            text += `Resumo das atividades: "${formData.summary}".\n\n`;

            if (formData.hasOccurrences || formData.hasEscapes || formData.hasConflicts || formData.hasMaintenance) {
                text += `II. INTERCORRÊNCIAS REGISTRADAS\n`;

                if (formData.hasOccurrences) {
                    text += `• OCORRÊNCIAS GERAIS: ${formData.occurrencesDetail}\n`;
                }
                if (formData.hasEscapes) {
                    text += `• EVASÃO/FUGAS: Foi registrada evasão institucional. Detalhes: ${formData.escapesDetail}. As autoridades competentes e a rede de proteção foram devidamente notificadas.\n`;
                }
                if (formData.hasConflicts) {
                    text += `• CONFLITOS/BRIGAS: Registrou-se episódio de conflito interpessoal entre acolhidos. Detalhes: ${formData.conflictsDetail}. Foram aplicadas medidas de mediação e resolução pacífica de conflitos.\n`;
                }
                if (formData.hasMaintenance) {
                    text += `• INFRAESTRUTURA/DANOS: Houve dano ou necessidade de reparo em: ${formData.maintenanceDetail}.\n`;
                }

                if (formData.hasChildrenInvolved && formData.involvedChildrenIds.length > 0) {
                    const names = formData.involvedChildrenIds.map(id => childrenList.find(c => c.id === id)?.full_name).filter(Boolean).join(', ');
                    text += `\nAcolhidos diretamente envolvidos nas intercorrências: ${names}.\n`;
                }
                text += `\n`;
            } else {
                text += `II. INTERCORRÊNCIAS\nNão houve registro de intercorrências significativas durante este plantão. Clima institucional estável.\n\n`;
            }

            text += `III. ORIENTAÇÕES PARA O PRÓXIMO TURNO\n`;
            text += `A transição de plantão ocorre com as seguintes recomendações: Manter vigilância ativa e garantir a continuidade do plano de rotina. `;
            if (formData.hasConflicts) text += `Atenção redobrada à dinâmica de grupo devido aos conflitos registrados. `;
            if (formData.hasEscapes) text += `Monitoramento rigoroso dos pontos de acesso. `;

            text += `\n\n__________________________________________\n`;
            text += `${profile?.full_name || 'Educador Responsável'}\n`;
            text += `ID Funcional: ${user?.id.substring(0, 8).toUpperCase()}`;

            setFormalReport(text);
            setIsGenerating(false);
            setActiveTab('canvas');
        }, 1800);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!user || !profile?.organization_id) throw new Error('Unauthorized');

            const { error } = await supabase.from('shift_reports').insert({
                organization_id: profile.organization_id,
                staff_id: user.id,
                shift: formData.shift,
                summary: formData.summary,
                occurrences: [
                    formData.hasOccurrences && `Geral: ${formData.occurrencesDetail}`,
                    formData.hasEscapes && `Evasão: ${formData.escapesDetail}`,
                    formData.hasConflicts && `Conflito: ${formData.conflictsDetail}`,
                    formData.hasMaintenance && `Manutenção: ${formData.maintenanceDetail}`,
                ].filter(Boolean).join(' | '),
                staff_present: formData.staff_present,
                report_date: new Date().toISOString().split('T')[0],
                metadata: {
                    formal_content: formalReport,
                    is_ai_enhanced: !!formalReport,
                    toggles: {
                        escapes: formData.hasEscapes,
                        conflicts: formData.hasConflicts,
                        maintenance: formData.hasMaintenance
                    },
                    involved_children: formData.involvedChildrenIds
                }
            });

            if (error) throw error;

            logAction('CREATE', 'shift_report', undefined, {
                shift: formData.shift,
                report_date: new Date().toISOString().split('T')[0]
            });
        },
        onSuccess: () => {
            setIsSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['logbook-timeline'] });
            setTimeout(onSuccess, 1200);
        }
    });

    const ToggleRow = ({ label, icon, active, onChange }: { label: string, icon: string, active: boolean, onChange: (v: boolean) => void }) => (
        <button
            type="button"
            onClick={() => onChange(!active)}
            className={clsx(
                "flex items-center justify-between p-3 rounded-2xl border transition-all",
                active ? "bg-primary/5 border-primary/30" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
            )}
        >
            <div className="flex items-center gap-2">
                <span className={clsx("material-symbols-outlined text-xl", active ? "text-primary" : "text-text-secondary")}>{icon}</span>
                <span className={clsx("text-[10px] font-black uppercase tracking-tight", active ? "text-primary" : "text-text-secondary")}>{label}</span>
            </div>
            <div className={clsx(
                "w-8 h-4 rounded-full relative transition-colors",
                active ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
            )}>
                <div className={clsx(
                    "absolute top-0.5 size-3 bg-white rounded-full transition-transform shadow-sm",
                    active ? "translate-x-4.5" : "translate-x-0.5"
                )} />
            </div>
        </button>
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col relative max-h-[95vh]">

                {/* Header Compact */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-xl">clinical_notes</span>
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-text-main dark:text-white uppercase tracking-tight">Relatório de Turno</h2>
                            <p className="text-[9px] text-text-secondary uppercase tracking-widest font-medium">Documento de Passagem</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-xl text-text-secondary">close</span>
                    </button>
                </div>

                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-white dark:bg-surface-dark flex flex-col items-center justify-center animate-in fade-in">
                        <div className="size-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 scale-in">
                            <span className="material-symbols-outlined text-4xl">check_rounded</span>
                        </div>
                        <h3 className="text-xl font-bold">Relatório Finalizado</h3>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex px-6 pt-4 bg-white dark:bg-surface-dark sticky top-0 z-10">
                    <div className="flex-1 flex bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <button onClick={() => setActiveTab('write')} className={clsx("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'write' ? "bg-white dark:bg-gray-800 text-primary shadow-sm" : "text-text-secondary opacity-60")}>Rascunho</button>
                        <button onClick={() => setActiveTab('canvas')} disabled={!formalReport} className={clsx("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:hidden", activeTab === 'canvas' ? "bg-white dark:bg-gray-800 text-primary shadow-sm" : "text-text-secondary opacity-60")}>Visualização Formal</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {activeTab === 'write' ? (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Row 1: Shift Dropdown & Staff */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block px-1">Período Selecionado</label>
                                    <div className="relative">
                                        <select
                                            value={formData.shift}
                                            onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                                            className="w-full h-12 pl-11 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 font-bold text-sm appearance-none"
                                        >
                                            <option value="morning">Período da Manhã</option>
                                            <option value="afternoon">Período da Tarde</option>
                                            <option value="night">Período da Noite</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                                            {shiftOptions.find(o => o.id === formData.shift)?.icon}
                                        </span>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block px-1">Equipe no Plantão</label>
                                    <input
                                        type="text"
                                        className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-primary/30 font-bold text-sm"
                                        placeholder="Ex: Ana, Roberto..."
                                        value={formData.staff_present}
                                        onChange={(e) => setFormData({ ...formData, staff_present: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Summary Main */}
                            <div className="relative">
                                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2 block px-1">Resumo do Plantão</label>
                                <textarea
                                    className="w-full min-h-[100px] p-5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] outline-none focus:border-primary/30 transition-all text-sm font-medium resize-none shadow-inner leading-relaxed no-scrollbar"
                                    placeholder="Escreva brevemente o que aconteceu hoje..."
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                />
                                <button
                                    onClick={generateAIReport}
                                    disabled={!formData.summary || isGenerating}
                                    className="absolute bottom-4 right-4 bg-primary text-white size-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    {isGenerating ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">auto_awesome</span>}
                                </button>
                            </div>

                            {/* Toggles Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <ToggleRow label="Ocorrências" icon="warning" active={formData.hasOccurrences} onChange={(v) => setFormData({ ...formData, hasOccurrences: v })} />
                                <ToggleRow label="Evasão" icon="door_front" active={formData.hasEscapes} onChange={(v) => setFormData({ ...formData, hasEscapes: v })} />
                                <ToggleRow label="Conflitos" icon="diversity_4" active={formData.hasConflicts} onChange={(v) => setFormData({ ...formData, hasConflicts: v })} />
                                <ToggleRow label="Manutenção" icon="build" active={formData.hasMaintenance} onChange={(v) => setFormData({ ...formData, hasMaintenance: v })} />
                                <ToggleRow label="Acolhidos" icon="group" active={formData.hasChildrenInvolved} onChange={(v) => setFormData({ ...formData, hasChildrenInvolved: v })} />
                            </div>

                            {/* Dynamic Sections */}
                            <div className="space-y-4">
                                {(formData.hasOccurrences || formData.hasEscapes || formData.hasConflicts || formData.hasMaintenance) && (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] p-6 space-y-4 border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-4">
                                        {formData.hasOccurrences && (
                                            <div>
                                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Detalhes da Ocorrência</label>
                                                <input type="text" className="w-full h-10 px-4 bg-white dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold" placeholder="O que aconteceu?" value={formData.occurrencesDetail} onChange={e => setFormData({ ...formData, occurrencesDetail: e.target.value })} />
                                            </div>
                                        )}
                                        {formData.hasEscapes && (
                                            <div>
                                                <label className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1 block">Detalhes da Evasão</label>
                                                <input type="text" className="w-full h-10 px-4 bg-white dark:bg-black/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs font-bold" placeholder="Quem? Qual horário? Providências?" value={formData.escapesDetail} onChange={e => setFormData({ ...formData, escapesDetail: e.target.value })} />
                                            </div>
                                        )}
                                        {formData.hasConflicts && (
                                            <div>
                                                <label className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1 block">Conflitos/Brigas</label>
                                                <input type="text" className="w-full h-10 px-4 bg-white dark:bg-black/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-xs font-bold" placeholder="Quem se envolveu? Qual o motivo?" value={formData.conflictsDetail} onChange={e => setFormData({ ...formData, conflictsDetail: e.target.value })} />
                                            </div>
                                        )}
                                        {formData.hasMaintenance && (
                                            <div>
                                                <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1 block">Equipamento/Estrutura</label>
                                                <input type="text" className="w-full h-10 px-4 bg-white dark:bg-black/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs font-bold" placeholder="O que estragou? Onde?" value={formData.maintenanceDetail} onChange={e => setFormData({ ...formData, maintenanceDetail: e.target.value })} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {formData.hasChildrenInvolved && (
                                    <div className="space-y-2 animate-in slide-in-from-top-4">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Acolhidos Envolvidos</label>
                                            <span className="text-[8px] font-bold text-primary">{formData.involvedChildrenIds.length} selecionados</span>
                                        </div>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                            <input type="text" className="w-full h-10 pl-9 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold" placeholder="Vincular acolhido..." value={childSearch} onChange={e => setChildSearch(e.target.value)} />
                                        </div>

                                        {formData.involvedChildrenIds.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {formData.involvedChildrenIds.map(id => {
                                                    const c = childrenList.find(child => child.id === id);
                                                    return (
                                                        <div key={id} className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-primary/10 rounded-full border border-primary/20">
                                                            <img src={c?.photo_url || `https://ui-avatars.com/api/?name=${c?.full_name}`} className="size-5 rounded-full object-cover" alt="" />
                                                            <span className="text-[9px] font-black text-primary uppercase">{c?.full_name.split(' ')[0]}</span>
                                                            <button onClick={() => setFormData({ ...formData, involvedChildrenIds: formData.involvedChildrenIds.filter(cid => cid !== id) })} className="material-symbols-outlined text-[10px] text-primary hover:text-primary-dark">close</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {childSearch && filteredChildren.length > 0 && (
                                            <div className="max-h-32 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-1 shadow-lg scrollbar-hide">
                                                {filteredChildren.slice(0, 5).map(c => (
                                                    <button key={c.id} onClick={() => { setFormData({ ...formData, involvedChildrenIds: [...formData.involvedChildrenIds, c.id] }); setChildSearch(''); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors">
                                                        <img src={c.photo_url || `https://ui-avatars.com/api/?name=${c.full_name}`} className="size-6 rounded-lg object-cover" alt="" />
                                                        <span className="text-[10px] font-bold uppercase">{c.full_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in zoom-in-95 duration-300">
                            <div className="w-full min-h-[400px] p-8 sm:p-12 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-900 rounded-[3rem] shadow-inner font-serif text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <span className="material-symbols-outlined text-[140px]">shield</span>
                                </div>
                                <div className="max-w-prose mx-auto space-y-4 whitespace-pre-wrap relative z-10 font-medium">
                                    {formalReport}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-3 bg-white dark:bg-surface-dark">
                    <button onClick={onClose} className="h-11 px-6 rounded-xl border border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-gray-50 active:scale-95 transition-all">Cancelar</button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !formData.summary}
                        className="h-11 px-10 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-2"
                    >
                        {saveMutation.isPending ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">send</span>}
                        Concluir Plantão
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
