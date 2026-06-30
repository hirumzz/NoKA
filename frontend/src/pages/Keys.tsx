import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Key, 
  AlertCircle,
  Search
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface KeyItem {
  id: string;
  name: string;
  set?: {
    id: string;
  };
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

export const Keys: React.FC = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    fetchKeys();
  }, [user?.node]);

  const fetchKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/keys');
      setKeys(response.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch keys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setError('');

    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');

    try {
      await axios.post('/api/kong/keys', {
        name,
        tags: parsedTags
      });
      setName('');
      setTagsInput('');
      setShowAddForm(false);
      fetchKeys();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this key?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/keys/${id}`);
      fetchKeys();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete key');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Keys</h2>
          <p className="text-xs text-text-secondary mt-1">Keys represent cryptographic credentials for signing and verification mechanisms</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setTagsInput('');
          }}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD KEY
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4 animate-slideDown">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Cryptographic Key</h3>
          <form onSubmit={handleAddKey} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Key Name / Alias</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. auth-jwt-key"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. jwt, auth, prod"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setTagsInput('');
                }}
                className="px-4 py-2 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs transition-colors"
              >
                ADD KEY
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {!loading && (keys.length > 0 || searchTerm || selectedTag) && (
          <div className="p-4 border-b border-border-light bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search keys by name, ID, or set ID..."
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
                {Array.from(new Set(keys.flatMap(k => k.tags || []))).sort().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading keys...
          </div>
        ) : keys.filter(k => {
          const searchMatch = !searchTerm || [
            k.name,
            k.id,
            k.set?.id
          ].some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));
          const tagMatch = !selectedTag || (k.tags && k.tags.includes(selectedTag));
          return searchMatch && tagMatch;
        }).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Set ID</th>
                  <th className="px-6 py-3.5">Tags</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {keys
                  .filter(k => {
                    const searchMatch = !searchTerm || [
                      k.name,
                      k.id,
                      k.set?.id
                    ].some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));
                    const tagMatch = !selectedTag || (k.tags && k.tags.includes(selectedTag));
                    return searchMatch && tagMatch;
                  })
                  .map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/25 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-orange-50 text-orange-600">
                            <Key className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-sm block">{k.name}</span>
                            <span className="text-[10px] text-text-muted font-mono block select-all">{k.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-text-secondary text-[11px]">
                        {k.set?.id ? k.set.id : <span className="text-text-muted italic">none</span>}
                      </td>
                      <td className="px-6 py-4">
                        {k.tags && k.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {k.tags.map((tag) => (
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
                        {new Date(k.created_at * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                            title="Delete Key"
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
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            {keys.length > 0 ? (
              <div className="space-y-3">
                <p>No keys match your search or filter criteria.</p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedTag(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-border-light rounded text-[10px] font-bold text-text-primary transition-colors"
                >
                  CLEAR FILTERS
                </button>
              </div>
            ) : (
              'No cryptographic keys found. Click "ADD KEY" to register credentials.'
            )}
          </div>
        )}
      </div>
    </div>
  );
};
