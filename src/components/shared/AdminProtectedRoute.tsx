import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

interface AdminProtectedRouteProps {
    children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
    const { user, profile, loading } = useAuth();
    const [fontsLoaded, setFontsLoaded] = React.useState(false);

    React.useEffect(() => {
        document.fonts.ready.then(() => {
            setFontsLoaded(true);
        });
    }, []);

    if (loading || !fontsLoaded) return <LoadingScreen />;

    // Check if user is logged in and has the saas_admin role
    if (!user || profile?.role !== 'saas_admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
