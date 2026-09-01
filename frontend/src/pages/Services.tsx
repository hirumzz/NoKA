import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Layers, 
  Search,
  Activity,
  CheckCircle, 
  XCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Pagination } from '../components/Pagination';

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
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [reachabilityStatus, setReachabilityStatus] = useState<Record<string, { status: 'checking' | 'reachable' | 'unreachable', message: string, code?: number }>>({});

  // Form fields
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(80);
  const [protocol, setProtocol] = useState('http');
  const [path, setPath] = useState('');
  const [useUrlField, setUseUrlField] = useState(true);
  const [tagsInput, setTagsInput] = useState('');
  
  const [description, setDescription] = useState('');
  const [retries, setRetries] = useState(5);
  const [connectTimeout, setConnectTimeout] = useState(60000);
  const [writeTimeout, setWriteTimeout] = useState(60000);
  const [readTimeout, setReadTimeout] = useState(60000);
  const [clientCertificateId, setClientCertificateId] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [terminatedServiceIds, setTerminatedServiceIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag]);

  useEffect(() => {
    fetchServices();
  }, [user?.node]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddForm) {
        setShowAddForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm]);



  const fetchServices = async () => {
    setLoading(true);
    try {
      const [svcResp, pluginResp] = await Promise.allSettled([
        axios.get('/api/kong/services?size=1000'),
        axios.get('/api/kong/plugins?size=1000')
      ]);

      if (svcResp.status === 'fulfilled') {
        setServices(svcResp.value.data?.data || []);
      }
      if (pluginResp.status === 'fulfilled') {
        const pList = pluginResp.value.data?.data || [];
        const tIds = new Set<string>();
        pList.forEach((p: any) => {
          if (p.name === 'request-termination' && p.enabled !== false && p.service?.id) {
            tIds.add(p.service.id);
          }
        });
        setTerminatedServiceIds(tIds);
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to fetch services', 'Fetch Error');
      console.error(err);
    } finally {
      setLoading(false);
    }

    // Fetch reachability in background asynchronously without blocking UI render
    fetchReachability();
  };

  const fetchReachability = async () => {
    try {
      const reachResp = await axios.get('/api/reachability');
      const statuses: Record<string, any> = {};
      const statusData = reachResp.data?.data || [];
      statusData.forEach((r: any) => {
        if (r.entity_type === 'service') {
          statuses[r.entity_id] = {
            status: r.status,
            message: r.message,
            code: r.status_code
          };
        }
      });
      setReachabilityStatus(statuses);
    } catch (err) {
      console.error('Failed to fetch reachability:', err);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    try {
      await axios.post('/api/reachability/refresh');
      addToast('success', 'Reachability checks triggered successfully', 'Status Refresh');
      // Wait a moment for checks to finish, then reload
      setTimeout(() => {
        fetchServices();
        setRefreshingAll(false);
      }, 3000);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to refresh statuses', 'Refresh Error');
      setRefreshingAll(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();

    let parsedTags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    if (description) {
      parsedTags.push(`noka-desc:${description}`);
    }

    const payload: any = { name };
    if (useUrlField) {
      if (!url) return;
      payload.url = url;
    } else {
      if (!host) return;
      payload.host = host;
      payload.port = Number(port);
      payload.protocol = protocol;
      if (path) payload.path = path;
    }

    if (parsedTags.length > 0) {
      payload.tags = parsedTags;
    }

    payload.retries = Number(retries);
    payload.connect_timeout = Number(connectTimeout);
    payload.write_timeout = Number(writeTimeout);
    payload.read_timeout = Number(readTimeout);
    if (clientCertificateId) payload.client_certificate = { id: clientCertificateId };

    try {
      await axios.post('/api/kong/services', payload);
      setName('');
      setUrl('');
      setHost('');
      setPort(80);
      setProtocol('http');
      setPath('');
      setTagsInput('');
      setDescription('');
      setRetries(5);
      setConnectTimeout(60000);
      setWriteTimeout(60000);
      setReadTimeout(60000);
      setClientCertificateId('');
      setClientCertificateId('');
      setShowAddForm(false);
      addToast('success', 'Service has been successfully created', 'Success');
      fetchServices();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to create service', 'Error');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete(`/api/kong/services/${id}`);
      addToast('success', 'Service deleted successfully', 'Success');
      fetchServices();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete service', 'Error');
    }
  };

  const handleCheckReachability = async (id: string) => {
    setReachabilityStatus(prev => ({ ...prev, [id]: { status: 'checking', message: 'Checking...' } }));
    try {
      const response = await axios.get(`/api/kong/services/${id}/check-reachability`);
      const { reachable, statusCode, message } = response.data;
      setReachabilityStatus(prev => ({
        ...prev,
        [id]: {
          status: reachable ? 'reachable' : 'unreachable',
          message: message || '',
          code: statusCode
        }
      }));
    } catch (err: any) {
      setReachabilityStatus(prev => ({
        ...prev,
        [id]: { status: 'unreachable', message: err.response?.data?.message || 'Check failed' }
      }));
    }
  };

  // Extract unique tags
  const uniqueTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    services.forEach(svc => {
      if (svc.tags) {
        svc.tags.forEach(tag => {
          if (!tag.startsWith('noka-desc:')) {
            tagsSet.add(tag);
          }
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [services]);

  // Filtered services (sorted by created_at desc - newest first)
  const filteredServices = React.useMemo(() => {
    const filtered = services.filter(svc => {
      const nameMatch = (svc.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = (svc.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const hostMatch = (svc.host || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = nameMatch || idMatch || hostMatch;

      const matchesTag = !selectedTag || (svc.tags && svc.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });

    return filtered.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [services, searchTerm, selectedTag]);

  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">Services</h2>
          <p className="text-xs text-text-secondary mt-0.5">Services represent your upstream APIs and microservices managed by Kong</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD NEW SERVICE
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}
        >
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-light flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">ADD NEW SERVICE</h3>
                <p className="text-xs text-text-secondary mt-0.5">Configure upstream service parameters and connection timeouts</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddService} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
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

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Description</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
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
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Write Timeout (ms)</label>
                    <input
                      type="number"
                      value={writeTimeout}
                      onChange={(e) => setWriteTimeout(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Read Timeout (ms)</label>
                    <input
                      type="number"
                      value={readTimeout}
                      onChange={(e) => setReadTimeout(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Client Certificate ID</label>
                    <input
                      type="text"
                      value={clientCertificateId}
                      onChange={(e) => setClientCertificateId(e.target.value)}
                      placeholder="Optional UUID"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-border-light flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded border border-border-light hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  ADD SERVICE
                </button>
              </div>
            </form>
          </div>
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

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-light hover:border-brand-primary text-text-secondary hover:text-brand-primary rounded shadow-sm text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingAll ? 'animate-spin' : ''}`} />
              {refreshingAll ? 'Refreshing...' : 'Refresh All Status'}
            </button>
            <div className="h-5 w-px bg-border-light mx-1"></div>
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
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {paginatedServices.map((svc) => (
                  <tr 
                    key={svc.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/services/${svc.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-emerald-50 text-emerald-600">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link to={`/services/${svc.id}`} className="font-bold text-sm block text-blue-600 hover:underline">
                              {svc.name || 'Unnamed'}
                            </Link>
                            {terminatedServiceIds.has(svc.id) && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-700 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
                                🚫 Terminated
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-text-muted font-mono block select-all">{svc.id}</span>
                          {(() => {
                            let description = '';
                            let normalTags: string[] = [];
                            if (svc.tags) {
                              const descTag = svc.tags.find((t: string) => t.startsWith('noka-desc:'));
                              if (descTag) description = descTag.substring('noka-desc:'.length);
                              normalTags = svc.tags.filter((t: string) => !t.startsWith('noka-desc:'));
                            }
                            return (
                              <>
                                {description && (
                                  <div className="text-xs text-text-secondary mt-1">{description}</div>
                                )}
                                {normalTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {normalTags.map((tag, idx) => {
                                      const style = getTagStyle(tag);
                                      return (
                                        <span key={`${tag}-${idx}`} className={`px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border} text-[10px] font-semibold`}>
                                          {tag}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-medium">
                          {svc.host}:{svc.port}
                          {svc.path && <span className="text-text-muted">{svc.path}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-600 text-[10px] font-bold uppercase">
                        {svc.protocol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {reachabilityStatus[svc.id] ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                          {reachabilityStatus[svc.id].status === 'checking' && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                              Checking...
                            </span>
                          )}
                          {reachabilityStatus[svc.id].status === 'reachable' && (
                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title={reachabilityStatus[svc.id].message}>
                              <CheckCircle className="w-3 h-3" /> Online
                            </span>
                          )}
                          {reachabilityStatus[svc.id].status === 'unreachable' && (
                            <span className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200" title={reachabilityStatus[svc.id].message}>
                              <XCircle className="w-3 h-3" /> Unreachable
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCheckReachability(svc.id); }}
                          className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Check Upstream Reachability"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(svc.created_at * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteService(svc.id); }}
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
            <Pagination
              currentPage={currentPage}
              totalItems={filteredServices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
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
