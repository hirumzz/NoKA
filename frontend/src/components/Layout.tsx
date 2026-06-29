import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Cloud,
  GitBranch, 
  Users, 
  Plug,
  Share2,
  Award,
  Lock,
  Key,
  Layers,
  Users as UsersIcon,
  Radio,
  HelpCircle,
  Bell,
  LogOut,
  ChevronDown
} from 'lucide-react';

interface ConnectionNode {
	id: number;
	name: string;
	kong_admin_url: string;
	active: boolean;
	kong_version: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [connections, setConnections] = useState<ConnectionNode[]>([]);
  const [activeNode, setActiveNode] = useState<ConnectionNode | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/connections');
      setConnections(response.data);
      const active = response.data.find((c: ConnectionNode) => c.active === true);
      if (active) {
        setActiveNode(active);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  const handleSwitchNode = async (nodeId: number) => {
    try {
      await axios.post(`/api/connections/${nodeId}/activate`);
      // Reload user profile to update active node ID
      const userResp = await axios.get('/api/me');
      setUser(userResp.data);
      // Reload connections list
      fetchConnections();
    } catch (err) {
      console.error('Failed to activate node:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarGroups = [
    {
      items: [
        { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard }
      ]
    },
    {
      title: 'API GATEWAY',
      items: [
        { path: '/services', label: 'SERVICES', icon: Cloud },
        { path: '/routes', label: 'ROUTES', icon: GitBranch },
        { path: '/consumers', label: 'CONSUMERS', icon: Users },
        { path: '/plugins', label: 'PLUGINS', icon: Plug },
        { path: '/upstreams', label: 'UPSTREAMS', icon: Share2 },
        { path: '/certificates', label: 'CERTIFICATES', icon: Award },
        { path: '/vaults', label: 'VAULTS', icon: Lock },
        { path: '/keys', label: 'KEYS', icon: Key },
        { path: '/key-sets', label: 'KEY SETS', icon: Layers }
      ]
    },
    {
      title: 'APPLICATION',
      items: [
        { path: '/users', label: 'USERS', icon: UsersIcon },
        { path: '/connections', label: 'CONNECTIONS', icon: Radio },
        { path: '/help', label: 'HELP', icon: HelpCircle }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex bg-bg-light text-text-primary font-sans">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-royal text-brand-mint flex flex-col z-20 shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 bg-brand-royal-dark border-b border-white/5">
          <img src="/conga.svg" alt="NOKA Logo" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-wider text-brand-primary font-montserrat leading-none">
              NOKA
            </span>
            <span className="text-[9px] text-white/40 tracking-wide font-medium mt-1 uppercase">
              Nocta Kong Admin
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-grow py-4 overflow-y-auto px-3 space-y-4">
          {sidebarGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.title && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-white/30 tracking-widest uppercase">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded transition-colors duration-150 text-xs font-semibold ${
                      isActive
                        ? 'bg-brand-royal-light text-white border-l-2 border-brand-primary'
                        : 'text-brand-mint hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-brand-primary' : 'text-brand-mint/65'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Version Footer */}
        <div className="p-4 bg-brand-royal-dark/40 border-t border-white/5 flex items-center justify-between text-[10px] font-semibold">
          <span className="text-brand-primary">NOKA v1.0.5</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border-light flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            {connections.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary">Gateway Node:</span>
                <select
                  value={activeNode?.id || ''}
                  onChange={(e) => handleSwitchNode(Number(e.target.value))}
                  className="px-3 py-1.5 rounded border border-border-light bg-slate-50 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary transition-colors"
                >
                  <option value="" disabled>Select Connection</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.kong_admin_url})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs font-semibold text-red-500">No active Kong node connections. Go to Connections page.</span>
            )}
          </div>

          {/* Profile & Notifications */}
          <div className="flex items-center gap-6">
            <button className="p-1 text-text-secondary hover:text-brand-primary transition-colors duration-150 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-brand-primary rounded-full border border-white" />
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors duration-150 outline-none"
              >
                <div className="w-8 h-8 rounded-full border border-brand-primary bg-slate-100 flex items-center justify-center text-brand-primary font-bold text-xs uppercase overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.firstName ? user.firstName[0] : (user?.username ? user.username[0] : 'U')
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-[11px] text-text-muted block font-medium">Hello,</span>
                  <span className="text-xs font-bold text-text-primary capitalize flex items-center gap-1">
                    {user?.firstName || user?.username}
                    <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                  </span>
                </div>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-border-light rounded-lg shadow-lg py-1 z-30">
                  <div className="px-4 py-2 border-b border-border-light">
                    <p className="text-xs font-bold text-text-primary truncate">{user?.username}</p>
                    <p className="text-[10px] text-text-muted truncate capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-xs font-semibold text-red-600 hover:bg-slate-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Page wrapper */}
        <main className="flex-1 p-8 flex flex-col justify-between">
          <div className="w-full">
            {children}
          </div>

          {/* Connected Footer */}
          <footer className="mt-8 pt-4 border-t border-border-light flex justify-between items-center text-[10px] font-semibold text-text-secondary shrink-0">
            <span>© {new Date().getFullYear()} NOKA</span>
            {activeNode ? (
              <span className="flex items-center gap-1.5 text-brand-primary">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Connected to {activeNode.name}
              </span>
            ) : (
              <span className="text-red-500 font-semibold">Not Connected</span>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
};
