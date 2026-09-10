import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Copy, Globe, Layers, GitBranch, User, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ClonePluginModalProps {
  plugin: any | null;
  onClose: () => void;
  onSuccess: () => void;
  initialScope?: 'global' | 'service' | 'route' | 'consumer';
  initialTargetId?: string;
}

export const ClonePluginModal: React.FC<ClonePluginModalProps> = ({
  plugin,
  onClose,
  onSuccess,
  initialScope,
  initialTargetId
}) => {
  const { addToast } = useToast();
  const [targetScope, setTargetScope] = useState<'global' | 'service' | 'route' | 'consumer'>('global');
  const [services, setServices] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [consumers, setConsumers] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedConsumerId, setSelectedConsumerId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingTargets, setFetchingTargets] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plugin) {
      setEnabled(plugin.enabled !== false);
      if (initialScope) {
        setTargetScope(initialScope);
        if (initialScope === 'service' && initialTargetId) setSelectedServiceId(initialTargetId);
        if (initialScope === 'route' && initialTargetId) setSelectedRouteId(initialTargetId);
        if (initialScope === 'consumer' && initialTargetId) setSelectedConsumerId(initialTargetId);
      } else if (plugin.service?.id) {
        setTargetScope('service');
        setSelectedServiceId(plugin.service.id);
      } else if (plugin.route?.id) {
        setTargetScope('route');
        setSelectedRouteId(plugin.route.id);
      } else if (plugin.consumer?.id) {
        setTargetScope('consumer');
        setSelectedConsumerId(plugin.consumer.id);
      } else {
        setTargetScope('global');
      }
    }
  }, [plugin, initialScope, initialTargetId]);

  useEffect(() => {
    const fetchTargets = async () => {
      setFetchingTargets(true);
      try {
        const [servicesRes, routesRes, consumersRes] = await Promise.allSettled([
          axios.get('/api/kong/services?size=1000'),
          axios.get('/api/kong/routes?size=1000'),
          axios.get('/api/kong/consumers?size=1000')
        ]);

        if (servicesRes.status === 'fulfilled') {
          const svcs = servicesRes.value.data?.data || [];
          setServices(svcs);
          if (svcs.length > 0 && !selectedServiceId) {
            setSelectedServiceId(svcs[0].id);
          }
        }
        if (routesRes.status === 'fulfilled') {
          const rts = routesRes.value.data?.data || [];
          setRoutes(rts);
          if (rts.length > 0 && !selectedRouteId) {
            setSelectedRouteId(rts[0].id);
          }
        }
        if (consumersRes.status === 'fulfilled') {
          const cns = consumersRes.value.data?.data || [];
          setConsumers(cns);
          if (cns.length > 0 && !selectedConsumerId) {
            setSelectedConsumerId(cns[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch targets for clone:', err);
      } finally {
        setFetchingTargets(false);
      }
    };

    if (plugin) {
      fetchTargets();
    }
  }, [plugin]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!plugin) return null;

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        name: plugin.name,
        config: plugin.config || {},
        enabled: enabled
      };

      if (plugin.tags && Array.isArray(plugin.tags) && plugin.tags.length > 0) {
        payload.tags = plugin.tags.filter((t: string) => !t.startsWith('noka-creator:') && !t.startsWith('noka-updated-by:') && !t.startsWith('noka-updated-at:'));
      }

      if (targetScope === 'service') {
        if (!selectedServiceId) {
          setError('Please select a target Service.');
          setLoading(false);
          return;
        }
        payload.service = { id: selectedServiceId };
      } else if (targetScope === 'route') {
        if (!selectedRouteId) {
          setError('Please select a target Route.');
          setLoading(false);
          return;
        }
        payload.route = { id: selectedRouteId };
      } else if (targetScope === 'consumer') {
        if (!selectedConsumerId) {
          setError('Please select a target Consumer.');
          setLoading(false);
          return;
        }
        payload.consumer = { id: selectedConsumerId };
      }

      await axios.post('/api/kong/plugins', payload);
      addToast('success', `Plugin "${plugin.name}" successfully cloned!`, 'Clone Successful');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clone plugin.');
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
        className="bg-white w-full max-w-xl rounded-xl border border-border-light shadow-2xl flex flex-col animate-scaleUp overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                CLONE PLUGIN: <span className="text-brand-primary">{plugin.name}</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Copy all configurations to a new Service, Route, Consumer, or Global scope
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
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Source Plugin Summary Card */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-border-light">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Source Plugin Config</span>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary">{plugin.name}</span>
                  <span className="text-[10px] font-mono text-text-muted">({plugin.id?.substring(0, 8)}...)</span>
                </div>
                <span className="text-[10px] font-bold text-brand-primary">
                  {Object.keys(plugin.config || {}).length} parameters copied
                </span>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase">
                Choose Target Scope <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetScope('global')}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                    targetScope === 'global'
                      ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300 font-medium'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs">Global</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetScope('service')}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                    targetScope === 'service'
                      ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300 font-medium'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-xs">Service</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetScope('route')}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                    targetScope === 'route'
                      ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300 font-medium'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  <span className="text-xs">Route</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetScope('consumer')}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                    targetScope === 'consumer'
                      ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300 font-medium'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs">Consumer</span>
                </button>
              </div>
            </div>

            {/* Target Select Dropdown */}
            {targetScope === 'service' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  Select Target Service <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                  disabled={fetchingTargets}
                >
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name || svc.id} ({svc.host}:{svc.port})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-text-muted">Plugin rules will apply to all routes under this service.</span>
              </div>
            )}

            {targetScope === 'route' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  Select Target Route <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                  disabled={fetchingTargets}
                >
                  {routes.map((rt) => {
                    const parentSvc = services.find(s => s.id === rt.service?.id);
                    const label = rt.name || rt.paths?.join(', ') || rt.id;
                    return (
                      <option key={rt.id} value={rt.id}>
                        {label} {parentSvc ? `(Service: ${parentSvc.name || parentSvc.id})` : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[10px] text-text-muted">Plugin rules will be strictly scoped to this route matching criteria.</span>
              </div>
            )}

            {targetScope === 'consumer' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  Select Target Consumer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedConsumerId}
                  onChange={(e) => setSelectedConsumerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                  disabled={fetchingTargets}
                >
                  {consumers.map((cn) => (
                    <option key={cn.id} value={cn.id}>
                      {cn.username || cn.custom_id || cn.id}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-text-muted">Plugin rules will apply to requests authenticated as this consumer.</span>
              </div>
            )}

            {/* Enable switch */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border-light bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-text-primary block">Enable Plugin Immediately</span>
                <span className="text-[10px] text-text-muted">Turn on to activate cloned plugin immediately upon creation</span>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
              />
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
              className="px-5 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  CLONE PLUGIN
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
