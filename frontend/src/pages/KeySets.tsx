import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Layers, 
  AlertCircle
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface KeySet {
  id: string;
  name: string;
  created_at: number;
}

export const KeySets: React.FC = () => {
  const { user } = useAuth();
  const [keySets, setKeySets] = useState<KeySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [name, setName] = useState('');

  useEffect(() => {
    fetchKeySets();
  }, [user?.node]);

  const fetchKeySets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/key-sets');
      setKeySets(response.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch key sets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeySet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setError('');

    try {
      await axios.post('/api/kong/key-sets', {
        name
      });
      setName('');
      setShowAddForm(false);
      fetchKeySets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create key set');
    }
  };

  const handleDeleteKeySet = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this key set?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/key-sets/${id}`);
      fetchKeySets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete key set');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Key Sets</h2>
          <p className="text-xs text-text-secondary mt-1">Key sets allow grouping multiple cryptographic keys to organize and rotate configurations easily</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD KEY SET
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
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Key Set Group</h3>
          <form onSubmit={handleAddKeySet} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Key Set Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. production-rotating-keys"
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
                ADD KEY SET
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading key sets...
          </div>
        ) : keySets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {keySets.map((ks) => (
                  <tr key={ks.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-indigo-50 text-indigo-600">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm block">{ks.name}</span>
                          <span className="text-[10px] text-text-muted font-mono block select-all">{ks.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(ks.created_at * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteKeySet(ks.id)}
                          className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                          title="Delete Key Set"
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
            No key sets found. Click "ADD KEY SET" to group keys.
          </div>
        )}
      </div>
    </div>
  );
};
