


export function LoadingScreen() {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark z-50 text-center px-6">
            <div className="mb-10 animate-pulse">
                <img
                    src="/logo.png"
                    alt="Logo"
                    className="h-32 w-auto object-contain drop-shadow-2xl"
                />
            </div>
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
            </div>
        </div>
    );
}
