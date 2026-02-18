import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import clsx from 'clsx';

export function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-white dark:bg-surface-dark font-display selection:bg-primary/20">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-border-light dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-white text-2xl">shield_with_heart</span>
                        </div>
                        <span className="text-xl font-extrabold text-text-main dark:text-white tracking-tight">GuardianFlow</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-secondary dark:text-gray-400">
                        <a href="#comparacao" className="hover:text-primary transition-colors">Comparação</a>
                        <a href="#features" className="hover:text-primary transition-colors">Recursos</a>
                        <a href="#pricing" className="hover:text-primary transition-colors">Preços</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm font-semibold text-text-main dark:text-gray-300 hover:text-primary transition-colors"
                        >
                            Entrar
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                        >
                            Teste Grátis
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-36 pb-16 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Sistema de Gestão para Acolhimento Institucional
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-text-main dark:text-white tracking-tight leading-[1.15] mb-6">
                        A tecnologia que cuida de<br />
                        <span className="text-primary">quem mais precisa.</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-text-secondary dark:text-gray-400 mb-10 font-medium leading-relaxed">
                        O GuardianFlow é o sistema SaaS completo para gestão de abrigos e casas-lares.
                        Simplifique o atendimento, organize documentos e foque no que importa: o futuro das crianças.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full sm:w-auto px-8 py-4 bg-primary text-white text-lg font-bold rounded-2xl shadow-sm hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            Começar Agora
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                        <button className="w-full sm:w-auto px-8 py-4 bg-gray-100 dark:bg-gray-800 text-text-main dark:text-white text-lg font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-3">
                            Fale Conosco
                            <span className="material-symbols-outlined">chat</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Stats bar */}
            <section className="py-12 px-6 border-y border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { value: '97%', label: 'Redução de papel' },
                        { value: '3x', label: 'Mais agilidade nos relatórios' },
                        { value: '100%', label: 'Dados em nuvem segura' },
                        { value: '+50', label: 'Instituições atendidas' },
                    ].map((stat, i) => (
                        <div key={i}>
                            <div className="text-3xl md:text-4xl font-extrabold text-primary mb-1">{stat.value}</div>
                            <div className="text-sm text-text-secondary dark:text-gray-400 font-medium">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Com vs Sem o Sistema — Comparison Section */}
            <section id="comparacao" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-text-main dark:text-white mb-4">
                            Antes e depois do <span className="text-primary">GuardianFlow</span>
                        </h2>
                        <p className="text-text-secondary dark:text-gray-400 font-medium max-w-xl mx-auto">
                            Veja a diferença real na rotina de quem adotou o sistema.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { icon: 'family_restroom', title: 'Prontuário', without: 'Pastas físicas, difíceis de consultar', withG: 'Digital, organizado por abas, acessível de qualquer lugar' },
                            { icon: 'menu_book', title: 'Diário de bordo', without: 'Caderno físico sem histórico pesquisável', withG: 'Registros categorizados com filtros por data e criança' },
                            { icon: 'gavel', title: 'Relatórios', without: 'Montagem manual em Word, horas gastas', withG: 'Gerados automaticamente a partir dos dados registrados' },
                            { icon: 'assignment', title: 'Plano Individual (PIA)', without: 'Disperso em pastas, sem acompanhamento', withG: 'Digital com metas, prazos e responsáveis definidos' },
                            { icon: 'health_and_safety', title: 'Histórico de saúde', without: 'Fichas soltas, sem cruzamento de dados', withG: 'Linha do tempo com vacinas, consultas e medicações' },
                            { icon: 'cloud_upload', title: 'Documentação', without: 'Gavetas físicas, sujeitas a dano ou perda', withG: 'Nuvem segura com backup automático diário' },
                        ].map((item, i) => (
                            <div key={i} className="rounded-2xl border border-border-light dark:border-gray-800 bg-white dark:bg-surface-dark p-6 hover:-translate-y-1 transition-transform duration-200">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-text-main dark:text-white">{item.title}</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2.5">
                                        <span className="material-symbols-outlined text-red-400 text-base mt-0.5 flex-shrink-0">close</span>
                                        <p className="text-sm text-text-secondary dark:text-gray-500 leading-relaxed">{item.without}</p>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <span className="material-symbols-outlined text-green-500 text-base mt-0.5 flex-shrink-0">check</span>
                                        <p className="text-sm text-text-main dark:text-gray-300 font-medium leading-relaxed">{item.withG}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 bg-gray-50/60 dark:bg-gray-900/40 border-y border-border-light dark:border-gray-800">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-text-main dark:text-white mb-4">Gestão 360° para seu abrigo</h2>
                        <p className="text-text-secondary dark:text-gray-400 font-medium max-w-xl mx-auto">Tudo o que você precisa em um único lugar, desenvolvido por especialistas em assistência social.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: 'family_restroom', title: 'Prontuário Digital', desc: 'Histórico completo, saúde, escolaridade e biografia organizada por abas.' },
                            { icon: 'menu_book', title: 'Diário de Bordo', desc: 'Registro de ocorrências diárias com categorias e acompanhamento emocional.' },
                            { icon: 'description', title: 'Gestão de PIA', desc: 'Acompanhamento do Plano Individual de Atendimento com relatórios automáticos.' },
                            { icon: 'upload_file', title: 'Documentos na Nuvem', desc: 'Upload e armazenamento seguro de documentos com backup diário automático.' },
                            { icon: 'bar_chart', title: 'Relatórios Automáticos', desc: 'Gere relatórios para o juizado e órgãos fiscalizadores com um clique.' },
                            { icon: 'lock', title: 'Segurança de Dados', desc: 'Criptografia, controle de acesso por perfil e conformidade com a LGPD.' }
                        ].map((feature, i) => (
                            <div key={i} className="p-7 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 hover:-translate-y-1 transition-transform duration-200">
                                <div className="size-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5">
                                    <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                                </div>
                                <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-text-secondary dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-text-main dark:text-white mb-4">Como funciona?</h2>
                        <p className="text-text-secondary dark:text-gray-400 font-medium">Três passos para transformar a gestão do seu abrigo.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: '01', title: 'Crie sua conta', desc: 'Cadastre a instituição e convide sua equipe. Plano Social é 100% gratuito.' },
                            { step: '02', title: 'Cadastre os acolhidos', desc: 'Registre o prontuário digital com histórico, saúde, escolaridade e mais.' },
                            { step: '03', title: 'Gerencie tudo', desc: 'Acompanhe PIAs, diários, relatórios e documentos em um único painel.' },
                        ].map((item, i) => (
                            <div key={i} className="text-center">
                                <div className="inline-flex items-center justify-center size-14 rounded-full bg-primary text-white text-xl font-extrabold mb-5">
                                    {item.step}
                                </div>
                                <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-text-secondary dark:text-gray-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6 bg-gray-50/60 dark:bg-gray-900/40 border-y border-border-light dark:border-gray-800">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-text-main dark:text-white mb-4">Planos que cabem na sua realidade</h2>
                        <p className="text-text-secondary dark:text-gray-400 font-medium">Transparência total para ajudar você a ajudar mais crianças.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { plan: 'Social', price: '0', kids: '10', popular: false },
                            { plan: 'Profissional', price: '199,90', kids: '50', popular: true },
                            { plan: 'Rede', price: '499,90', kids: 'Ilimitados', popular: false }
                        ].map((tier, i) => (
                            <div key={i} className={clsx(
                                "relative p-8 rounded-2xl border-2 transition-all hover:scale-[1.02]",
                                tier.popular ? "border-primary bg-white dark:bg-gray-800 shadow-xl shadow-primary/5" : "border-border-light dark:border-gray-800 bg-white dark:bg-surface-dark"
                            )}>
                                {tier.popular && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                                        Mais Popular
                                    </div>
                                )}
                                <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">{tier.plan}</h3>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-4xl font-extrabold text-text-main dark:text-white">R$ {tier.price}</span>
                                    <span className="text-text-secondary dark:text-gray-400 font-semibold">/mês</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {[
                                        `Até ${tier.kids} acolhidos`,
                                        'Usuários ilimitados',
                                        'Suporte prioritário',
                                        'Backup diário',
                                        'Relatórios automáticos'
                                    ].map((feature, j) => (
                                        <li key={j} className="flex items-center gap-3 text-sm font-medium text-text-secondary dark:text-gray-300">
                                            <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => navigate('/login')}
                                    className={clsx(
                                        "w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95",
                                        tier.popular ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-100 dark:bg-gray-700 text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                                    )}>
                                    {tier.price === '0' ? 'Começar Grátis' : 'Assinar Agora'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto rounded-3xl bg-primary p-12 md:p-16 text-center relative overflow-hidden">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-6">
                        Seu abrigo merece<br />a melhor tecnologia.
                    </h2>
                    <p className="text-white/80 font-medium mb-10 text-lg max-w-xl mx-auto">
                        Junte-se a dezenas de instituições que estão transformando o acolhimento no Brasil.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-10 py-4 bg-white text-primary text-lg font-bold rounded-2xl hover:bg-gray-50 transition-colors active:scale-95"
                    >
                        Começar Gratuitamente
                    </button>
                    <p className="mt-5 text-white/60 text-sm font-medium">Cartão de crédito não necessário para o plano Social.</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 border-t border-border-light dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-xl">shield_with_heart</span>
                            </div>
                            <span className="text-lg font-extrabold text-text-main dark:text-white tracking-tight">GuardianFlow</span>
                        </div>
                        <p className="text-text-secondary dark:text-gray-400 font-medium max-w-sm mb-6 text-sm leading-relaxed">
                            A tecnologia como ferramenta de transformação social e garantia de direitos para crianças e adolescentes.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-text-main dark:text-white mb-5 uppercase text-xs tracking-widest">Produto</h4>
                        <ul className="space-y-3 text-sm font-medium text-text-secondary dark:text-gray-400">
                            <li><a href="#features" className="hover:text-primary transition-colors">Recursos</a></li>
                            <li><a href="#pricing" className="hover:text-primary transition-colors">Preços</a></li>
                            <li><a href="#comparacao" className="hover:text-primary transition-colors">Comparação</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-text-main dark:text-white mb-5 uppercase text-xs tracking-widest">Suporte</h4>
                        <ul className="space-y-3 text-sm font-medium text-text-secondary dark:text-gray-400">
                            <li><a href="#" className="hover:text-primary transition-colors">Ajuda</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Termos</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-border-light dark:border-gray-800 text-center">
                    <p className="text-xs text-text-secondary dark:text-gray-500 font-medium">© 2026 GuardianFlow. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}
