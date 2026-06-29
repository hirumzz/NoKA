import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Share2, 
  AlertCircle
} from 'lucide-react';

interface Upstream {
  id: string;
  name: string;
  algorithm: string;
  created_at: number;
}

export const Upstreams: React.FC = () => {
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [algorithm, setAlgorithm] = useState('round-robin');

  useEffect(() => {
    fetchUpstreams();
  }, []);

  const fetchUpstreams = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/upstreams');
      setUpstreams(response.data?.data || []);
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

    try {
      await axios.post('/api/kong/upstreams', {
        name,
        algorithm
      });
      setName('');
      setAlgorithm('round-robin');
      setShowAddForm(false);
      fetchUpstreams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create upstream');
    }
  };

  const handleDeleteUpstream = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this upstream?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/upstreams/${id}`);
      fetchUpstreams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete upstream');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Upstreams</h2>
          <p className="text-xs text-text-secondary mt-1">Upstream entities represent virtual hostnames that load balance incoming requests across multiple targets</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
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

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4 animate-slideDown">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Upstream Details</h3>
          <form onSubmit={handleAddUpstream} className="space-y-4">
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
                ADD UPSTREAM
              </button>
            </div>
          </form>
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Algorithm</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {upstreams.map((up) => (
                  <tr key={up.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-sky-50 text-sky-600">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div>
                          <Link to={`/upstreams/${up.id}`} className="font-bold text-sm block text-blue-600 hover:underline">
                            {up.name}
                          </Link>
                          <span className="text-[10px] text-text-muted font-mono block select-all">{up.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 text-[10px] font-bold uppercase">
                        {up.algorithm}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(up.created_at * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteUpstream(up.id)}
                          className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                          title="Delete Upstream"
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
            No upstreams found. Click "ADD UPSTREAM" to start configuring targets.
          </div>
        )}
      </div>
    </div>
  );
};
