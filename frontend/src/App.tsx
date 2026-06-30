import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { Help } from './pages/Help';
import { ServiceDetails } from './pages/ServiceDetails';
import { RouteDetails } from './pages/RouteDetails';
import { ConsumerDetails } from './pages/ConsumerDetails';
import { UpstreamDetails } from './pages/UpstreamDetails';
import { CertificateDetails } from './pages/CertificateDetails';
import { Info } from './pages/Info';
import { Snapshots } from './pages/Snapshots';
import { Settings } from './pages/Settings';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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
              <ProtectedRoute>
                <Services />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services/:id"
            element={
              <ProtectedRoute>
                <ServiceDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routes"
            element={
              <ProtectedRoute>
                <RoutesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routes/:id"
            element={
              <ProtectedRoute>
                <RouteDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consumers"
            element={
              <ProtectedRoute>
                <Consumers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consumers/:id"
            element={
              <ProtectedRoute>
                <ConsumerDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plugins"
            element={
              <ProtectedRoute>
                <Plugins />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upstreams"
            element={
              <ProtectedRoute>
                <Upstreams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upstreams/:id"
            element={
              <ProtectedRoute>
                <UpstreamDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <Certificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates/:id"
            element={
              <ProtectedRoute>
                <CertificateDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vaults"
            element={
              <ProtectedRoute>
                <Vaults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/keys"
            element={
              <ProtectedRoute>
                <Keys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/key-sets"
            element={
              <ProtectedRoute>
                <KeySets />
              </ProtectedRoute>
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
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
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
              <ProtectedRoute>
                <Info />
              </ProtectedRoute>
            }
          />
          <Route
            path="/snapshots"
            element={
              <ProtectedRoute>
                <Snapshots />
              </ProtectedRoute>
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
    </AuthProvider>
  );
}

export default App;
