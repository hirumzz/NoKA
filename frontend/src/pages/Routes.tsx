import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  GitBranch, 
  Search,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Pagination } from '../components/Pagination';
import { AuthorBadge } from '../components/AuthorBadge';

interface RouteItem {
  id: string;
  name?: string;
  paths: string[];
  hosts?: string[];
  methods?: string[];
  protocols: string[];
  service: {
    id: string;
  };
  created_at: number;
  tags?: string[];
}

interface Service {
  id: string;
  name: string;
}

const getTagStyle = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const Routes: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [reachabilityStatus, setReachabilityStatus] = useState<Record<string, { status: 'checking' | 'reachable' | 'unreachable', message: string, code?: number }>>({});

  // Form fields
  const [name, setName] = useState('');
  const [paths, setPaths] = useState('');
  const [hosts, setHosts] = useState('');
  const [methods, setMethods] = useState<string[]>([]);
  const [protocols, setProtocols] = useState<string[]>(['http', 'https']);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [healthcheckPath, setHealthcheckPath] = useState('');
  const [healthcheckMethod, setHealthcheckMethod] = useState<'GET' | 'POST' | 'HEAD'>('GET');
  const [tagsInput, setTagsInput] = useState('');
  const [stripPath, setStripPath] = useState(true);
  const [preserveHost, setPreserveHost] = useState(false);
  const [headers, setHeaders] = useState('');
  const [regexPriority, setRegexPriority] = useState<number>(0);
  const [httpsRedirectStatusCode, setHttpsRedirectStatusCode] = useState<number>(426);
  const [pathHandling, setPathHandling] = useState<'v0' | 'v1'>('v0');
  const [snis, setSnis] = useState('');
  const [sources, setSources] = useState('');
  const [destinations, setDestinations] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [terminatedRouteIds, setTerminatedRouteIds] = useState<Set<string>>(new Set());
  const [entityAuthors, setEntityAuthors] = useState<Record<string, any>>({});

  const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
  const protocolOptions = ['http', 'https', 'grpc', 'grpcs', 'tcp', 'tls', 'udp'];

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag]);

  useEffect(() => {
    fetchRoutesAndServices();
  }, [user?.node]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddForm) {
        setShowAddForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm]);



  const fetchRoutesAndServices = async () => {
    setLoading(true);
    try {
      const [routesResp, pluginsResp, authorResp] = await Promise.allSettled([
        axios.get('/api/kong/routes?size=1000'),
        axios.get('/api/kong/plugins?size=1000'),
        axios.get('/api/entity-authors')
      ]);

      if (routesResp.status === 'fulfilled') {
        setRoutes(routesResp.value.data?.data || []);
      }
      if (authorResp.status === 'fulfilled') {
        setEntityAuthors(authorResp.value.data?.data || {});
      }
      if (pluginsResp.status === 'fulfilled') {
        const pList = pluginsResp.value.data?.data || [];
        const tIds = new Set<string>();
        pList.forEach((p: any) => {
          if (p.name === 'request-termination' && p.enabled !== false && p.route?.id) {
            tIds.add(p.route.id);
          }
        });
        setTerminatedRouteIds(tIds);
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to fetch routes', 'Fetch Error');
      console.error(err);
    } finally {
      setLoading(false);
    }

    // Fetch services and reachability in background without blocking UI
    fetchAuxiliaryData();
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [servicesResp, reachResp] = await Promise.allSettled([
        axios.get('/api/kong/services?size=1000'),
        axios.get('/api/reachability')
      ]);

      if (servicesResp.status === 'fulfilled') {
        const servList = servicesResp.value.data?.data || [];
        setServices(servList);
        if (servList.length > 0) {
          setSelectedServiceId(servList[0].id);
        }
      }

      if (reachResp.status === 'fulfilled') {
        const statuses: Record<string, any> = {};
        const statusData = reachResp.value.data?.data || [];
        statusData.forEach((r: any) => {
          if (r.entity_type === 'route') {
            statuses[r.entity_id] = {
              status: r.status,
              message: r.message,
              code: r.status_code
            };
          }
        });
        setReachabilityStatus(statuses);
      }
    } catch (err) {
      console.error('Error fetching auxiliary route data:', err);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    try {
      await axios.post('/api/reachability/refresh');
      addToast('success', 'Reachability checks triggered successfully', 'Status Refresh');
      setTimeout(() => {
        fetchRoutesAndServices();
        setRefreshingAll(false);
      }, 3000);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to refresh statuses', 'Refresh Error');
      setRefreshingAll(false);
    }
  };

  const handleCheckReachability = async (id: string) => {
    setReachabilityStatus(prev => ({ ...prev, [id]: { status: 'checking', message: 'Checking...' } }));
    try {
      const proxyUrl = localStorage.getItem('noka_proxy_url') || '';
      const response = await axios.get(`/api/kong/routes/${id}/check-reachability`, {
        params: { proxyUrl }
      });
      const { reachable, statusCode, message } = response.data;
      setReachabilityStatus(prev => ({
        ...prev,
        [id]: {
          status: reachable ? 'reachable' : 'unreachable',
          message: message || '',
          code: statusCode
        }
      }));
    } catch (err: any) {
      setReachabilityStatus(prev => ({
        ...prev,
        [id]: { status: 'unreachable', message: err.response?.data?.message || 'Check failed' }
      }));
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
      setProtocols(protocols.filter(p => p !== protocol));
    } else {
      setProtocols([...protocols, protocol]);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !paths) return;

    // Parse comma-separated paths & hosts
    const parsedPaths = paths.split(',').map(p => p.trim()).filter(p => p !== '');
    const parsedHosts = hosts ? hosts.split(',').map(h => h.trim()).filter(h => h !== '') : undefined;
    const parsedTags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    if (healthcheckPath.trim()) {
      const safeHp = healthcheckPath.trim().replace(/\//g, '~');
      parsedTags.push(`noka-hp:${safeHp}`);
    }
    if (healthcheckMethod && healthcheckMethod !== 'GET') {
      parsedTags.push(`noka-hm:${healthcheckMethod}`);
    }

    let parsedHeaders = undefined;
    if (headers.trim()) {
      try { parsedHeaders = JSON.parse(headers); } catch(e) {}
    }
    let parsedSources = undefined;
    if (sources.trim()) {
      try { parsedSources = JSON.parse(sources); } catch(e) {}
    }
    let parsedDestinations = undefined;
    if (destinations.trim()) {
      try { parsedDestinations = JSON.parse(destinations); } catch(e) {}
    }
    const parsedSnis = snis ? snis.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    const payload: any = {
      paths: parsedPaths,
      service: { id: selectedServiceId }
    };
    if (name) payload.name = name;
    if (parsedHosts && parsedHosts.length > 0) payload.hosts = parsedHosts;
    if (methods.length > 0) payload.methods = methods;
    if (protocols.length > 0) payload.protocols = protocols;
    if (parsedTags.length > 0) payload.tags = parsedTags;
    if (parsedHeaders) payload.headers = parsedHeaders;
    payload.regex_priority = regexPriority;
    payload.https_redirect_status_code = httpsRedirectStatusCode;
    payload.path_handling = pathHandling;
    payload.strip_path = stripPath;
    payload.preserve_host = preserveHost;
    if (parsedSnis && parsedSnis.length > 0) payload.snis = parsedSnis;
    if (parsedSources && Array.isArray(parsedSources)) payload.sources = parsedSources;
    if (parsedDestinations && Array.isArray(parsedDestinations)) payload.destinations = parsedDestinations;

    try {
      await axios.post('/api/kong/routes', payload);
      setName('');
      setPaths('');
      setHosts('');
      setHealthcheckPath('');
      setMethods([]);
      setProtocols(['http', 'https']);
      setTagsInput('');
      setStripPath(true);
      setPreserveHost(false);
      setHeaders('');
      setRegexPriority(0);
      setHttpsRedirectStatusCode(426);
      setPathHandling('v0');
      setSnis('');
      setSources('');
      setDestinations('');
      setShowAddForm(false);
      addToast('success', 'Route has been successfully created', 'Success');
      fetchRoutesAndServices();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to create route', 'Error');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Route',
      message: 'Are you sure you want to delete this route? Traffic directed to this path will no longer match this rule.',
      confirmText: 'Delete Route',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/kong/routes/${id}`);
      addToast('success', 'Route deleted successfully', 'Success');
      fetchRoutesAndServices();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete route', 'Error');
    }
  };

  // Extract unique tags
  const uniqueTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    routes.forEach(route => {
      if (route.tags) {
        route.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [routes]);

  // Filtered routes (sorted by created_at desc - newest first)
  const filteredRoutes = React.useMemo(() => {
    const filtered = routes.filter(route => {
      const nameMatch = (route.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = (route.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const hostMatch = route.hosts
        ? route.hosts.some(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
        : false;
      const pathMatch = route.paths
        ? route.paths.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
        : false;
      const matchesSearch = nameMatch || idMatch || hostMatch || pathMatch;

      const matchesTag = !selectedTag || (route.tags && route.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });

    return filtered.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [routes, searchTerm, selectedTag]);

  const paginatedRoutes = React.useMemo(() => {
    return filteredRoutes.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredRoutes, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">Routes</h2>
          <p className="text-xs text-text-secondary mt-0.5">Routes define rules to match client requests and direct them to specific Services</p>
        </div>
        <button
          disabled={services.length === 0}
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all disabled:bg-slate-300 disabled:cursor-not-allowed self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD NEW ROUTE
        </button>
      </div>

      {services.length === 0 && !loading && (
        <div className="p-4 rounded border border-yellow-200 bg-yellow-50 text-yellow-800 text-xs font-semibold">
          Please add a Service first before creating a Route.
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}
        >
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-light flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">ADD NEW ROUTE</h3>
                <p className="text-xs text-text-secondary mt-0.5">Configure route match criteria and upstream forwarding rules</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddRoute} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Associated Service</label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                    >
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.id}</option>
                      ))}
                    </select>
                  </div>

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
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Matching Paths (comma separated)</label>
                    <input
                      type="text"
                      required
                      value={paths}
                      onChange={(e) => setPaths(e.target.value)}
                      placeholder="e.g. /users, /profiles"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Matching Hosts (comma separated, optional)</label>
                    <input
                      type="text"
                      value={hosts}
                      onChange={(e) => setHosts(e.target.value)}
                      placeholder="e.g. api.domain.com"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">Healthcheck Endpoint & Method (Optional)</label>
                      <span className="text-[9px] text-text-muted italic">Used for reachability tests</span>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={healthcheckMethod}
                        onChange={(e) => setHealthcheckMethod(e.target.value as any)}
                        className="w-28 px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-bold text-text-primary"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="HEAD">HEAD</option>
                      </select>
                      <input
                        type="text"
                        value={healthcheckPath}
                        onChange={(e) => setHealthcheckPath(e.target.value)}
                        placeholder="e.g. ping, /healthz, /ping (appended to route path)"
                        className="flex-1 px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                      />
                    </div>
                    <span className="text-[10px] text-text-muted">Relative subpaths (e.g. <code>ping</code>) are automatically combined with the route base path.</span>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. production, core, v1"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
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

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Destinations (JSON Array)</label>
                    <input
                      type="text"
                      value={destinations}
                      onChange={(e) => setDestinations(e.target.value)}
                      placeholder='[{"ip":"10.0.0.0/24","port":80}]'
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-2 md:col-span-2 text-xs font-semibold text-text-primary">
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

                  {/* Protocols Selector */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase block">Protocols</label>
                    <div className="flex flex-wrap gap-2">
                      {protocolOptions.map(p => {
                        const isSelected = protocols.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleToggleProtocol(p)}
                            className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors uppercase cursor-pointer ${
                              isSelected 
                                ? 'bg-brand-primary text-white border-brand-primary' 
                                : 'bg-white border-border-light text-text-secondary hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase block">HTTP Methods (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {methodOptions.map(m => {
                        const isSelected = methods.includes(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleToggleMethod(m)}
                            className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              isSelected 
                                ? 'bg-brand-primary text-white border-brand-primary' 
                                : 'bg-white border-border-light text-text-secondary hover:bg-slate-50'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-border-light flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded border border-border-light hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  ADD ROUTE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Routes List Table */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {/* Search and Filter Toolbar */}
        <div className="p-4 bg-slate-50/50 border-b border-border-light flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, ID, or host..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-[10px] font-bold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-light hover:border-brand-primary text-text-secondary hover:text-brand-primary rounded shadow-sm text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingAll ? 'animate-spin' : ''}`} />
              {refreshingAll ? 'Refreshing...' : 'Refresh All Status'}
            </button>
            <div className="h-5 w-px bg-border-light mx-1"></div>
            <span className="text-[10px] font-bold text-text-secondary uppercase whitespace-nowrap">Filter by Tag:</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full sm:w-48 px-2.5 py-1.5 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
            >
              <option value="">All Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading routes...
          </div>
        ) : filteredRoutes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Route</th>
                  <th className="px-6 py-3.5">Linked Service</th>
                  <th className="px-6 py-3.5">Matching Rules</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created By</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5">Updated By</th>
                  <th className="px-6 py-3.5">Updated At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {paginatedRoutes.map((route) => {
                  const linkedSvc = services.find(s => s.id === route.service.id);
                  const authorInfo = entityAuthors[route.id];
                  const updatedAt = authorInfo?.updatedAt ? new Date(authorInfo.updatedAt).getTime() / 1000 : null;

                  const normalTags = (route.tags || []).filter((t: string) =>
                    !t.startsWith('noka-desc:') &&
                    !t.startsWith('noka-health-path:') &&
                    !t.startsWith('noka-hp:') &&
                    !t.startsWith('noka-hm:') &&
                    !t.startsWith('noka-creator:') &&
                    !t.startsWith('noka-updated-by:') &&
                    !t.startsWith('noka-updated-at:')
                  );

                  return (
                    <tr 
                    key={route.id} 
                    className="hover:bg-slate-50/25 transition-colors cursor-pointer"
                    onClick={() => navigate(`/routes/${route.id}`)}
                  >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-indigo-50 text-indigo-600">
                            <GitBranch className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-sm block text-blue-600 hover:underline cursor-pointer">
                                {route.name || 'Unnamed Route'}
                              </div>
                              {terminatedRouteIds.has(route.id) && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-700 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
                                  🚫 Terminated
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-text-muted font-mono block select-all">{route.id}</span>
                            {normalTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {normalTags.map((tag, idx) => {
                                  const style = getTagStyle(tag);
                                  return (
                                    <span key={`${tag}-${idx}`} className={`px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border} text-[10px] font-semibold`}>
                                      {tag}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div onClick={(e) => { e.stopPropagation(); navigate(`/services/${route.service.id}`); }} className="font-bold text-text-primary hover:text-brand-primary hover:underline cursor-pointer">
                          {linkedSvc?.name || 'Service ID: ' + route.service.id.substring(0, 8) + '...'}
                        </div>
                        <span className="text-[10px] text-text-muted font-mono block select-all">{route.service.id}</span>
                      </td>
                      <td className="px-6 py-4 space-y-1 font-medium">
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[10px] font-bold text-text-muted mr-1.5 uppercase">Paths:</span>
                          {route.paths.map((p, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-text-secondary border border-slate-200">
                              {p}
                            </span>
                          ))}
                        </div>
                        {route.methods && route.methods.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] font-bold text-text-muted mr-1.5 uppercase">Methods:</span>
                            {route.methods.map((m, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono text-[10px] border border-emerald-100">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                        {route.hosts && route.hosts.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] font-bold text-text-muted mr-1.5 uppercase">Hosts:</span>
                            {route.hosts.map((h, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono text-[10px] border border-blue-100">
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {reachabilityStatus[route.id] ? (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold">
                            {reachabilityStatus[route.id].status === 'checking' && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                                Checking...
                              </span>
                            )}
                            {reachabilityStatus[route.id].status === 'reachable' && (
                              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title={reachabilityStatus[route.id].message}>
                                <CheckCircle className="w-3 h-3" /> Online
                              </span>
                            )}
                            {reachabilityStatus[route.id].status === 'unreachable' && (
                              <span className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200" title={reachabilityStatus[route.id].message}>
                                <XCircle className="w-3 h-3" /> Unreachable
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCheckReachability(route.id); }}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Check Route Reachability"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-text-primary whitespace-nowrap">
                        <AuthorBadge
                          username={authorInfo?.created_by_username}
                          fullName={authorInfo?.created_by_full_name}
                          email={authorInfo?.created_by_email}
                          labelPrefix="Created by"
                        />
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-text-muted whitespace-nowrap">
                        {new Date(route.created_at * 1000).toLocaleDateString()} {new Date(route.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-text-primary whitespace-nowrap">
                        <AuthorBadge
                          username={authorInfo?.updated_by_username}
                          fullName={authorInfo?.updated_by_full_name}
                          email={authorInfo?.updated_by_email}
                          labelPrefix="Updated by"
                        />
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-text-muted whitespace-nowrap">
                        {updatedAt ? `${new Date(updatedAt * 1000).toLocaleDateString()} ${new Date(updatedAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}
                            className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                            title="Delete Route"
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
              totalItems={filteredRoutes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : routes.length > 0 ? (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No routes match your search or filter criteria.
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No routes found. Click "ADD NEW ROUTE" to configure routing rules.
          </div>
        )}
      </div>
    </div>
  );
};
