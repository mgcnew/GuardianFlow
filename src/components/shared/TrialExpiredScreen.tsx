import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TrialExpiredScreen() {
    const { signOut, profile } = useAuth();

    const expirationDate = profile?.trial_expires_at
        ? format(new Date(profile.trial_expires_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
        : 'data desconhecida';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-surface-dark rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 text-center animate-in zoom-in-95 duration-300">
                <div className="size-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl">timer_off</span>
                </div>

                <h2 className="text-2xl font-black text-text-main dark:text-white mb-2 uppercase tracking-tight">
                    Período de Teste Encerrado
                </h2>

                <p className="text-sm text-text-secondary dark:text-gray-400 mb-8 leading-relaxed">
                    Seu acesso de demonstração expirou em <span className="font-bold text-red-500">{expirationDate}</span>.
                    Esperamos que tenha gostado da experiência com o <span className="font-bold text-primary">GuardianFlow</span>!
                </p>

                <div className="space-y-3">
                    <a
                        href="https://wa.me/seu-numero-aqui"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg">chat</span>
                        Contratar Versão Completa
                    </a>

                    <button
                        onClick={() => signOut()}
                        className="w-full h-12 bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Sair do Sistema
                    </button>
                </div>

                <p className="mt-8 text-[10px] text-text-secondary dark:text-gray-500 uppercase tracking-widest font-bold opacity-50">
                    GuardianFlow &copy; 2026 - Gestão Acolhedora
                </p>
            </div>
        </div>
    );
}
