import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CloneServiceModalProps {
  service: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CloneServiceModal: React.FC<CloneServiceModalProps> = ({
  service,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(80);
  const [protocol, setProtocol] = useState('http');
  const [path, setPath] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [retries, setRetries] = useState(5);
  const [connectTimeout, setConnectTimeout] = useState(60000);
  const [writeTimeout, setWriteTimeout] = useState(60000);
  const [readTimeout, setReadTimeout] = useState(60000);
  const [clientCertificateId, setClientCertificateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setName(service.name ? `${service.name}-copy` : '');
      setHost(service.host || '');
      setPort(service.port || 80);
      setProtocol(service.protocol || 'http');
      setPath(service.path || '');
      setRetries(service.retries ?? 5);
      setConnectTimeout(service.connect_timeout ?? 60000);
      setWriteTimeout(service.write_timeout ?? 60000);
      setReadTimeout(service.read_timeout ?? 60000);
      setClientCertificateId(service.client_certificate?.id || '');

      let fetchedDesc = '';
      let normalTags: string[] = [];
      if (service.tags) {
        const descTag = service.tags.find((t: string) => t.startsWith('noka-desc:'));
        if (descTag) fetchedDesc = descTag.substring('noka-desc:'.length);
        normalTags = service.tags.filter((t: string) => 
          !t.startsWith('noka-desc:') && 
          !t.startsWith('noka-creator:') && 
          !t.startsWith('noka-updated-by:') && 
          !t.startsWith('noka-updated-at:')
        );
      }
      setDescription(fetchedDesc ? `${fetchedDesc} (Copy)` : '');
      setTagsInput(normalTags.join(', '));
    }
  }, [service]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!service) return null;

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim()) {
      setError('Service name and host are required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const parsedTags = tagsInput
        ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      if (description.trim()) {
        parsedTags.push(`noka-desc:${description.trim()}`);
      }

      const payload: any = {
        name: name.trim(),
        host: host.trim(),
        port: Number(port),
        protocol: protocol,
        retries: Number(retries),
        connect_timeout: Number(connectTimeout),
        write_timeout: Number(writeTimeout),
        read_timeout: Number(readTimeout)
      };

      if (path.trim()) {
        payload.path = path.trim();
      }

      if (parsedTags.length > 0) {
        payload.tags = parsedTags;
      }

      if (clientCertificateId.trim()) {
        payload.client_certificate = { id: clientCertificateId.trim() };
      }

      await axios.post('/api/kong/services', payload);
      addToast('success', `Service "${name.trim()}" successfully cloned!`, 'Clone Successful');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clone service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      onMouseDown={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl max-h-[88vh] rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                CLONE SERVICE: <span className="text-emerald-600">{service.name || service.id}</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Copies service backend configuration. Routes are NOT copied.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleClone} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/60 text-emerald-800 text-xs flex items-center justify-between">
              <span>✨ Creating a clean independent clone with original upstream timeouts and parameters.</span>
              <span className="font-bold text-[10px] uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
                No Routes Copied
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  New Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. my-service-copy"
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-bold text-text-primary"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Cloned production backend service"
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  Protocol <span className="text-red-500">*</span>
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="grpc">GRPC</option>
                  <option value="grpcs">GRPCS</option>
                  <option value="tcp">TCP</option>
                  <option value="tls">TLS</option>
                  <option value="udp">UDP</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="e.g. api.example.com"
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Path (Optional)</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g. /v1 (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. production, core, v1"
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Retries</label>
                <input
                  type="number"
                  value={retries}
                  onChange={(e) => setRetries(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Connect Timeout (ms)</label>
                <input
                  type="number"
                  value={connectTimeout}
                  onChange={(e) => setConnectTimeout(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-light bg-slate-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  CLONE SERVICE
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
