import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CommuneManagementProvider } from './hooks/useCommuneManagement';
import { CommuneDataProvider } from './hooks/useCommuneData';
import Layout from './components/Layout/Layout';
import LoginPage from './components/Auth/LoginPage';
import SignupPage from './components/Auth/SignupPage';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Trends from './pages/Trends';
import Recommendations from './pages/Recommendations';
import Profile from './pages/Profile';
import Compare from './pages/Compare';
import ImportPage from './pages/Admin/ImportPage';
import CommunesPage from './pages/Admin/CommunesPage';
import UsersPage from './pages/Admin/UsersPage';
import HistoryPage from './pages/Admin/HistoryPage';
import Help from './pages/Help';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accès non autorisé</h2>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires.</p>
        </div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/analysis"
        element={
          <PrivateRoute>
            <Analysis />
          </PrivateRoute>
        }
      />
      <Route
        path="/trends"
        element={
          <PrivateRoute>
            <Trends />
          </PrivateRoute>
        }
      />
      <Route
        path="/compare"
        element={
          <PrivateRoute>
            <Compare />
          </PrivateRoute>
        }
      />
      <Route
        path="/recommendations"
        element={
          <PrivateRoute>
            <Recommendations />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/help"
        element={
          <PrivateRoute>
            <Help />
          </PrivateRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/import"
        element={
          <PrivateRoute adminOnly>
            <ImportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/communes"
        element={
          <PrivateRoute adminOnly>
            <CommunesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute adminOnly>
            <UsersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/history"
        element={
          <PrivateRoute adminOnly>
            <HistoryPage />
          </PrivateRoute>
        }
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CommuneManagementProvider>
          <CommuneDataProvider>
            <AppRoutes />
          </CommuneDataProvider>
        </CommuneManagementProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
