import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Layers, 
  AlertCircle,
  Search
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface Service {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  path: string;
  created_at: number;
  tags?: string[];
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

export const Services: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(80);
  const [protocol, setProtocol] = useState('http');
  const [path, setPath] = useState('');
  const [useUrlField, setUseUrlField] = useState(true);
  const [tagsInput, setTagsInput] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    fetchServices();
  }, [user?.node]);

  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/services');
      // Kong returns services inside a "data" array
      setServices(response.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch services. Make sure a connection is selected and active.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedTags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const payload: any = { name };
    if (useUrlField) {
      if (!url) return;
      payload.url = url;
    } else {
      if (!host) return;
      payload.host = host;
      payload.port = Number(port);
      payload.protocol = protocol;
      payload.path = path;
    }
    if (parsedTags.length > 0) {
      payload.tags = parsedTags;
    }

    try {
      await axios.post('/api/kong/services', payload);
      setName('');
      setUrl('');
      setHost('');
      setPort(80);
      setProtocol('http');
      setPath('');
      setTagsInput('');
      setShowAddForm(false);
      fetchServices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create service');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service? This will delete all associated routes.')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/services/${id}`);
      fetchServices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete service');
    }
  };

  // Extract unique tags
  const uniqueTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    services.forEach(svc => {
      if (svc.tags) {
        svc.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [services]);

  // Filtered services
  const filteredServices = React.useMemo(() => {
    return services.filter(svc => {
      const nameMatch = (svc.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = (svc.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const hostMatch = (svc.host || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = nameMatch || idMatch || hostMatch;

      const matchesTag = !selectedTag || (svc.tags && svc.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [services, searchTerm, selectedTag]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Services</h2>
          <p className="text-xs text-text-secondary mt-1">Services represent your upstream APIs and microservices managed by Kong</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD NEW SERVICE
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
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Service details</h3>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Service Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. users-api"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      checked={useUrlField}
                      onChange={() => setUseUrlField(true)}
                      className="mr-1.5 accent-brand-primary"
                    />
                    Use URL shorthand
                  </label>
                  <label className="flex items-center text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      checked={!useUrlField}
                      onChange={() => setUseUrlField(false)}
                      className="mr-1.5 accent-brand-primary"
                    />
                    Specify host components
                  </label>
                </div>

                {useUrlField ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Full Service URL</label>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="e.g. http://my-microservice.internal:8080/v1"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">Host</label>
                      <input
                        type="text"
                        required
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        placeholder="e.g. users-service.local"
                        className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">Port</label>
                      <input
                        type="number"
                        required
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                        placeholder="80"
                        className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">Protocol</label>
                      <select
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value)}
                        className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                        <option value="grpc">gRPC</option>
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-4">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">Path</label>
                      <input
                        type="text"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="e.g. /v1 (optional)"
                        className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>
                )}
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
                ADD SERVICE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List Table */}
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
            Loading services...
          </div>
        ) : filteredServices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Target Upstream</th>
                  <th className="px-6 py-3.5">Protocol</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {filteredServices.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-emerald-50 text-emerald-600">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <Link to={`/services/${svc.id}`} className="font-bold text-sm block text-blue-600 hover:underline">
                            {svc.name || 'Unnamed'}
                          </Link>
                          <span className="text-[10px] text-text-muted font-mono block select-all">{svc.id}</span>
                          {svc.tags && svc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {svc.tags.map((tag, idx) => {
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
                      <span className="font-mono text-xs font-medium">
                        {svc.host}:{svc.port}
                        {svc.path && <span className="text-text-muted">{svc.path}</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-600 text-[10px] font-bold uppercase">
                        {svc.protocol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(svc.created_at * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteService(svc.id)}
                          className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                          title="Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : services.length > 0 ? (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No services match your search or filter criteria.
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No services found. Click "ADD NEW SERVICE" to proxy a service.
          </div>
        )}
      </div>
    </div>
  );
};
