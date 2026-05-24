import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { AdminProtectedRoute } from './components/shared/AdminProtectedRoute';
import { TrialExpiredScreen } from './components/shared/TrialExpiredScreen';

// Always loaded — needed before auth resolves
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { DemoRequest } from './pages/DemoRequest';

// Lazy-loaded — split into separate chunks
const MainLayout             = lazy(() => import('./components/layout/MainLayout').then(m => ({ default: m.MainLayout })));
const Dashboard              = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ChildrenList           = lazy(() => import('./pages/ChildrenList').then(m => ({ default: m.ChildrenList })));
const ChildProfile           = lazy(() => import('./pages/ChildProfile').then(m => ({ default: m.ChildProfile })));
const EducatorLogbook        = lazy(() => import('./pages/EducatorLogbook').then(m => ({ default: m.EducatorLogbook })));
const Schedule               = lazy(() => import('./pages/Schedule').then(m => ({ default: m.Schedule })));
const UnitSettings           = lazy(() => import('./pages/UnitSettings').then(m => ({ default: m.UnitSettings })));
const UserProfile            = lazy(() => import('./pages/UserProfile').then(m => ({ default: m.UserProfile })));
const PsychologistDashboard  = lazy(() => import('./pages/PsychologistDashboard').then(m => ({ default: m.PsychologistDashboard })));
const PedagogueDashboard     = lazy(() => import('./pages/PedagogueDashboard').then(m => ({ default: m.PedagogueDashboard })));
const SocialWorkDashboard    = lazy(() => import('./pages/SocialWorkDashboard').then(m => ({ default: m.SocialWorkDashboard })));
const InventoryPage          = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const FinancialDashboard     = lazy(() => import('./pages/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
const OperationalDashboard   = lazy(() => import('./pages/OperationalDashboard').then(m => ({ default: m.OperationalDashboard })));
const SuperAdmin             = lazy(() => import('./pages/admin/SuperAdmin').then(m => ({ default: m.SuperAdmin })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isTrialExpired, loading: authLoading } = useAuth();
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

  // Block access if trial is expired, unless it's a saas_admin
  if (isTrialExpired && profile?.role !== 'saas_admin') {
    return <TrialExpiredScreen />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/request-demo" element={<DemoRequest />} />

              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <SuperAdmin />
                  </Suspense>
                </AdminProtectedRoute>
              } />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <MainLayout />
                  </Suspense>
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense>} />
                <Route path="children" element={<Suspense fallback={<LoadingScreen />}><ChildrenList /></Suspense>} />
                <Route path="children/:id" element={<Suspense fallback={<LoadingScreen />}><ChildProfile /></Suspense>} />
                <Route path="agenda" element={<Suspense fallback={<LoadingScreen />}><Schedule /></Suspense>} />
                <Route path="logbook" element={<Suspense fallback={<LoadingScreen />}><EducatorLogbook /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<LoadingScreen />}><UnitSettings /></Suspense>} />
                <Route path="psychology" element={<Suspense fallback={<LoadingScreen />}><PsychologistDashboard /></Suspense>} />
                <Route path="pedagogy" element={<Suspense fallback={<LoadingScreen />}><PedagogueDashboard /></Suspense>} />
                <Route path="social" element={<Suspense fallback={<LoadingScreen />}><SocialWorkDashboard /></Suspense>} />
                <Route path="inventory" element={<Suspense fallback={<LoadingScreen />}><InventoryPage /></Suspense>} />
                <Route path="finance" element={<Suspense fallback={<LoadingScreen />}><FinancialDashboard /></Suspense>} />
                <Route path="operational" element={<Suspense fallback={<LoadingScreen />}><OperationalDashboard /></Suspense>} />
                <Route path="profile" element={<Suspense fallback={<LoadingScreen />}><UserProfile /></Suspense>} />
                <Route path="*" element={<div>Not Found</div>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
