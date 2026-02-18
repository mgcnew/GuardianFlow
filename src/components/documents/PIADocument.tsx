import React, { forwardRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface PIADocumentProps {
    child: any;
}

export const PIADocument = forwardRef<HTMLDivElement, PIADocumentProps>(({ child }, ref) => {
    const { organization } = useAuth();
    const currentDate = format(new Date(), 'dd/MM/yyyy');

    return (
        <div ref={ref} className="bg-white p-8 w-[210mm] min-h-[297mm] mx-auto text-black font-serif relative">
            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    {/* Logo Placeholder */}
                    <div className="size-16 bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 uppercase rounded-lg border border-gray-300">
                        Logo
                    </div>
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wide">{organization?.name || 'Nome da Instituição'}</h1>
                        <p className="text-sm text-gray-600">Relatório Técnico Processual</p>
                        <p className="text-xs text-gray-500 mt-1">Data de Emissão: {currentDate}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold uppercase text-gray-400">confidencial</p>
                    <p className="text-[10px] text-gray-400">Documento gerado eletronicamente</p>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold uppercase underline decoration-2 underline-offset-4">Plano Individual de Atendimento (PIA)</h2>
                <p className="text-sm font-medium mt-2 italic text-gray-600">Relatório Consolidado para Fins Judiciais</p>
            </div>

            {/* Content */}
            <div className="space-y-8">

                {/* Section 1: Identificação */}
                <section>
                    <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-l-4 border-black mb-4">1. Identificação do Acolhido</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Nome Completo</span>
                            <span className="block border-b border-gray-300 pb-1">{child.full_name}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Data de Nascimento</span>
                            <span className="block border-b border-gray-300 pb-1">
                                {child.date_of_birth ? format(new Date(child.date_of_birth), 'dd/MM/yyyy') : 'N/A'}
                                <span className="text-xs text-gray-500 ml-2">
                                    ({new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()} anos)
                                </span>
                            </span>
                        </div>
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Filiação (Mãe)</span>
                            <span className="block border-b border-gray-300 pb-1">{child.mother_name || 'Não informada'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Filiação (Pai)</span>
                            <span className="block border-b border-gray-300 pb-1">{child.father_name || 'Não informado'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Documentos (CPF/RG)</span>
                            <span className="block border-b border-gray-300 pb-1">
                                CPF: {child.cpf || '--'} / RG: {child.rg || '--'} / NIS: {child.nis || '--'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Section 2: Dados do Acolhimento */}
                <section>
                    <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-l-4 border-black mb-4">2. Dados do Acolhimento</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Data de Admissão</span>
                            <span className="block border-b border-gray-300 pb-1">
                                {child.admission_date ? format(new Date(child.admission_date), 'dd/MM/yyyy') : 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Unidade de Acolhimento</span>
                            <span className="block border-b border-gray-300 pb-1">{child.unit || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="font-bold block text-xs text-gray-500 uppercase">Motivo do Acolhimento</span>
                            <p className="mt-1 text-justify leading-relaxed p-3 bg-gray-50 rounded border border-gray-200 italic">
                                "{child.reason_for_admission || 'Motivo não detalhado no prontuário eletrônico.'}"
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 3: Situação Jurídica e Processual */}
                <section>
                    <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-l-4 border-black mb-4">3. Situação Jurídica</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        <div className="col-span-2">
                            <span className="font-bold block text-xs text-gray-500 uppercase">Número do Processo</span>
                            <span className="block border-b border-gray-300 pb-1 font-mono">{child.judicial_process || 'Não informado'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="font-bold block text-xs text-gray-500 uppercase">Status Processual</span>
                            <span className="block mt-1">
                                {child.status === 'active' ? 'Acolhimento Ativo - Em acompanhamento regular.' :
                                    child.status === 'urgent' ? 'PRIORIDADE - Situação de risco ou demanda judicial urgente.' :
                                        'Processo em análise ou aguardando documentação.'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Section 4: Saúde e Educação */}
                <section>
                    <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-l-4 border-black mb-4">4. Saúde e Educação</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Escolaridade</span>
                            <span className="block border-b border-gray-300 pb-1">{child.schooling || 'Não informada'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-xs text-gray-500 uppercase">Alergias / Restrições</span>
                            <span className="block border-b border-gray-300 pb-1 text-red-700">{child.allergies || 'Nenhuma relatada'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="font-bold block text-xs text-gray-500 uppercase">Observações de Saúde & Medicamentos</span>
                            <p className="mt-1 text-justify leading-relaxed">
                                {child.medications ? `Faz uso de: ${child.medications}. ` : 'Sem uso contínuo de medicação. '}
                                {child.health_info || ''}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 5: Parecer Técnico (Placeholder for dynamic content) */}
                <section className="break-inside-avoid">
                    <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-l-4 border-black mb-4">5. Parecer Técnico Simplificado</h3>
                    <div className="border border-gray-300 rounded p-4 h-48">
                        <p className="text-sm text-gray-500 italic text-center mt-16">
                            [Espaço reservado para inserção manual de parecer técnico detalhado ou atualização da equipe multidisciplinar]
                        </p>
                    </div>
                </section>

            </div>

            {/* Footer Signatures */}
            <div className="mt-24 grid grid-cols-2 gap-16 break-inside-avoid">
                <div className="text-center">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold text-sm">Assistente Social / Psicólogo(a)</p>
                        <p className="text-xs text-gray-500">Equipe Técnica</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold text-sm">Coordenação</p>
                        <p className="text-xs text-gray-500">{organization?.name}</p>
                    </div>
                </div>
            </div>

            {/* Pagination Footer */}
            <div className="absolute bottom-4 left-0 w-full text-center text-[10px] text-gray-400 border-t pt-2">
                Documento gerado pelo sistema Guardian Flow - {currentDate} - Página 1/1
            </div>
        </div>
    );
});

PIADocument.displayName = 'PIADocument';
