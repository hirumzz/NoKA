import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Server, 
  Database,
  Cpu,
  Globe,
  Clock,
  Plug,
  Activity,
  CheckCircle2,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';

interface KongInfo {
  version: string;
  hostname: string;
  lua_version: string;
  configuration: {
    database: string;
    [key: string]: any;
  };
  plugins: {
    available_on_server: Record<string, boolean>;
    enabled_in_cluster: string[];
  };
  timers: {
    running: number;
    pending: number;
  };
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

export const Info: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<KongInfo | null>(null);
  const [status, setStatus] = useState<KongStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [showRawConfig, setShowRawConfig] = useState(false);
  const [rawSearch, setRawSearch] = useState('');

  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const [infoRes, statusRes] = await Promise.all([
        axios.get('/api/kong/'),
        axios.get('/api/kong/status')
      ]);
      setInfo(infoRes.data);
      setStatus(statusRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch node information.');
    } finally {
      setLoading(false);
    }
  };

  const formatAdminListen = (listen: any) => {
    if (Array.isArray(listen)) return listen.join(', ');
    if (typeof listen === 'string') return listen;
    return 'N/A';
  };

  const getDatastoreDetails = (config: any) => {
    if (!config) return { dbms: 'N/A', host: 'N/A', name: 'N/A', user: 'N/A', port: 'N/A' };
    const dbms = config.database || 'N/A';
    if (dbms === 'postgres') {
      return {
        dbms: 'PostgreSQL',
        host: config.pg_host || 'N/A',
        name: config.pg_database || 'N/A',
        user: config.pg_user || 'N/A',
        port: config.pg_port || 'N/A'
      };
    }
    if (dbms === 'cassandra') {
      return {
        dbms: 'Cassandra',
        host: Array.isArray(config.cassandra_contact_points) ? config.cassandra_contact_points.join(', ') : (config.cassandra_contact_points || 'N/A'),
        name: config.cassandra_keyspace || 'N/A',
        user: config.cassandra_username || 'N/A',
        port: config.cassandra_port || 'N/A'
      };
    }
    return {
      dbms: dbms,
      host: 'N/A',
      name: 'N/A',
      user: 'N/A',
      port: 'N/A'
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-text-secondary">
        <Activity className="animate-spin w-8 h-8 mr-3 text-brand-primary" />
        <span className="font-semibold">Loading Node Information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm font-semibold flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (!info || !status) return null;

  const allPlugins = Object.keys(info.plugins.available_on_server || {}).sort();
  const filteredPlugins = allPlugins.filter(name => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="p-4 sm:p-6 rounded-lg bg-white border border-border-light shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">Node Information</h2>
          <p className="text-xs text-text-secondary mt-0.5">Detailed metrics and configurations for your Kong Gateway node.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold self-start sm:self-auto shrink-0">
          {status.database.reachable ? (
            <span className="flex items-center text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> DB Connected
            </span>
          ) : (
            <span className="flex items-center text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> DB Disconnected
            </span>
          )}
        </div>
      </div>

      {/* 3-column layout card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card 1: Node specifications */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4">
              <Server className="w-4 h-4 text-brand-primary" /> Node Specifications
            </h3>
            <div className="space-y-3.5 mt-4">
              <div className="flex items-start gap-3">
                <Cpu className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-text-muted font-bold uppercase">Hostname</p>
                  <p className="text-xs font-bold text-text-primary mt-0.5 break-words">{info.hostname}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Server className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-text-muted font-bold uppercase">Kong Version</p>
                  <p className="text-xs font-bold text-text-primary mt-0.5">{info.version}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-text-muted font-bold uppercase">Lua VM Version</p>
                  <p className="text-xs font-bold text-text-primary mt-0.5">{info.lua_version}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-text-muted font-bold uppercase">Admin Listener</p>
                  <p className="text-xs font-bold text-text-primary mt-0.5 break-all">
                    {formatAdminListen(info.configuration?.admin_listen)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Lua VM Timers */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4">
              <Clock className="w-4 h-4 text-brand-primary" /> Lua VM Timers
            </h3>
            <svg className="hidden">
              <defs>
                <linearGradient id="pendingTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="runningTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            {info.timers ? (
              <div className="flex items-center justify-around h-full py-6">
                {/* Pending Timers */}
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                    <svg className="w-full h-full animate-[spin_25s_linear_infinite]" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke="url(#pendingTimerGrad)" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - Math.min(251.2, (info.timers.pending / Math.max(10, info.timers.pending, info.timers.running)) * 251.2)} 
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg sm:text-xl font-extrabold text-amber-500">{info.timers.pending}</span>
                      <span className="text-[8px] sm:text-[9px] text-text-secondary uppercase font-bold">Pending</span>
                    </div>
                  </div>
                </div>

                {/* Running Timers */}
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                    <svg className="w-full h-full animate-[spin_25s_linear_infinite]" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke="url(#runningTimerGrad)" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - Math.min(251.2, (info.timers.running / Math.max(10, info.timers.pending, info.timers.running)) * 251.2)} 
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg sm:text-xl font-extrabold text-emerald-500">{info.timers.running}</span>
                      <span className="text-[8px] sm:text-[9px] text-text-secondary uppercase font-bold">Running</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-text-muted">Timer statistics not available.</div>
            )}
          </div>
        </div>

        {/* Card 3: Datastore configuration */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border-light pb-4 gap-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-primary" /> Datastore Config
              </h3>
              <div className="flex items-center space-x-2 text-xs font-bold shrink-0">
                {status.database.reachable ? (
                  <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[11px]">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Reachable
                  </span>
                ) : (
                  <span className="flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 text-[11px]">
                    <span className="h-2 w-2 mr-1.5 rounded-full bg-red-500" />
                    Unreachable
                  </span>
                )}
              </div>
            </div>

            {(() => {
              const details = getDatastoreDetails(info.configuration);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-2 mt-4">
                  <div>
                    <p className="text-[10px] text-text-muted font-bold uppercase">DBMS</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5 capitalize">{details.dbms}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-bold uppercase">Host</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5 break-all">{details.host}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-bold uppercase">Database Name</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5 break-all">{details.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-bold uppercase">User</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5 break-all">{details.user}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Port</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5">{details.port}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Plugins Grid Section */}
      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-light pb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Plug className="w-4 h-4 text-brand-primary" /> Plugins Registry
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              List of all plugins available on the server. Active plugins are highlighted.
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Filter plugins by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-sans font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredPlugins.map((plugin) => {
            const isActive = info.plugins.enabled_in_cluster ? info.plugins.enabled_in_cluster.includes(plugin) : false;
            return (
              <div 
                key={plugin}
                style={
                  isActive 
                    ? { borderColor: '#8ec400', boxShadow: '0 0 12px rgba(142, 196, 0, 0.35)' }
                    : undefined
                }
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                  isActive 
                    ? 'bg-[#8ec400]/5 border-2 text-slate-800 scale-[1.03] font-bold' 
                    : 'bg-slate-50/50 border-slate-200 text-text-secondary opacity-60 hover:opacity-100 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-bold text-center truncate w-full" title={plugin}>
                  {plugin}
                </span>
                <span className={`text-[8px] uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-[#8ec400]/20 text-[#679100] font-extrabold' 
                    : 'bg-slate-200/50 text-slate-500 font-bold'
                }`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            );
          })}
          {filteredPlugins.length === 0 && (
            <div className="col-span-full text-center text-xs text-text-muted py-8">
              No plugins match your search filter.
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Raw Configuration Details */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={() => setShowRawConfig(prev => !prev)}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors duration-150 border-0 cursor-pointer"
        >
          {showRawConfig
            ? <EyeOff className="w-4 h-4 text-slate-500" />
            : <Eye className="w-4 h-4 text-slate-500" />}
          <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
            {showRawConfig ? 'Hide' : 'Reveal'} Raw Configuration Details
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
              showRawConfig ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        {/* Collapsible Panel */}
        {showRawConfig && (
          <div className="p-6 border-t border-border-light">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Full Node Configuration (Raw)
              </h3>
              {/* Raw config search bar */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search configuration parameters..."
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-sans font-medium"
                />
              </div>
            </div>

            {/* ── General Information accordion ───────────────────────────── */}
            <details
              open
              className="group mb-4 rounded-lg border border-slate-200 overflow-hidden"
            >
              <summary className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer select-none list-none hover:bg-slate-100 transition-colors">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">General Information</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="px-4 py-4 space-y-3 text-xs">
                {/* Kong Version */}
                {(rawSearch === '' || 'kong version'.includes(rawSearch.toLowerCase()) || (info.version || '').toLowerCase().includes(rawSearch.toLowerCase())) && (
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted font-semibold w-36 shrink-0">Kong Version</span>
                    <span className="text-text-primary font-mono font-medium">{info.version}</span>
                  </div>
                )}

                {/* Node ID */}
                {(rawSearch === '' || 'node id'.includes(rawSearch.toLowerCase()) || (info.configuration?.node_id || (info as any).id || '').toLowerCase().includes(rawSearch.toLowerCase())) && (
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted font-semibold w-36 shrink-0">Node ID</span>
                    <span className="text-red-400 font-mono font-semibold break-all">
                      {info.configuration?.node_id || (info as any).id || 'N/A'}
                    </span>
                  </div>
                )}

                {/* Hostname */}
                {(rawSearch === '' || 'hostname'.includes(rawSearch.toLowerCase()) || (info.hostname || '').toLowerCase().includes(rawSearch.toLowerCase())) && (
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted font-semibold w-36 shrink-0">Hostname</span>
                    <span className="text-text-primary font-mono font-medium">{info.hostname}</span>
                  </div>
                )}

                {/* Lua Version */}
                {(rawSearch === '' || 'lua version'.includes(rawSearch.toLowerCase()) || (info.lua_version || '').toLowerCase().includes(rawSearch.toLowerCase())) && (
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted font-semibold w-36 shrink-0">Lua Version</span>
                    <span className="text-text-primary font-mono font-medium">{info.lua_version}</span>
                  </div>
                )}

                {/* Available Plugins */}
                {(rawSearch === '' || 'available plugins'.includes(rawSearch.toLowerCase()) || allPlugins.some(p => p.toLowerCase().includes(rawSearch.toLowerCase()))) && (
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted font-semibold w-36 shrink-0 pt-0.5">Available Plugins</span>
                    <div className="flex flex-wrap gap-1.5">
                      {allPlugins
                        .filter(p => rawSearch === '' || p.toLowerCase().includes(rawSearch.toLowerCase()))
                        .map(plugin => {
                          const isActive = info.plugins.enabled_in_cluster?.includes(plugin);
                          return (
                            <span
                              key={plugin}
                              style={isActive ? { borderColor: '#8ec400', boxShadow: '0 0 8px rgba(142,196,0,0.3)' } : undefined}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                isActive
                                  ? 'bg-[#8ec400]/10 text-[#679100] border-[#8ec400]/40'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {plugin}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </details>

            {/* ── Detailed Gateway Configuration Settings accordion ────────── */}
            <details className="group rounded-lg border border-slate-200 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer select-none list-none hover:bg-slate-100 transition-colors">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Detailed Gateway Configuration Settings</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-600 w-1/3">Parameter</th>
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-600">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(info.configuration || {})
                      .filter(([key, val]) => {
                        if (rawSearch === '') return true;
                        const q = rawSearch.toLowerCase();
                        const valStr = Array.isArray(val)
                          ? val.join(', ')
                          : typeof val === 'object' && val !== null
                          ? JSON.stringify(val)
                          : String(val ?? '');
                        return key.toLowerCase().includes(q) || valStr.toLowerCase().includes(q);
                      })
                      .map(([key, val], idx) => {
                        let displayVal: string;
                        if (Array.isArray(val)) {
                          displayVal = val.join(', ');
                        } else if (typeof val === 'object' && val !== null) {
                          displayVal = JSON.stringify(val, null, 2);
                        } else {
                          displayVal = String(val ?? '');
                        }
                        return (
                          <tr
                            key={key}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          >
                            <td className="px-4 py-2 font-mono font-semibold text-slate-700 border-b border-slate-100 align-top whitespace-nowrap">
                              {key}
                            </td>
                            <td className="px-4 py-2 font-mono text-slate-600 border-b border-slate-100 break-all">
                              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{displayVal}</pre>
                            </td>
                          </tr>
                        );
                      })}
                    {Object.entries(info.configuration || {}).filter(([key, val]) => {
                      if (rawSearch === '') return true;
                      const q = rawSearch.toLowerCase();
                      const valStr = Array.isArray(val)
                        ? val.join(', ')
                        : typeof val === 'object' && val !== null
                        ? JSON.stringify(val)
                        : String(val ?? '');
                      return key.toLowerCase().includes(q) || valStr.toLowerCase().includes(q);
                    }).length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-text-muted">
                          No configuration parameters match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};
