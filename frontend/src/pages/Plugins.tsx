import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useKongData } from '../context/KongDataContext';
import { useToast } from '../context/ToastContext';
import { 
  Plus, 
  Trash2, 
  X,
  Settings,
  Search,
  Eye,
  ShieldAlert,
  Layers,
  ListFilter,
  CheckCircle2,
  Ban,
  GitBranch,
  RefreshCw
} from 'lucide-react';
import { PluginDynamicForm } from '../components/PluginDynamicForm';
import { PluginGallery } from '../components/PluginGallery';
import { RawViewModal } from '../components/RawViewModal';
import { Pagination } from '../components/Pagination';

interface PluginItem {
  id: string;
  name: string;
  enabled: boolean;
  service?: {
    id: string;
  };
  route?: {
    id: string;
  };
  consumer?: {
    id: string;
  };
  config: Record<string, any>;
  created_at: number;
  tags?: string[];
}

interface Service {
  id: string;
  name: string;
}

const getTagColor = (tag: string) => {
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const Plugins: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { 
    plugins: cachedPlugins, 
    services: cachedServices, 
    routes: cachedRoutes,
    refreshKongData 
  } = useKongData();

  // Initialize state from localStorage cache for INSTANT render on hard refresh (0ms wait)
  const [plugins, setPlugins] = useState<PluginItem[]>(() => {
    try {
      const saved = localStorage.getItem('noka_cache_plugins');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return (cachedPlugins || []) as PluginItem[];
  });

  const [services, setServices] = useState<Service[]>(() => {
    try {
      const saved = localStorage.getItem('noka_cache_services');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return (cachedServices || []) as Service[];
  });

  const [routes, setRoutes] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('noka_cache_routes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return cachedRoutes || [];
  });
  
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'by-service'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Modal fields
  const [editingPlugin, setEditingPlugin] = useState<PluginItem | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editConfig, setEditConfig] = useState<any>({});
  
  // Raw View Modal states
  const [viewingRawPlugin, setViewingRawPlugin] = useState<PluginItem | null>(null);
  const [isFormInvalid, setIsFormInvalid] = useState(false);

  // Initial and reactive background fetch without blocking page render
  useEffect(() => {
    fetchPluginsAndResources(plugins.length === 0);
  }, [user?.node]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddForm(false);
        setEditingPlugin(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchPluginsAndResources = async (showInitialLoader = false) => {
    if (showInitialLoader) {
      setIsSyncing(true);
    }
    try {
      // Use single aggregated endpoint that returns plugins, services, and routes together
      const resp = await axios.get('/api/kong/enriched-plugins');
      if (resp.data) {
        const p = resp.data.plugins || [];
        const s = resp.data.services || [];
        const r = resp.data.routes || [];

        setPlugins(p);
        setServices(s);
        setRoutes(r);

        // Persist to localStorage for instant 0ms hard refreshes
        try {
          localStorage.setItem('noka_cache_plugins', JSON.stringify(p));
          localStorage.setItem('noka_cache_services', JSON.stringify(s));
          localStorage.setItem('noka_cache_routes', JSON.stringify(r));
        } catch (e) {}
      }
      
      // Also update background context
      refreshKongData();
    } catch (err: any) {
      console.error('Failed to fetch enriched plugins:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddPluginFromGallery = async (pluginName: string, config: any, tags: string[]) => {


    const payload: any = {
      name: pluginName,
      enabled: true,
      config: config
    };

    if (tags && tags.length > 0) {
      payload.tags = tags;
    }

    try {
      await axios.post('/api/kong/plugins', payload);
      setShowAddForm(false);
      addToast('success', 'Plugin successfully enabled', 'Success');
      fetchPluginsAndResources();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to add plugin', 'Error');
    }
  };

  const handleUpdatePlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlugin) return;


    try {
      await axios.patch(`/api/kong/plugins/${editingPlugin.id}`, {
        enabled: editEnabled,
        config: editConfig
      });

      setEditingPlugin(null);
      addToast('success', 'Plugin successfully updated', 'Success');
      fetchPluginsAndResources();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to update plugin', 'Error');
    }
  };

  const handleDeletePlugin = async (id: string) => {
    if (!window.confirm('Are you sure you want to disable and delete this plugin?')) return;
    try {
      await axios.delete(`/api/kong/plugins/${id}`);
      addToast('success', 'Plugin successfully deleted', 'Success');
      fetchPluginsAndResources();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete plugin', 'Error');
    }
  };

  const openEditModal = (plugin: PluginItem) => {
    setEditingPlugin(plugin);
    setEditEnabled(plugin.enabled !== false);
    setEditConfig(plugin.config || {});
  };

  const uniqueTags = Array.from(
    new Set(
      plugins.flatMap(p => p.tags || [])
    )
  ).sort();

  const terminationPlugins = plugins.filter(p => p.name === 'request-termination');
  const activeTerminationCount = terminationPlugins.filter(p => p.enabled !== false).length;

  const filteredPlugins = plugins.filter(plugin => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return !selectedTag || (plugin.tags && plugin.tags.includes(selectedTag));
    }

    const svc = services.find(s => s.id === plugin.service?.id);
    const rt = routes.find(r => r.id === plugin.route?.id);
    const rtSvc = rt?.service?.id ? services.find(s => s.id === rt.service?.id) : null;

    const nameMatch = plugin.name.toLowerCase().includes(q);
    const idMatch = plugin.id.toLowerCase().includes(q);
    const serviceNameMatch = svc ? svc.name.toLowerCase().includes(q) : false;
    const serviceIdMatch = plugin.service?.id ? plugin.service.id.toLowerCase().includes(q) : false;
    const routeParentServiceNameMatch = rtSvc ? rtSvc.name.toLowerCase().includes(q) : false;
    const routeNameMatch = rt ? (rt.name || '').toLowerCase().includes(q) : false;
    const routePathMatch = rt ? (rt.paths || []).some((p: string) => p.toLowerCase().includes(q)) : false;
    const routeIdMatch = plugin.route?.id ? plugin.route.id.toLowerCase().includes(q) : false;
    const consumerMatch = plugin.consumer?.id ? plugin.consumer.id.toLowerCase().includes(q) : false;

    const matchesSearch = 
      nameMatch || 
      idMatch || 
      serviceNameMatch || 
      serviceIdMatch || 
      routeParentServiceNameMatch ||
      routeNameMatch || 
      routePathMatch || 
      routeIdMatch || 
      consumerMatch;
    
    const matchesTag = 
      !selectedTag || 
      (plugin.tags && plugin.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });

  const paginatedPlugins = React.useMemo(() => {
    return filteredPlugins.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredPlugins, currentPage, pageSize]);

  // Group plugins by service
  const servicePluginGroups = React.useMemo(() => {
    const map: Array<{ service: Service | null; plugins: PluginItem[] }> = [];

    // Global plugins (no service, no route)
    const globalPlugins = plugins.filter(p => !p.service?.id && !p.route?.id);
    if (globalPlugins.length > 0) {
      map.push({
        service: null,
        plugins: globalPlugins
      });
    }

    // Service plugins
    services.forEach(svc => {
      // Direct service plugins + plugins on routes that belong to this service
      const svcPlugins = plugins.filter(p => {
        if (p.service?.id === svc.id) return true;
        if (p.route?.id) {
          const r = routes.find(route => route.id === p.route?.id);
          return r?.service?.id === svc.id;
        }
        return false;
      });

      if (svcPlugins.length > 0) {
        map.push({
          service: svc,
          plugins: svcPlugins
        });
      }
    });

    return map;
  }, [plugins, services, routes]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">Plugins</h2>
            {isSyncing && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-brand-primary bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing in background...
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">Plugins allow you to extend gateway features, providing authentication, traffic control, security, logging, and more</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchPluginsAndResources(false)}
            disabled={isSyncing}
            className="p-2 rounded border border-border-light text-text-secondary hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-brand-primary' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all animate-fadeIn shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" /> ADD GLOBAL PLUGIN
          </button>
        </div>
      </div>

      {/* Dedicated Request Termination Box */}
      <div className={`p-5 rounded-xl border transition-all shadow-sm ${
        activeTerminationCount > 0 
          ? 'bg-rose-50/70 border-rose-200' 
          : 'bg-white border-border-light'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              activeTerminationCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Request Termination Box
                </h3>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Overview of all Request Termination policies. Intercepts incoming requests and responds immediately with custom status codes and messages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTerminationCount > 0 ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-sm animate-pulse">
                <Ban className="w-3.5 h-3.5" />
                <span>ACTIVE ({activeTerminationCount} TARGETS)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>NONE ACTIVE (ALL TRAFFIC PASSING)</span>
              </span>
            )}
          </div>
        </div>

        {terminationPlugins.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-border-light grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {terminationPlugins.map((p) => {
              const isEnabled = p.enabled !== false;
              const svc = services.find(s => s.id === p.service?.id);
              const rt = routes.find(r => r.id === p.route?.id);
              const targetName = svc?.name || (rt ? rt.name || rt.paths?.join(', ') : 'Global Gateway');
              const statusCode = p.config?.status_code || 503;
              const message = p.config?.message || 'Request terminated';

              return (
                <div key={p.id} className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                  isEnabled ? 'bg-white border-rose-200 shadow-2xs' : 'bg-slate-50 border-border-light opacity-75'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`} />
                        <span className="font-bold text-text-primary">{targetName}</span>
                      </div>
                      <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                        {p.service?.id ? `Service: ${p.service.id.substring(0, 8)}...` : p.route?.id ? `Route: ${p.route.id.substring(0, 8)}...` : 'Global'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                      isEnabled ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      HTTP {statusCode}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-text-secondary italic truncate">
                    "{message}"
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-light/60">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isEnabled ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {isEnabled ? '● Enabled (Intercepting)' : '○ Disabled'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 rounded hover:bg-slate-100 text-text-secondary cursor-pointer"
                        title="Edit plugin config"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlugin(p.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                        title="Delete plugin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 pt-2 border-t border-border-light text-[11px] text-text-muted">
            No Request Termination plugin configured yet. Add it on any service or route to temporarily block traffic with customized response codes.
          </div>
        )}
      </div>

      {/* View Switcher Bar */}
      <div className="flex items-center gap-2 border-b border-border-light pb-2">
        <button
          onClick={() => setViewMode('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'all' 
              ? 'bg-brand-primary text-white shadow-sm' 
              : 'bg-white border border-border-light text-text-secondary hover:bg-slate-50'
          }`}
        >
          <ListFilter className="w-4 h-4" /> All Plugins List ({plugins.length})
        </button>
        <button
          onClick={() => setViewMode('by-service')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'by-service' 
              ? 'bg-brand-primary text-white shadow-sm' 
              : 'bg-white border border-border-light text-text-secondary hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" /> Plugins to Service Mapping ({servicePluginGroups.length} Groups)
        </button>
      </div>

      {/* Add Form / Gallery Modal Dialog */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onMouseDown={() => setShowAddForm(false)}
        >
          <div 
            className="bg-white w-full max-w-5xl max-h-[88vh] rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <PluginGallery 
              onAdd={handleAddPluginFromGallery} 
              onCancel={() => setShowAddForm(false)} 
              scopeContext="Globally" 
            />
          </div>
        </div>
      )}

      {/* Search and Filter Panel */}
      {plugins.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-border-light shadow-sm">
          <div className="relative flex-1 w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins by name, ID, or applied service..."
              className="w-full pl-10 pr-4 py-2 rounded bg-slate-50 border border-border-light outline-none text-xs font-medium placeholder:text-text-muted transition-colors focus:border-brand-primary focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">Filter by Tag:</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary min-w-[140px]"
            >
              <option value="">All Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Conditional View: All Plugins Table vs Plugins by Service Mapping */}
      {viewMode === 'by-service' ? (
        <div className="space-y-4 animate-fadeIn">
          {servicePluginGroups.length > 0 ? (
            servicePluginGroups.map((group, idx) => {
              const isGlobal = group.service === null;
              return (
                <div key={idx} className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
                  {/* Service Header Bar */}
                  <div className="p-4 bg-slate-50/80 border-b border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isGlobal ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-brand-primary'}`}>
                        {isGlobal ? <GitBranch className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-text-primary">
                            {isGlobal ? 'Global Plugins (All Gateway Endpoints)' : (
                              <Link to={`/services/${group.service?.id}`} className="text-brand-primary hover:underline flex items-center gap-1">
                                {group.service?.name || group.service?.id}
                              </Link>
                            )}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            {group.plugins.length} active plugin{group.plugins.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        {!isGlobal && (
                          <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                            Service ID: {group.service?.id}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isGlobal && (
                      <Link 
                        to={`/services/${group.service?.id}`} 
                        className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
                      >
                        Manage Service Plugins →
                      </Link>
                    )}
                  </div>

                  {/* Plugins Grid under this Service */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.plugins.map((plugin) => {
                      const isTerm = plugin.name === 'request-termination';
                      const isEnabled = plugin.enabled !== false;

                      return (
                        <div 
                          key={plugin.id} 
                          className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                            isTerm && isEnabled 
                              ? 'bg-rose-50/80 border-rose-200 shadow-2xs' 
                              : 'bg-white border-border-light hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-50 border border-border-light shrink-0">
                                  <img 
                                    src={`/images/kong/plugins/${plugin.name}.png`} 
                                    alt={plugin.name}
                                    onError={(e) => { e.currentTarget.src = '/images/kong/plugins/kong.svg'; }}
                                    className="max-w-full max-h-full object-contain p-0.5"
                                  />
                                </div>
                                <div>
                                  <span 
                                    onClick={() => openEditModal(plugin)}
                                    className="font-bold text-xs text-text-primary hover:text-brand-primary hover:underline cursor-pointer block"
                                  >
                                    {plugin.name}
                                  </span>
                                  <span className="text-[9px] text-text-muted font-mono block">
                                    {plugin.id.substring(0, 8)}...
                                  </span>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>

                            {/* Plugin Tags */}
                            {plugin.tags && plugin.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {plugin.tags.map(t => {
                                  const c = getTagColor(t);
                                  return (
                                    <span key={t} className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
                                      {t}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {isTerm && (
                              <div className="mt-2 p-1.5 rounded bg-rose-100/70 text-rose-800 text-[10px] font-semibold flex items-center gap-1">
                                <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>Terminates: HTTP {plugin.config?.status_code || 503}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-border-light/60">
                            <span className="text-[10px] text-text-muted font-medium">
                              Created: {new Date(plugin.created_at * 1000).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setViewingRawPlugin(plugin)}
                                className="p-1 rounded hover:bg-slate-100 text-text-secondary cursor-pointer"
                                title="View Raw Config"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => openEditModal(plugin)}
                                className="p-1 rounded hover:bg-slate-100 text-text-secondary cursor-pointer"
                                title="Edit"
                              >
                                <Settings className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeletePlugin(plugin.id)}
                                className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 bg-white rounded-xl border border-border-light text-center text-text-muted text-xs font-semibold">
              No services with attached plugins found.
            </div>
          )}
        </div>
      ) : (
        /* Plugins List Table */
        <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
          {plugins.length === 0 && isSyncing ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Scope</th>
                    <th className="px-6 py-3.5">Apply To</th>
                    <th className="px-6 py-3.5">Consumer</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-200" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-slate-200 rounded" />
                            <div className="h-2.5 w-40 bg-slate-100 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="h-3 w-14 bg-slate-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-24 bg-slate-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-16 bg-slate-200 rounded" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-7 w-16 bg-slate-100 rounded ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : plugins.length > 0 ? (
            <div className="overflow-x-auto">
              {paginatedPlugins.length > 0 ? (
                <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      <th className="px-6 py-3.5">Name</th>
                      <th className="px-6 py-3.5">Scope</th>
                      <th className="px-6 py-3.5">Apply To</th>
                      <th className="px-6 py-3.5">Consumer</th>
                      <th className="px-6 py-3.5">Created</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary animate-fadeIn">
                    {paginatedPlugins.map((plugin) => {
                      let scopeName = 'global';
                      let applyTarget = 'All Entrypoints';
                      let targetLink = '';

                      if (plugin.service?.id) {
                        scopeName = 'services';
                        const svc = services.find(s => s.id === plugin.service?.id);
                        applyTarget = svc?.name || plugin.service.id;
                        targetLink = `/services/${plugin.service.id}`;
                      } else if (plugin.route?.id) {
                        scopeName = 'routes';
                        const r = routes.find(rt => rt.id === plugin.route?.id);
                        const parentSvc = r?.service?.id ? services.find(s => s.id === r.service?.id) : null;
                        applyTarget = parentSvc?.name || r?.name || r?.paths?.join(', ') || plugin.route.id;
                        targetLink = `/routes/${plugin.route.id}`;
                      }

                      const consumerName = plugin.consumer?.id ? plugin.consumer.id : 'All consumers';

                      return (
                        <tr key={plugin.id} className="hover:bg-slate-50/25 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center bg-white border border-border-light shadow-sm">
                                <img 
                                  src={`/images/kong/plugins/${plugin.name}.png`} 
                                  alt={plugin.name}
                                  onError={(e) => {
                                    e.currentTarget.src = '/images/kong/plugins/kong.svg';
                                  }}
                                  className="max-w-full max-h-full object-contain p-1"
                                />
                              </div>
                              <div>
                                {/* Clickable name opens edit modal */}
                                <span 
                                  onClick={() => openEditModal(plugin)}
                                  className="font-bold text-sm text-blue-600 block cursor-pointer hover:underline flex items-center gap-1.5"
                                >
                                  {plugin.name}
                                  <Settings className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
                                </span>
                                <span className="text-[10px] text-text-muted font-mono block select-all mt-0.5">{plugin.id}</span>
                                {plugin.tags && plugin.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5 max-w-xs">
                                    {plugin.tags.map(t => {
                                      const c = getTagColor(t);
                                      return (
                                        <span key={t} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
                                          {t}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-text-secondary capitalize font-medium">{scopeName}</span>
                          </td>
                          <td className="px-6 py-4">
                            {targetLink ? (
                              <Link 
                                to={targetLink} 
                                className="text-brand-primary hover:underline font-bold"
                              >
                                {applyTarget}
                              </Link>
                            ) : (
                              <span className="text-text-secondary font-medium">{applyTarget}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-text-secondary font-medium">
                            {plugin.consumer?.id ? (
                              <Link 
                                to={`/consumers/${plugin.consumer.id}`} 
                                className="text-brand-primary hover:underline font-bold"
                              >
                                {consumerName}
                              </Link>
                            ) : (
                              <span className="text-text-secondary font-medium">{consumerName}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-text-secondary font-medium">
                            {new Date(plugin.created_at * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setViewingRawPlugin(plugin)}
                                className="p-2 rounded border border-border-light hover:border-brand-primary/20 hover:bg-brand-primary/5 hover:text-brand-primary transition-colors text-text-secondary cursor-pointer"
                                title="View Raw JSON Config"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePlugin(plugin.id)}
                                className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary cursor-pointer"
                                title="Disable Plugin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredPlugins.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
                </>
              ) : (
                <div className="p-12 text-center text-text-muted text-xs font-medium">
                  No plugins match your search and filter criteria.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-text-muted text-xs font-medium">
              No plugins active. Click "+ ADD GLOBAL PLUGINS" to configure metrics, auth, etc.
            </div>
          )}
        </div>
      )}

      {/* Edit Plugin Modal */}
      {editingPlugin && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onMouseDown={() => {
            setEditingPlugin(null);
            setShowAddForm(false);
          }}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-lg border border-border-light shadow-xl flex flex-col animate-scaleUp overflow-hidden"
            style={{ maxHeight: '70vh' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                Configure Plugin: {editingPlugin.name}
              </h3>
              <button onClick={() => setEditingPlugin(null)} className="p-1 rounded hover:bg-slate-100 text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdatePlugin} className="p-6 space-y-4 overflow-y-auto">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded border border-border-light">
                <span className="text-xs font-bold text-text-primary uppercase">Status Active</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    {editEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditEnabled(!editEnabled)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${
                      editEnabled ? 'bg-brand-primary' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.25 transition-all shadow-sm ${
                      editEnabled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mt-4">
                <div className="bg-white border border-border-light rounded-lg p-6">
                  <PluginDynamicForm
                    pluginName={editingPlugin.name}
                    initialConfig={editConfig}
                    onChange={(cfg) => setEditConfig(cfg)}
                    onValidationError={setIsFormInvalid}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border-light mt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlugin(null)}
                  className="px-4 py-2 rounded border border-border-light text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFormInvalid}
                  className={`px-4 py-2 rounded text-white font-bold text-xs uppercase transition-colors ${
                    isFormInvalid ? 'bg-slate-300 cursor-not-allowed' : 'bg-brand-primary'
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raw View Modal */}
      <RawViewModal
        isOpen={!!viewingRawPlugin}
        onClose={() => setViewingRawPlugin(null)}
        title={`Raw View: ${viewingRawPlugin?.name}`}
        subtitle={`ID: ${viewingRawPlugin?.id}`}
        data={viewingRawPlugin}
      />
    </div>
  );
};
