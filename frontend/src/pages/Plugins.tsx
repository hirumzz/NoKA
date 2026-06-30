import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Plug, 
  AlertCircle,
  X,
  Settings,
  Search
} from 'lucide-react';

interface PluginItem {
  id: string;
  name: string;
  enabled: boolean;
  service?: {
    id: string;
  };
  route?: {
    id: string;
  };
  consumer?: {
    id: string;
  };
  config: Record<string, any>;
  created_at: number;
  tags?: string[];
}

interface Service {
  id: string;
  name: string;
}

interface RouteItem {
  id: string;
  name?: string;
  paths: string[];
}

const getTagColor = (tag: string) => {
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const Plugins: React.FC = () => {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [pluginName, setPluginName] = useState('cors');
  const [scope, setScope] = useState('global'); // global, service, route
  const [targetServiceId, setTargetServiceId] = useState('');
  const [targetRouteId, setTargetRouteId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Search & Filter fields
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Key-Auth config
  const [keyNames, setKeyNames] = useState('apikey');

  // Rate Limiting config
  const [rlSecond, setRlSecond] = useState('');
  const [rlHour, setRlHour] = useState('');

  // Edit Modal fields
  const [editingPlugin, setEditingPlugin] = useState<PluginItem | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editConfig, setEditConfig] = useState('{}');

  useEffect(() => {
    fetchPluginsAndResources();
  }, [user?.node]);

  const fetchPluginsAndResources = async () => {
    setLoading(true);
    setError('');
    try {
      const [pluginsResp, servicesResp, routesResp] = await Promise.all([
        axios.get('/api/kong/plugins'),
        axios.get('/api/kong/services'),
        axios.get('/api/kong/routes')
      ]);
      setPlugins(pluginsResp.data?.data || []);
      setServices(servicesResp.data?.data || []);
      setRoutes(routesResp.data?.data || []);

      if (servicesResp.data?.data?.length > 0) {
        setTargetServiceId(servicesResp.data.data[0].id);
      }
      if (routesResp.data?.data?.length > 0) {
        setTargetRouteId(routesResp.data.data[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch plugins and metadata');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload: any = {
      name: pluginName,
      enabled: true
    };

    // Attach scope
    if (scope === 'service' && targetServiceId) {
      payload.service = { id: targetServiceId };
    } else if (scope === 'route' && targetRouteId) {
      payload.route = { id: targetRouteId };
    }

    // Attach configurations
    if (pluginName === 'key-auth') {
      payload.config = {
        key_names: keyNames.split(',').map(k => k.trim())
      };
    } else if (pluginName === 'rate-limiting') {
      const configrl: any = {};
      if (rlSecond) configrl.second = Number(rlSecond);
      if (rlHour) configrl.hour = Number(rlHour);
      payload.config = configrl;
    }

    // Parse and attach tags
    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (parsedTags.length > 0) {
      payload.tags = parsedTags;
    }

    try {
      await axios.post('/api/kong/plugins', payload);
      setScope('global');
      setRlSecond('');
      setRlHour('');
      setKeyNames('apikey');
      setTagsInput('');
      setShowAddForm(false);
      fetchPluginsAndResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable plugin');
    }
  };

  const handleUpdatePlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlugin) return;
    setError('');

    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(editConfig);
      } catch (jsonErr) {
        setError('Invalid Configuration JSON format');
        return;
      }

      await axios.patch(`/api/kong/plugins/${editingPlugin.id}`, {
        enabled: editEnabled,
        config: parsedConfig
      });

      setEditingPlugin(null);
      fetchPluginsAndResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update plugin');
    }
  };

  const handleDeletePlugin = async (id: string) => {
    if (!window.confirm('Are you sure you want to disable and delete this plugin?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/plugins/${id}`);
      fetchPluginsAndResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable plugin');
    }
  };

  const openEditModal = (plugin: PluginItem) => {
    setEditingPlugin(plugin);
    setEditEnabled(plugin.enabled);
    setEditConfig(JSON.stringify(plugin.config, null, 2));
  };

  const uniqueTags = Array.from(
    new Set(
      plugins.flatMap(p => p.tags || [])
    )
  ).sort();

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = 
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      plugin.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = 
      !selectedTag || 
      (plugin.tags && plugin.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Plugins</h2>
          <p className="text-xs text-text-secondary mt-1">Plugins allow you to extend gateway features, providing authentication, traffic control, security, logging, and more</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all animate-fadeIn"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD GLOBAL PLUGIN
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4 animate-slideDown">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Enable New Plugin</h3>
          <form onSubmit={handleAddPlugin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Plugin Type</label>
                <select
                  value={pluginName}
                  onChange={(e) => setPluginName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                >
                  <option value="cors">CORS (Cross-Origin Resource Sharing)</option>
                  <option value="key-auth">Key Authentication</option>
                  <option value="rate-limiting">Rate Limiting</option>
                  <option value="prometheus">Prometheus Metrics</option>
                  <option value="jwt">JWT Authentication</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Apply Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                >
                  <option value="global">Global (All requests)</option>
                  <option value="service" disabled={services.length === 0}>Service Specific</option>
                  <option value="route" disabled={routes.length === 0}>Route Specific</option>
                </select>
              </div>

              {scope === 'service' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Select Target Service</label>
                  <select
                    value={targetServiceId}
                    onChange={(e) => setTargetServiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.id}</option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'route' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Select Target Route</label>
                  <select
                    value={targetRouteId}
                    onChange={(e) => setTargetRouteId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name || r.paths.join(', ')}</option>
                    ))}
                  </select>
                </div>
              )}

              {pluginName === 'key-auth' && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">API Key Header Name(s)</label>
                  <input
                    type="text"
                    required
                    value={keyNames}
                    onChange={(e) => setKeyNames(e.target.value)}
                    placeholder="e.g. apikey, X-API-KEY"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
              )}

              {pluginName === 'rate-limiting' && (
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Requests per Second</label>
                    <input
                      type="number"
                      value={rlSecond}
                      onChange={(e) => setRlSecond(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Requests per Hour</label>
                    <input
                      type="number"
                      value={rlHour}
                      onChange={(e) => setRlHour(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. production, auth, public"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs transition-colors"
              >
                ADD GLOBAL PLUGIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter Panel */}
      {plugins.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-border-light shadow-sm">
          <div className="relative flex-1 w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins by name or ID..."
              className="w-full pl-10 pr-4 py-2 rounded bg-slate-50 border border-border-light outline-none text-xs font-medium placeholder:text-text-muted transition-colors focus:border-brand-primary focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">Filter by Tag:</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary min-w-[140px]"
            >
              <option value="">All Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Plugins List Table */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading plugins...
          </div>
        ) : plugins.length > 0 ? (
          <div className="overflow-x-auto">
            {filteredPlugins.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Scope</th>
                    <th className="px-6 py-3.5">Apply To</th>
                    <th className="px-6 py-3.5">Consumer</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary animate-fadeIn">
                  {filteredPlugins.map((plugin) => {
                    let scopeName = 'global';
                    let applyTarget = 'All Entrypoints';

                    if (plugin.service?.id) {
                      scopeName = 'services';
                      const svc = services.find(s => s.id === plugin.service?.id);
                      applyTarget = svc?.name || plugin.service.id;
                    } else if (plugin.route?.id) {
                      scopeName = 'routes';
                      const r = routes.find(rt => rt.id === plugin.route?.id);
                      applyTarget = r?.name || r?.paths?.join(', ') || plugin.route.id;
                    }

                    const consumerName = plugin.consumer?.id ? plugin.consumer.id : 'All consumers';

                    return (
                      <tr key={plugin.id} className="hover:bg-slate-50/25 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-teal-50 text-teal-600">
                              <Plug className="w-4 h-4" />
                            </div>
                            <div>
                              {/* Clickable name opens edit modal */}
                              <span 
                                onClick={() => openEditModal(plugin)}
                                className="font-bold text-sm text-blue-600 block cursor-pointer hover:underline flex items-center gap-1.5"
                              >
                                {plugin.name}
                                <Settings className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
                              </span>
                              <span className="text-[10px] text-text-muted font-mono block select-all mt-0.5">{plugin.id}</span>
                              {plugin.tags && plugin.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5 max-w-xs">
                                  {plugin.tags.map(t => {
                                    const c = getTagColor(t);
                                    return (
                                      <span key={t} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
                                        {t}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-text-secondary capitalize font-medium">{scopeName}</span>
                        </td>
                        <td className="px-6 py-4">
                          {plugin.service?.id ? (
                            <Link 
                              to={`/services/${plugin.service.id}`} 
                              className="text-brand-primary hover:underline font-bold"
                            >
                              {applyTarget}
                            </Link>
                          ) : plugin.route?.id ? (
                            <Link 
                              to={`/routes/${plugin.route.id}`} 
                              className="text-brand-primary hover:underline font-bold"
                            >
                              {applyTarget}
                            </Link>
                          ) : (
                            <span className="text-text-secondary font-medium">{applyTarget}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-text-secondary font-medium">
                          {plugin.consumer?.id ? (
                            <Link 
                              to={`/consumers/${plugin.consumer.id}`} 
                              className="text-brand-primary hover:underline font-bold"
                            >
                              {consumerName}
                            </Link>
                          ) : (
                            <span className="text-text-secondary font-medium">{consumerName}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-text-secondary font-medium">
                          {new Date(plugin.created_at * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
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
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-text-muted text-xs font-medium">
                No plugins match your search and filter criteria.
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No plugins active. Click "+ ADD GLOBAL PLUGINS" to configure metrics, auth, etc.
          </div>
        )}
      </div>

      {/* Edit Plugin Modal */}
      {editingPlugin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg border border-border-light shadow-xl flex flex-col max-h-[85vh] animate-scaleUp overflow-hidden">
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

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Configuration Payload JSON</label>
                <textarea
                  rows={10}
                  required
                  value={editConfig}
                  onChange={(e) => setEditConfig(e.target.value)}
                  className="w-full p-2.5 rounded border border-border-light bg-slate-50 text-xs font-mono leading-relaxed outline-none focus:border-brand-primary"
                />
                <p className="text-[9px] text-text-muted">Directly adjust configuration properties in GFE/Kong format.</p>
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
                  className="px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs uppercase"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
