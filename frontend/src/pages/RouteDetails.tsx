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
  Layers
} from 'lucide-react';
import { CommentsSection } from '../components/CommentsSection';

interface KongRoute {
  id: string;
  name?: string;
  paths?: string[];
  hosts?: string[];
  methods?: string[];
  protocols: string[];
  strip_path: boolean;
  preserve_host: boolean;
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
  const [route, setRoute] = useState<KongRoute | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'plugins'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Route fields
  const [name, setName] = useState('');
  const [pathsInput, setPathsInput] = useState('');
  const [hostsInput, setHostsInput] = useState('');
  const [methods, setMethods] = useState<string[]>([]);
  const [protocols, setProtocols] = useState<string[]>(['http', 'https']);
  const [stripPath, setStripPath] = useState(true);
  const [preserveHost, setPreserveHost] = useState(false);

  // Sub-resource list states
  const [plugins, setPlugins] = useState<KongPlugin[]>([]);

  // Add Plugin Modal states
  const [showAddPlugin, setShowAddPlugin] = useState(false);
  const [pluginName, setPluginName] = useState('key-auth');
  const [pluginConfig, setPluginConfig] = useState('{}');

  useEffect(() => {
    fetchRouteDetails();
  }, [id]);

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

      // Fetch plugins
      fetchSubResources();
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
      setPlugins(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch plugins:', err);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const parsedPaths = pathsInput ? pathsInput.split(',').map(p => p.trim()).filter(p => p !== '') : [];
    const parsedHosts = hostsInput ? hostsInput.split(',').map(h => h.trim()).filter(h => h !== '') : [];

    try {
      await axios.patch(`/api/kong/routes/${id}`, {
        name: name || null,
        paths: parsedPaths.length > 0 ? parsedPaths : null,
        hosts: parsedHosts.length > 0 ? parsedHosts : null,
        methods: methods.length > 0 ? methods : null,
        protocols,
        strip_path: stripPath,
        preserve_host: preserveHost
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

      await axios.post(`/api/kong/routes/${id}/plugins`, {
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Update Route Rules</h3>
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

                {/* Protocols */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase block">Protocols</label>
                  <div className="flex gap-4">
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
                  <div className="flex gap-4">
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
            <CommentsSection referenceId={route.id} referenceType="route" />
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
                <div className="text-text-muted text-xs italic py-4">No plugins configured specifically for this route.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
