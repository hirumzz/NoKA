import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  User, 
  Search,
  X
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Pagination } from '../components/Pagination';

interface Consumer {
  id: string;
  username?: string;
  custom_id?: string;
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

export const Consumers: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [customId, setCustomId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [entityAuthors, setEntityAuthors] = useState<Record<string, any>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag]);

  useEffect(() => {
    fetchConsumers();
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

  const fetchConsumers = async () => {
    setLoading(true);
    try {
      const [response, authorResp] = await Promise.allSettled([
        axios.get('/api/kong/consumers?size=1000'),
        axios.get('/api/entity-authors')
      ]);

      if (response.status === 'fulfilled') {
        setConsumers(response.value.data?.data || []);
      }
      if (authorResp.status === 'fulfilled') {
        setEntityAuthors(authorResp.value.data?.data || {});
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to fetch consumers', 'Fetch Error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConsumer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username && !customId) {
      addToast('error', 'Either Username or Custom ID must be specified', 'Validation Error');
      return;
    }

    const parsedTags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const payload: any = {};
    if (username) payload.username = username;
    if (customId) payload.custom_id = customId;
    if (parsedTags.length > 0) payload.tags = parsedTags;

    try {
      await axios.post('/api/kong/consumers', payload);
      setUsername('');
      setCustomId('');
      setTagsInput('');
      setShowAddForm(false);
      addToast('success', 'Consumer has been successfully created', 'Success');
      fetchConsumers();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to create consumer', 'Error');
    }
  };

  const handleDeleteConsumer = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Consumer',
      message: 'Are you sure you want to delete this consumer? All associated credentials and ACL groups will also be deleted.',
      confirmText: 'Delete Consumer',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/kong/consumers/${id}`);
      addToast('success', 'Consumer deleted successfully', 'Success');
      fetchConsumers();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete consumer', 'Error');
    }
  };

  // Extract unique tags
  const uniqueTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    consumers.forEach(c => {
      if (c.tags) {
        c.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [consumers]);

  // Filtered consumers
  const filteredConsumers = React.useMemo(() => {
    return consumers.filter(consumer => {
      const matchesSearch = 
        consumer.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        consumer.custom_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consumer.id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = selectedTag ? consumer.tags?.includes(selectedTag) : true;
      
      return matchesSearch && matchesTag;
    }).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [consumers, searchTerm, selectedTag]);

  const paginatedConsumers = React.useMemo(() => {
    return filteredConsumers.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredConsumers, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">Consumers</h2>
          <p className="text-xs text-text-secondary mt-0.5">Consumers represent downstream clients or developers consuming your API gateway services</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD CONSUMER
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onMouseDown={() => setShowAddForm(false)}
        >
          <div 
            className="bg-white w-full max-w-xl max-h-[85vh] rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                ADD NEW CONSUMER
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
            <form onSubmit={handleAddConsumer} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. client-application-abc"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Custom ID (optional)</label>
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="e.g. external-client-uuid-123"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>

                <div className="space-y-1">
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
                  ADD CONSUMER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consumers List Table */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {/* Search and Filter Toolbar */}
        <div className="p-4 bg-slate-50/50 border-b border-border-light flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search by username, ID, or custom ID..."
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
            Loading consumers...
          </div>
        ) : filteredConsumers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Consumer</th>
                  <th className="px-6 py-3.5">Username</th>
                  <th className="px-6 py-3.5">Custom ID</th>
                  <th className="px-6 py-3.5">Created By</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5">Updated By</th>
                  <th className="px-6 py-3.5">Updated At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {paginatedConsumers.map((c) => {
                  const authorInfo = entityAuthors[c.id];
                  const creator = authorInfo?.created_by_username && authorInfo.created_by_username !== '-'
                    ? authorInfo.created_by_username
                    : null;
                  const updater = authorInfo?.updated_by_username && authorInfo.updated_by_username !== '-'
                    ? authorInfo.updated_by_username
                    : null;
                  const updatedAt = authorInfo?.updatedAt ? new Date(authorInfo.updatedAt).getTime() / 1000 : null;

                  const normalTags = (c.tags || []).filter((t: string) =>
                    !t.startsWith('noka-desc:') &&
                    !t.startsWith('noka-creator:') &&
                    !t.startsWith('noka-updated-by:') &&
                    !t.startsWith('noka-updated-at:')
                  );

                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/consumers/${c.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-amber-50 text-amber-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <Link to={`/consumers/${c.id}`} className="font-bold text-sm block text-blue-600 hover:underline">
                              {c.username || c.custom_id || 'Unnamed'}
                            </Link>
                            <span className="text-[10px] text-text-muted font-mono block select-all">{c.id}</span>
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
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-text-secondary">
                        {c.username || <span className="text-text-muted italic">not set</span>}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-text-secondary">
                        {c.custom_id || <span className="text-text-muted italic">not set</span>}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-text-primary whitespace-nowrap">
                        {creator || '-'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-text-muted whitespace-nowrap">
                        {new Date(c.created_at * 1000).toLocaleDateString()} {new Date(c.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                            onClick={(e) => { e.stopPropagation(); handleDeleteConsumer(c.id); }}
                            className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                            title="Delete Consumer"
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
            <Pagination
              currentPage={currentPage}
              totalItems={filteredConsumers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : consumers.length > 0 ? (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No consumers match your search or filter criteria.
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No consumers found. Click "ADD CONSUMER" to register client credentials.
          </div>
        )}
      </div>
    </div>
  );
};
