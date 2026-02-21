import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { ChildrenList } from './pages/ChildrenList';
import { ChildProfile } from './pages/ChildProfile';
import { EducatorLogbook } from './pages/EducatorLogbook';
import { Schedule } from './pages/Schedule';

import { UnitSettings } from './pages/UnitSettings';
import { UserProfile } from './pages/UserProfile';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { PsychologistDashboard } from './pages/PsychologistDashboard';
import { PedagogueDashboard } from './pages/PedagogueDashboard';
import { SocialWorkDashboard } from './pages/SocialWorkDashboard';
import { InventoryPage } from './pages/InventoryPage';
import { FinancialDashboard } from './pages/FinancialDashboard';
import { OperationalDashboard } from './pages/OperationalDashboard';
import { SuperAdmin } from './pages/admin/SuperAdmin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { AdminProtectedRoute } from './components/shared/AdminProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  React.useEffect(() => {
    // Safety timeout to prevent getting stuck
    const timeout = setTimeout(() => setFontsLoaded(true), 800);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        clearTimeout(timeout);
        setFontsLoaded(true);
      }).catch(() => {
        setFontsLoaded(true);
      });
    } else {
      setFontsLoaded(true);
    }

    return () => clearTimeout(timeout);
  }, []);

  const loading = authLoading || !fontsLoaded;

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" />;

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />

              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <SuperAdmin />
                </AdminProtectedRoute>
              } />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="children" element={<ChildrenList />} />
                <Route path="children/:id" element={<ChildProfile />} />
                <Route path="agenda" element={<Schedule />} />
                <Route path="logbook" element={<EducatorLogbook />} />
                <Route path="settings" element={<UnitSettings />} />
                <Route path="psychology" element={<PsychologistDashboard />} />
                <Route path="pedagogy" element={<PedagogueDashboard />} />
                <Route path="social" element={<SocialWorkDashboard />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="finance" element={<FinancialDashboard />} />
                <Route path="operational" element={<OperationalDashboard />} />
                <Route path="profile" element={<UserProfile />} />
                <Route path="*" element={<div>Not Found</div>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
