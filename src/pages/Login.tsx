import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export function Login() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && user) {
            navigate('/dashboard');
        }
    }, [user, authLoading, navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                toast('Verifique seu e-mail para confirmar o cadastro!', 'success');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-surface-dark font-display flex">
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gray-50 dark:bg-gray-900/60 border-r border-border-light dark:border-gray-800 flex-col items-center justify-center px-12 relative">
                <div className="max-w-md text-center">
                    <div className="mb-6">
                        <img
                            src="/logo.png"
                            alt="Guardião Amigo"
                            className="h-28 md:h-32 w-auto mx-auto drop-shadow-xl object-contain"
                        />
                    </div>
                    <p className="text-text-secondary dark:text-gray-400 font-medium leading-relaxed mb-10">
                        A tecnologia que cuida de quem mais precisa. Gerencie seu abrigo com eficiência, segurança e humanidade.
                    </p>

                    {/* Mini feature list */}
                    <div className="space-y-4 text-left">
                        {[
                            { icon: 'family_restroom', text: 'Prontuário digital completo para cada acolhido' },
                            { icon: 'description', text: 'Relatórios automáticos para o juizado' },
                            { icon: 'lock', text: 'Dados seguros e em conformidade com a LGPD' },
                            { icon: 'cloud_done', text: 'Backup automático diário na nuvem' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-primary text-lg">{item.icon}</span>
                                </div>
                                <span className="text-sm text-text-secondary dark:text-gray-400 font-medium leading-relaxed">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer on left panel */}
                <div className="absolute bottom-8 text-xs text-text-secondary dark:text-gray-500 font-medium">
                    © 2026 Guardião Amigo. Todos os direitos reservados.
                </div>
            </div>

            {/* Right Panel — Auth Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    {/* Mobile logo — only visible on small screens */}
                    <div className="lg:hidden text-center mb-10">
                        <img
                            src="/logo.png"
                            alt="Guardião Amigo"
                            className="h-16 w-auto mx-auto drop-shadow-md object-contain"
                        />
                    </div>
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight mb-2">
                            {isSignUp ? 'Criar nova conta' : 'Bem-vindo de volta'}
                        </h1>
                        <p className="text-sm text-text-secondary dark:text-gray-400 font-medium">
                            {isSignUp
                                ? 'Preencha os dados para criar sua conta.'
                                : 'Entre com suas credenciais para acessar o painel.'
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-5">
                        <div>
                            <label htmlFor="email-address" className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                Email
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-text-main dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                required
                                className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-text-main dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Error alert */}
                        {error && (
                            <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3">
                                <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">error</span>
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Carregando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">login</span>
                                    {isSignUp ? 'Criar Conta' : 'Entrar'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle sign up / sign in */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-text-secondary dark:text-gray-400 font-medium">
                            {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
                            <button
                                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                                className="font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                {isSignUp ? 'Entrar' : 'Criar conta grátis'}
                            </button>
                        </p>
                    </div>

                    {/* Back to landing */}
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary dark:text-gray-500 hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Voltar para a página inicial
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
