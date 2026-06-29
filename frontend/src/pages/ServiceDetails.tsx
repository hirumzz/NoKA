import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Layers, 
  Plug, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { CommentsSection } from '../components/CommentsSection';
import { useAuth } from '../context/AuthContext';

interface KongService {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  path: string;
  connect_timeout: number;
  write_timeout: number;
  read_timeout: number;
  retries: number;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState<KongService | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'routes' | 'plugins'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    navigate('/services');
  }, [user?.node]);

  // Service fields
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(80);
  const [protocol, setProtocol] = useState('http');
  const [path, setPath] = useState('');
  const [connectTimeout, setConnectTimeout] = useState(60000);
  const [writeTimeout, setWriteTimeout] = useState(60000);
  const [readTimeout, setReadTimeout] = useState(60000);
  const [retries, setRetries] = useState(5);

  // Sub-resource list states
  const [routes, setRoutes] = useState<KongRoute[]>([]);
  const [plugins, setPlugins] = useState<KongPlugin[]>([]);

  // Add Plugin Modal states
  const [showAddPlugin, setShowAddPlugin] = useState(false);
  const [pluginName, setPluginName] = useState('key-auth');
  const [pluginConfig, setPluginConfig] = useState('{}');

  useEffect(() => {
    fetchServiceDetails();
  }, [id]);

  const fetchServiceDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/kong/services/${id}`);
      const data = response.data;
      setService(data);
      setName(data.name || '');
      setHost(data.host || '');
      setPort(data.port || 80);
      setProtocol(data.protocol || 'http');
      setPath(data.path || '');
      setConnectTimeout(data.connect_timeout || 60000);
      setWriteTimeout(data.write_timeout || 60000);
      setReadTimeout(data.read_timeout || 60000);
      setRetries(data.retries || 5);

      // Fetch routes and plugins
      fetchSubResources();
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
      setRoutes(routesResp.data?.data || []);
      setPlugins(pluginsResp.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch routes or plugins:', err);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.patch(`/api/kong/services/${id}`, {
        name: name || null,
        host,
        port: Number(port),
        protocol,
        path: path || null,
        connect_timeout: Number(connectTimeout),
        write_timeout: Number(writeTimeout),
        read_timeout: Number(readTimeout),
        retries: Number(retries)
      });
      setSuccess('Service parameters updated successfully!');
      fetchServiceDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update service');
    }
  };

  const handleAddPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let parsedConfig = {};
      try {
        if (pluginConfig.trim()) {
          parsedConfig = JSON.parse(pluginConfig);
        }
      } catch (jsonErr) {
        setError('Invalid Plugin Config JSON format');
        return;
      }

      await axios.post(`/api/kong/services/${id}/plugins`, {
        name: pluginName,
        config: parsedConfig
      });
      setShowAddPlugin(false);
      setPluginConfig('{}');
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable plugin');
    }
  };

  const handleDeletePlugin = async (pluginId: string) => {
    if (!window.confirm('Are you sure you want to disable this plugin?')) return;
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

      {/* Tabs */}
      <div className="flex border-b border-border-light gap-6 text-xs font-bold uppercase tracking-wider text-text-secondary">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-2.5 outline-none border-b-2 transition-colors ${
            activeTab === 'details' ? 'border-brand-primary text-text-primary' : 'border-transparent hover:text-text-primary'
          }`}
        >
          Details & Notes
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`pb-2.5 outline-none border-b-2 transition-colors ${
            activeTab === 'routes' ? 'border-brand-primary text-text-primary' : 'border-transparent hover:text-text-primary'
          }`}
        >
          Routes ({routes.length})
        </button>
        <button
          onClick={() => setActiveTab('plugins')}
          className={`pb-2.5 outline-none border-b-2 transition-colors ${
            activeTab === 'plugins' ? 'border-brand-primary text-text-primary' : 'border-transparent hover:text-text-primary'
          }`}
        >
          Plugins ({plugins.length})
        </button>
      </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Update Service Specifications</h3>
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
            <CommentsSection referenceId={service.id} referenceType="service" />
          </div>
        </div>
      )}

      {/* Tab: Routes */}
      {activeTab === 'routes' && (
        <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-light flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Sub-routes of Service</h3>
            <Link
              to={`/routes?service_id=${service.id}`}
              className="flex items-center px-3 py-1.5 rounded bg-brand-primary text-white font-bold text-[10px] hover:bg-brand-primary-hover shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> ADD ROUTE
            </Link>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase">
                <th className="px-6 py-3.5">Route Name</th>
                <th className="px-6 py-3.5">Paths</th>
                <th className="px-6 py-3.5">Hosts</th>
                <th className="px-6 py-3.5">Methods</th>
                <th className="px-6 py-3.5">Protocols</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light font-semibold text-text-primary">
              {routes.length > 0 ? (
                routes.map(route => (
                  <tr key={route.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      {/* CRITICAL RELATION: Link to Route Details page */}
                      <Link 
                        to={`/routes/${route.id}`} 
                        className="text-brand-primary hover:underline flex items-center gap-1 font-bold"
                      >
                        {route.name || 'Unnamed Route'}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <span className="text-[10px] text-text-muted block font-mono mt-0.5">{route.id}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.paths ? route.paths.join(', ') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.hosts ? route.hosts.join(', ') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.methods ? route.methods.join(', ') : 'ANY'}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                      {route.protocols.join(', ')}
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
              <form onSubmit={handleAddPlugin} className="p-4 bg-slate-50 rounded border border-border-light space-y-4 animate-slideDown max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Plugin Type</label>
                    <select
                      value={pluginName}
                      onChange={(e) => setPluginName(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                    >
                      <option value="key-auth">Key Authentication</option>
                      <option value="rate-limiting">Rate Limiting</option>
                      <option value="cors">CORS</option>
                      <option value="prometheus">Prometheus</option>
                      <option value="jwt">JWT Authentication</option>
                      <option value="acl">Access Control List (ACL)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Configuration JSON</label>
                  <textarea
                    rows={4}
                    value={pluginConfig}
                    onChange={(e) => setPluginConfig(e.target.value)}
                    className="w-full p-2.5 rounded border border-border-light bg-white text-xs outline-none font-mono"
                  />
                  <p className="text-[9px] text-text-muted">Enter configuration parameters as raw JSON (e.g. {"{}"})</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddPlugin(false)} className="px-3 py-1.5 border rounded bg-white text-xs font-semibold">Cancel</button>
                  <button type="submit" className="px-3 py-1.5 bg-brand-primary text-white rounded text-xs font-bold uppercase">Enable Plugin</button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light">
              {plugins.length > 0 ? (
                plugins.map(plugin => (
                  <div key={plugin.id} className="py-4 flex justify-between items-center gap-4 hover:bg-slate-50/20 px-2 rounded">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-primary capitalize">{plugin.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          plugin.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted font-mono block mt-1">ID: {plugin.id}</span>
                      <pre className="text-[10px] font-mono bg-slate-50 p-2 border rounded mt-2 max-h-24 overflow-y-auto select-all leading-normal font-medium text-text-secondary">
                        {JSON.stringify(plugin.config, null, 2)}
                      </pre>
                    </div>
                    <button 
                      onClick={() => handleDeletePlugin(plugin.id)} 
                      className="p-2 rounded border border-border-light text-text-secondary hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                      title="Disable Plugin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-text-muted text-xs italic py-4">No plugins configured specifically for this service.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
