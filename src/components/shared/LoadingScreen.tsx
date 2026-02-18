


export function LoadingScreen() {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark z-50">
            <div className="flex items-center justify-center bg-primary/10 rounded-full size-16 text-primary mb-6 animate-pulse">
                <span className="material-symbols-outlined text-[40px]">shield_person</span>
            </div>
            <h1 className="text-xl font-bold text-text-main dark:text-white mb-2">GuardianFlow</h1>
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
            </div>
        </div>
    );
}
