import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import clsx from 'clsx';

interface AcademicEvolutionReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    child: any;
    reports: any[];
    meetings: any[];
    activities: any[];
}

export function AcademicEvolutionReportModal({ isOpen, onClose, child, reports, meetings, activities }: AcademicEvolutionReportModalProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [opinion, setOpinion] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeSection, setActiveSection] = useState<'editor' | 'preview'>('editor');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setOpinion('');
            setActiveSection('editor');
            setIsSuccess(false);
        }
    }, [isOpen]);

    const saveMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!profile?.organization_id) throw new Error('Unauthorized');

            const { error } = await supabase
                .from('child_entries')
                .insert([{
                    child_id: child.id,
                    organization_id: profile.organization_id,
                    author_id: profile.id,
                    type: 'pedagogical',
                    title: `Parecer Pedagógico - ${format(new Date(), 'MMMM/yyyy', { locale: ptBR })}`,
                    content: content,
                    metadata: {
                        category: 'evaluation',
                        is_formal_report: true,
                        average_grade: reports.length > 0 ? (reports.reduce((acc, curr) => acc + curr.grade, 0) / reports.length).toFixed(1) : null
                    }
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

    if (!isOpen || !child) return null;

    const generateAIPreview = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const avgGrade = reports.length > 0 ? (reports.reduce((acc, curr) => acc + curr.grade, 0) / reports.length).toFixed(1) : 'não disponível';
            const recentMeetingsCount = meetings.length;
            const extraCount = activities.length;

            let text = `PARECER PEDAGÓGICO: ${child.full_name}\nRECIPIENTE: Equipe Técnica / Vara da Infância\nDATA DE EMISSÃO: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}\n\n`;

            text += `I. DESEMPENHO ACADÊMICO\nO acolhido apresenta uma média geral de ${avgGrade} no período avaliado. `;
            if (parseFloat(avgGrade) >= 7) {
                text += `Demonstra um aproveitamento acadêmico satisfatório, evidenciando compromisso com as atividades escolares e facilidade na absorção dos conteúdos programáticos.\n\n`;
            } else if (reports.length > 0) {
                text += `Apresenta oscilações no desempenho acadêmico, indicando a necessidade de suporte pedagógico direcionado e acompanhamento mais próximo nas disciplinas de maior complexidade.\n\n`;
            } else {
                text += `Os registros acadêmicos estão sendo atualizados para uma análise mais profunda do desempenho escolar.\n\n`;
            }

            text += `II. PARTICIPAÇÃO E SOCIALIZAÇÃO\n`;
            if (extraCount > 0) {
                text += `Identificamos um engajamento positivo em ${extraCount} atividade(s) extracurricular(es). Tal envolvimento tem sido fundamental para o fortalecimento de sua autoestima e desenvolvimento de competências socioemocionais. `;
            } else {
                text += `Atualmente não integra atividades fora da grade curricular regular. Recomenda-se a exploração de aptidões lúdicas ou esportivas para complementar sua rotina acolhedora. `;
            }

            text += `\n\nIII. ARTICULAÇÃO COM A REDE DE ENSINO\nForam realizados ${recentMeetingsCount} contatos/reuniões com a instituição de ensino durante este ciclo. `;
            text += `A interlocução técnica constante visa garantir que as demandas específicas do acolhido sejam atendidas integralmente pela rede de apoio escolar.\n\n`;

            text += `CONCLUSÃO\nO processo pedagógico segue em evolução, com monitoramento contínuo das metas estabelecidas no Plano Individual de Atendimento (PIA).`;

            setOpinion(text);
            setIsGenerating(false);
            setActiveSection('editor');
        }, 2000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-3xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden flex flex-col relative max-h-[95vh] sm:max-h-[92vh]">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-500 text-2xl">auto_awesome</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Parecer Pedagógico</h2>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">{child.full_name}</p>
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
                        <h3 className="text-xl font-bold">Parecer Publicado</h3>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Stats HUD */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/30">
                            <span className="material-symbols-outlined text-emerald-600">assessment</span>
                            <div>
                                <p className="text-[9px] font-black text-emerald-600 uppercase opacity-60">Notas</p>
                                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{reports.length}</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl flex items-center gap-3 border border-blue-100 dark:border-blue-900/30">
                            <span className="material-symbols-outlined text-blue-600">forum</span>
                            <div>
                                <p className="text-[9px] font-black text-blue-600 uppercase opacity-60">Reuniões</p>
                                <p className="text-sm font-black text-blue-700 dark:text-blue-400">{meetings.length}</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl flex items-center gap-3 border border-amber-100 dark:border-amber-900/30">
                            <span className="material-symbols-outlined text-amber-600">verified</span>
                            <div>
                                <p className="text-[9px] font-black text-amber-600 uppercase opacity-60">Extras</p>
                                <p className="text-sm font-black text-amber-700 dark:text-amber-400">{activities.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 p-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
                            <button
                                onClick={() => setActiveSection('editor')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-[10px] font-black transition-all",
                                    activeSection === 'editor' ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-text-secondary"
                                )}
                            >
                                EDITOR
                            </button>
                            <button
                                onClick={() => setActiveSection('preview')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-[10px] font-black transition-all",
                                    activeSection === 'preview' ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-text-secondary"
                                )}
                            >
                                PRÉVIA
                            </button>
                        </div>

                        <button
                            onClick={generateAIPreview}
                            disabled={isGenerating}
                            className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl px-4 py-2 flex items-center gap-2 text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <div className="size-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-sm">bolt</span>
                            )}
                            IA: GERAR RASCUNHO
                        </button>
                    </div>

                    <div className="relative">
                        {isGenerating && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] rounded-[2.5rem] animate-in fade-in">
                                <span className="material-symbols-outlined text-emerald-500 text-4xl animate-bounce">auto_awesome</span>
                                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 mt-2">PROCESSANDO...</p>
                            </div>
                        )}

                        {activeSection === 'editor' ? (
                            <textarea
                                value={opinion}
                                onChange={(e) => setOpinion(e.target.value)}
                                placeholder="A trajetória escolar será consolidada aqui..."
                                className="w-full h-[350px] px-8 py-8 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] outline-none focus:border-emerald-500/30 transition-all font-serif text-sm leading-[1.8] text-gray-700 dark:text-gray-300 shadow-inner no-scrollbar resize-none"
                            />
                        ) : (
                            <div className="w-full h-[350px] px-8 py-8 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-y-auto no-scrollbar shadow-inner">
                                <div className="max-w-prose mx-auto space-y-4 font-serif leading-[1.8] text-gray-800 dark:text-gray-200 text-sm">
                                    {opinion ? opinion.split('\n').map((para, i) => (
                                        <p key={i} className={para.startsWith('I.') || para.startsWith('II.') || para.startsWith('III.') || para.startsWith('CONCLUSÃO') || para.startsWith('PARECER') ? "font-black text-emerald-700 dark:text-emerald-400 pt-4" : ""}>
                                            {para}
                                        </p>
                                    )) : (
                                        <p className="text-gray-400 italic text-center mt-20">Nenhuma pré-visualização. Clique em "IA: GERAR RASCUNHO".</p>
                                    )}
                                </div>
                            </div>
                        )}
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
                        onClick={() => saveMutation.mutate(opinion)}
                        disabled={!opinion || saveMutation.isPending}
                        className="h-12 px-10 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-3"
                    >
                        {saveMutation.isPending ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined">check_circle</span>
                        )}
                        Publicar Parecer
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
