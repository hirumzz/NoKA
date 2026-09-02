import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Layers, 
  Plug, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Activity,
  XCircle,
  GitBranch,
  Users,
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


interface KongService {
  id: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  protocol: string;
  path: string;
  connect_timeout: number;
  write_timeout: number;
  read_timeout: number;
  retries: number;
  tags?: string[];
  client_certificate?: { id: string };
}

interface KongRoute {
  id: string;
  name?: string;
  paths?: string[];
  hosts?: string[];
  protocols: string[];
  methods?: string[];
}

interface KongPlugin {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export const ServiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { confirm } = useConfirm();
  const [service, setService] = useState<KongService | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'routes' | 'plugins'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reachabilityStatus, setReachabilityStatus] = useState<{ status: 'idle' | 'checking' | 'reachable' | 'unreachable', message: string, code?: number }>({ status: 'idle', message: '' });



  // Service fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(80);
  const [protocol, setProtocol] = useState('http');
  const [path, setPath] = useState('');
  const [connectTimeout, setConnectTimeout] = useState(60000);
  const [writeTimeout, setWriteTimeout] = useState(60000);
  const [readTimeout, setReadTimeout] = useState(60000);
  const [retries, setRetries] = useState(5);
  const [clientCertificateId, setClientCertificateId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Sub-resource list states
  const [routes, setRoutes] = useState<KongRoute[]>([]);
  const [plugins, setPlugins] = useState<KongPlugin[]>([]);

  // Add Route Modal states
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routePaths, setRoutePaths] = useState('');
  const [routeHosts, setRouteHosts] = useState('');
  const [routeMethods, setRouteMethods] = useState<string[]>([]);
  const [routeProtocols, setRouteProtocols] = useState<string[]>(['http', 'https']);
  const [routeTags, setRouteTags] = useState('');
  const [routeStripPath, setRouteStripPath] = useState(true);
  const [routePreserveHost, setRoutePreserveHost] = useState(false);
  const [routeRegexPriority, setRouteRegexPriority] = useState<number>(0);
  const [routeHttpsRedirectStatusCode, setRouteHttpsRedirectStatusCode] = useState<number>(426);
  const [routePathHandling, setRoutePathHandling] = useState<'v0' | 'v1'>('v0');
  const [routeHeaders, setRouteHeaders] = useState('');
  const [routeSnis, setRouteSnis] = useState('');
  const [routeSources, setRouteSources] = useState('');
  const [routeDestinations, setRouteDestinations] = useState('');
  const [routeSubmitting, setRouteSubmitting] = useState(false);

  const routeMethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
  const routeProtocolOptions = ['http', 'https', 'grpc', 'grpcs', 'tcp', 'tls', 'udp'];

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
    fetchServiceDetails();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingPlugin(null);
        setShowAddRouteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchServiceDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/kong/services/${id}`);
      const data = response.data;
      setService(data);
      setName(data.name || '');
      
      let fetchedDesc = '';
      let fetchedTags: string[] = [];
      if (data.tags) {
        const descTag = data.tags.find((t: string) => t.startsWith('noka-desc:'));
        if (descTag) fetchedDesc = descTag.substring('noka-desc:'.length);
        fetchedTags = data.tags.filter((t: string) => !t.startsWith('noka-desc:'));
      }
      setDescription(fetchedDesc);
      setTagsInput(fetchedTags.join(', '));
      setHost(data.host || '');
      setPort(data.port || 80);
      setProtocol(data.protocol || 'http');
      setPath(data.path || '');
      setConnectTimeout(data.connect_timeout || 60000);
      setWriteTimeout(data.write_timeout || 60000);
      setReadTimeout(data.read_timeout || 60000);
      setRetries(data.retries || 5);
      setClientCertificateId(data.client_certificate?.id || '');

      // Fetch routes and plugins
      fetchSubResources();
      // Auto check reachability
      handleCheckReachability();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch service details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubResources = async () => {
    try {
      const [routesResp, pluginsResp] = await Promise.all([
        axios.get(`/api/kong/services/${id}/routes`).catch(() => ({ data: { data: [] } })),
        axios.get(`/api/kong/services/${id}/plugins`).catch(() => ({ data: { data: [] } }))
      ]);
      const rts = routesResp.data?.data || [];
      const plgs = pluginsResp.data?.data || [];
      setRoutes(rts.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0)));
      setPlugins(plgs.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0)));
    } catch (err) {
      console.error('Failed to fetch routes or plugins:', err);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload: any = {};
      const changedFields: string[] = [];

      if ((name || '') !== (service?.name || '')) {
        payload.name = name || null;
        changedFields.push('name');
      }
      if (host !== (service?.host || '')) {
        payload.host = host;
        changedFields.push('host');
      }
      if (Number(port) !== (service?.port || 80)) {
        payload.port = Number(port);
        changedFields.push('port');
      }
      if (protocol !== (service?.protocol || 'http')) {
        payload.protocol = protocol;
        changedFields.push('protocol');
      }
      if ((path || '') !== (service?.path || '')) {
        payload.path = path || null;
        changedFields.push('path');
      }
      if (Number(connectTimeout) !== (service?.connect_timeout || 60000)) {
        payload.connect_timeout = Number(connectTimeout);
        changedFields.push('connect_timeout');
      }
      if (Number(writeTimeout) !== (service?.write_timeout || 60000)) {
        payload.write_timeout = Number(writeTimeout);
        changedFields.push('write_timeout');
      }
      if (Number(readTimeout) !== (service?.read_timeout || 60000)) {
        payload.read_timeout = Number(readTimeout);
        changedFields.push('read_timeout');
      }
      if (Number(retries) !== (service?.retries || 5)) {
        payload.retries = Number(retries);
        changedFields.push('retries');
      }
      
      let fetchedDesc = '';
      if (service?.tags) {
        const descTag = service.tags.find((t: string) => t.startsWith('noka-desc:'));
        if (descTag) fetchedDesc = descTag.substring('noka-desc:'.length);
      }
      
      
      if (description !== fetchedDesc || tagsInput !== (service?.tags?.filter((t: string) => !t.startsWith('noka-desc:')).join(', ') || '')) {
        let newTags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [];
        if (description) {
          newTags.push(`noka-desc:${description}`);
        }
        
        // Deep compare array elements
        const currentServiceTags = service?.tags || [];
        const sortedNew = [...newTags].sort();
        const sortedOld = [...currentServiceTags].sort();
        if (JSON.stringify(sortedNew) !== JSON.stringify(sortedOld)) {
            if (description !== fetchedDesc) {
              changedFields.push('description');
            }
            if (tagsInput !== (service?.tags?.filter((t: string) => !t.startsWith('noka-desc:')).join(', ') || '')) {
              changedFields.push('tags');
            }
            payload.tags = newTags;
        }
      }

      if ((clientCertificateId || '') !== (service?.client_certificate?.id || '')) {
        payload.client_certificate = clientCertificateId ? { id: clientCertificateId } : null;
        changedFields.push('client_certificate');
      }

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes detected.');
        return;
      }
      
      await axios.patch(`/api/kong/services/${id}`, payload, {
        headers: {
          'X-Noka-Changed-Fields': changedFields.join(', ')
        }
      });
      setSuccess('Service parameters updated successfully!');
      fetchServiceDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update service');
    }
  };

  const handleCheckReachability = async () => {
    setReachabilityStatus({ status: 'checking', message: 'Checking...' });
    try {
      const response = await axios.get(`/api/kong/services/${id}/check-reachability`);
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

  const handleToggleRouteMethod = (method: string) => {
    if (routeMethods.includes(method)) {
      setRouteMethods(routeMethods.filter(m => m !== method));
    } else {
      setRouteMethods([...routeMethods, method]);
    }
  };

  const handleToggleRouteProtocol = (protocol: string) => {
    if (routeProtocols.includes(protocol)) {
      setRouteProtocols(routeProtocols.filter(p => p !== protocol));
    } else {
      setRouteProtocols([...routeProtocols, protocol]);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routePaths.trim() && !routeHosts.trim() && routeMethods.length === 0) {
      setError('Please specify at least one Path, Host, or Method for the route.');
      return;
    }

    setRouteSubmitting(true);
    setError('');

    const parsedPaths = routePaths.split(',').map(p => p.trim()).filter(p => p !== '');
    const parsedHosts = routeHosts ? routeHosts.split(',').map(h => h.trim()).filter(h => h !== '') : undefined;
    const parsedTags = routeTags
      ? routeTags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    let parsedHeaders = undefined;
    if (routeHeaders.trim()) {
      try { parsedHeaders = JSON.parse(routeHeaders); } catch(e) {}
    }
    let parsedSources = undefined;
    if (routeSources.trim()) {
      try { parsedSources = JSON.parse(routeSources); } catch(e) {}
    }
    let parsedDestinations = undefined;
    if (routeDestinations.trim()) {
      try { parsedDestinations = JSON.parse(routeDestinations); } catch(e) {}
    }
    const parsedSnis = routeSnis ? routeSnis.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    const payload: any = {
      service: { id: service?.id || id }
    };
    if (parsedPaths.length > 0) payload.paths = parsedPaths;
    if (routeName.trim()) payload.name = routeName.trim();
    if (parsedHosts && parsedHosts.length > 0) payload.hosts = parsedHosts;
    if (routeMethods.length > 0) payload.methods = routeMethods;
    if (routeProtocols.length > 0) payload.protocols = routeProtocols;
    if (parsedTags.length > 0) payload.tags = parsedTags;
    if (parsedHeaders) payload.headers = parsedHeaders;
    payload.regex_priority = routeRegexPriority;
    payload.https_redirect_status_code = routeHttpsRedirectStatusCode;
    payload.path_handling = routePathHandling;
    payload.strip_path = routeStripPath;
    payload.preserve_host = routePreserveHost;
    if (parsedSnis && parsedSnis.length > 0) payload.snis = parsedSnis;
    if (parsedSources && Array.isArray(parsedSources)) payload.sources = parsedSources;
    if (parsedDestinations && Array.isArray(parsedDestinations)) payload.destinations = parsedDestinations;

    try {
      await axios.post(`/api/kong/services/${service?.id || id}/routes`, payload);
      setSuccess('Route has been successfully created and linked to this service!');
      setShowAddRouteModal(false);
      // Reset form fields
      setRouteName('');
      setRoutePaths('');
      setRouteHosts('');
      setRouteMethods([]);
      setRouteProtocols(['http', 'https']);
      setRouteTags('');
      setRouteStripPath(true);
      setRoutePreserveHost(false);
      setRouteRegexPriority(0);
      setRouteHttpsRedirectStatusCode(426);
      setRoutePathHandling('v0');
      setRouteHeaders('');
      setRouteSnis('');
      setRouteSources('');
      setRouteDestinations('');
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create route');
    } finally {
      setRouteSubmitting(false);
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
      await axios.post(`/api/kong/services/${id}/plugins`, payload);
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
      message: 'Are you sure you want to disable and delete this plugin from this service?',
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
        Loading service details...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-6 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        Service config not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <Link to="/services" className="p-2 rounded border border-border-light hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-primary" /> 
            {service.name || 'Unnamed Service'}
          </h2>
          <span className="text-[10px] text-text-muted font-mono font-medium block mt-0.5">Service ID: {service.id}</span>
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
                  All incoming traffic to this service is currently <strong>terminated/blocked</strong> with response message: <em>"{msg}"</em>.
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
            <AlertCircle className="w-4 h-4" /> Service Details
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-colors ${
              activeTab === 'routes' ? 'bg-brand-primary text-white' : 'bg-transparent text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            <GitBranch className="w-4 h-4" /> Routes
          </button>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-colors ${
              activeTab === 'plugins' ? 'bg-brand-primary text-white' : 'bg-transparent text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            <Plug className="w-4 h-4" /> Plugins
          </button>
          <button
            disabled
            className="flex items-center justify-between px-4 py-3 rounded text-xs font-bold bg-transparent text-text-secondary opacity-70 cursor-not-allowed"
          >
            <span className="flex items-center gap-3"><Users className="w-4 h-4" /> Eligible consumers</span>
            <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] uppercase tracking-wider">beta</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 min-w-0">

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Update Service Specifications</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Service Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. users-api"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Tags</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. production, api (comma-separated)"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="grpc">gRPC</option>
                    <option value="grpcs">gRPCs</option>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Host</label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="e.g. backend.local"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Port</label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Path</label>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="e.g. /v1"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Retries</label>
                  <input
                    type="number"
                    value={retries}
                    onChange={(e) => setRetries(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Connect Timeout (ms)</label>
                  <input
                    type="number"
                    value={connectTimeout}
                    onChange={(e) => setConnectTimeout(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Write Timeout (ms)</label>
                  <input
                    type="number"
                    value={writeTimeout}
                    onChange={(e) => setWriteTimeout(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Read Timeout (ms)</label>
                  <input
                    type="number"
                    value={readTimeout}
                    onChange={(e) => setReadTimeout(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Client Certificate ID</label>
                  <input
                    type="text"
                    value={clientCertificateId}
                    onChange={(e) => setClientCertificateId(e.target.value)}
                    placeholder="Optional UUID"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
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
            <CommentsSection referenceId={service.id} referenceType="service" referenceName={service.name || service.id} />
          </div>
        </div>
      )}

      {/* Tab: Routes */}
      {activeTab === 'routes' && (
        <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-light flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Sub-routes of Service</h3>
            <button
              type="button"
              onClick={() => setShowAddRouteModal(true)}
              className="flex items-center px-3 py-1.5 rounded bg-brand-primary text-white font-bold text-[10px] hover:bg-brand-primary-hover shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> ADD ROUTE
            </button>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase">
                <th className="px-6 py-3.5">Name / ID</th>
                <th className="px-6 py-3.5">Hosts</th>
                <th className="px-6 py-3.5">Paths</th>
                <th className="px-6 py-3.5">Protocols</th>
                <th className="px-6 py-3.5">Methods</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light font-semibold text-text-primary">
              {routes.length > 0 ? (
                routes.map(route => (
                  <tr key={route.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <Link 
                        to={`/routes/${route.id}`} 
                        className="text-brand-primary hover:underline flex items-center gap-1 font-bold"
                      >
                        {route.name || 'Unnamed Route'}
                      </Link>
                      <span className="text-[10px] text-text-muted block font-mono mt-0.5">{route.id}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.hosts && route.hosts.length > 0 ? route.hosts.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.paths && route.paths.length > 0 ? route.paths.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.protocols.join(', ')}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.methods && route.methods.length > 0 ? route.methods.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 text-[10px] font-bold uppercase tracking-wider">
                        <Link 
                          to={`/routes/${route.id}`} 
                          className="flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          Edit
                        </Link>
                        <button 
                          className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Delete Route',
                              message: 'Are you sure you want to delete this route from this service?',
                              confirmText: 'Delete Route',
                              cancelText: 'Cancel',
                              type: 'danger'
                            });
                            if (ok) {
                              axios.delete(`/api/kong/routes/${route.id}`).then(() => fetchSubResources());
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted italic">
                    No routes defined for this service.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Plugins */}
      {activeTab === 'plugins' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Plug className="w-4 h-4 text-brand-primary" /> Service-Specific Plugins
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
                scopeContext="specifically for this service" 
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
                              onClick={() => setEditingPlugin(plugin)}
                              className="p-2 rounded border border-border-light hover:border-brand-primary/20 hover:bg-brand-primary/5 hover:text-brand-primary transition-colors text-text-secondary cursor-pointer"
                              title="Configure Plugin"
                            >
                              <Settings className="w-3.5 h-3.5" />
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-text-muted text-xs italic py-8">No plugins configured specifically for this service.</div>
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

      {/* Add Route Modal */}
      {showAddRouteModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onMouseDown={() => setShowAddRouteModal(false)}
        >
          <div 
            className="bg-white w-full max-w-3xl rounded-lg border border-border-light shadow-xl flex flex-col animate-scaleUp overflow-hidden"
            style={{ maxHeight: '85vh' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-brand-primary" />
                  Add Route to Service: <span className="text-brand-primary">{service.name || service.id}</span>
                </h3>
              </div>
              <button 
                onClick={() => setShowAddRouteModal(false)} 
                className="p-1 rounded hover:bg-slate-100 text-text-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="p-6 space-y-5 overflow-y-auto">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-primary shrink-0" />
                <span>*For hosts, paths, methods, protocols, snis, sources, headers and destinations, separate multiple values with commas or click their buttons.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Route Name */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Name</label>
                    <span className="text-[9px] text-text-muted italic">(optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="The name of the Route."
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">The name of the Route.</p>
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Tags</label>
                    <span className="text-[9px] text-text-muted italic">(optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routeTags}
                    onChange={(e) => setRouteTags(e.target.value)}
                    placeholder="e.g. public, v1 (comma-separated)"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">Optionally add tags to the route.</p>
                </div>

                {/* Hosts */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Hosts</label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routeHosts}
                    onChange={(e) => setRouteHosts(e.target.value)}
                    placeholder="e.g. example.com, api.domain.com"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">A list of domain names that match this Route. At least one of hosts, paths, or methods must be set.</p>
                </div>

                {/* Matching Paths */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">
                      Paths <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routePaths}
                    onChange={(e) => setRoutePaths(e.target.value)}
                    placeholder="e.g. /my-path, /v1/users (comma-separated)"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">A list of paths that match this Route. At least one of hosts, paths, or methods must be set.</p>
                </div>

                {/* Headers */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Headers</label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routeHeaders}
                    onChange={(e) => setRouteHeaders(e.target.value)}
                    placeholder='{"x-version":["v1"]}'
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">One or more lists of values indexed by header name that will cause this Route to match if present.</p>
                </div>

                {/* Path Handling */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Path Handling</label>
                    <span className="text-[9px] text-text-muted italic">(default: v0)</span>
                  </div>
                  <select
                    value={routePathHandling}
                    onChange={(e) => setRoutePathHandling(e.target.value as 'v0' | 'v1')}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  >
                    <option value="v0">v0 (Legacy behavior)</option>
                    <option value="v1">v1 (Standard RFC3986)</option>
                  </select>
                  <p className="text-[9px] text-text-muted">Controls how the Service path and Route path are combined when proxying.</p>
                </div>

                {/* HTTPS Redirect Status Code */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">HTTPS Redirect Status Code</label>
                    <span className="text-[9px] text-text-muted italic">(optional)</span>
                  </div>
                  <select
                    value={routeHttpsRedirectStatusCode}
                    onChange={(e) => setRouteHttpsRedirectStatusCode(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  >
                    <option value={426}>426</option>
                    <option value={301}>301</option>
                    <option value={302}>302</option>
                    <option value={307}>307</option>
                    <option value={308}>308</option>
                  </select>
                  <p className="text-[9px] text-text-muted">The status code Kong responds with when request protocol is HTTP instead of HTTPS.</p>
                </div>

                {/* Regex Priority */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Regex Priority</label>
                    <span className="text-[9px] text-text-muted italic">(optional)</span>
                  </div>
                  <input
                    type="number"
                    value={routeRegexPriority}
                    onChange={(e) => setRouteRegexPriority(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">A number used to choose which route resolves a request when multiple regex routes match.</p>
                </div>

                {/* Protocols Selector */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase block">Protocols</label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {routeProtocolOptions.map(p => {
                      const isSelected = routeProtocols.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleToggleRouteProtocol(p)}
                          className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer uppercase ${
                            isSelected 
                              ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                              : 'bg-white border-border-light text-text-secondary hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-text-muted">A list of the protocols this Route should allow. By default it is ['http', 'https'].</p>
                </div>

                {/* HTTP Methods */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase block">HTTP Methods</label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {routeMethodOptions.map(m => {
                      const isSelected = routeMethods.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleToggleRouteMethod(m)}
                          className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                              : 'bg-white border-border-light text-text-secondary hover:bg-slate-50'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-text-muted">A list of HTTP methods that match this Route. Leave empty to allow any method.</p>
                </div>

                {/* Strip Path & Preserve Host */}
                <div className="flex items-center gap-8 pt-2 md:col-span-2 text-xs font-semibold text-text-primary bg-slate-50/75 p-3.5 rounded border border-border-light">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routeStripPath}
                      onChange={(e) => setRouteStripPath(e.target.checked)}
                      className="rounded text-brand-primary border-border-light w-4 h-4"
                    />
                    <div>
                      <span className="block font-bold">Strip Path</span>
                      <span className="text-[9px] text-text-muted font-normal block">Strip the matching prefix from the upstream request URL.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routePreserveHost}
                      onChange={(e) => setRoutePreserveHost(e.target.checked)}
                      className="rounded text-brand-primary border-border-light w-4 h-4"
                    />
                    <div>
                      <span className="block font-bold">Preserve Host</span>
                      <span className="text-[9px] text-text-muted font-normal block">Forward the incoming request Host header to the upstream server.</span>
                    </div>
                  </label>
                </div>

                {/* SNIs */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">SNIs</label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routeSnis}
                    onChange={(e) => setRouteSnis(e.target.value)}
                    placeholder="e.g. ssl.domain.com (comma-separated)"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">A list of SNIs that match this Route when using stream routing.</p>
                </div>

                {/* Sources */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Sources (JSON Array)</label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routeSources}
                    onChange={(e) => setRouteSources(e.target.value)}
                    placeholder='[{"ip":"10.0.0.0/24","port":80}]'
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">A list of IP sources of incoming connections that match this Route.</p>
                </div>

                {/* Destinations */}
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Destinations (JSON Array)</label>
                    <span className="text-[9px] text-text-muted italic">(semi-optional)</span>
                  </div>
                  <input
                    type="text"
                    value={routeDestinations}
                    onChange={(e) => setRouteDestinations(e.target.value)}
                    placeholder='[{"ip":"10.0.0.0/24","port":80}]'
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                  <p className="text-[9px] text-text-muted">A list of IP destinations of incoming connections that match this Route.</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border-light mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddRouteModal(false)}
                  className="px-4 py-2 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={routeSubmitting}
                  className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {routeSubmitting ? 'Adding...' : 'SUBMIT ROUTE'}
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
