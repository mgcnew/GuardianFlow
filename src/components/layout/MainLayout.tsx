import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-text-main dark:text-white font-display">
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileMenuOpen}
                closeMobile={() => setIsMobileMenuOpen(false)}
            />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <Header onMenuToggle={() => setIsMobileMenuOpen(true)} />
                <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6">
                    <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
                        <div key={location.pathname} className="animate-in fade-in duration-300">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
