import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Scroll Reveal Logic
    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                }
            });
        }, observerOptions);

        const elements = document.querySelectorAll('.reveal');
        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [location.pathname]); // Re-run when page changes

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-text-main dark:text-white font-display p-4 gap-4">
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileMenuOpen}
                closeMobile={() => setIsMobileMenuOpen(false)}
            />
            <main className="flex-1 flex flex-col h-full gap-4 overflow-hidden relative">
                <Header onMenuToggle={() => setIsMobileMenuOpen(true)} />
                <div className="flex-1 overflow-y-auto bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-gray-800 shadow-sm p-6">
                    <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
                        <div key={location.pathname} className="animate-in fade-in duration-400">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
