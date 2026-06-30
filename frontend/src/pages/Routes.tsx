import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  GitBranch, 
  AlertCircle,
  Search
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

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
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [paths, setPaths] = useState('');
  const [hosts, setHosts] = useState('');
  const [methods, setMethods] = useState<string[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

  useEffect(() => {
    fetchRoutesAndServices();
  }, [user?.node]);

  const fetchRoutesAndServices = async () => {
    setLoading(true);
    setError('');
    try {
      const [routesResp, servicesResp] = await Promise.all([
        axios.get('/api/kong/routes'),
        axios.get('/api/kong/services')
      ]);
      setRoutes(routesResp.data?.data || []);
      setServices(servicesResp.data?.data || []);
      if (servicesResp.data?.data?.length > 0) {
        setSelectedServiceId(servicesResp.data.data[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch routes and services');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMethod = (method: string) => {
    if (methods.includes(method)) {
      setMethods(methods.filter(m => m !== method));
    } else {
      setMethods([...methods, method]);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !paths) return;
    setError('');

    // Parse comma-separated paths & hosts
    const parsedPaths = paths.split(',').map(p => p.trim()).filter(p => p !== '');
    const parsedHosts = hosts ? hosts.split(',').map(h => h.trim()).filter(h => h !== '') : undefined;
    const parsedTags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const payload: any = {
      paths: parsedPaths,
      service: { id: selectedServiceId }
    };
    if (name) payload.name = name;
    if (parsedHosts && parsedHosts.length > 0) payload.hosts = parsedHosts;
    if (methods.length > 0) payload.methods = methods;
    if (parsedTags.length > 0) payload.tags = parsedTags;

    try {
      await axios.post('/api/kong/routes', payload);
      setName('');
      setPaths('');
      setHosts('');
      setMethods([]);
      setTagsInput('');
      setShowAddForm(false);
      fetchRoutesAndServices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create route');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/routes/${id}`);
      fetchRoutesAndServices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete route');
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

  // Filtered routes
  const filteredRoutes = React.useMemo(() => {
    return routes.filter(route => {
      const nameMatch = (route.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = (route.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const hostMatch = route.hosts
        ? route.hosts.some(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
        : false;
      const matchesSearch = nameMatch || idMatch || hostMatch;

      const matchesTag = !selectedTag || (route.tags && route.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [routes, searchTerm, selectedTag]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Routes</h2>
          <p className="text-xs text-text-secondary mt-1">Routes define rules to match client requests and direct them to specific Services</p>
        </div>
        <button
          disabled={services.length === 0}
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD NEW ROUTE
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {services.length === 0 && !loading && (
        <div className="p-4 rounded border border-yellow-200 bg-yellow-50 text-yellow-800 text-xs font-semibold">
          Please add a Service first before creating a Route.
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4 animate-slideDown">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Route config</h3>
          <form onSubmit={handleAddRoute} className="space-y-4">
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
                <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. production, core, v1"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
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
                        className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors ${
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
                ADD ROUTE
              </button>
            </div>
          </form>
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {filteredRoutes.map((route) => {
                  const linkedSvc = services.find(s => s.id === route.service.id);
                  return (
                    <tr key={route.id} className="hover:bg-slate-50/25 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-indigo-50 text-indigo-600">
                            <GitBranch className="w-4 h-4" />
                          </div>
                          <div>
                            <Link to={`/routes/${route.id}`} className="font-bold text-sm block text-blue-600 hover:underline">
                              {route.name || 'Unnamed Route'}
                            </Link>
                            <span className="text-[10px] text-text-muted font-mono block select-all">{route.id}</span>
                            {route.tags && route.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {route.tags.map((tag, idx) => {
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
                        <Link to={`/services/${route.service.id}`} className="font-bold text-text-primary hover:text-brand-primary hover:underline">
                          {linkedSvc?.name || 'Service ID: ' + route.service.id.substring(0, 8) + '...'}
                        </Link>
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
                      <td className="px-6 py-4 text-text-secondary font-medium">
                        {new Date(route.created_at * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDeleteRoute(route.id)}
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
