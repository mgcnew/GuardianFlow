import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

export function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user, navigate]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('reveal-active');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Header - Transparent to Solid on Scroll */}
            <header className={clsx(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-3 md:px-6 lg:px-16",
                scrolled ? "py-2 md:py-4" : "py-4 md:py-8"
            )}>
                <div className={clsx(
                    "max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-12 md:h-16 transition-all duration-300",
                    scrolled
                        ? "bg-white/90 backdrop-blur-md shadow-sm border border-slate-200 rounded-full"
                        : "bg-white/60 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none rounded-2xl md:rounded-none"
                )}>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="size-8 md:size-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                            <span className="material-symbols-outlined text-white text-[18px] md:text-[22px]">shield_with_heart</span>
                        </div>
                        <span className="text-base md:text-xl font-black tracking-tight text-slate-900 font-display-new uppercase">GuardianFlow</span>
                    </div>

                    <nav className="hidden md:flex items-center gap-10">
                        {['Metodologia', 'Segurança', 'Planos'].map((item) => (
                            <a key={item} href="#" className="text-[13px] font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider">{item}</a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1 md:gap-3">
                        <button onClick={() => navigate('/login')} className="px-3 md:px-5 py-2 text-[12px] md:text-[13px] font-bold text-slate-700 hover:text-blue-600 transition-colors">Entrar</button>
                        <button onClick={() => navigate('/login')} className="hidden sm:block px-5 lg:px-7 py-2 md:py-2.5 bg-slate-900 text-white text-[12px] md:text-[13px] font-bold rounded-full hover:bg-blue-600 shadow-lg shadow-slate-900/10 transition-all active:scale-95">Solicitar Acesso</button>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section - The First Impression of Confidence */}
                <section className="relative pt-24 sm:pt-32 md:pt-44 pb-16 md:pb-28 px-6 overflow-hidden bg-white">
                    {/* Subtle grid pattern for a technical/organized look */}
                    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                    <div className="max-w-6xl mx-auto text-center relative z-10">
                        <div className="reveal inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-[11px] font-bold text-blue-700 mb-8 uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            Certificação de Dados e Sigilo Institucional
                        </div>

                        <h1 className="reveal font-serif text-3xl sm:text-5xl md:text-8xl font-medium tracking-tight text-slate-900 leading-[1.1] md:leading-[1.05] mb-6 md:mb-8">
                            Gestão de abrigos com<br className="hidden sm:block" /><span className="text-blue-600"> rigor técnico</span> e <span className="italic">fé pública.</span>
                        </h1>

                        <p className="reveal max-w-2xl mx-auto text-[18px] md:text-[21px] text-slate-500 font-medium leading-relaxed mb-12">
                            A plataforma definitiva para instituições que não abrem mão da excelência jurídica,
                            segurança de dados e do acompanhamento humano impecável.
                        </p>

                        <div className="reveal flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                            <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 md:px-12 py-3.5 md:py-5 bg-blue-600 text-white text-[14px] md:text-[16px] font-bold rounded-full shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95">
                                Ver Demonstração Completa
                            </button>
                            <button className="w-full sm:w-auto px-8 md:px-12 py-3.5 md:py-5 bg-white text-slate-900 text-[14px] md:text-[16px] font-bold rounded-full border-2 border-slate-900 hover:bg-slate-50 transition-all">
                                Protocolo de Segurança
                            </button>
                        </div>
                    </div>
                </section>

                {/* Proof of Trust - Stats with solid visual backing */}
                <section className="py-20 bg-slate-900 text-white border-y border-slate-800">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                            {[
                                { label: 'Conformidade MP', value: '100%' },
                                { label: 'Uptime do Sistema', value: '99.9%' },
                                { label: 'Atendimento ECA', value: 'Nível A' },
                                { label: 'Dados Criptografados', value: 'AES-256' },
                            ].map((stat, i) => (
                                <div key={i} className="reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                                    <div className="font-display-new text-4xl md:text-5xl font-black text-blue-400 mb-2 leading-none">{stat.value}</div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Methodology Grid - Clean and Stable Cards */}
                <section className="py-32 px-6 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-20 text-left">
                            <div className="max-w-2xl">
                                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4 block">Arquitetura de Confiança</span>
                                <h2 className="reveal font-serif text-3xl md:text-6xl font-medium text-slate-900 leading-tight">Um sistema projetado para ser o alicerce do seu trabalho.</h2>
                            </div>
                            <div className="reveal pb-2 hidden lg:block">
                                <p className="text-slate-500 font-medium max-w-sm text-right leading-relaxed">
                                    Nossa metodologia elimina sombras de dúvida, garantindo que toda decisão seja baseada em dados reais e protegidos.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                            {[
                                {
                                    title: 'Blindagem de Dados',
                                    desc: 'Infraestrutura com redundância geográfica e backups irrevogáveis para total proteção institucional.',
                                    icon: 'lock_person'
                                },
                                {
                                    title: 'Automação Pericial',
                                    desc: 'Geração de relatórios e PIAs sob medida para o MP, economizando horas de trabalho braçal.',
                                    icon: 'architecture'
                                },
                                {
                                    title: 'Integridade Ética',
                                    desc: 'Logs de acesso detalhados e níveis de permissão que garantem o sigilo profissional absoluto.',
                                    icon: 'gavel'
                                }
                            ].map((card, i) => (
                                <div key={i} className="reveal p-8 md:p-12 bg-white rounded-[32px] md:rounded-[40px] shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 group">
                                    <div className="size-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                        <span className="material-symbols-outlined text-3xl">{card.icon}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 font-display-new">{card.title}</h3>
                                    <p className="text-slate-500 leading-relaxed font-medium">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* The "Calling Card" Graphic - Clean UI Presentation */}
                <section className="px-6 py-32 bg-white border-y border-slate-100">
                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
                        <div className="flex-1 reveal order-2 lg:order-1">
                            {/* Stylized UI Graph/Component mock (SVG for zero weight) */}
                            <div className="relative p-1 bg-slate-100 rounded-[40px] shadow-2xl">
                                <div className="bg-white rounded-[36px] overflow-hidden border border-slate-200">
                                    <svg viewBox="0 0 800 500" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="800" height="500" fill="white" />
                                        <rect x="0" y="0" width="800" height="70" fill="#F8FAFC" />
                                        <rect x="30" y="20" width="120" height="30" rx="6" fill="#E2E8F0" />
                                        <rect x="650" y="20" width="120" height="30" rx="15" fill="#2563EB" />

                                        <rect x="40" y="110" width="340" height="150" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="1" />
                                        <rect x="420" y="110" width="340" height="150" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="1" />

                                        <rect x="40" y="290" width="720" height="180" rx="24" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />

                                        {/* Stylized Chart lines */}
                                        <path d="M70 420 L150 380 L230 400 L310 350 L390 370 L470 330 L550 350 L630 310 L710 330" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="absolute -top-6 -right-6 p-6 bg-slate-900 text-white rounded-[24px] shadow-xl text-center">
                                    <div className="text-3xl font-black text-blue-400">100%</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Controle Jurídico</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 reveal order-1 lg:order-2">
                            <h2 className="font-serif text-3xl md:text-6xl font-medium text-slate-900 mb-6 md:mb-8 leading-tight">O espelho da sua<br className="hidden sm:block" />governança.</h2>
                            <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed mb-8 md:text-lg">
                                O GuardianFlow não é apenas software, é o cartão de visita digital do seu rigor administrativo.
                                Quando o sistema opera, cada dado gerado é uma prova da qualidade do acolhimento da sua unidade.
                            </p>
                            <ul className="space-y-5">
                                {[
                                    'Checklists técnicos automatizados',
                                    'Gestão unificada de múltiplos abrigos',
                                    'Auditoria completa de cada registro'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 text-[15px] font-bold text-slate-800">
                                        <span className="material-symbols-outlined text-blue-600">check_circle</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Final Call to Action - Focused on Professional Urgency and Trust */}
                <section className="py-20 md:py-40 px-6">
                    <div className="max-w-5xl mx-auto rounded-[32px] md:rounded-[64px] bg-slate-900 p-10 md:p-24 text-center text-white relative overflow-hidden ring-1 ring-slate-800 shadow-[0_48px_100px_rgba(0,0,0,0.15)]">
                        <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none hidden md:block">
                            <span className="material-symbols-outlined text-[300px]">verified</span>
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <h2 className="reveal font-serif text-4xl md:text-7xl font-medium leading-[1.1] mb-10 max-w-3xl">
                                O próximo nível de <span className="text-blue-500 italic">segurança</span> para sua instituição.
                            </h2>
                            <p className="reveal max-w-xl text-slate-400 text-lg md:text-xl font-medium mb-12">
                                Junte-se à elite da gestão de acolhimento institucional no Brasil e profissionalize sua unidade ainda hoje.
                            </p>

                            <div className="reveal flex flex-col sm:flex-row gap-4 w-full justify-center">
                                <button onClick={() => navigate('/login')} className="px-12 py-5 bg-blue-600 text-white text-[16px] font-bold rounded-full hover:bg-blue-500 shadow-2xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95">
                                    Começar Adesão Gratuita
                                </button>
                                <button className="px-12 py-5 bg-slate-800 text-white text-[16px] font-bold rounded-full hover:bg-slate-700 transition-all">
                                    Agendar Consultoria Técnica
                                </button>
                            </div>

                            <p className="reveal mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                🔒 Dados protegidos conforme diretrizes da LGPD e do CONANDA
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Professional Footer */}
            <footer className="py-24 px-6 md:px-16 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-24">
                    <div className="md:col-span-5">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[18px]">shield_with_heart</span>
                            </div>
                            <span className="text-xl font-black tracking-tight text-slate-900 font-display-new uppercase">GuardianFlow</span>
                        </div>
                        <p className="text-[14px] text-slate-500 font-medium leading-relaxed max-w-sm mb-10">
                            Excelência tecnológica dedicada ao acolhimento institucional. O padrão ouro para monitoramento, segurança e direitos da infância.
                        </p>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-12">
                        <div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Sistema</h4>
                            <ul className="space-y-4 text-[13px] font-bold text-slate-800">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Funcionalidades</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Segurança</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">MP / Judiciário</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Institucional</h4>
                            <ul className="space-y-4 text-[13px] font-bold text-slate-800">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Termos de Uso</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">LGPD</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Suporte Técnico</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-[12px] font-bold text-slate-400 gap-4">
                    <p>© 2026 GuardianFlow. Tecnologia para o Acolhimento Institucional.</p>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-slate-900">Privacidade</a>
                        <a href="#" className="hover:text-slate-900">Certificações</a>
                    </div>
                </div>
            </footer>

            <style>{`
                .reveal {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
                }
                .reveal-active {
                    opacity: 1;
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
}
