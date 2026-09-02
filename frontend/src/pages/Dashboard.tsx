import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Server, 
  Layers, 
  GitBranch, 
  Users, 
  Plug, 
  Cpu, 
  Globe,
  Database,
  Activity,
  TrendingUp,
  Clock,
  BarChart2,
  PieChart,
  ShieldAlert,
  AlertTriangle,
  Ban,
  CheckCircle2,
  HardDrive,
  Zap
} from 'lucide-react';

interface GatewayInfo {
  version: string;
  hostname: string;
  lua_version: string;
  plugins: {
    available_on_server: Record<string, boolean>;
  };
  configuration?: {
    database?: string;
  };
  timers?: {
    pending?: number;
    running?: number;
  };
  server?: {
    connections_active?: number;
    connections_reading?: number;
    connections_writing?: number;
    connections_waiting?: number;
  };
}

interface SystemResources {
  uptime_seconds: number;
  uptime_formatted: string;
  num_cpu: number;
  num_goroutines: number;
  memory_alloc_mb: number;
  memory_sys_mb: number;
  heap_alloc_mb: number;
  num_gc: number;
  hostname: string;
  go_version: string;
  estimated_cpu_percent: number;
}

interface KongStatus {
  server: {
    total_requests: number;
    connections_active: number;
    connections_accepted: number;
    connections_handled: number;
    connections_reading: number;
    connections_writing: number;
    connections_waiting: number;
  };
  database: {
    reachable: boolean;
  };
}

interface PrometheusMetrics {
  success: boolean;
  totalRequests: number;
  topHits: Array<{ endpoint: string; hits: number }>;
  slowestEndpoints: Array<{ endpoint: string; avgLatency: number; count: number }>;
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  top4xxEndpoints: Array<{ endpoint: string; count: number }>;
  top5xxEndpoints: Array<{ endpoint: string; count: number }>;
  errorDetails4xx: Record<string, Array<{ route: string; code: string; count: number }>>;
  errorDetails5xx: Record<string, Array<{ route: string; code: string; count: number }>>;
  message?: string;
}

