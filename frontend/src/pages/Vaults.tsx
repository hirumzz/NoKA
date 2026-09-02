import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Lock, 
  AlertCircle,
  Search,
  X
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Pagination } from '../components/Pagination';

interface Vault {
  id: string;
  prefix: string;
  backend?: string;
  description?: string;
  tags?: string[];
  created_at: number;
}

const getTagBadgeStyle = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    'bg-amber-50 text-amber-700 border-amber-200/60',
    'bg-rose-50 text-rose-700 border-rose-200/60',
    'bg-sky-50 text-sky-700 border-sky-200/60',
    'bg-purple-50 text-purple-700 border-purple-200/60',
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const Vaults: React.FC = () => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [prefix, setPrefix] = useState('');
  const [backend, setBackend] = useState('env');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag]);

  useEffect(() => {
    fetchVaults();
  }, [user?.node]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddForm(false);
        setTagsInput('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchVaults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/vaults?size=1000');
      setVaults(response.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch vaults');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefix) return;
    setError('');

    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');

    try {
      await axios.post('/api/kong/vaults', {
        prefix,
        backend,
        description,
        tags: parsedTags
      });
      setPrefix('');
      setBackend('env');
      setDescription('');
      setTagsInput('');
      setShowAddForm(false);
      fetchVaults();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create vault');
    }
  };

  const handleDeleteVault = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Vault',
      message: 'Are you sure you want to delete this Kong Vault configuration? Any secrets stored in this backend might become inaccessible.',
      confirmText: 'Delete Vault',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`/api/kong/vaults/${id}`);
      fetchVaults();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete vault');
    }
  };

  const filteredVaults = vaults.filter(v => {
    const searchMatch = !searchTerm || [
      v.prefix,
      v.id,
      v.backend,
      v.description
    ].some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));
    const tagMatch = !selectedTag || (v.tags && v.tags.includes(selectedTag));
    return searchMatch && tagMatch;
  });

  const paginatedVaults = React.useMemo(() => {
    return filteredVaults.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredVaults, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Vaults</h2>
          <p className="text-xs text-text-secondary mt-1">Vaults allow you to store sensitive credentials (like API keys or passwords) securely</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD VAULT
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Add Vault Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onMouseDown={() => {
            setShowAddForm(false);
            setTagsInput('');
          }}
        >
          <div 
            className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-primary" />
                Add New Vault
              </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setTagsInput('');
                }} 
                className="p-1 rounded hover:bg-slate-100 text-text-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVault} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Prefix</label>
                  <input
                    type="text"
                    required
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. secret-env"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Backend</label>
                  <select
                    value={backend}
                    onChange={(e) => setBackend(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                  >
                    <option value="env">Environment Variables</option>
                    <option value="hcv">HashiCorp Vault</option>
                    <option value="aws">AWS Secrets Manager</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
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
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. env, production, secure"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-border-light mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setTagsInput('');
                  }}
                  className="px-4 py-2 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  ADD VAULT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {!loading && (vaults.length > 0 || searchTerm || selectedTag) && (
          <div className="p-4 border-b border-border-light bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search vaults by prefix, ID, backend, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary font-medium"
              />
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
              <span className="text-[10px] font-bold text-text-secondary uppercase whitespace-nowrap">Filter by Tag:</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-3 py-1.5 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary font-semibold text-text-primary min-w-[140px]"
              >
                <option value="">All Tags</option>
                {Array.from(new Set(vaults.flatMap(v => v.tags || []))).sort().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading vaults...
          </div>
        ) : filteredVaults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Prefix</th>
                  <th className="px-6 py-3.5">Backend</th>
                  <th className="px-6 py-3.5">Tags</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {paginatedVaults.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-red-50 text-red-600">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm block">{v.prefix}</span>
                          <span className="text-[10px] text-text-muted font-mono block select-all">{v.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-text-secondary text-[10px] font-bold uppercase">
                        {v.backend || 'env'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {v.tags && v.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {v.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all hover:opacity-85 cursor-pointer ${getTagBadgeStyle(tag)}`}
                              onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(v.created_at * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteVault(v.id)}
                          className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                          title="Delete Vault"
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
              totalItems={filteredVaults.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            {vaults.length > 0 ? (
              <div className="space-y-3">
                <p>No vaults match your search or filter criteria.</p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedTag(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-border-light rounded text-[10px] font-bold text-text-primary transition-colors"
                >
                  CLEAR FILTERS
                </button>
              </div>
            ) : (
              'No vaults found. Click "ADD VAULT" to register a secrets vault backend.'
            )}
          </div>
        )}
      </div>
    </div>
  );
};
