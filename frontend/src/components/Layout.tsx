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
  ChevronDown,
  X,
  Info,
  Settings,
  Camera,
  FileText,
  Menu
} from 'lucide-react';

interface ConnectionNode {
  id: number;
  name: string;
  kong_admin_url: string;
  active: boolean;
  kong_version: string;
}

interface NotificationItem {
  id: number;
  message: string;
  icon?: string;
  state?: string;
  stateParams?: string;
  createdAt: string;
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState<string>(
    localStorage.getItem('noka_last_read_time') || new Date(0).toISOString()
  );

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      const now = new Date().toISOString();
      setLastReadTime(now);
      localStorage.setItem('noka_last_read_time', now);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setShowNotifications(false);
    if (notif.state) {
      navigate(`/${notif.state}`);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/notifications/${notifId}`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const unreadCount = notifications.filter(
    n => new Date(n.createdAt).getTime() > new Date(lastReadTime).getTime()
  ).length;

  const fetchConnections = async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/connections');
      const conns: ConnectionNode[] = response.data || [];
      setConnections(conns);
      
      // Determine active node: prioritize user.node, then conn.active
      let active: ConnectionNode | undefined;
      if (user.node) {
        active = conns.find((c) => c.id === Number(user.node));
      }
      if (!active) {
        active = conns.find((c) => c.active === true);
      }
      setActiveNode(active || null);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  const handleSwitchNode = async (nodeIdStr: string) => {
    if (!nodeIdStr || nodeIdStr === 'none') {
      try {
        await axios.post('/api/connections/deactivate');
        const userResp = await axios.get('/api/me');
        setUser(userResp.data);
        setActiveNode(null);
        fetchConnections();
      } catch (err) {
        console.error('Failed to deactivate node:', err);
      }
      return;
    }

    try {
      const nodeId = Number(nodeIdStr);
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

  const isAdmin = user?.admin || user?.role === 'admin' || user?.role === 'superadmin';

  const hasActiveNode = Boolean(activeNode || user?.node);

  interface SidebarItem {
    path: string;
    label: string;
    icon: React.ElementType;
    adminOnly?: boolean;
    requiresNode?: boolean;
  }

  interface SidebarGroup {
    title?: string;
    requiresNode?: boolean;
    items: SidebarItem[];
  }

  const sidebarGroups: SidebarGroup[] = [
    {
      items: [
        { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
        { path: '/info', label: 'INFO', icon: Info, adminOnly: true, requiresNode: true }
      ]
    },
    {
      title: 'API GATEWAY',
      requiresNode: true,
      items: [
        { path: '/services', label: 'SERVICES', icon: Cloud, requiresNode: true },
        { path: '/routes', label: 'ROUTES', icon: GitBranch, requiresNode: true },
        { path: '/consumers', label: 'CONSUMERS', icon: Users, requiresNode: true },
        { path: '/plugins', label: 'PLUGINS', icon: Plug, requiresNode: true },
        { path: '/upstreams', label: 'UPSTREAMS', icon: Share2, requiresNode: true },
        { path: '/certificates', label: 'CERTIFICATES', icon: Award, requiresNode: true },
        { path: '/vaults', label: 'VAULTS', icon: Lock, requiresNode: true },
        { path: '/keys', label: 'KEYS', icon: Key, requiresNode: true },
        { path: '/key-sets', label: 'KEY SETS', icon: Layers, requiresNode: true },
        { path: '/snapshots', label: 'SNAPSHOTS', icon: Camera, adminOnly: true, requiresNode: true }
      ]
    },
    {
      title: 'APPLICATION',
      items: [
        { path: '/users', label: 'USERS', icon: UsersIcon },
        { path: '/connections', label: 'CONNECTIONS', icon: Radio },
        { path: '/audit-logs', label: 'AUDIT LOGS', icon: FileText, adminOnly: true },
        { path: '/settings', label: 'SETTINGS', icon: Settings },
        { path: '/help', label: 'HELP', icon: HelpCircle }
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => !item.adminOnly || isAdmin)
  }));

  return (
    <div className="min-h-screen flex bg-bg-light text-text-primary font-sans relative">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop static / Mobile fixed drawer) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-60 bg-brand-royal text-brand-mint flex flex-col shrink-0
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 bg-brand-royal-dark border-b border-white/5">
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-wider text-brand-primary font-montserrat leading-none">
              NOKA
            </span>
            <span className="text-[9px] text-brand-mint/75 tracking-wide font-medium mt-1.5 uppercase">
              Nocta Kong Admin
            </span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded text-brand-mint/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-grow py-4 overflow-y-auto px-3 space-y-4">
          {sidebarGroups.map((group, groupIdx) => {
            const isGroupDisabled = Boolean(group.requiresNode && !hasActiveNode);

            return (
              <div key={groupIdx} className="space-y-1">
                {group.title && (
                  <div className="flex items-center justify-between px-3 pt-3 pb-1 text-[10px] font-semibold text-white/30 tracking-widest uppercase">
                    <span>{group.title}</span>
                    {isGroupDisabled && (
                      <span className="text-[8px] tracking-normal lowercase text-amber-400/80 font-normal italic">
                        (node required)
                      </span>
                    )}
                  </div>
                )}
                {group.items.map((item) => {
                  const isItemDisabled = Boolean(item.requiresNode && !hasActiveNode);
                  const isActive = !isItemDisabled && location.pathname === item.path;
                  const Icon = item.icon;

                  if (isItemDisabled) {
                    return (
                      <div
                        key={item.path}
                        title="Requires an active Kong connection. Please go to Connections to activate a node."
                        className="flex items-center justify-between px-3 py-2 rounded text-xs font-semibold opacity-30 text-white/30 cursor-not-allowed select-none transition-opacity"
                      >
                        <div className="flex items-center">
                          <Icon className="w-4 h-4 mr-3 text-white/20" />
                          <span>{item.label}</span>
                        </div>
                        <Lock className="w-3 h-3 text-white/20" />
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 rounded transition-colors duration-150 text-xs font-semibold ${isActive
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
            );
          })}
        </nav>

        {/* Version Footer */}
        <div className="p-4 bg-brand-royal-dark/40 border-t border-white/5 flex items-center justify-between text-[10px] font-semibold">
          <span className="text-brand-primary">NOKA v2.9.7</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border-light flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg border border-border-light hover:bg-slate-50 text-text-primary cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {connections.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary hidden sm:inline">Gateway Node:</span>
                <select
                  value={activeNode?.id || 'none'}
                  onChange={(e) => handleSwitchNode(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-border-light bg-slate-50 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary transition-colors max-w-[170px] sm:max-w-xs truncate cursor-pointer"
                >
                  <option value="none">-- Disconnected (No Gateway) --</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.kong_admin_url})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs font-semibold text-red-500">No active Kong node</span>
            )}
          </div>

          {/* Profile & Notifications */}
          <div className="flex items-center gap-6">
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={handleToggleNotifications}
                className="p-1.5 text-text-secondary hover:text-brand-primary hover:bg-slate-100 rounded-full transition-colors duration-150 relative outline-none cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-brand-primary text-white font-extrabold text-[8px] rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-border-light rounded-lg shadow-xl py-2 z-30 card-shadow">
                  <div className="px-4 py-2 border-b border-border-light flex justify-between items-center bg-slate-50/75">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wide">Notifications</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded hover:bg-slate-100 text-text-secondary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border-light/60">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-text-muted font-medium">
                        No notifications found...
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isNew = new Date(notif.createdAt).getTime() > new Date(lastReadTime).getTime();
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 text-left hover:bg-slate-50/75 transition-colors flex items-start gap-2.5 cursor-pointer relative ${isNew ? 'bg-brand-primary/[0.03]' : ''
                              }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-text-primary leading-normal break-words">
                                {notif.message}
                              </p>
                              <span className="text-[9px] text-text-muted font-medium block mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString()} — {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={(e) => handleDeleteNotification(e, notif.id)}
                                className="p-1 rounded hover:bg-slate-100 text-text-secondary hover:text-red-500 opacity-60 hover:opacity-100 transition-all flex-shrink-0"
                                title="Dismiss"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
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
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">NOKA Engine</span>
                    <span className="text-[9px] text-text-muted/80 block mt-0.5">v2.9.7 • Enterprise Ready</span>
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
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
