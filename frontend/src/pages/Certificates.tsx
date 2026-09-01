import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Award, 
  AlertCircle,
  Search,
  X
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/Pagination';

interface Certificate {
  id: string;
  cert: string;
  key: string;
  snis?: string[];
  created_at: number;
  tags?: string[];
}

const getTagColor = (tag: string) => {
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const Certificates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [cert, setCert] = useState('');
  const [key, setKey] = useState('');
  const [snis, setSnis] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag]);

  useEffect(() => {
    fetchCertificates();
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

  const fetchCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/kong/certificates?size=1000');
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
    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const payload: any = {
      cert,
      key,
      snis: parsedSnis
    };
    if (parsedTags.length > 0) {
      payload.tags = parsedTags;
    }

    try {
      await axios.post('/api/kong/certificates', payload);
      setCert('');
      setKey('');
      setSnis('');
      setTagsInput('');
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

  const uniqueTags = Array.from(
    new Set(
      certificates.flatMap(c => c.tags || [])
    )
  ).sort();

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cert.snis && cert.snis.some(sni => sni.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesTag = selectedTag ? cert.tags?.includes(selectedTag) : true;
    
    return matchesSearch && matchesTag;
  });

  const paginatedCertificates = React.useMemo(() => {
    return filteredCertificates.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredCertificates, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">Certificates</h2>
          <p className="text-xs text-text-secondary mt-0.5">Upload and manage SSL certificates and Server Name Indication (SNI) configurations for HTTPS endpoints</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all self-start sm:self-auto cursor-pointer"
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
                UPLOAD SSL CERTIFICATE
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
            <form onSubmit={handleAddCertificate} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto">
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

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. production, secure, external"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                  </div>
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
                  ADD CERTIFICATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filter Panel */}
      {certificates.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-border-light shadow-sm">
          <div className="relative flex-1 w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search certificates by ID..."
              className="w-full pl-10 pr-4 py-2 rounded bg-slate-50 border border-border-light outline-none text-xs font-medium placeholder:text-text-muted transition-colors focus:border-brand-primary focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">Filter by Tag:</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary min-w-[140px]"
            >
              <option value="">All Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
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
            {filteredCertificates.length > 0 ? (
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
                  {paginatedCertificates.map((cert) => (
                    <tr 
                      key={cert.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/certificates/${cert.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-purple-50 text-purple-600">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <Link to={`/certificates/${cert.id}`} className="font-bold text-sm block font-mono text-blue-600 hover:underline select-all">
                              {cert.id.substring(0, 16)}...
                            </Link>
                            <span className="text-[10px] text-text-muted font-mono block select-all">{cert.id}</span>
                            {cert.tags && cert.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 max-w-xs">
                                {cert.tags.map(t => {
                                  const cColor = getTagColor(t);
                                  return (
                                    <span key={t} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${cColor.bg} ${cColor.text} ${cColor.border}`}>
                                      {t}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1 font-medium">
                        {cert.snis && cert.snis.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cert.snis.map((sni, idx) => (
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
                        {new Date(cert.created_at * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCertificate(cert.id); }}
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
            ) : (
              <div className="p-12 text-center text-text-muted text-xs font-medium">
                No certificates match your search and filter criteria.
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCertificates.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
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
