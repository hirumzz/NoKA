import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Layers, 
  AlertCircle
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  path: string;
  created_at: number;
}

export const Services: React.FC = () => {
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

  useEffect(() => {
    fetchServices();
  }, []);

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

    try {
      await axios.post('/api/kong/services', payload);
      setName('');
      setUrl('');
      setHost('');
      setPort(80);
      setProtocol('http');
      setPath('');
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
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading services...
          </div>
        ) : services.length > 0 ? (
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
                {services.map((svc) => (
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
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No services found. Click "ADD NEW SERVICE" to proxy a service.
          </div>
        )}
      </div>
    </div>
  );
};
