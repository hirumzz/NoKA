import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Cpu, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Server
} from 'lucide-react';
import { CommentsSection } from '../components/CommentsSection';


interface KongUpstream {
  id: string;
  name: string;
  algorithm: string;
  slots: number;
  hash_on: string;
  hash_fallback: string;
  hash_on_header?: string;
  hash_fallback_header?: string;
  hash_on_cookie?: string;
  hash_on_cookie_path?: string;
  tags?: string[];
}

interface KongTarget {
  id: string;
  target: string;
  weight: number;
  created_at: number;
}

export const UpstreamDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [upstream, setUpstream] = useState<KongUpstream | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'targets'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');



  // Upstream fields
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

  // Sub-resource list states
  const [targets, setTargets] = useState<KongTarget[]>([]);

  // Add target Form fields
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetAddress, setTargetAddress] = useState('');
  const [targetWeight, setTargetWeight] = useState(100);

  useEffect(() => {
    fetchUpstreamDetails();
  }, [id]);

  const fetchUpstreamDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/kong/upstreams/${id}`);
      const data = response.data;
      setUpstream(data);
      setName(data.name || '');
      setAlgorithm(data.algorithm || 'round-robin');
      setSlots(data.slots || 10000);
      setHashOn(data.hash_on || 'none');
      setHashFallback(data.hash_fallback || 'none');
      setHashOnHeader(data.hash_on_header || '');
      setHashFallbackHeader(data.hash_fallback_header || '');
      setHashOnCookie(data.hash_on_cookie || '');
      setHashOnCookiePath(data.hash_on_cookie_path || '/');
      setTagsInput(data.tags ? data.tags.join(', ') : '');

      // Fetch targets
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch upstream details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubResources = async () => {
    try {
      const response = await axios.get(`/api/kong/upstreams/${id}/targets`);
      // Kong returns targets in a data array
      setTargets(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch targets:', err);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const parsedTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
      const payload: any = {};
      const changedFields: string[] = [];

      if ((name || '') !== (upstream?.name || '')) { payload.name = name || null; changedFields.push('name'); }
      if (algorithm !== (upstream?.algorithm || 'round-robin')) { payload.algorithm = algorithm; changedFields.push('algorithm'); }
      if (Number(slots) !== (upstream?.slots || 10000)) { payload.slots = Number(slots); changedFields.push('slots'); }
      if (hashOn !== (upstream?.hash_on || 'none')) { payload.hash_on = hashOn; changedFields.push('hash_on'); }
      if (hashFallback !== (upstream?.hash_fallback || 'none')) { payload.hash_fallback = hashFallback; changedFields.push('hash_fallback'); }
      if ((hashOnHeader || '') !== (upstream?.hash_on_header || '')) { payload.hash_on_header = hashOnHeader || null; changedFields.push('hash_on_header'); }
      if ((hashFallbackHeader || '') !== (upstream?.hash_fallback_header || '')) { payload.hash_fallback_header = hashFallbackHeader || null; changedFields.push('hash_fallback_header'); }
      if ((hashOnCookie || '') !== (upstream?.hash_on_cookie || '')) { payload.hash_on_cookie = hashOnCookie || null; changedFields.push('hash_on_cookie'); }
      if ((hashOnCookiePath || '') !== (upstream?.hash_on_cookie_path || '/')) { payload.hash_on_cookie_path = hashOnCookiePath || null; changedFields.push('hash_on_cookie_path'); }

      const originalTags = upstream?.tags || [];
      if (JSON.stringify([...parsedTags].sort()) !== JSON.stringify([...originalTags].sort())) {
        payload.tags = parsedTags; changedFields.push('tags');
      }

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes detected.');
        return;
      }

      await axios.patch(`/api/kong/upstreams/${id}`, payload, {
        headers: { 'X-Noka-Changed-Fields': changedFields.join(', ') }
      });
      setSuccess('Upstream load balancing parameters updated successfully!');
      fetchUpstreamDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update upstream');
    }
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAddress) return;
    setError('');

    try {
      await axios.post(`/api/kong/upstreams/${id}/targets`, {
        target: targetAddress,
        weight: Number(targetWeight)
      });
      setTargetAddress('');
      setTargetWeight(100);
      setShowAddForm(false);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add target');
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!window.confirm('Are you sure you want to remove this target backend?')) return;
    setError('');
    try {
      // In Kong, to delete a target we hit DELETE /upstreams/:id/targets/:target_id
      await axios.delete(`/api/kong/upstreams/${id}/targets/${targetId}`);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete target');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
        Loading upstream details...
      </div>
    );
  }

  if (!upstream) {
    return (
      <div className="p-6 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        Upstream load balancer not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <Link to="/upstreams" className="p-2 rounded border border-border-light hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-primary" /> 
            {upstream.name || 'Unnamed Upstream'}
          </h2>
          <span className="text-[10px] text-text-muted font-mono font-medium block mt-0.5">Upstream ID: {upstream.id}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-colors ${
              activeTab === 'details' ? 'bg-brand-primary text-white' : 'bg-transparent text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            <AlertCircle className="w-4 h-4" /> Upstream Details
          </button>
          <button
            onClick={() => setActiveTab('targets')}
            className={`flex items-center gap-3 px-4 py-3 rounded text-xs font-bold transition-colors ${
              activeTab === 'targets' ? 'bg-brand-primary text-white' : 'bg-transparent text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            <Server className="w-4 h-4" /> Targets
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 min-w-0">

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Update Upstream Load-Balancer Properties</h3>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Upstream Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. backend-servers"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Algorithm</label>
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
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Hash On</label>
                  <select
                    value={hashOn}
                    onChange={(e) => setHashOn(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold"
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
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold"
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
                    placeholder="/"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Tags</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. production, api (comma-separated)"
                    className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs uppercase hover:bg-brand-primary-hover shadow-sm"
              >
                Submit Changes
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
            <CommentsSection referenceId={upstream.id} referenceType="upstream" referenceName={upstream.name || upstream.id} />
          </div>
        </div>
      )}

      {/* Tab: Targets */}
      {activeTab === 'targets' && (
        <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Load-Balancing Targets</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center px-3 py-1.5 rounded bg-brand-primary text-white font-bold text-[10px] hover:bg-brand-primary-hover shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> ADD TARGET
            </button>
          </div>

          {showAddForm && (
            <div className="p-6 bg-slate-50 border-b border-border-light animate-slideDown">
              <form onSubmit={handleAddTarget} className="flex flex-col md:flex-row gap-4 items-end max-w-2xl">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Target Address (host:port)</label>
                  <input
                    type="text"
                    required
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="e.g. 192.168.1.100:8080"
                    className="w-full px-3 py-2 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Weight</label>
                  <input
                    type="number"
                    required
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary font-medium"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded border border-border-light bg-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs uppercase hover:bg-brand-primary-hover shadow-sm"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          )}

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase">
                <th className="px-6 py-3.5">Target Address</th>
                <th className="px-6 py-3.5">Weight</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5 width-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light font-semibold text-text-primary">
              {targets.length > 0 ? (
                targets.map(target => (
                  <tr key={target.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-text-secondary">
                      {target.target}
                      <span className="text-[9px] text-text-muted block font-mono mt-0.5">ID: {target.id}</span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {target.weight}
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(target.created_at * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteTarget(target.id)}
                        className="p-1 rounded text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-text-muted italic">
                    No backend targets configured. Add a target to distribute traffic.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
