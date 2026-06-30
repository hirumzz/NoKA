import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Server, 
  Database,
  Cpu,
  Globe,
  Clock,
  Zap,
  Plug,
  Activity,
  CheckCircle2,
  AlertCircle
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
  const [error, setError] = useState('');

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

  const plugins = info.plugins.available_on_server || {};
  const enabledPlugins = Object.entries(plugins)
    .filter(([_, isEnabled]) => isEnabled)
    .map(([name]) => name);

  return (
    <div className="space-y-6 font-sans">
      <div className="p-6 rounded-lg bg-white border border-border-light shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Node Information</h2>
          <p className="text-xs text-text-secondary mt-1">Detailed metrics and configurations for your Kong Gateway node.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm font-semibold">
          {status.database.reachable ? (
            <span className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> DB Connected
            </span>
          ) : (
            <span className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
              <AlertCircle className="w-4 h-4 mr-1.5" /> DB Disconnected
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4">
            <Server className="w-4 h-4 text-brand-primary" /> System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Hostname</p>
                <p className="text-sm font-bold text-text-primary mt-0.5">{info.hostname}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Kong Version</p>
                <p className="text-sm font-bold text-text-primary mt-0.5">{info.version}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Lua VM</p>
                <p className="text-sm font-bold text-text-primary mt-0.5">{info.lua_version}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded bg-slate-100 text-text-secondary">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-muted font-bold uppercase">Datastore</p>
                <p className="text-sm font-bold text-text-primary mt-0.5 capitalize">{info.configuration.database}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4">
            <Activity className="w-4 h-4 text-brand-primary" /> Node Status
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded border border-slate-100">
              <p className="text-[10px] text-text-muted font-bold uppercase mb-1">Active Connections</p>
              <p className="text-2xl font-extrabold text-brand-primary">{status.server.connections_active}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded border border-slate-100">
              <p className="text-[10px] text-text-muted font-bold uppercase mb-1">Total Requests</p>
              <p className="text-2xl font-extrabold text-indigo-600">{status.server.total_requests}</p>
            </div>
          </div>

          {info.timers && (
            <div className="mt-4 pt-4 border-t border-border-light flex space-x-6">
              <div className="flex items-center text-sm font-semibold">
                <Clock className="w-4 h-4 mr-2 text-amber-500" />
                <span className="text-text-secondary">Pending Timers:</span>
                <span className="ml-2 text-text-primary">{info.timers.pending}</span>
              </div>
              <div className="flex items-center text-sm font-semibold">
                <Zap className="w-4 h-4 mr-2 text-emerald-500" />
                <span className="text-text-secondary">Running Timers:</span>
                <span className="ml-2 text-text-primary">{info.timers.running}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-6">
          <Plug className="w-4 h-4 text-brand-primary" /> Enabled Plugins on Node
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {enabledPlugins.map((plugin) => (
            <div 
              key={plugin}
              className="flex items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-md shadow-sm hover:border-brand-primary transition-colors"
            >
              <span className="text-xs font-semibold text-text-primary text-center truncate w-full" title={plugin}>
                {plugin}
              </span>
            </div>
          ))}
          {enabledPlugins.length === 0 && (
            <div className="col-span-full text-center text-sm text-text-muted py-4">
              No plugins available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