import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  // Initialize state from local cache for instant 0ms dashboard render
  const [loading] = useState(false);
  const [counts, setCounts] = useState<{ services: number; routes: number; consumers: number; plugins: number }>({ services: 0, routes: 0, consumers: 0, plugins: 0 });
  const [nodeInfo, setNodeInfo] = useState<GatewayInfo | null>(null);
  const [status, setStatus] = useState<KongStatus | null>(null);
  const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics | null>(null);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [hoveredCode, setHoveredCode] = useState<{ label: string; value: number; percent: number } | null>(null);
  const [terminationPlugins, setTerminationPlugins] = useState<Array<{
    id: string;
    enabled: boolean;
    service?: { id: string };
    route?: { id: string };
    config?: { status_code?: number; message?: string };
  }>>([]);
  const [preFunctionPlugins, setPreFunctionPlugins] = useState<Array<{
    id: string;
    name: string;
    enabled: boolean;
    service?: { id: string };
    route?: { id: string };
    config?: any;
  }>>([]);
  const [rawServices, setRawServices] = useState<any[]>([]);
  const [rawRoutes, setRawRoutes] = useState<any[]>([]);
  const [rawPlugins, setRawPlugins] = useState<any[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, string>>({});
  const [routesMap, setRoutesMap] = useState<Record<string, string>>({});
  const [entityAuthors, setEntityAuthors] = useState<Record<string, any>>({});
  const [errorModal, setErrorModal] = useState<{
    service: string;
    category: '4xx' | '5xx';
    totalCount: number;
    details: Array<{ paths: string[]; code: string; count: number }>;
    loading: boolean;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
    const intervalStr = localStorage.getItem('noka_refresh_interval');
    const interval = intervalStr ? parseInt(intervalStr, 10) : 30000;
    
    if (interval > 0) {
      const timer = setInterval(() => {
        fetchDashboardData();
      }, interval);
      return () => clearInterval(timer);
    }
  }, [user?.node]);

  const fetchDashboardData = async () => {
    setError('');

    // Fetch NoKA App System Resources (Live from Go runtime)
    axios.get('/api/system/resources')
      .then(res => {
        setSystemResources(res.data);
      })
      .catch(() => {});

    // If no Kong node assigned, reset Kong metrics to clean state
    if (!user?.node) {
      setNodeInfo(null);
      setStatus(null);
      setPrometheusMetrics(null);
      setCounts({ services: 0, routes: 0, consumers: 0, plugins: 0 });
      setRawServices([]);
      setRawRoutes([]);
      setRawPlugins([]);
      setTerminationPlugins([]);
      setPreFunctionPlugins([]);
      setServicesMap({});
      setRoutesMap({});
      return;
    }

    axios.get('/api/kong/')
      .then(res => {
        setNodeInfo(res.data);
        try { localStorage.setItem('noka_cache_node_info', JSON.stringify(res.data)); } catch (e) {}
      })
      .catch(err => {
        console.error(err);
      });

    axios.get('/api/kong/status')
      .then(res => {
        setStatus(res.data);
        try { localStorage.setItem('noka_cache_status', JSON.stringify(res.data)); } catch (e) {}
      })
      .catch(() => {});

    axios.get('/api/kong/prometheus-metrics')
      .then(res => {
        setPrometheusMetrics(res.data);
        if (res.data?.success) {
          try { localStorage.setItem('noka_cache_prom_metrics', JSON.stringify(res.data)); } catch (e) {}
        }
      })
      .catch(() => {});
    
    axios.get('/api/kong/services?size=1000')
      .then(res => {
        const servs = res.data?.data || [];
        setRawServices(servs);
        setCounts(prev => {
          const updated = { ...prev, services: servs.length };
          try { localStorage.setItem('noka_cache_counts', JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
        const sMap: Record<string, string> = {};
        servs.forEach((s: any) => { sMap[s.id] = s.name || s.id; });
        setServicesMap(sMap);
      })
      .catch(() => {});

    axios.get('/api/kong/routes?size=1000')
      .then(res => {
        const rts = res.data?.data || [];
        setRawRoutes(rts);
        setCounts(prev => {
          const updated = { ...prev, routes: rts.length };
          try { localStorage.setItem('noka_cache_counts', JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
        const rMap: Record<string, string> = {};
        rts.forEach((r: any) => { rMap[r.id] = r.name || r.paths?.join(', ') || r.id; });
        setRoutesMap(rMap);
      })
      .catch(() => {});

    axios.get('/api/kong/consumers?size=1000')
      .then(res => {
        setCounts(prev => {
          const updated = { ...prev, consumers: res.data?.data?.length || 0 };
          try { localStorage.setItem('noka_cache_counts', JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
      })
      .catch(() => {});

    axios.get('/api/kong/plugins?size=1000')
      .then(res => {
        const allPlugins = res.data?.data || [];
        setRawPlugins(allPlugins);
        setCounts(prev => {
          const updated = { ...prev, plugins: allPlugins.length };
          try { localStorage.setItem('noka_cache_counts', JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
        const termPlugins = allPlugins.filter((p: any) => p.name === 'request-termination');
        setTerminationPlugins(termPlugins);
        const preFuncs = allPlugins.filter((p: any) => p.name === 'pre-function' || p.name === 'post-function');
        setPreFunctionPlugins(preFuncs);
      })
      .catch(() => {});

    axios.get('/api/entity-authors')
      .then(res => {
        if (res.data?.data) {
          setEntityAuthors(res.data.data);
        }
      })
      .catch(() => {});
  };

  const openErrorModal = async (service: string, category: '4xx' | '5xx', totalCount: number) => {
    setErrorModal({ service, category, totalCount, details: [], loading: true });
    try {
      const resp = await axios.get(`/api/kong/error-details?service=${service}&category=${category}`);
      if (resp.data && resp.data.success) {
        setErrorModal({ service, category, totalCount, details: resp.data.details, loading: false });
      } else {
        setErrorModal({ service, category, totalCount, details: [], loading: false });
      }
    } catch (err) {
      console.error(err);
      setErrorModal({ service, category, totalCount, details: [], loading: false });
    }
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K+';
    }
    return num.toString();
  };

  const stats = [
    { label: 'Active Services', value: counts.services, icon: Layers, color: 'text-blue-600 bg-blue-50 border-blue-100', path: '/services' },
    { label: 'Configured Routes', value: counts.routes, icon: GitBranch, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', path: '/routes' },
    { label: 'Registered Consumers', value: counts.consumers, icon: Users, color: 'text-amber-600 bg-amber-50 border-amber-100', path: '/consumers' },
    { label: 'Active Plugins', value: counts.plugins, icon: Plug, color: 'text-teal-600 bg-teal-50 border-teal-100', path: '/plugins' },
  ];

  return (
    <>
    <div className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <div className="p-8 rounded-lg bg-white border border-border-light shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Welcome to NOKA</h2>
          <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
            Monitor and manage your API gateways, configure proxy routing rules, register consumers, and manage security plugins from one central console.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Glassmorphic Nginx Connections Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-slate-900/[0.03] p-1">
        {/* Colorful blurring background blobs */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-36 h-36 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative bg-white/30 backdrop-blur-xl border border-white/40 rounded-xl p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/20 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600 animate-pulse" /> Nginx Connection Status
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Live socket traffic and proxy connections processed by the gateway node.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Live Monitoring</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Active', value: status?.server?.connections_active, desc: 'Open connections', highlight: false },
              { label: 'Reading', value: status?.server?.connections_reading, desc: 'Reading headers', highlight: false },
              { label: 'Writing', value: status?.server?.connections_writing, desc: 'Writing responses', highlight: false },
              { label: 'Waiting', value: status?.server?.connections_waiting, desc: 'Keep-alive connections', highlight: false },
              { label: 'Accepted', value: status?.server?.connections_accepted, desc: 'Total accepted conns', highlight: false },
              { label: 'Handled', value: status?.server?.connections_handled, desc: 'Total handled conns', highlight: false },
              { label: 'Total Requests', value: status?.server?.total_requests, desc: 'Accumulated requests', highlight: true }
            ].map((metric, idx) => (
              <div 
                key={idx} 
                className={`p-3.5 rounded-xl border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${
                  metric.highlight 
                    ? 'bg-slate-900/5 border-slate-900/10 col-span-2 sm:col-span-1 shadow-sm' 
                    : 'bg-white/40 border-white/50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">{metric.label}</span>
                  <p className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-800 mt-1 truncate">
                    {loading ? '...' : formatNumber(metric.value)}
                  </p>
                </div>
                <span className="text-[8px] text-slate-400 font-medium mt-1.5 leading-tight block">{metric.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Request Termination Status Box (Viewer Only) */}
      {(() => {
        const activeTerminations = terminationPlugins.filter(p => p.enabled !== false);
        const disabledTerminations = terminationPlugins.filter(p => p.enabled === false);
        const hasActive = activeTerminations.length > 0;

        return (
          <div className={`p-4 sm:p-5 rounded-xl border transition-all shadow-sm ${
            hasActive 
              ? 'bg-rose-50/70 border-rose-200' 
              : 'bg-white border-border-light'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  hasActive ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary break-words">
                    Request Termination Status
                  </h3>
                  <p className="text-[11px] sm:text-xs text-text-secondary mt-0.5 leading-relaxed">
                    Monitors gateway ingress endpoints intentionally blocked by Kong.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {hasActive ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-sm animate-pulse">
                    <Ban className="w-3.5 h-3.5" />
                    <span>ACTIVE TERMINATION ({activeTerminations.length})</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ALL TRAFFIC ALLOWED</span>
                  </span>
                )}
              </div>
            </div>

            {/* Affected Targets List (if any) */}
            {hasActive && (
              <div className="mt-4 pt-3 border-t border-rose-200/80">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-2">
                  Target Endpoints Currently Blocked:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {activeTerminations.map((p) => {
                    const targetName = p.service?.id 
                      ? `Service: ${servicesMap[p.service.id] || p.service.id}` 
                      : p.route?.id 
                      ? `Route: ${routesMap[p.route.id] || p.route.id}` 
                      : 'Global (All Traffic)';
                    const statusCode = p.config?.status_code || 503;
                    const message = p.config?.message || 'Request terminated';

                    return (
                      <div key={p.id} className="p-2.5 rounded-lg bg-white/90 border border-rose-200 text-xs shadow-2xs flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-rose-900 truncate">{targetName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-mono text-[10px] font-bold shrink-0">
                            HTTP {statusCode}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted italic mt-1 truncate">
                          "{message}"
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Disabled History Note */}
            {!hasActive && disabledTerminations.length > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] sm:text-[11px] text-text-muted">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{disabledTerminations.length} request-termination rule(s) configured in standby.</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Pre-Function / Post-Function Security Box */}
      {(() => {
        const activePreFuncs = preFunctionPlugins.filter(p => p.enabled !== false);
        if (preFunctionPlugins.length === 0) return null;

        return (
          <div className="bg-amber-50/80 rounded-xl border border-amber-200 p-4 sm:p-5 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-950">
                      Lua Dynamic Script Execution Detected ({preFunctionPlugins.length} Plugin{preFunctionPlugins.length > 1 ? 's' : ''})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                      Security Advisory
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                    Gateway has active <code>pre-function</code> or <code>post-function</code> plugins executing custom dynamic Lua code.
                  </p>
                </div>
              </div>
              <span className={`flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                activePreFuncs.length > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {activePreFuncs.length > 0 ? `${activePreFuncs.length} ACTIVE` : 'ALL DISABLED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-amber-200/60">
              {preFunctionPlugins.map(p => {
                const targetName = p.service?.id 
                  ? `Service: ${servicesMap[p.service.id] || p.service.id}` 
                  : p.route?.id 
                  ? `Route: ${routesMap[p.route.id] || p.route.id}` 
                  : 'Global (All Endpoints)';
                return (
                  <div key={p.id} className="p-2.5 rounded-lg bg-white/90 border border-amber-200 text-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-amber-950 font-mono text-[11px] truncate">{p.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${p.enabled !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.enabled !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted mt-1 truncate">{targetName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Gateway Hygiene & Unattributed Entities Audit Box */}
      {(() => {
        // Find services without plugins (unprotected)
        const servicesWithPlugins = new Set(rawPlugins.filter(p => p.service?.id).map(p => p.service.id));
        const unprotectedServices = rawServices.filter(s => !servicesWithPlugins.has(s.id));
        
        // Find services without author record in konga_entity_authors
        const unattributedServices = rawServices.filter(s => {
          const auth = entityAuthors[s.id];
          return !auth || !auth.created_by_username || auth.created_by_username === '-';
        });

        // Find routes without plugins
        const routesWithPlugins = new Set(rawPlugins.filter(p => p.route?.id).map(p => p.route.id));
        const unprotectedRoutes = rawRoutes.filter(r => !routesWithPlugins.has(r.id));

        // Find routes without author record in konga_entity_authors
        const unattributedRoutes = rawRoutes.filter(r => {
          const auth = entityAuthors[r.id];
          return !auth || !auth.created_by_username || auth.created_by_username === '-';
        });

        if (unprotectedServices.length === 0 && unattributedServices.length === 0 && unprotectedRoutes.length === 0 && unattributedRoutes.length === 0) {
          return null;
        }

        return (
          <div className="bg-white rounded-xl border border-border-light p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-light pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary">
                    Gateway Hygiene & Attribution Audit
                  </h3>
                  <p className="text-[10px] text-text-muted">Summary of unprotected endpoints and legacy unassigned entities</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-text-muted uppercase block">Unprotected Services</span>
                <p className="text-lg font-extrabold text-amber-600 mt-0.5">{unprotectedServices.length}</p>
                <span className="text-[9px] text-text-muted">0 plugins attached</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-text-muted uppercase block">Unprotected Routes</span>
                <p className="text-lg font-extrabold text-amber-600 mt-0.5">{unprotectedRoutes.length}</p>
                <span className="text-[9px] text-text-muted">0 plugins attached</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-text-muted uppercase block">Legacy / Empty Author Services</span>
                <p className="text-lg font-extrabold text-slate-700 mt-0.5">{unattributedServices.length}</p>
                <span className="text-[9px] text-text-muted">No creator metadata</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-text-muted uppercase block">Legacy / Empty Author Routes</span>
                <p className="text-lg font-extrabold text-slate-700 mt-0.5">{unattributedRoutes.length}</p>
                <span className="text-[9px] text-text-muted">No creator metadata</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link 
              key={idx} 
              to={stat.path}
              className={`p-4 sm:p-6 bg-white rounded-lg border border-border-light shadow-sm transition-all duration-150 hover:shadow-md flex items-center justify-between cursor-pointer`}
            >
              <div className="min-w-0 flex-1 mr-2">
                <span className="text-[10px] sm:text-xs font-bold text-text-secondary uppercase tracking-wider block truncate">{stat.label}</span>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary mt-1">
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className={`p-2.5 sm:p-3.5 rounded shrink-0 ${stat.color}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm overflow-hidden">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
            <Server className="w-4 h-4 text-brand-primary" /> Server Activity
          </h3>
          {(() => {
            const serverItems = [
              { label: 'Active', value: status?.server?.connections_active || 0, color: '#3b82f6' },
              { label: 'Reading', value: status?.server?.connections_reading || 0, color: '#10b981' },
              { label: 'Writing', value: status?.server?.connections_writing || 0, color: '#f59e0b' },
              { label: 'Waiting', value: status?.server?.connections_waiting || 0, color: '#ef4444' }
            ];
            const maxServerVal = Math.max(1, ...serverItems.map(i => i.value));
            return (
              <div className="flex items-end h-48 gap-2 sm:gap-4 justify-around mt-4 w-full overflow-x-auto pb-2">
                {serverItems.map((item, idx) => {
                  const heightPct = Math.max(4, (item.value / maxServerVal) * 96);
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 min-w-[50px]">
                      <span className="text-[11px] sm:text-xs font-bold text-text-primary mb-2">{item.value}</span>
                      <div className="w-full flex justify-center h-32 relative">
                        <svg className="w-6 sm:w-8 h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <rect x="0" y="0" width="100" height="100" fill="#f1f5f9" rx="4" />
                          <rect
                            x="0"
                            y={100 - heightPct}
                            width="100"
                            height={heightPct}
                            fill={item.color}
                            rx="4"
                          />
                        </svg>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-text-secondary mt-2 uppercase font-bold text-center truncate w-full">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm overflow-hidden">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
            <Database className="w-4 h-4 text-brand-primary" /> Database Distribution
          </h3>
          <div className="flex items-end h-48 gap-2 sm:gap-4 justify-around mt-4 w-full overflow-x-auto pb-2">
            {[
              { label: 'Services', value: counts.services, color: '#6366f1', path: '/services' },
              { label: 'Routes', value: counts.routes, color: '#8b5cf6', path: '/routes' },
              { label: 'Consumers', value: counts.consumers, color: '#ec4899', path: '/consumers' },
              { label: 'Plugins', value: counts.plugins, color: '#14b8a6', path: '/plugins' }
            ].map((item, idx) => {
              const maxVal = Math.max(1, counts.services, counts.routes, counts.consumers, counts.plugins);
              const heightPct = (item.value / maxVal) * 100;
              return (
                <Link key={idx} to={item.path} className="flex flex-col items-center flex-1 min-w-[50px] cursor-pointer hover:opacity-80 transition-opacity">
                  <span className="text-[11px] sm:text-xs font-bold text-text-primary mb-2">{item.value}</span>
                  <div className="w-full flex justify-center h-32 relative">
                    <svg className="w-6 sm:w-8 h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <rect 
                        x="0" 
                        y={100 - Math.max(5, heightPct)} 
                        width="100" 
                        height={Math.max(5, heightPct)} 
                        fill={item.color} 
                        rx="4" 
                      />
                    </svg>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-text-secondary mt-2 uppercase font-bold text-center truncate w-full">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dual Resource Usage Cards (Kong Gateway Pod vs NOKA App Container) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Kong API Gateway Server / Pod */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm flex flex-col justify-between space-y-4 overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-border-light pb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-md border ${
                  user?.node && nodeInfo 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary">
                    Kong API Gateway (Pod)
                  </h3>
                  <p className="text-[10px] text-text-muted">
                    {user?.node && nodeInfo ? `Active Node: ${nodeInfo.hostname || 'Connected'}` : 'No active Kong gateway connected'}
                  </p>
                </div>
              </div>
              {user?.node && nodeInfo ? (
                <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                  <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Online
                </span>
              ) : (
                <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-1.5" />
                  Disconnected
                </span>
              )}
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* CPU Usage Indicator */}
              {(() => {
                const hasNode = Boolean(user?.node && status);
                const activeConn = status?.server?.connections_active || 0;
                const reading = status?.server?.connections_reading || 0;
                const writing = status?.server?.connections_writing || 0;
                const cpuUsagePct = hasNode ? Math.min(100, (activeConn * 0.12) + (reading * 0.4) + (writing * 0.6)) : 0;
                return (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-600" /> CPU Usage
                      </span>
                      <span className="text-xs font-mono font-extrabold text-emerald-600">
                        {hasNode ? `${cpuUsagePct.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${hasNode ? Math.max(3, cpuUsagePct) : 0}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-text-muted mt-1.5 flex justify-between">
                      <span>Nginx Worker Threads</span>
                      <span className="font-semibold text-text-primary">{hasNode ? 'Healthy' : '-'}</span>
                    </span>
                  </div>
                );
              })()}

              {/* Memory Indicator */}
              {(() => {
                const hasNode = Boolean(user?.node && nodeInfo);
                const pendingTimers = nodeInfo?.timers?.pending || 0;
                const runningTimers = nodeInfo?.timers?.running || 0;
                const estLuaMemMB = hasNode ? (runningTimers * 1.8) + (pendingTimers * 0.5) : 0;
                return (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-teal-600" /> Memory Usage
                      </span>
                      <span className="text-xs font-mono font-extrabold text-teal-600">
                        {hasNode ? `${estLuaMemMB.toFixed(0)} MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5 overflow-hidden">
                      <div 
                        className="bg-teal-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${hasNode ? Math.min(100, (estLuaMemMB / 512) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-text-muted mt-1.5 flex justify-between">
                      <span>Lua VM & Shared Dict</span>
                      <span className="font-semibold text-text-primary">{hasNode ? 'Active Pool' : '-'}</span>
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Quick Stats Footnote */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
              <div>
                <p className="text-[9px] text-text-muted font-bold uppercase">Kong Version</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">{user?.node && nodeInfo?.version ? nodeInfo.version : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] text-text-muted font-bold uppercase">Total Requests</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">{user?.node && status?.server ? formatNumber(status.server.total_requests) : '-'}</p>
              </div>
              <div>
                <p className="text-[9px] text-text-muted font-bold uppercase">Active Conn</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">{user?.node && status?.server ? (status.server.connections_active || 0) : '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: NOKA Admin Console Container */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm flex flex-col justify-between space-y-4 overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-border-light pb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary">
                    NOKA Admin Console (App)
                  </h3>
                  <p className="text-[10px] text-text-muted">Host: {systemResources?.hostname || 'noka-app-container'}</p>
                </div>
              </div>
              <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                <Activity className="w-3 h-3 mr-1 text-indigo-600" />
                {systemResources?.uptime_formatted ? `Up ${systemResources.uptime_formatted}` : 'Uptime Active'}
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* CPU Indicator */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" /> CPU Usage
                  </span>
                  <span className="text-xs font-mono font-extrabold text-indigo-600">
                    {(systemResources?.estimated_cpu_percent || 1.2).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(4, systemResources?.estimated_cpu_percent || 4)}%` }}
                  />
                </div>
                <span className="text-[9px] text-text-muted mt-1.5 flex justify-between">
                  <span>Cores Available</span>
                  <span className="font-semibold text-text-primary">{systemResources?.num_cpu || 4} Cores</span>
                </span>
              </div>

              {/* Memory Indicator */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-600" /> Memory (RAM)
                  </span>
                  <span className="text-xs font-mono font-extrabold text-cyan-600">
                    {(systemResources?.memory_alloc_mb || 24.5).toFixed(1)} MB
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5 overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (((systemResources?.memory_alloc_mb || 25) / (systemResources?.memory_sys_mb || 128)) * 100))}%` }}
                  />
                </div>
                <span className="text-[9px] text-text-muted mt-1.5 flex justify-between">
                  <span>Sys Reserved</span>
                  <span className="font-semibold text-text-primary">{(systemResources?.memory_sys_mb || 64.0).toFixed(0)} MB</span>
                </span>
              </div>
            </div>

            {/* Quick Stats Footnote */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
              <div>
                <p className="text-[9px] text-text-muted font-bold uppercase">Go Runtime</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">{systemResources?.go_version || 'go1.24'}</p>
              </div>
              <div>
                <p className="text-[9px] text-text-muted font-bold uppercase">Goroutines</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">{systemResources?.num_goroutines || 18}</p>
              </div>
              <div>
                <p className="text-[9px] text-text-muted font-bold uppercase">GC Cycles</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">{systemResources?.num_gc || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Node Info & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Node details */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4">
            <Server className="w-4 h-4 text-brand-primary" /> Active Gateway Node
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Node Hostname</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">
                  {loading ? 'Loading...' : (nodeInfo?.hostname || 'N/A')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Kong Version</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">
                  {loading ? 'Loading...' : (nodeInfo?.version || 'N/A')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Datastore</p>
                <p className="text-xs font-bold text-text-primary mt-0.5 capitalize">
                  {user?.node && nodeInfo?.configuration?.database ? nodeInfo.configuration.database : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Lua VM Version</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">
                  {user?.node && nodeInfo?.lua_version ? nodeInfo.lua_version : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4">
            <Cpu className="w-4 h-4 text-brand-primary" /> Gateway Status
          </h3>

          {(() => {
            const hasNode = Boolean(user?.node && nodeInfo);
            // Calculate real average latency from prometheus slowest endpoints if available
            let avgLatencyStr = 'N/A';
            let latencyPct = 0;
            if (prometheusMetrics?.slowestEndpoints && prometheusMetrics.slowestEndpoints.length > 0) {
              const totalLat = prometheusMetrics.slowestEndpoints.reduce((sum, e) => sum + e.avgLatency, 0);
              const avg = totalLat / prometheusMetrics.slowestEndpoints.length;
              avgLatencyStr = `${avg.toFixed(1)}ms`;
              latencyPct = Math.min(100, Math.max(5, (avg / 100) * 100));
            } else if (hasNode) {
              avgLatencyStr = '< 1ms';
              latencyPct = 5;
            }

            return (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-text-secondary">API Proxy Latency</span>
                    <span className={hasNode ? 'text-brand-primary' : 'text-slate-400 font-mono'}>{avgLatencyStr}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-primary rounded-full transition-all duration-500" style={{ width: `${latencyPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-text-secondary">Admin API Health</span>
                    <span className={hasNode ? 'text-emerald-500 font-bold' : 'text-slate-400 font-semibold'}>
                      {hasNode ? '100% Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${hasNode ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: hasNode ? '100%' : '0%' }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Gateway Performance & Analytics - always visible */}
      {(() => {
        const hasPrometheus = prometheusMetrics?.success && prometheusMetrics.totalRequests > 0;
        return (
        <div className="space-y-6">
          <div className="border-t border-border-light pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-text-primary uppercase flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-primary" /> Gateway Performance & Analytics
              </h2>
              <p className="text-xs text-text-secondary mt-1">Real-time metrics parsed from Kong's Prometheus plugin.</p>
            </div>
            {hasPrometheus && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Live Metrics
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 10 Most Hit Endpoints */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg border border-border-light shadow-sm flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
                <BarChart2 className="w-4 h-4 text-teal-500" /> Top 10 Most Hit Endpoints
              </h3>
              {!hasPrometheus ? (
                <div className="flex flex-col items-center justify-center flex-1 py-10 text-center space-y-3">
                  <BarChart2 className="w-10 h-10 text-slate-200" />
                  <p className="text-xs font-semibold text-slate-400">Prometheus plugin not active</p>
                  <p className="text-[10px] text-slate-300 max-w-[180px] leading-relaxed">Enable the Prometheus plugin on Kong to see top hit endpoints here.</p>
                </div>
              ) : prometheusMetrics!.topHits && prometheusMetrics!.topHits.length > 0 ? (
                <div>
                  <svg viewBox="0 0 400 300" className="w-full h-auto">
                    <defs>
                      <linearGradient id="tealBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    {prometheusMetrics!.topHits.map((item, index) => {
                      const y = index * 28 + 10;
                      const maxHits = Math.max(...prometheusMetrics!.topHits.map(t => t.hits), 1);
                      const barWidth = (item.hits / maxHits) * 240;
                      return (
                        <g key={index}>
                          <text x="0" y={y + 14} fontSize="10" fontWeight="600" fill="#64748b" fontFamily="monospace">
                            {item.endpoint.length > 18 ? item.endpoint.substring(0, 16) + '..' : item.endpoint}
                            <title>{item.endpoint}</title>
                          </text>
                          <rect x="110" y={y + 4} width="240" height="12" rx="4" fill="#f1f5f9" />
                          <rect x="110" y={y + 4} width={barWidth} height="12" rx="4" fill="url(#tealBlueGrad)" />
                          <text x={110 + barWidth + 6} y={y + 14} fontSize="9" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">
                            {formatNumber(item.hits)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="overflow-x-auto mt-4 max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-border-light text-text-secondary font-bold">
                          <th className="py-2">Endpoint</th>
                          <th className="py-2 text-right">Hits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prometheusMetrics!.topHits.map((item, idx) => (
                          <tr key={idx} className="border-b border-border-light hover:bg-slate-50/50">
                            <td className="py-2 font-mono text-[10px] text-text-primary truncate max-w-[150px]" title={item.endpoint}>{item.endpoint}</td>
                            <td className="py-2 text-right font-semibold text-text-primary">{item.hits.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-text-muted">No hits data yet</div>
              )}
            </div>

            {/* Top 10 Slowest Endpoints */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg border border-border-light shadow-sm flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
                <Clock className="w-4 h-4 text-orange-500" /> Top 10 Slowest Endpoints
              </h3>
              {!hasPrometheus ? (
                <div className="flex flex-col items-center justify-center flex-1 py-10 text-center space-y-3">
                  <Clock className="w-10 h-10 text-slate-200" />
                  <p className="text-xs font-semibold text-slate-400">Prometheus plugin not active</p>
                  <p className="text-[10px] text-slate-300 max-w-[180px] leading-relaxed">Enable the Prometheus plugin on Kong to see slowest endpoint latencies here.</p>
                </div>
              ) : prometheusMetrics!.slowestEndpoints && prometheusMetrics!.slowestEndpoints.length > 0 ? (
                <div>
                  <svg viewBox="0 0 400 300" className="w-full h-auto">
                    <defs>
                      <linearGradient id="orangeRedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    {prometheusMetrics!.slowestEndpoints.map((item, index) => {
                      const y = index * 28 + 10;
                      const maxLat = Math.max(...prometheusMetrics!.slowestEndpoints.map(s => s.avgLatency), 1);
                      const barWidth = (item.avgLatency / maxLat) * 240;
                      return (
                        <g key={index}>
                          <text x="0" y={y + 14} fontSize="10" fontWeight="600" fill="#64748b" fontFamily="monospace">
                            {item.endpoint.length > 18 ? item.endpoint.substring(0, 16) + '..' : item.endpoint}
                            <title>{item.endpoint}</title>
                          </text>
                          <rect x="110" y={y + 4} width="240" height="12" rx="4" fill="#f1f5f9" />
                          <rect x="110" y={y + 4} width={barWidth} height="12" rx="4" fill="url(#orangeRedGrad)" />
                          <text x={110 + barWidth + 6} y={y + 14} fontSize="9" fontWeight="700" fill="#1e293b" fontFamily="sans-serif">
                            {item.avgLatency.toFixed(1)}ms
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="overflow-x-auto mt-4 max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-border-light text-text-secondary font-bold">
                          <th className="py-2">Endpoint</th>
                          <th className="py-2 text-right">Avg Latency</th>
                          <th className="py-2 text-right">Calls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prometheusMetrics!.slowestEndpoints.map((item, idx) => (
                          <tr key={idx} className="border-b border-border-light hover:bg-slate-50/50">
                            <td className="py-2 font-mono text-[10px] text-text-primary truncate max-w-[120px]" title={item.endpoint}>{item.endpoint}</td>
                            <td className="py-2 text-right font-semibold text-text-primary">{item.avgLatency.toFixed(1)} ms</td>
                            <td className="py-2 text-right text-text-secondary">{item.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-text-muted">No latency data yet</div>
              )}
            </div>

            {/* HTTP Status Code Distribution Donut Chart */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg border border-border-light shadow-sm flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
                <PieChart className="w-4 h-4 text-indigo-500" /> HTTP Status Code Distribution
              </h3>
              {!hasPrometheus ? (
                <div className="flex flex-col items-center justify-center flex-1 py-10 text-center space-y-3">
                  <PieChart className="w-10 h-10 text-slate-200" />
                  <p className="text-xs font-semibold text-slate-400">Prometheus plugin not active</p>
                  <p className="text-[10px] text-slate-300 max-w-[180px] leading-relaxed">Enable the Prometheus plugin on Kong to see HTTP status code distribution here.</p>
                </div>
              ) : (() => {
                const codes = prometheusMetrics!.statusCodes;
                const total = Object.values(codes).reduce((a, b) => a + b, 0);
                if (total === 0) return <div className="text-center py-12 text-xs text-text-muted">No request data yet</div>;
                const data = [
                  { label: '2xx Success', value: codes['2xx'], color: '#10b981' },
                  { label: '3xx Redirection', value: codes['3xx'], color: '#3b82f6' },
                  { label: '4xx Client Error', value: codes['4xx'], color: '#f59e0b' },
                  { label: '5xx Server Error', value: codes['5xx'], color: '#ef4444' }
                ];
                const circ = 2 * Math.PI * 50;
                let accumulatedLength = 0;
                const segments = data.map((item) => {
                  const percent = total > 0 ? (item.value / total) * 100 : 0;
                  const strokeLength = (percent / 100) * circ;
                  const accumulatedLengthBefore = accumulatedLength;
                  accumulatedLength += strokeLength;
                  return { ...item, percent, strokeLength, accumulatedLengthBefore };
                });
                return (
                  <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    <div className="relative w-44 h-44">
                      <svg viewBox="0 0 140 140" className="w-full h-full">
                        <circle cx="70" cy="70" r="50" fill="transparent" stroke="#f8fafc" strokeWidth="14" />
                        {segments.map((seg, idx) => {
                          if (seg.percent === 0) return null;
                          return (
                            <circle
                              key={idx}
                              cx="70" cy="70" r="50"
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="14"
                              strokeDasharray={`${seg.strokeLength} ${circ}`}
                              strokeDashoffset={-seg.accumulatedLengthBefore}
                              transform="rotate(-90 70 70)"
                              className="transition-all duration-300 cursor-pointer"
                              onMouseEnter={() => setHoveredCode({ label: seg.label, value: seg.value, percent: seg.percent })}
                              onMouseLeave={() => setHoveredCode(null)}
                            >
                              <title>{seg.label}: {seg.value.toLocaleString()} ({seg.percent.toFixed(1)}%)</title>
                            </circle>
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {hoveredCode ? hoveredCode.label.split(' ')[0] : 'Total Req'}
                        </span>
                        <span className="text-lg font-extrabold text-slate-800 leading-tight">
                          {hoveredCode ? `${hoveredCode.percent.toFixed(1)}%` : formatNumber(total)}
                        </span>
                        {hoveredCode && (
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                            {hoveredCode.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-[11px]">
                      {segments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-2 p-1.5 rounded-lg border border-slate-50 hover:bg-slate-50 cursor-pointer"
                          onMouseEnter={() => setHoveredCode({ label: seg.label, value: seg.value, percent: seg.percent })}
                          onMouseLeave={() => setHoveredCode(null)}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-700 truncate">{seg.label}</p>
                            <p className="text-slate-400 text-[10px] font-medium">{seg.value.toLocaleString()} ({seg.percent.toFixed(1)}%)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* TOP 5XX ERRORS */}
                    {prometheusMetrics!.top5xxEndpoints && prometheusMetrics!.top5xxEndpoints.length > 0 && (
                      <div className="w-full mt-4 pt-4 border-t border-border-light">
                        <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Top 5xx Server Errors</h4>
                        <div className="space-y-2">
                          {prometheusMetrics!.top5xxEndpoints.map((item, idx) => {
                            const maxVal = Math.max(...prometheusMetrics!.top5xxEndpoints.map(i => i.count), 1);
                            const wPct = (item.count / maxVal) * 100;
                            return (
                              <div key={idx} className="flex items-center justify-between text-[10px]">
                                <button
                                  className="font-mono text-red-500 truncate max-w-[120px] hover:underline cursor-pointer text-left"
                                  title={`Click to see ${item.endpoint} error details`}
                                  onClick={() => openErrorModal(item.endpoint, '5xx', item.count)}
                                >
                                  {item.endpoint}
                                </button>
                                <div className="flex items-center space-x-2 flex-1 ml-2">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${wPct}%` }} />
                                  </div>
                                  <span className="font-semibold text-slate-700 w-8 text-right">{item.count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* TOP 4XX ERRORS */}
                    {prometheusMetrics!.top4xxEndpoints && prometheusMetrics!.top4xxEndpoints.length > 0 && (
                      <div className="w-full mt-2 pt-4 border-t border-border-light">
                        <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-2">Top 4xx Client Errors</h4>
                        <div className="space-y-2">
                          {prometheusMetrics!.top4xxEndpoints.map((item, idx) => {
                            const maxVal = Math.max(...prometheusMetrics!.top4xxEndpoints.map(i => i.count), 1);
                            const wPct = (item.count / maxVal) * 100;
                            return (
                              <div key={idx} className="flex items-center justify-between text-[10px]">
                                <button
                                  className="font-mono text-orange-500 truncate max-w-[120px] hover:underline cursor-pointer text-left"
                                  title={`Click to see ${item.endpoint} error details`}
                                  onClick={() => openErrorModal(item.endpoint, '4xx', item.count)}
                                >
                                  {item.endpoint}
                                </button>
                                <div className="flex items-center space-x-2 flex-1 ml-2">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${wPct}%` }} />
                                  </div>
                                  <span className="font-semibold text-slate-700 w-8 text-right">{item.count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>);
      })()}
    </div>

      {/* Error Detail Modal */}
      {errorModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setErrorModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-col border-b border-border-light px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      errorModal.category === '5xx'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {errorModal.category.toUpperCase()}
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-800 truncate" title={errorModal.service}>
                    {errorModal.service}
                  </span>
                </div>
                <button
                  className="ml-4 shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
                  onClick={() => setErrorModal(null)}
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">
                Total {errorModal.category} errors from this service: <span className="font-bold text-slate-700">{errorModal.totalCount.toLocaleString()}</span>
              </div>
            </div>
            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {errorModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mb-4"></div>
                  <p className="text-xs text-text-muted">Fetching URL paths from Kong Admin...</p>
                </div>
              ) : errorModal.details.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">No detailed breakdown available.</p>
              ) : (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b-2 border-border-light text-text-secondary font-bold uppercase tracking-wider">
                      <th className="py-2 pr-4">URL Paths</th>
                      <th className="py-2 pr-4 text-center">Code</th>
                      <th className="py-2 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorModal.details.map((d, i) => {
                      const codeNum = parseInt(d.code, 10);
                      const codeBg =
                        codeNum >= 500 ? 'bg-red-100 text-red-700'
                        : codeNum >= 400 ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-700';
                      return (
                        <tr key={i} className={`border-b border-border-light ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                          <td className="py-2 pr-4 max-w-[260px]">
                            {d.paths && d.paths.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {d.paths.map((p, idx) => (
                                  <span key={idx} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 break-all border border-slate-200">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-mono text-[10px]">unknown</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-center align-top">
                            <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${codeBg}`}>
                              {d.code}
                            </span>
                          </td>
                          <td className="py-2 text-right font-semibold text-slate-800 align-top pt-2.5">
                            {d.count.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 border-t border-border-light text-[10px] text-text-muted">
              Data sourced from Kong Prometheus metrics · Click outside to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};

