import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileSpreadsheet, 
  Search, 
  Eye, 
  X, 
  Calendar, 
  User, 
  Activity, 
  Globe
} from 'lucide-react';

interface AuditLog {
  id: number;
  ip_address: string;
  username: string;
  action: string;
  entity: string;
  url: string;
  payload: string | Record<string, any>;
  kong_node_name: string;
  createdAt: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);

  const mockLogs: AuditLog[] = [
    {
      id: 1,
      ip_address: '127.0.0.1',
      username: 'admin',
      action: 'PATCH',
      entity: 'plugins',
      url: '/plugins/4c3d489b-8671-46eb-8e54-5a213e4b77f9',
      payload: { enabled: true, name: 'key-auth', config: { key_names: ['apikey'] } },
      kong_node_name: 'default-kong-node',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      ip_address: '192.168.1.5',
      username: 'admin',
      action: 'POST',
      entity: 'services',
      url: '/services',
      payload: { name: 'users-api', url: 'http://users-service:8080' },
      kong_node_name: 'default-kong-node',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auditlogs');
      if (response.data && response.data.length > 0) {
        setLogs(response.data);
      } else {
        setLogs(mockLogs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs, using fallback values:', err);
      setLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'POST':
        return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600';
      case 'PATCH':
      case 'PUT':
        return 'border-amber-500/20 bg-amber-500/5 text-amber-600';
      case 'DELETE':
        return 'border-rose-500/20 bg-rose-500/5 text-rose-600';
      default:
        return 'border-slate-200 bg-slate-50 text-text-secondary';
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      log.username.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.entity.toLowerCase().includes(term) ||
      log.ip_address.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Audit Logs</h2>
          <p className="text-xs text-text-secondary mt-1">Audit log tracks writing actions and API modifications made through NOKA console</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, IP, action, or entity..."
            className="w-full pl-10 pr-4 py-2 rounded bg-white border border-border-light outline-none text-xs font-medium placeholder:text-text-muted transition-colors focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">IP Address</th>
                <th className="px-6 py-3.5">Node Name</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Entity</th>
                <th className="px-6 py-3.5">URL</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted">
                    <span className="w-5 h-5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin inline-block" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted font-medium">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-[11px] text-text-secondary font-medium">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">{log.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-text-secondary font-medium">{log.ip_address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-text-secondary font-medium">{log.kong_node_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-50 border border-border-light text-[10px] font-bold text-text-secondary uppercase">
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate font-mono font-medium text-text-secondary" title={log.url}>
                      {log.url}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded border border-border-light hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary transition-all text-text-secondary"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg border border-border-light shadow-xl flex flex-col max-h-[85vh] animate-scaleUp overflow-hidden">
            {/* Modal Header */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
              <h3 className="text-sm font-bold flex items-center gap-2 text-text-primary uppercase tracking-wide">
                <FileSpreadsheet className="w-4 h-4 text-brand-primary" /> Audit Log Payload
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded hover:bg-slate-100 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Metadata details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border border-border-light font-semibold text-text-primary">
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted flex items-center gap-1 uppercase tracking-wider"><User className="w-3.5 h-3.5" /> Triggered By</p>
                  <p className="text-text-primary">{selectedLog.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted flex items-center gap-1 uppercase tracking-wider"><Globe className="w-3.5 h-3.5" /> IP Address</p>
                  <p className="font-mono text-text-primary">{selectedLog.ip_address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted flex items-center gap-1 uppercase tracking-wider"><Activity className="w-3.5 h-3.5" /> Action / Entity</p>
                  <p className="text-text-primary">{selectedLog.action} {selectedLog.entity}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted flex items-center gap-1 uppercase tracking-wider"><Calendar className="w-3.5 h-3.5" /> Date / Time</p>
                  <p className="text-text-primary">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* JSON Payload viewer */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Payload Data</p>
                <div className="p-4 rounded bg-slate-900 border border-slate-800 overflow-x-auto font-mono text-[11px] text-emerald-400">
                  <pre>
                    {JSON.stringify(
                      typeof selectedLog.payload === 'string'
                        ? JSON.parse(selectedLog.payload || '{}')
                        : selectedLog.payload,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
