import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function DemoRequest() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        institution: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('demo_requests')
                .insert([formData]);

            if (error) throw error;
            setIsSuccess(true);
        } catch (error: any) {
            console.error('Erro ao enviar solicitação:', error);
            alert('Ocorreu um erro ao enviar sua solicitação. Por favor, tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4 font-display">
                <div className="max-w-md w-full bg-white dark:bg-surface-dark rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-800 text-center animate-in zoom-in-95 duration-500">
                    <div className="size-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8 shadow-inner">
                        <span className="material-symbols-outlined text-5xl">check_circle</span>
                    </div>
                    <h2 className="text-3xl font-black text-text-main dark:text-white mb-4 tracking-tight">Solicitação Enviada!</h2>
                    <p className="text-text-secondary dark:text-gray-400 mb-10 leading-relaxed font-medium">
                        Obrigado pelo interesse no <span className="text-primary font-bold">GuardianFlow</span>.
                        Nossa equipe analisará seu contato e enviará o acesso à conta de demonstração por e-mail em breve.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        Voltar para o Início
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col md:flex-row font-display overflow-hidden">
            {/* Left Side: Info */}
            <div className="flex-1 p-8 md:p-20 flex flex-col justify-center bg-primary relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 size-96 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 size-64 bg-black/10 rounded-full -translate-x-1/3 translate-y-1/3 blur-2xl" />

                <div className="relative z-10 max-w-lg">
                    <Link to="/" className="inline-flex items-center gap-2 mb-12 group">
                        <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
                        <span className="font-bold uppercase tracking-widest text-xs">Voltar</span>
                    </Link>

                    <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight tracking-tight uppercase">
                        Experimente o <br />
                        <span className="text-slate-900 dark:text-gray-100 opacity-90">GuardianFlow</span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/90 mb-12 leading-relaxed font-medium">
                        Descubra como nossa plataforma pode transformar a gestão do seu acolhimento institucional com tecnologia humanizada.
                    </p>

                    <div className="space-y-8">
                        {[
                            { icon: 'visibility', title: 'Tour Completo', desc: 'Acesso total a uma unidade já populada com dados fictícios para teste.' },
                            { icon: 'verified', title: '7 Dias Grátis', desc: 'Explore todos os módulos (Financeiro, Psicologia, Social) sem compromisso.' },
                            { icon: 'support_agent', title: 'Suporte VIP', desc: 'Durante o período de teste, nossa equipe estará à disposição para tirar dúvidas.' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                                    <span className="material-symbols-outlined">{item.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wider text-sm mb-1">{item.title}</h3>
                                    <p className="text-sm text-white/70 font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 md:bg-transparent bg-white p-8 md:p-20 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto animate-in fade-in slide-in-from-right-8 duration-700">
                    <div className="mb-10 lg:hidden">
                        <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
                    </div>

                    <h2 className="text-3xl font-black text-text-main dark:text-white mb-2 tracking-tight uppercase">Solicitar Acesso</h2>
                    <p className="text-text-secondary dark:text-gray-400 mb-10 font-medium">
                        Preencha os campos abaixo e entraremos em contato com suas credenciais de demonstração.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Seu Nome Completo</label>
                            <input
                                required
                                type="text"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-text-main dark:text-white"
                                placeholder="Como podemos te chamar?"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                            <input
                                required
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-text-main dark:text-white"
                                placeholder="email@instituicao.org"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                            <input
                                required
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-text-main dark:text-white"
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-black text-text-secondary dark:text-gray-500 uppercase tracking-widest ml-1">Nome da Instituição</label>
                            <input
                                required
                                type="text"
                                value={formData.institution}
                                onChange={e => setFormData({ ...formData, institution: e.target.value })}
                                className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-text-main dark:text-white"
                                placeholder="Qual unidade você representa?"
                            />
                        </div>

                        <button
                            disabled={isSubmitting}
                            className="w-full h-16 bg-slate-900 dark:bg-primary text-white rounded-[24px] font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20 mt-4 group"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <span>{isSubmitting ? 'Enviando...' : 'Solicitar Demonstração'}</span>
                                {!isSubmitting && <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>}
                            </div>
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-text-secondary dark:text-gray-500 font-medium leading-relaxed">
                        Ao solicitar, você concorda em ser contatado por nossa equipe para o envio das credenciais de acesso.
                        A conta demo expira em 7 dias após o primeiro acesso.
                    </p>
                </div>
            </div>
        </div>
    );
}
