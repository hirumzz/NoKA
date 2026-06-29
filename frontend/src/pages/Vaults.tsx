import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Lock, 
  AlertCircle
} from 'lucide-react';

interface Vault {
  id: string;
  prefix: string;
  description?: string;
  created_at: number;
}

export const Vaults: React.FC = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [prefix, setPrefix] = useState('');
  const [backend, setBackend] = useState('env');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchVaults();
  }, []);

  const fetchVaults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/vaults');
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

    try {
      await axios.post('/api/kong/vaults', {
        prefix,
        backend,
        description
      });
      setPrefix('');
      setBackend('env');
      setDescription('');
      setShowAddForm(false);
      fetchVaults();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create vault');
    }
  };

  const handleDeleteVault = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vault?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/vaults/${id}`);
      fetchVaults();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete vault');
    }
  };

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

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4 animate-slideDown">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Vault Details</h3>
          <form onSubmit={handleAddVault} className="space-y-4">
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
                ADD VAULT
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading vaults...
          </div>
        ) : vaults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Prefix</th>
                  <th className="px-6 py-3.5">Backend</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {vaults.map((v) => (
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
                        {v.prefix}
                      </span>
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
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No vaults found. Click "ADD VAULT" to register a secrets vault backend.
          </div>
        )}
      </div>
    </div>
  );
};
