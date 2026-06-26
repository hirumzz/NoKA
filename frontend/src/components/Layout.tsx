import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Network, 
  Layers, 
  GitBranch, 
  Users, 
  Puzzle, 
  FileSpreadsheet, 
  Settings as SettingsIcon, 
  LogOut, 
  User as UserIcon,
  Shield,
  Activity
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/connections', label: 'Connections', icon: Network },
    { path: '/services', label: 'Services', icon: Layers, gatewayRequired: true },
    { path: '/routes', label: 'Routes', icon: GitBranch, gatewayRequired: true },
    { path: '/consumers', label: 'Consumers', icon: Users, gatewayRequired: true },
    { path: '/plugins', label: 'Plugins', icon: Puzzle, gatewayRequired: true },
    { path: '/audit-logs', label: 'Audit Logs', icon: FileSpreadsheet },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex bg-bg-dark text-text-primary">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-dark glass-panel flex flex-col z-20">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border-dark gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
              KONGA <span className="text-[10px] font-medium text-brand-accent px-1.5 py-0.5 rounded-full border border-brand-accent/30 bg-brand-accent/5 ml-1">REVAMP</span>
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/15'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card-dark'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-text-muted group-hover:text-text-primary'
                }`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-border-dark bg-card-dark/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mr-3">
                <UserIcon className="w-5 h-5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.username}</p>
                <span className="text-xs text-text-muted capitalize flex items-center gap-1">
                  <Shield className="w-3 h-3 text-brand-accent" />
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-muted hover:text-brand-accent hover:bg-brand-accent/5 transition-colors duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-border-dark flex items-center justify-between px-8 bg-bg-dark/85 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Gateway Connected: Default Node
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted">v2.0.0 (Go-React)</span>
          </div>
        </header>

        {/* Content Page */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
