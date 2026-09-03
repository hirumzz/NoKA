import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  GitBranch, 
  Plug, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Layers,
  XCircle,
  Activity,
  Settings,
  X,
  Eye,
  Ban
} from 'lucide-react';
import { CommentsSection } from '../components/CommentsSection';
import { PluginGallery } from '../components/PluginGallery';
import { PluginDynamicForm } from '../components/PluginDynamicForm';
import { RawViewModal } from '../components/RawViewModal';
import { useConfirm } from '../context/ConfirmContext';


interface KongRoute {
  id: string;
  name?: string;
  paths?: string[];
  hosts?: string[];
  methods?: string[];
  protocols: string[];
  strip_path: boolean;
  preserve_host: boolean;
  headers?: Record<string, string[]>;
  regex_priority?: number;
  https_redirect_status_code?: number;
  path_handling?: string;
  snis?: string[];
  sources?: any[];
  destinations?: any[];
  tags?: string[];
  service?: { id: string };
}

interface KongPlugin {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export const RouteDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { confirm } = useConfirm();
  const [route, setRoute] = useState<KongRoute | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'plugins'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [reachabilityStatus, setReachabilityStatus] = useState<{ status: 'idle' | 'checking' | 'reachable' | 'unreachable', message: string, code?: number }>({ status: 'idle', message: '' });

  // Route fields
  const [name, setName] = useState('');
  const [pathsInput, setPathsInput] = useState('');
  const [hostsInput, setHostsInput] = useState('');
  const [methods, setMethods] = useState<string[]>([]);
  const [protocols, setProtocols] = useState<string[]>(['http', 'https']);
  const [stripPath, setStripPath] = useState(true);
  const [preserveHost, setPreserveHost] = useState(false);
  const [headers, setHeaders] = useState('');
  const [regexPriority, setRegexPriority] = useState<number>(0);
  const [httpsRedirectStatusCode, setHttpsRedirectStatusCode] = useState<number>(426);
  const [pathHandling, setPathHandling] = useState<'v0' | 'v1'>('v0');
  const [snis, setSnis] = useState('');
  const [sources, setSources] = useState('');
  const [destinations, setDestinations] = useState('');
  const [healthcheckPath, setHealthcheckPath] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Sub-resource list states
  const [plugins, setPlugins] = useState<KongPlugin[]>([]);

  // Add Plugin Modal states
  const [showAddPlugin, setShowAddPlugin] = useState(false);

