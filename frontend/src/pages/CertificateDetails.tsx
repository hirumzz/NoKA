import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  FileText, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Globe
} from 'lucide-react';
import { CommentsSection } from '../components/CommentsSection';
import { useAuth } from '../context/AuthContext';

interface KongCertificate {
  id: string;
  cert: string;
  key: string;
  tags?: string[];
  created_at: number;
}

interface KongSNI {
  id: string;
  name: string;
  created_at: number;
}

export const CertificateDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cert, setCert] = useState<KongCertificate | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'snis'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    navigate('/certificates');
  }, [user?.node]);

  // Certificate fields
  const [certContent, setCertContent] = useState('');
  const [keyContent, setKeyContent] = useState('');

  // Sub-resource list states
  const [snis, setSnis] = useState<KongSNI[]>([]);

  // Add SNI Form fields
  const [showAddForm, setShowAddForm] = useState(false);
  const [sniName, setSniName] = useState('');

  useEffect(() => {
    fetchCertificateDetails();
  }, [id]);

  const fetchCertificateDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/kong/certificates/${id}`);
      const data = response.data;
      setCert(data);
      setCertContent(data.cert || '');
      setKeyContent(data.key || '');

      // Fetch SNIs
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch certificate details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubResources = async () => {
    try {
      // In Kong, SNIs can be queried on the certificate endpoint
      const response = await axios.get(`/api/kong/certificates/${id}/snis`);
      setSnis(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch SNIs:', err);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.patch(`/api/kong/certificates/${id}`, {
        cert: certContent,
        key: keyContent
      });
      setSuccess('Certificate payload updated successfully!');
      fetchCertificateDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update certificate');
    }
  };

  const handleAddSNI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sniName) return;
    setError('');

    try {
      await axios.post(`/api/kong/certificates/${id}/snis`, {
        name: sniName
      });
      setSniName('');
      setShowAddForm(false);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add SNI mapping');
    }
  };

  const handleDeleteSNI = async (sniId: string) => {
    if (!window.confirm('Are you sure you want to delete this SNI mapping?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/snis/${sniId}`);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete SNI');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
        Loading certificate details...
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="p-6 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        Certificate not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <Link to="/certificates" className="p-2 rounded border border-border-light hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-primary" /> 
            Certificate Config
          </h2>
          <span className="text-[10px] text-text-muted font-mono font-medium block mt-0.5">Certificate ID: {cert.id}</span>
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

      {/* Tabs */}
      <div className="flex border-b border-border-light gap-6 text-xs font-bold uppercase tracking-wider text-text-secondary">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-2.5 outline-none border-b-2 transition-colors ${
            activeTab === 'details' ? 'border-brand-primary text-text-primary' : 'border-transparent hover:text-text-primary'
          }`}
        >
          Details & Notes
        </button>
        <button
          onClick={() => setActiveTab('snis')}
          className={`pb-2.5 outline-none border-b-2 transition-colors ${
            activeTab === 'snis' ? 'border-brand-primary text-text-primary' : 'border-transparent hover:text-text-primary'
          }`}
        >
          SNI Mappings ({snis.length})
        </button>
      </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Update SSL Certificate & Key</h3>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Certificate (PEM block)</label>
                <textarea
                  rows={8}
                  required
                  value={certContent}
                  onChange={(e) => setCertContent(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----"
                  className="w-full p-2.5 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-mono leading-normal"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Private Key (PEM block)</label>
                <textarea
                  rows={8}
                  required
                  value={keyContent}
                  onChange={(e) => setKeyContent(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  className="w-full p-2.5 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-mono leading-normal"
                />
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
            <CommentsSection referenceId={cert.id} referenceType="certificate" />
          </div>
        </div>
      )}

      {/* Tab: SNIs */}
      {activeTab === 'snis' && (
        <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden space-y-4 max-w-2xl">
          <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Associated SNIs</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center px-3 py-1.5 rounded bg-brand-primary text-white font-bold text-[10px] hover:bg-brand-primary-hover shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> ADD SNI
            </button>
          </div>

          {showAddForm && (
            <div className="p-6 bg-slate-50 border-b border-border-light animate-slideDown">
              <form onSubmit={handleAddSNI} className="flex gap-4 items-end max-w-md">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Server Name (SNI)</label>
                  <input
                    type="text"
                    required
                    value={sniName}
                    onChange={(e) => setSniName(e.target.value)}
                    placeholder="e.g. api.domain.com"
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
                <th className="px-6 py-3.5">Server Name (SNI)</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5 width-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light font-semibold text-text-primary">
              {snis.length > 0 ? (
                snis.map(sni => (
                  <tr key={sni.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-brand-primary/60" />
                      <span>{sni.name}</span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(sni.created_at * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteSNI(sni.id)}
                        className="p-1 rounded text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete SNI Mapping"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-text-muted italic">
                    No SNIs mapped to this certificate. Add SNI domain names to enable TLS Routing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
