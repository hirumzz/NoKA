import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Award, 
  AlertCircle
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface Certificate {
  id: string;
  cert: string;
  key: string;
  snis?: string[];
  created_at: number;
}

export const Certificates: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [cert, setCert] = useState('');
  const [key, setKey] = useState('');
  const [snis, setSnis] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, [user?.node]);

  const fetchCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/certificates');
      setCertificates(response.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch certificates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cert || !key) return;
    setError('');

    const parsedSnis = snis ? snis.split(',').map(s => s.trim()).filter(s => s !== '') : undefined;

    try {
      await axios.post('/api/kong/certificates', {
        cert,
        key,
        snis: parsedSnis
      });
      setCert('');
      setKey('');
      setSnis('');
      setShowAddForm(false);
      fetchCertificates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add certificate');
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this SSL certificate?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/certificates/${id}`);
      fetchCertificates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete certificate');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Certificates</h2>
          <p className="text-xs text-text-secondary mt-1">Upload and manage SSL certificates and Server Name Indication (SNI) configurations for HTTPS endpoints</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD CERTIFICATE
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
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Upload SSL Certificate</h3>
          <form onSubmit={handleAddCertificate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Certificate (.crt / .pem file contents)</label>
                <textarea
                  required
                  rows={4}
                  value={cert}
                  onChange={(e) => setCert(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----\n..."
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Private Key (.key contents)</label>
                <textarea
                  required
                  rows={4}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n..."
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Associated SNIs (comma separated, optional)</label>
                <input
                  type="text"
                  value={snis}
                  onChange={(e) => setSnis(e.target.value)}
                  placeholder="e.g. api.mydomain.com, app.domain.com"
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
                ADD CERTIFICATE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Certificates List Table */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading certificates...
          </div>
        ) : certificates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Certificate ID</th>
                  <th className="px-6 py-3.5">SNIs</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {certificates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-purple-50 text-purple-600">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <Link to={`/certificates/${c.id}`} className="font-bold text-sm block font-mono text-blue-600 hover:underline select-all">
                            {c.id.substring(0, 16)}...
                          </Link>
                          <span className="text-[10px] text-text-muted font-mono block select-all">{c.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1 font-medium">
                      {c.snis && c.snis.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.snis.map((sni, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono text-[10px] border border-blue-100">
                              {sni}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted italic">no SNIs associated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(c.created_at * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteCertificate(c.id)}
                          className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary"
                          title="Delete Certificate"
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
            No certificates found. Click "ADD CERTIFICATE" to upload an SSL bundle.
          </div>
        )}
      </div>
    </div>
  );
};
