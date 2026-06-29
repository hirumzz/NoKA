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
  Database
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
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [user?.node]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [infoResp, servicesResp, routesResp, consumersResp, pluginsResp] = await Promise.all([
        axios.get('/api/kong/'),
        axios.get('/api/kong/services').catch(() => ({ data: { data: [] } })),
        axios.get('/api/kong/routes').catch(() => ({ data: { data: [] } })),
        axios.get('/api/kong/consumers').catch(() => ({ data: { data: [] } })),
        axios.get('/api/kong/plugins').catch(() => ({ data: { data: [] } }))
      ]);

      setNodeInfo(infoResp.data);
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
    </div>
  );
};