  // Edit Plugin Modal states
  const [editingPlugin, setEditingPlugin] = useState<KongPlugin | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editConfig, setEditConfig] = useState<any>({});

  // Raw View Modal states
  const [viewingRawPlugin, setViewingRawPlugin] = useState<any>(null);
  const [isFormInvalid, setIsFormInvalid] = useState(false);

  useEffect(() => {
    fetchRouteDetails();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingPlugin(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchRouteDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/kong/routes/${id}`);
      const data = response.data;
      setRoute(data);
      setName(data.name || '');
      setPathsInput(data.paths ? data.paths.join(', ') : '');
      setHostsInput(data.hosts ? data.hosts.join(', ') : '');
      setMethods(data.methods || []);
      setProtocols(data.protocols || ['http', 'https']);
      setStripPath(data.strip_path ?? true);
      setPreserveHost(data.preserve_host ?? false);
      setHeaders(data.headers ? JSON.stringify(data.headers) : '');
      setRegexPriority(data.regex_priority ?? 0);
      setHttpsRedirectStatusCode(data.https_redirect_status_code ?? 426);
      setPathHandling(data.path_handling ?? 'v0');
      setSnis(data.snis ? data.snis.join(', ') : '');
      setSources(data.sources ? JSON.stringify(data.sources) : '');
      setDestinations(data.destinations ? JSON.stringify(data.destinations) : '');
      
      let fetchedHealthPath = '';
      const normalTags: string[] = [];
      if (data.tags) {
        data.tags.forEach((t: string) => {
          if (t.startsWith('noka-health-path:')) {
            fetchedHealthPath = t.substring('noka-health-path:'.length);
          } else if (!t.startsWith('noka-creator:') && !t.startsWith('noka-updated-by:') && !t.startsWith('noka-updated-at:')) {
            normalTags.push(t);
          }
        });
      }
      setHealthcheckPath(fetchedHealthPath);
      setTagsInput(normalTags.join(', '));

      // Fetch plugins
      fetchSubResources();
      handleCheckReachability();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch route details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubResources = async () => {
    try {
      const response = await axios.get(`/api/kong/routes/${id}/plugins`);
      const plgs = response.data?.data || [];
      setPlugins(plgs.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0)));
    } catch (err) {
      console.error('Failed to fetch plugins:', err);
    }
  };

  const handleCheckReachability = async () => {
    setReachabilityStatus({ status: 'checking', message: 'Checking...' });
    try {
      const proxyUrl = localStorage.getItem('noka_proxy_url') || '';
      const response = await axios.get(`/api/kong/routes/${id}/check-reachability`, {
        params: { proxyUrl }
      });
      const { reachable, statusCode, message } = response.data;
      setReachabilityStatus({
        status: reachable ? 'reachable' : 'unreachable',
        message: message || '',
        code: statusCode
      });
    } catch (err: any) {
      setReachabilityStatus({ 
        status: 'unreachable', 
        message: err.response?.data?.message || 'Check failed' 
      });
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const parsedPaths = pathsInput ? pathsInput.split(',').map(p => p.trim()).filter(p => p !== '') : [];
    const parsedHosts = hostsInput ? hostsInput.split(',').map(h => h.trim()).filter(h => h !== '') : [];

    let parsedHeaders = undefined;
    if (headers.trim()) {
      try { parsedHeaders = JSON.parse(headers); } catch(e) { setError('Invalid Headers JSON format'); return; }
    }
    let parsedSources = undefined;
    if (sources.trim()) {
      try { parsedSources = JSON.parse(sources); } catch(e) { setError('Invalid Sources JSON format'); return; }
    }
    const parsedDestinations = destinations.trim() ? JSON.parse(destinations) : undefined;
    const parsedSnis = snis ? snis.split(',').map(s => s.trim()).filter(Boolean) : null;
    const parsedTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (healthcheckPath.trim()) {
      parsedTags.push(`noka-health-path:${healthcheckPath.trim()}`);
    }

    try {
      const payload: any = {};
      const changedFields: string[] = [];

      if ((name || '') !== (route?.name || '')) { payload.name = name || null; changedFields.push('name'); }
      
      const originalPaths = route?.paths || [];
      if (JSON.stringify([...parsedPaths].sort()) !== JSON.stringify([...originalPaths].sort())) {
        payload.paths = parsedPaths.length > 0 ? parsedPaths : null; changedFields.push('paths');
      }

      const originalHosts = route?.hosts || [];
      if (JSON.stringify([...parsedHosts].sort()) !== JSON.stringify([...originalHosts].sort())) {
        payload.hosts = parsedHosts.length > 0 ? parsedHosts : null; changedFields.push('hosts');
      }

      const originalMethods = route?.methods || [];
      if (JSON.stringify([...methods].sort()) !== JSON.stringify([...originalMethods].sort())) {
        payload.methods = methods.length > 0 ? methods : null; changedFields.push('methods');
      }

      const originalProtocols = route?.protocols || [];
      if (JSON.stringify([...protocols].sort()) !== JSON.stringify([...originalProtocols].sort())) {
        payload.protocols = protocols; changedFields.push('protocols');
      }

      if (stripPath !== (route?.strip_path ?? true)) { payload.strip_path = stripPath; changedFields.push('strip_path'); }
      if (preserveHost !== (route?.preserve_host ?? false)) { payload.preserve_host = preserveHost; changedFields.push('preserve_host'); }
      
      if (JSON.stringify(parsedHeaders || null) !== JSON.stringify(route?.headers || null)) {
        payload.headers = parsedHeaders || null; changedFields.push('headers');
      }

      if (regexPriority !== (route?.regex_priority ?? 0)) { payload.regex_priority = regexPriority; changedFields.push('regex_priority'); }
      if (httpsRedirectStatusCode !== (route?.https_redirect_status_code ?? 426)) { payload.https_redirect_status_code = httpsRedirectStatusCode; changedFields.push('https_redirect_status_code'); }
      if (pathHandling !== (route?.path_handling ?? 'v0')) { payload.path_handling = pathHandling; changedFields.push('path_handling'); }

      const originalSnis = route?.snis || [];
      if (JSON.stringify([...(parsedSnis || [])].sort()) !== JSON.stringify([...originalSnis].sort())) {
        payload.snis = parsedSnis; changedFields.push('snis');
      }

      if (JSON.stringify(parsedSources || null) !== JSON.stringify(route?.sources || null)) {
        payload.sources = parsedSources || null; changedFields.push('sources');
      }

      if (JSON.stringify(parsedDestinations || null) !== JSON.stringify(route?.destinations || null)) {
        payload.destinations = parsedDestinations || null; changedFields.push('destinations');
      }

      const originalTags = route?.tags || [];
      if (JSON.stringify([...parsedTags].sort()) !== JSON.stringify([...originalTags].sort())) {
        payload.tags = parsedTags; changedFields.push('tags');
      }

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes detected.');
        return;
      }

      await axios.patch(`/api/kong/routes/${id}`, payload, {
        headers: { 'X-Noka-Changed-Fields': changedFields.join(', ') }
      });
      setSuccess('Route configurations updated successfully!');
      fetchRouteDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update route');
    }
  };

  const handleToggleMethod = (method: string) => {
    if (methods.includes(method)) {
      setMethods(methods.filter(m => m !== method));
    } else {
      setMethods([...methods, method]);
    }
  };

  const handleToggleProtocol = (protocol: string) => {
    if (protocols.includes(protocol)) {
      if (protocols.length > 1) {
        setProtocols(protocols.filter(p => p !== protocol));
      }
    } else {
      setProtocols([...protocols, protocol]);
    }
  };

  const handleAddPluginFromGallery = async (pluginName: string, config: any, tags: string[]) => {
    setError('');
    try {
      const payload: any = {
        name: pluginName,
        config: config
      };
      if (tags && tags.length > 0) {
        payload.tags = tags;
      }
      await axios.post(`/api/kong/routes/${id}/plugins`, payload);
      setShowAddPlugin(false);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable plugin');
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
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update plugin');
    }
  };

  const openEditModal = (plugin: KongPlugin) => {
    setEditingPlugin(plugin);
    setEditEnabled(plugin.enabled !== false);
    setEditConfig(plugin.config || {});
  };

  const handleDeletePlugin = async (pluginId: string) => {
    const ok = await confirm({
      title: 'Disable Plugin',
      message: 'Are you sure you want to disable and delete this plugin from this route?',
      confirmText: 'Delete Plugin',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`/api/kong/plugins/${pluginId}`);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable plugin');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
        Loading route details...
      </div>
    );
  }

  if (!route) {
    return (
      <div className="p-6 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        Route config not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <Link to="/routes" className="p-2 rounded border border-border-light hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-brand-primary" /> 
            {route.name || 'Unnamed Route'}
          </h2>
          <span className="text-[10px] text-text-muted font-mono font-medium block mt-0.5">Route ID: {route.id}</span>
          {route.service && (
            <span className="text-[10px] text-brand-primary mt-1.5 block font-bold">
              Linked Service:{' '}
              <Link to={`/services/${route.service.id}`} className="hover:underline flex items-center gap-1 inline-flex">
                <Layers className="w-3 h-3 inline" /> {route.service.id}
              </Link>
            </span>
          )}
        </div>
      </div>

      {/* Request Termination Alert Banner (Conditional) */}
      {(() => {
        const activeTermPlugin = plugins.find(p => p.name === 'request-termination' && p.enabled !== false);
        if (!activeTermPlugin) return null;

        const statusCode = activeTermPlugin.config?.status_code || 503;
        const msg = activeTermPlugin.config?.message || 'Request terminated';

        return (
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/90 text-rose-900 shadow-sm flex items-start justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 shadow-sm animate-pulse">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    Traffic Intercepted by Request Termination Plugin
                  </h4>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-200 text-rose-800">
                    HTTP {statusCode}
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  All matching requests routed to this path are currently <strong>terminated/blocked</strong> with response message: <em>"{msg}"</em>.
                </p>
                <span className="text-[10px] text-rose-600 font-medium block mt-1">
                  To restore normal traffic flow, disable or delete the request-termination plugin in the <strong>Plugins</strong> tab below.
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('plugins')}
              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Manage Plugin
            </button>
          </div>
        );
      })()}

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-colors ${
              activeTab === 'details' ? 'bg-brand-primary text-white' : 'bg-transparent text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            <AlertCircle className="w-4 h-4" /> Route Details
          </button>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-colors ${
              activeTab === 'plugins' ? 'bg-brand-primary text-white' : 'bg-transparent text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            <Plug className="w-4 h-4" /> Plugins
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 min-w-0">

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Update Route Rules</h3>
              <div className="flex flex-wrap items-center gap-2">
                {reachabilityStatus.status !== 'idle' && (
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {reachabilityStatus.status === 'checking' && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                        Checking...
                      </span>
                    )}
                    {reachabilityStatus.status === 'reachable' && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200" title={reachabilityStatus.message}>
                        <CheckCircle className="w-4 h-4" /> Reachable {reachabilityStatus.code ? `(${reachabilityStatus.code})` : ''}
                      </span>
                    )}
                    {reachabilityStatus.status === 'unreachable' && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200" title={reachabilityStatus.message}>
                        <XCircle className="w-4 h-4" /> Unreachable
                      </span>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCheckReachability}
                  disabled={reachabilityStatus.status === 'checking'}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors uppercase disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5" /> Refresh Status
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Route Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. get-users-route"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Paths (comma separated)</label>
                  <input
                    type="text"
                    value={pathsInput}
                    onChange={(e) => setPathsInput(e.target.value)}
                    placeholder="e.g. /users, /accounts"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Hosts (comma separated)</label>
                  <input
                    type="text"
                    value={hostsInput}
                    onChange={(e) => setHostsInput(e.target.value)}
                    placeholder="e.g. api.domain.com"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Regex Priority</label>
                  <input
                    type="number"
                    value={regexPriority}
                    onChange={(e) => setRegexPriority(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">HTTPS Redirect Status</label>
                  <select
                    value={httpsRedirectStatusCode}
                    onChange={(e) => setHttpsRedirectStatusCode(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  >
                    <option value={426}>426</option>
                    <option value={301}>301</option>
                    <option value={302}>302</option>
                    <option value={307}>307</option>
                    <option value={308}>308</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Path Handling</label>
                  <select
                    value={pathHandling}
                    onChange={(e) => setPathHandling(e.target.value as 'v0' | 'v1')}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  >
                    <option value="v0">v0</option>
                    <option value="v1">v1</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Headers (JSON)</label>
                  <input
                    type="text"
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    placeholder='{"x-version":["v1"]}'
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">SNIs (comma separated)</label>
                  <input
                    type="text"
                    value={snis}
                    onChange={(e) => setSnis(e.target.value)}
                    placeholder="e.g. ssl.domain.com"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Sources (JSON Array)</label>
                  <input
                    type="text"
                    value={sources}
                    onChange={(e) => setSources(e.target.value)}
                    placeholder='[{"ip":"10.0.0.0/24","port":80}]'
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Destinations (JSON array)</label>
                  <input
                    type="text"
                    value={destinations}
                    onChange={(e) => setDestinations(e.target.value)}
                    placeholder='[{"ip":"10.1.0.0/16","port":8080}]'
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                  />
                </div>
                
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Healthcheck Path (Optional)</label>
                  <input
                    type="text"
                    value={healthcheckPath}
                    onChange={(e) => setHealthcheckPath(e.target.value)}
                    placeholder="e.g. /healthz or /actuator/health (leave blank to test root /)"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <span className="text-[10px] text-text-muted">Custom endpoint for route status health checks. Not sent to Kong route rules.</span>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Tags</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. production, api (comma-separated)"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Protocols */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase block">Protocols</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {['http', 'https', 'grpc', 'grpcs', 'tcp', 'tls'].map(p => (
                      <label key={p} className="flex items-center gap-1.5 text-xs text-text-primary font-semibold select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={protocols.includes(p)}
                          onChange={() => handleToggleProtocol(p)}
                          className="rounded text-brand-primary border-border-light"
                        />
                        <span className="uppercase">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* HTTP Methods */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase block">HTTP Methods (leave empty for any)</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map(m => (
                      <label key={m} className="flex items-center gap-1.5 text-xs text-text-primary font-semibold select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={methods.includes(m)}
                          onChange={() => handleToggleMethod(m)}
                          className="rounded text-brand-primary border-border-light"
                        />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-6 pt-2 md:col-span-2 text-xs font-semibold text-text-primary">
                  <label className="flex items-center gap-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripPath}
                      onChange={(e) => setStripPath(e.target.checked)}
                      className="rounded text-brand-primary border-border-light"
                    />
                    <span>Strip Path</span>
                  </label>
                  <label className="flex items-center gap-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveHost}
                      onChange={(e) => setPreserveHost(e.target.checked)}
                      className="rounded text-brand-primary border-border-light"
                    />
                    <span>Preserve Host</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs uppercase hover:bg-brand-primary-hover shadow-sm"
              >
                Submit Changes
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
            <CommentsSection referenceId={route.id} referenceType="route" referenceName={route.name || route.id} />
          </div>
        </div>
      )}

      {/* Tab: Plugins */}
      {activeTab === 'plugins' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Plug className="w-4 h-4 text-brand-primary" /> Route-Specific Plugins
              </h3>
              <button
                onClick={() => setShowAddPlugin(!showAddPlugin)}
                className="flex items-center px-3 py-1.5 rounded border border-border-light hover:bg-slate-50 text-brand-primary font-bold text-[10px] uppercase shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Enable Plugin
              </button>
            </div>

            {showAddPlugin && (
              <PluginGallery 
                onAdd={handleAddPluginFromGallery} 
                onCancel={() => setShowAddPlugin(false)} 
                scopeContext="specifically for this route" 
              />
            )}

            <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden mt-4">
              {plugins.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                        <th className="px-6 py-3.5">Name</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                      {plugins.map(plugin => (
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
                                <span 
                                  onClick={() => openEditModal(plugin)}
                                  className="font-bold text-sm text-blue-600 block cursor-pointer hover:underline flex items-center gap-1.5 capitalize"
                                >
                                  {plugin.name}
                                  <Settings className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
                                </span>
                                <span className="text-[10px] text-text-muted font-mono block select-all mt-0.5">{plugin.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              plugin.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                            </span>
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
                                onClick={() => openEditModal(plugin)} 
                                className="p-2 rounded border border-border-light text-text-secondary hover:text-brand-primary hover:border-brand-primary/20 hover:bg-brand-primary/5 transition-colors"
                                title="Configure Plugin"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeletePlugin(plugin.id)} 
                                className="p-2 rounded border border-border-light text-text-secondary hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                                title="Disable Plugin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-text-muted text-xs italic py-8">No plugins configured specifically for this route.</div>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Edit Plugin Modal */}
      {editingPlugin && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onMouseDown={() => {
            setEditingPlugin(null);
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
