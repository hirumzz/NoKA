import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Share2, 
  AlertCircle,
  Search,
  X
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Pagination } from '../components/Pagination';

interface Upstream {
  id: string;
  name: string;
  algorithm: string;
  created_at: number;
  tags?: string[];
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

export const Upstreams: React.FC = () => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [algorithm, setAlgorithm] = useState('round-robin');
  const [slots, setSlots] = useState(10000);
  const [hashOn, setHashOn] = useState('none');
  const [hashFallback, setHashFallback] = useState('none');
  const [hashOnHeader, setHashOnHeader] = useState('');
  const [hashFallbackHeader, setHashFallbackHeader] = useState('');
  const [hashOnCookie, setHashOnCookie] = useState('');
  const [hashOnCookiePath, setHashOnCookiePath] = useState('/');
  const [tagsInput, setTagsInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [entityAuthors, setEntityAuthors] = useState<Record<string, any>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag]);

  useEffect(() => {
    fetchUpstreams();
  }, [user?.node]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchUpstreams = async () => {
    setLoading(true);
    setError('');
    try {
      const [response, authorResp] = await Promise.allSettled([
        axios.get('/api/kong/upstreams?size=1000'),
        axios.get('/api/entity-authors')
      ]);

      if (response.status === 'fulfilled') {
        setUpstreams(response.value.data?.data || []);
      }
      if (authorResp.status === 'fulfilled') {
        setEntityAuthors(authorResp.value.data?.data || {});
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch upstreams');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpstream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setError('');

    const payload: any = {
      name,
      algorithm,
      slots: Number(slots),
      hash_on: hashOn,
      hash_fallback: hashFallback,
      hash_on_header: hashOnHeader || undefined,
      hash_fallback_header: hashFallbackHeader || undefined,
      hash_on_cookie: hashOnCookie || undefined,
      hash_on_cookie_path: hashOnCookiePath || undefined
    };
    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (parsedTags.length > 0) {
      payload.tags = parsedTags;
    }

    try {
      await axios.post('/api/kong/upstreams', payload);
      setName('');
      setAlgorithm('round-robin');
      setSlots(10000);
      setHashOn('none');
      setHashFallback('none');
      setHashOnHeader('');
      setHashFallbackHeader('');
      setHashOnCookie('');
      setHashOnCookiePath('/');
      setTagsInput('');
      setShowAddForm(false);
      fetchUpstreams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create upstream');
    }
  };

  const handleDeleteUpstream = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Upstream',
      message: 'Are you sure you want to delete this upstream? All attached targets and ring balancer configurations will be removed.',
      confirmText: 'Delete Upstream',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`/api/kong/upstreams/${id}`);
      fetchUpstreams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete upstream');
    }
  };

  const uniqueTags = Array.from(
    new Set(
      upstreams.flatMap(up => up.tags || [])
    )
  ).sort();

  const filteredUpstreams = upstreams.filter(upstream => {
    const matchesSearch = 
      upstream.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      upstream.id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = selectedTag ? upstream.tags?.includes(selectedTag) : true;
    
    return matchesSearch && matchesTag;
  }).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  const paginatedUpstreams = React.useMemo(() => {
    return filteredUpstreams.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredUpstreams, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">Upstreams</h2>
          <p className="text-xs text-text-secondary mt-0.5">Upstream entities represent virtual hostnames that load balance incoming requests across multiple targets</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD UPSTREAM
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onMouseDown={() => setShowAddForm(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                ADD NEW UPSTREAM
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="p-1 rounded hover:bg-slate-100 text-text-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddUpstream} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Upstream Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. backend-load-balancer"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Load Balancing Algorithm</label>
                    <select
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                    >
                      <option value="round-robin">Round Robin</option>
                      <option value="least-connections">Least Connections</option>
                      <option value="consistent-hashing">Consistent Hashing</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Slots</label>
                    <input
                      type="number"
                      value={slots}
                      onChange={(e) => setSlots(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Hash On</label>
                    <select
                      value={hashOn}
                      onChange={(e) => setHashOn(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                    >
                      <option value="none">None</option>
                      <option value="consumer">Consumer</option>
                      <option value="ip">IP</option>
                      <option value="header">Header</option>
                      <option value="cookie">Cookie</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Hash Fallback</label>
                    <select
                      value={hashFallback}
                      onChange={(e) => setHashFallback(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                    >
                      <option value="none">None</option>
                      <option value="consumer">Consumer</option>
                      <option value="ip">IP</option>
                      <option value="header">Header</option>
                      <option value="cookie">Cookie</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Hash On Header</label>
                    <input
                      type="text"
                      value={hashOnHeader}
                      onChange={(e) => setHashOnHeader(e.target.value)}
                      placeholder="e.g. x-custom-header"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Hash Fallback Header</label>
                    <input
                      type="text"
                      value={hashFallbackHeader}
                      onChange={(e) => setHashFallbackHeader(e.target.value)}
                      placeholder="e.g. x-custom-header"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Hash On Cookie</label>
                    <input
                      type="text"
                      value={hashOnCookie}
                      onChange={(e) => setHashOnCookie(e.target.value)}
                      placeholder="e.g. session_id"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Hash On Cookie Path</label>
                    <input
                      type="text"
                      value={hashOnCookiePath}
                      onChange={(e) => setHashOnCookiePath(e.target.value)}
                      placeholder="e.g. /"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. staging, api, secure"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-2 justify-end px-6 py-4 border-t border-border-light bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded border border-border-light hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  ADD UPSTREAM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filter Panel */}
      {upstreams.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-border-light shadow-sm">
          <div className="relative flex-1 w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search upstreams by name or ID..."
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

      {/* Upstreams List Table */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading upstreams...
          </div>
        ) : upstreams.length > 0 ? (
          <div className="overflow-x-auto">
            {filteredUpstreams.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Algorithm</th>
                    <th className="px-6 py-3.5">Created By</th>
                    <th className="px-6 py-3.5">Created At</th>
                    <th className="px-6 py-3.5">Updated By</th>
                    <th className="px-6 py-3.5">Updated At</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                  {paginatedUpstreams.map((upstream) => {
                    const authorInfo = entityAuthors[upstream.id];
                    const creator = authorInfo?.created_by_username && authorInfo.created_by_username !== '-'
                      ? authorInfo.created_by_username
                      : null;
                    const updater = authorInfo?.updated_by_username && authorInfo.updated_by_username !== '-'
                      ? authorInfo.updated_by_username
                      : null;
                    const updatedAt = authorInfo?.updatedAt ? new Date(authorInfo.updatedAt).getTime() / 1000 : null;

                    const normalTags = (upstream.tags || []).filter((t: string) =>
                      !t.startsWith('noka-desc:') &&
                      !t.startsWith('noka-creator:') &&
                      !t.startsWith('noka-updated-by:') &&
                      !t.startsWith('noka-updated-at:')
                    );

                    return (
                      <tr 
                        key={upstream.id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/upstreams/${upstream.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-sky-50 text-sky-600">
                              <Share2 className="w-4 h-4" />
                            </div>
                            <div>
                              <Link to={`/upstreams/${upstream.id}`} className="font-bold text-sm block text-blue-600 hover:underline">
                                {upstream.name}
                              </Link>
                              <span className="text-[10px] text-text-muted font-mono block select-all">{upstream.id}</span>
                              {normalTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5 max-w-xs">
                                  {normalTags.map(t => {
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
                          <span className="px-2.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 text-[10px] font-bold uppercase">
                            {upstream.algorithm}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-text-primary whitespace-nowrap">
                          {creator || '-'}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-medium text-text-muted whitespace-nowrap">
                          {new Date(upstream.created_at * 1000).toLocaleDateString()} {new Date(upstream.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-text-primary whitespace-nowrap">
                          {updater || '-'}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-medium text-text-muted whitespace-nowrap">
                          {updatedAt ? `${new Date(updatedAt * 1000).toLocaleDateString()} ${new Date(updatedAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteUpstream(upstream.id); }}
                              className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                              title="Delete Upstream"
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
                No upstreams match your search and filter criteria.
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredUpstreams.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No upstreams found. Click "ADD UPSTREAM" to start configuring targets.
          </div>
        )}
      </div>
    </div>
  );
};
