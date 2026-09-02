import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KongDataProvider } from './context/KongDataContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Connections } from './pages/Connections';
import { AuditLogs } from './pages/AuditLogs';
import { Services } from './pages/Services';
import { Routes as RoutesPage } from './pages/Routes';
import { Consumers } from './pages/Consumers';
import { Plugins } from './pages/Plugins';
import { Upstreams } from './pages/Upstreams';
import { Certificates } from './pages/Certificates';
import { Vaults } from './pages/Vaults';
import { Keys } from './pages/Keys';
import { KeySets } from './pages/KeySets';
import { Users } from './pages/Users';
import { UserProfile } from './pages/UserProfile';
import { Help } from './pages/Help';
import { ChangePassword } from './pages/ChangePassword';
import { ServiceDetails } from './pages/ServiceDetails';
import { RouteDetails } from './pages/RouteDetails';
import { ConsumerDetails } from './pages/ConsumerDetails';
import { UpstreamDetails } from './pages/UpstreamDetails';
import { CertificateDetails } from './pages/CertificateDetails';
import { Info } from './pages/Info';
import { Snapshots } from './pages/Snapshots';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.require_password_change) {
    return <Navigate to="/change-password" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Route guard requiring an active Kong Gateway connection
const GatewayRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.require_password_change) {
    return <Navigate to="/change-password" replace />;
  }

  if (!user.node) {
    return <Navigate to="/connections" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.require_password_change) {
    return <Navigate to="/change-password" replace />;
  }

  const isAdmin = user.admin || user.role === 'admin';
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Route guard requiring Admin AND active Kong Gateway connection
const GatewayAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.require_password_change) {
    return <Navigate to="/change-password" replace />;
  }

  const isAdmin = user.admin || user.role === 'admin';
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user.node) {
    return <Navigate to="/connections" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <KongDataProvider>
            <Router>
            <Routes>
            {/* Public / Auth Flow Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/connections"
              element={
                <ProtectedRoute>
                  <Connections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <GatewayRoute>
                  <Services />
                </GatewayRoute>
              }
            />
            <Route
              path="/services/:id"
              element={
                <GatewayRoute>
                  <ServiceDetails />
                </GatewayRoute>
              }
            />
            <Route
              path="/routes"
              element={
                <GatewayRoute>
                  <RoutesPage />
                </GatewayRoute>
              }
            />
            <Route
              path="/routes/:id"
              element={
                <GatewayRoute>
                  <RouteDetails />
                </GatewayRoute>
              }
            />
            <Route
              path="/consumers"
              element={
                <GatewayRoute>
                  <Consumers />
                </GatewayRoute>
              }
            />
            <Route
              path="/consumers/:id"
              element={
                <GatewayRoute>
                  <ConsumerDetails />
                </GatewayRoute>
              }
            />
            <Route
              path="/plugins"
              element={
                <GatewayRoute>
                  <Plugins />
                </GatewayRoute>
              }
            />
            <Route
              path="/upstreams"
              element={
                <GatewayRoute>
                  <Upstreams />
                </GatewayRoute>
              }
            />
            <Route
              path="/upstreams/:id"
              element={
                <GatewayRoute>
                  <UpstreamDetails />
                </GatewayRoute>
              }
            />
            <Route
              path="/certificates"
              element={
                <GatewayRoute>
                  <Certificates />
                </GatewayRoute>
              }
            />
            <Route
              path="/certificates/:id"
              element={
                <GatewayRoute>
                  <CertificateDetails />
                </GatewayRoute>
              }
            />
            <Route
              path="/vaults"
              element={
                <GatewayRoute>
                  <Vaults />
                </GatewayRoute>
              }
            />
            <Route
              path="/keys"
              element={
                <GatewayRoute>
                  <Keys />
                </GatewayRoute>
              }
            />
            <Route
              path="/key-sets"
              element={
                <GatewayRoute>
                  <KeySets />
                </GatewayRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <AdminRoute>
                  <AuditLogs />
                </AdminRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <Help />
                </ProtectedRoute>
              }
            />
            <Route
              path="/info"
              element={
                <GatewayRoute>
                  <Info />
                </GatewayRoute>
              }
            />
            <Route
              path="/snapshots"
              element={
                <GatewayAdminRoute>
                  <Snapshots />
                </GatewayAdminRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        </KongDataProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
