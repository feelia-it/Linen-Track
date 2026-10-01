import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { exchangeSession, handleGoogleCallback } from './services/api';
import './index.css';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Outlets from './pages/Outlets';
import Users from './pages/Users';
import Categories from './pages/Categories';
import Departments from './pages/Departments';
import Items from './pages/Items';
import Vendors from './pages/Vendors';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import GRN from './pages/GRN';
import Issues from './pages/Issues';
import Returns from './pages/Returns';
import DiscardLost from './pages/DiscardLost';
import Reports from './pages/Reports';
import ActivityLogs from './pages/ActivityLogs';
import Settings from './pages/Settings';

// Auth callback component
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
      const sessionId = hashParams.get('session_id') || searchParams.get('session_id');

      try {
        if (code) {
          const redirectUri = window.location.origin + '/auth/callback';
          await handleGoogleCallback(code, redirectUri);
        } else if (sessionId) {
          await exchangeSession(sessionId);
        }
        await checkAuth();
        window.history.replaceState({}, '', '/dashboard');
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Authentication failed:', error);
        navigate('/', { replace: true });
      }
    };

    processAuth();
  }, [location, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
};

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(!location.state?.user);

  useEffect(() => {
    if (location.state?.user) {
      setChecking(false);
      return;
    }

    const verify = async () => {
      const userData = await checkAuth();
      if (!userData) {
        navigate('/', { replace: true });
      }
      setChecking(false);
    };

    if (!isLoading && !isAuthenticated) {
      navigate('/', { replace: true });
    } else if (!isLoading) {
      verify();
    }
  }, [isLoading, isAuthenticated, checkAuth, navigate, location.state]);

  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Router
const AppRouter = () => {
  const location = useLocation();

  // Check for auth callback in URL fragment or search params - handle BEFORE rendering routes
  if (location.hash?.includes('session_id=') || location.search?.includes('code=') || location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/companies" element={<ProtectedRoute allowedRoles={['super_admin']}><Companies /></ProtectedRoute>} />
      <Route path="/outlets" element={<ProtectedRoute allowedRoles={['super_admin', 'company_admin']}><Outlets /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['super_admin', 'company_admin']}><Users /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute allowedRoles={['super_admin', 'company_admin', 'company_manager']}><Categories /></ProtectedRoute>} />
      <Route path="/departments" element={<ProtectedRoute allowedRoles={['super_admin', 'company_admin', 'company_manager']}><Departments /></ProtectedRoute>} />
      <Route path="/items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
      <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/grn" element={<ProtectedRoute><GRN /></ProtectedRoute>} />
      <Route path="/issues" element={<ProtectedRoute><Issues /></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
      <Route path="/discard-lost" element={<ProtectedRoute><DiscardLost /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/activity-logs" element={<ProtectedRoute allowedRoles={['super_admin', 'company_admin', 'auditor']}><ActivityLogs /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
