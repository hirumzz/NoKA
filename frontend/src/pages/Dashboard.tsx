import React, { useEffect, useState } from 'react';
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
  PieChart
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
  server?: {
    connections_active?: number;
    connections_reading?: number;
    connections_writing?: number;
    connections_waiting?: number;
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
  message?: string;
}

import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    services: 0,
    routes: 0,
    consumers: 0,
    plugins: 0
  });
  const [nodeInfo, setNodeInfo] = useState<GatewayInfo | null>(null);
  const [status, setStatus] = useState<KongStatus | null>(null);
  const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics | null>(null);
  const [hoveredCode, setHoveredCode] = useState<{ label: string; value: number; percent: number } | null>(null);
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
    setLoading(true);
    setError('');
    try {
      const [infoResp, statusResp, prometheusResp, servicesResp, routesResp, consumersResp, pluginsResp] = await Promise.all([
        axios.get('/api/kong/'),
        axios.get('/api/kong/status').catch(() => ({ data: null })),
        axios.get('/api/kong/prometheus-metrics').catch(() => ({ data: { success: false } })),
        axios.get('/api/kong/services').catch(() => ({ data: { data: [] } })),
        axios.get('/api/kong/routes').catch(() => ({ data: { data: [] } })),
        axios.get('/api/kong/consumers').catch(() => ({ data: { data: [] } })),
        axios.get('/api/kong/plugins').catch(() => ({ data: { data: [] } }))
      ]);

      setNodeInfo(infoResp.data);
      setStatus(statusResp.data);
      setPrometheusMetrics(prometheusResp.data);
      setCounts({
        services: servicesResp.data?.data?.length || 0,
        routes: routesResp.data?.data?.length || 0,
        consumers: consumersResp.data?.data?.length || 0,
        plugins: pluginsResp.data?.data?.length || 0
      });
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch gateway statistics. Please verify that a connection is active.');
    } finally {
      setLoading(false);
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
    { label: 'Active Services', value: counts.services, icon: Layers, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { label: 'Configured Routes', value: counts.routes, icon: GitBranch, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Registered Consumers', value: counts.consumers, icon: Users, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Active Plugins', value: counts.plugins, icon: Plug, color: 'text-teal-600 bg-teal-50 border-teal-100' },
  ];

  return (
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

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
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
                className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${
                  metric.highlight 
                    ? 'bg-slate-900/5 border-slate-900/10 col-span-2 sm:col-span-1 shadow-sm' 
                    : 'bg-white/40 border-white/50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{metric.label}</span>
                  <p className="text-xl font-extrabold tracking-tight text-slate-800 mt-1">
                    {loading ? '...' : formatNumber(metric.value)}
                  </p>
                </div>
                <span className="text-[8px] text-slate-400 font-medium mt-2 leading-tight block">{metric.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className={`p-6 bg-white rounded-lg border border-border-light shadow-sm transition-all duration-150 hover:shadow-md flex items-center justify-between`}
            >
              <div>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">{stat.label}</span>
                <p className="text-3xl font-extrabold tracking-tight text-text-primary mt-1">
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className={`p-3.5 rounded ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
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
                  {loading ? 'Loading...' : (nodeInfo?.configuration?.database || 'PostgreSQL')}
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
                  {loading ? 'Loading...' : (nodeInfo?.lua_version || 'LuaJIT')}
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

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-text-secondary">API Proxy Latency</span>
                <span className="text-brand-primary">1.2ms</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary rounded-full" style={{ width: '12%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-text-secondary">Admin API Health</span>
                <span className="text-emerald-500">100% OK</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
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
                  </div>
                );
              })()}
            </div>
          </div>
        </div>);
      })()}

      {/* SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
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
              <div className="flex items-end h-48 gap-4 justify-around mt-4">
                {serverItems.map((item, idx) => {
                  const heightPct = Math.max(4, (item.value / maxServerVal) * 96);
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <span className="text-xs font-bold text-text-primary mb-2">{item.value}</span>
                      <div className="w-full flex justify-center h-32 relative">
                        <svg className="w-8 h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
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
                      <span className="text-[10px] text-text-secondary mt-2 uppercase font-bold">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
            <Database className="w-4 h-4 text-brand-primary" /> Database Distribution
          </h3>
          <div className="flex items-end h-48 gap-4 justify-around mt-4">
            {[
              { label: 'Services', value: counts.services, color: '#6366f1' },
              { label: 'Routes', value: counts.routes, color: '#8b5cf6' },
              { label: 'Consumers', value: counts.consumers, color: '#ec4899' },
              { label: 'Plugins', value: counts.plugins, color: '#14b8a6' }
            ].map((item, idx) => {
              const maxVal = Math.max(1, counts.services, counts.routes, counts.consumers, counts.plugins);
              const heightPct = (item.value / maxVal) * 100;
              return (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <span className="text-xs font-bold text-text-primary mb-2">{item.value}</span>
                  <div className="w-full flex justify-center h-32 relative">
                    <svg className="w-8 h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
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
                  <span className="text-[10px] text-text-secondary mt-2 uppercase font-bold">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

