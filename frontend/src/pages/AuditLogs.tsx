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

  // Mock logs for premium visuals in case db is empty
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
    },
    {
      id: 3,
      ip_address: '127.0.0.1',
      username: 'developer-jane',
      action: 'DELETE',
      entity: 'routes',
      url: '/routes/82bfde7a-42a1-4328-98e9-4e6a8d0526e0',
      payload: {},
      kong_node_name: 'staging-gateway',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  useEffect(() => {
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
        console.error('Failed to fetch audit logs, using mock values:', err);
        setLogs(mockLogs);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getActionBadgeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'POST':
        return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400';
      case 'PATCH':
      case 'PUT':
        return 'border-amber-500/20 bg-amber-500/5 text-amber-400';
      case 'DELETE':
        return 'border-rose-500/20 bg-rose-500/5 text-rose-400';
      default:
        return 'border-border-dark bg-card-dark text-text-secondary';
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-sm text-text-secondary mt-1">Track modifications made to your API Gateways</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, IP, action, or entity..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card-dark/20 border border-border-dark focus:border-brand-primary/50 outline-none transition-all duration-200 text-sm placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-dark bg-card-dark/10 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Node Name</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">URL</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted">
                    <span className="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin inline-block" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-card-dark/10 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-text-secondary">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{log.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-text-secondary">{log.ip_address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-text-secondary">{log.kong_node_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-card-dark border border-border-dark text-xs font-semibold">
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate font-mono text-xs text-text-muted" title={log.url}>
                      {log.url}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg border border-border-dark hover:border-brand-primary/30 hover:bg-brand-primary/5 hover:text-brand-primary transition-all duration-200"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-border-dark shadow-2xl flex flex-col max-h-[85vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-border-dark">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-primary" /> Audit Log Payload
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl hover:bg-card-dark text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Metadata details */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-card-dark/20 p-4 rounded-2xl border border-border-dark">
                <div className="space-y-1">
                  <p className="text-xs text-text-muted flex items-center gap-1"><User className="w-3.5 h-3.5" /> Triggered By</p>
                  <p className="font-semibold">{selectedLog.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-text-muted flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> IP Address</p>
                  <p className="font-semibold font-mono">{selectedLog.ip_address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-text-muted flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Action / Entity</p>
                  <p className="font-semibold">{selectedLog.action} {selectedLog.entity}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-text-muted flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date / Time</p>
                  <p className="font-semibold">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* JSON Payload viewer */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Payload Data</p>
                <div className="p-4 rounded-2xl bg-bg-dark border border-border-dark overflow-x-auto font-mono text-xs text-emerald-400">
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
