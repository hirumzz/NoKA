import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Server
} from 'lucide-react';

interface Connection {
  id: number;
  name: string;
  url: string;
  active: boolean;
  version: string;
}

export const Connections: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([
    { id: 1, name: 'Default Kong Node', url: 'http://konga-kong-1:8001', active: true, version: '3.9.2' },
    { id: 2, name: 'Staging Gateway', url: 'http://staging-kong:8001', active: false, version: '3.8.0' },
  ]);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    const newConn: Connection = {
      id: Date.now(),
      name,
      url,
      active: false,
      version: 'Pending check...'
    };

    setConnections([...connections, newConn]);
    setName('');
    setUrl('');
    setShowAddForm(false);
  };

  const handleActivate = (id: number) => {
    setConnections(connections.map(c => ({
      ...c,
      active: c.id === id
    })));
  };

  const handleDelete = (id: number) => {
    setConnections(connections.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kong Connections</h2>
          <p className="text-sm text-text-secondary mt-1">Manage and switch between different Kong Admin API endpoints</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Connection
        </button>
      </div>

      {/* Add Form (Expandable) */}
      {showAddForm && (
        <div className="glass-panel p-6 rounded-2xl border border-border-dark space-y-4 animate-slideDown">
          <h3 className="text-lg font-semibold">New Kong Connection</h3>
          <form onSubmit={handleAddConnection} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Connection Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My API Gateway"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 outline-none transition-all duration-200 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Kong Admin URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:8001"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 outline-none transition-all duration-200 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl border border-border-dark hover:bg-card-dark text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm transition-colors"
              >
                Save Connection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connections List */}
      <div className="grid grid-cols-1 gap-4">
        {connections.map((conn) => (
          <div 
            key={conn.id}
            className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              conn.active 
                ? 'border-brand-primary bg-brand-primary/5 shadow-lg shadow-brand-primary/5' 
                : 'border-border-dark bg-card-dark/20 hover:border-border-dark/65'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${conn.active ? 'bg-brand-primary/10 text-brand-primary' : 'bg-card-dark text-text-secondary'}`}>
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">{conn.name}</h4>
                  {conn.active && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-semibold">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary font-mono mt-1">{conn.url}</p>
                <span className="text-xs text-text-muted mt-2 block">Version: {conn.version}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!conn.active && (
                <button
                  onClick={() => handleActivate(conn.id)}
                  className="px-4 py-2 rounded-xl bg-card-dark hover:bg-brand-primary/10 hover:text-brand-primary border border-border-dark text-sm font-semibold transition-all duration-200"
                >
                  Activate
                </button>
              )}
              <button
                onClick={() => handleDelete(conn.id)}
                className="p-2.5 rounded-xl border border-border-dark hover:border-brand-accent/30 hover:bg-brand-accent/5 hover:text-brand-accent transition-colors duration-200"
                title="Delete Connection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
