import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Server,
  Heart,
  AlertCircle,
  X,
  Check,
  HeartOff,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Connection {
  id: number;
  name: string;
  kong_admin_url: string;
  active: boolean;
  type: string;
  kong_version: string;
  health_checks: boolean;
  health_check_details?: string | any;
  kong_api_key?: string;
  username?: string;
  password?: string;
  jwt_algorithm?: string;
  jwt_key?: string;
  jwt_secret?: string;
  netdata_url?: string;
}

export const Connections: React.FC = () => {
  const { setUser } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Form fields
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('default');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [jwtAlgorithm, setJwtAlgorithm] = useState('HS256');
  const [jwtKey, setJwtKey] = useState('');
  const [jwtSecret, setJwtSecret] = useState('');
  const [netdataUrl, setNetdataUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Form Visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showJwtSecret, setShowJwtSecret] = useState(false);

  // Edit Modal fields
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editType, setEditType] = useState('default');
  const [editApiKey, setEditApiKey] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editJwtAlgorithm, setEditJwtAlgorithm] = useState('HS256');
  const [editJwtKey, setEditJwtKey] = useState('');
  const [editJwtSecret, setEditJwtSecret] = useState('');
  const [editNetdataUrl, setEditNetdataUrl] = useState('');

  // Edit Modal Visibility toggles
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditJwtSecret, setShowEditJwtSecret] = useState(false);

  // Health Check Modal fields
  const [checkingConnection, setCheckingConnection] = useState<Connection | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/connections');
      setConnections(response.data || []);
    } catch (err: any) {
      setError('Failed to fetch connections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    setError('');

    try {
      await axios.post('/api/connections', {
        name,
        kong_admin_url: url,
        type,
        kong_api_key: apiKey,
        username,
        password,
        jwt_algorithm: jwtAlgorithm,
        jwt_key: jwtKey,
        jwt_secret: jwtSecret,
        netdata_url: netdataUrl
      });

      setName('');
      setUrl('');
      setType('default');
      setApiKey('');
      setUsername('');
      setPassword('');
      setJwtAlgorithm('HS256');
      setJwtKey('');
      setJwtSecret('');
      setNetdataUrl('');
      setShowAddForm(false);
      
      // Reset visibility toggles
      setShowApiKey(false);
      setShowPassword(false);
      setShowJwtSecret(false);

      fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create connection');
    }
  };

  const handleUpdateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConnection) return;
    setError('');

    try {
      await axios.put(`/api/connections/${editingConnection.id}`, {
        name: editName,
        kong_admin_url: editUrl,
        type: editType,
        kong_api_key: editApiKey,
        username: editUsername,
        password: editPassword,
        jwt_algorithm: editJwtAlgorithm,
        jwt_key: editJwtKey,
        jwt_secret: editJwtSecret,
        netdata_url: editNetdataUrl
      });

      setEditingConnection(null);
      
      // Reset visibility toggles
      setShowEditApiKey(false);
      setShowEditPassword(false);
      setShowEditJwtSecret(false);

      fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update connection');
    }
  };

  const handleToggleHealthCheck = async (conn: Connection) => {
    try {
      const updatedStatus = !conn.health_checks;
      const response = await axios.put(`/api/connections/${conn.id}`, {
        health_checks: updatedStatus
      });

      // Update checkingConnection modal if open
      if (checkingConnection?.id === conn.id) {
        setCheckingConnection(response.data);
      }

      fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle health checks');
    }
  };

  const handleActivate = async (id: number) => {
    setError('');
    try {
      await axios.post(`/api/connections/${id}/activate`);
      // Reload current user state to refresh node ID
      const userResp = await axios.get('/api/me');
      setUser(userResp.data);
      // Reload connections list
      fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate connection');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this connection node?')) return;
    setError('');
    try {
      await axios.delete(`/api/connections/${id}`);
      fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete connection');
    }
  };

  const openEditModal = (conn: Connection) => {
    setEditingConnection(conn);
    setEditName(conn.name);
    setEditUrl(conn.kong_admin_url);
    setEditType(conn.type);
    setEditApiKey(conn.kong_api_key || '');
    setEditUsername(conn.username || '');
    setEditPassword(conn.password || '');
    setEditJwtAlgorithm(conn.jwt_algorithm || 'HS256');
    setEditJwtKey(conn.jwt_key || '');
    setEditJwtSecret(conn.jwt_secret || '');
    setEditNetdataUrl(conn.netdata_url || '');

    // Reset visibility toggles
    setShowEditApiKey(false);
    setShowEditPassword(false);
    setShowEditJwtSecret(false);
  };

  // Helper to parse GORM json string or raw object
  const parseHealthDetails = (detailsRaw: any) => {
    if (!detailsRaw) return null;
    if (typeof detailsRaw === 'string') {
      try {
        return JSON.parse(detailsRaw);
      } catch {
        return null;
      }
    }
    return detailsRaw;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Connections</h2>
          <p className="text-xs text-text-secondary mt-1">Manage and switch between different Kong Admin API gateways</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD CONNECTION
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
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Connection Config</h3>
          <form onSubmit={handleAddConnection} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Connection Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kong Staging Node"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Kong Admin / Loopback URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. http://konga-kong-1:8001"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Auth Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                >
                  <option value="default">None (Default)</option>
                  <option value="key_auth">API Key Header</option>
                  <option value="jwt">JWT Token Auth</option>
                  <option value="basic_auth">Basic Auth (User/Pass)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Netdata URL (optional)</label>
                <input
                  type="url"
                  value={netdataUrl}
                  onChange={(e) => setNetdataUrl(e.target.value)}
                  placeholder="e.g. http://my-netdata-server:19999"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              {type === 'key_auth' && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Kong API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter apiKey header value"
                      className="w-full px-3 py-2 pr-10 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {type === 'jwt' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">JWT Algorithm</label>
                    <select
                      value={jwtAlgorithm}
                      onChange={(e) => setJwtAlgorithm(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                    >
                      <option value="HS256">HS256</option>
                      <option value="RS256">RS256</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">JWT Key</label>
                    <input
                      type="text"
                      required
                      value={jwtKey}
                      onChange={(e) => setJwtKey(e.target.value)}
                      placeholder="The JWT identification key"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">JWT Secret</label>
                    <div className="relative">
                      <input
                        type={showJwtSecret ? 'text' : 'password'}
                        required
                        value={jwtSecret}
                        onChange={(e) => setJwtSecret(e.target.value)}
                        placeholder="The JWT secret key"
                        className="w-full px-3 py-2 pr-10 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowJwtSecret(!showJwtSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        {showJwtSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {type === 'basic_auth' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3 py-2 pr-10 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
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
                SAVE CONNECTION
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connections List */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Configured Gateways</h3>
        </div>
        <div className="divide-y divide-border-light">
          {loading ? (
            <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
              Loading connections...
            </div>
          ) : connections.length > 0 ? (
            connections.map((conn) => {
              const details = parseHealthDetails(conn.health_check_details);
              const isHealthy = details ? details.isHealthy : false;

              return (
                <div 
                  key={conn.id}
                  className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    conn.active ? 'bg-brand-primary/5' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Active Checkbox Trigger */}
                    <div 
                      onClick={() => !conn.active && handleActivate(conn.id)}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        conn.active 
                          ? 'bg-brand-primary/10 text-brand-primary' 
                          : 'bg-slate-100 text-text-muted hover:bg-slate-200 hover:text-text-secondary'
                      }`}
                      title={conn.active ? "Active Node" : "Click to activate node"}
                    >
                      <Server className="w-5 h-5" />
                    </div>

                    {/* Health Check Status icon */}
                    <div 
                      onClick={() => setCheckingConnection(conn)}
                      className="cursor-pointer"
                      title="View Health Checks info"
                    >
                      {conn.health_checks ? (
                        isHealthy ? (
                          <Heart className="w-5 h-5 text-emerald-500 fill-emerald-500 animate-pulse" />
                        ) : (
                          <HeartOff className="w-5 h-5 text-red-500" />
                        )
                      ) : (
                        <Heart className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {/* Click Name to Edit */}
                        <h4 
                          onClick={() => openEditModal(conn)}
                          className="font-bold text-sm text-text-primary cursor-pointer hover:text-brand-primary hover:underline flex items-center gap-1.5"
                        >
                          {conn.name}
                          <Settings className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
                        </h4>
                        {conn.active && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 text-[10px] font-bold">
                            <CheckCircle className="w-3.5 h-3.5" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary font-mono mt-1">{conn.kong_admin_url}</p>
                      <div className="flex items-center gap-3 text-[10px] text-text-muted mt-1.5 font-bold uppercase">
                        <span>Version: {conn.kong_version}</span>
                        <span>•</span>
                        <span>Auth: {conn.type.replace('_', ' ')}</span>
                        {conn.netdata_url && (
                          <>
                            <span>•</span>
                            <a href={conn.netdata_url} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline flex items-center gap-0.5 font-bold">
                              Netdata Dashboard
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!conn.active && (
                      <button
                        onClick={() => handleActivate(conn.id)}
                        className="px-4 py-2 rounded bg-white hover:bg-slate-50 border border-border-light text-xs font-bold text-text-primary transition-all shadow-sm cursor-pointer"
                      >
                        ACTIVATE
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(conn.id)}
                      className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary cursor-pointer"
                      title="Delete Connection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-text-muted text-xs font-medium">
              No connections found. Click "+ ADD CONNECTION" to setup a Kong gateway connection.
            </div>
          )}
        </div>
      </div>

      {/* Edit Connection Modal */}
      {editingConnection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg border border-border-light shadow-xl flex flex-col max-h-[85vh] animate-scaleUp overflow-hidden">
            <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Edit Connection</h3>
              <button onClick={() => setEditingConnection(null)} className="p-1 rounded hover:bg-slate-100 text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateConnection} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Connection Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Kong Admin / Loopback URL</label>
                <input
                  type="url"
                  required
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Auth Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                >
                  <option value="default">None (Default)</option>
                  <option value="key_auth">API Key Header</option>
                  <option value="jwt">JWT Token Auth</option>
                  <option value="basic_auth">Basic Auth (User/Pass)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Netdata URL (optional)</label>
                <input
                  type="url"
                  value={editNetdataUrl}
                  onChange={(e) => setEditNetdataUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>

              {editType === 'key_auth' && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Kong API Key</label>
                  <div className="relative">
                    <input
                      type={showEditApiKey ? 'text' : 'password'}
                      required
                      value={editApiKey}
                      onChange={(e) => setEditApiKey(e.target.value)}
                      className="w-full px-3 py-2 pr-10 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditApiKey(!showEditApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showEditApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {editType === 'jwt' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">JWT Algorithm</label>
                    <select
                      value={editJwtAlgorithm}
                      onChange={(e) => setEditJwtAlgorithm(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
                    >
                      <option value="HS256">HS256</option>
                      <option value="RS256">RS256</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">JWT Key</label>
                    <input
                      type="text"
                      required
                      value={editJwtKey}
                      onChange={(e) => setEditJwtKey(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">JWT Secret</label>
                    <div className="relative">
                      <input
                        type={showEditJwtSecret ? 'text' : 'password'}
                        required
                        value={editJwtSecret}
                        onChange={(e) => setEditJwtSecret(e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditJwtSecret(!showEditJwtSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        {showEditJwtSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {editType === 'basic_auth' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Username</label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Password</label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        required
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t border-border-light mt-4">
                <button
                  type="button"
                  onClick={() => setEditingConnection(null)}
                  className="px-4 py-2 rounded border border-border-light text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs uppercase"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health Checks Modal */}
      {checkingConnection && (() => {
        const details = parseHealthDetails(checkingConnection.health_check_details);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-lg border border-border-light shadow-xl flex flex-col max-h-[85vh] animate-scaleUp overflow-hidden">
              <div className="h-14 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/50">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-brand-primary" /> Health Checks Info
                </h3>
                <button onClick={() => setCheckingConnection(null)} className="p-1 rounded hover:bg-slate-100 text-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded border border-border-light">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase">{checkingConnection.name}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5 font-mono">{checkingConnection.kong_admin_url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">
                      {checkingConnection.health_checks ? "ENABLED" : "DISABLED"}
                    </span>
                    <button
                      onClick={() => handleToggleHealthCheck(checkingConnection)}
                      className={`w-8 h-4 rounded-full relative transition-colors ${
                        checkingConnection.health_checks ? 'bg-brand-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.25 transition-all shadow-sm ${
                        checkingConnection.health_checks ? 'right-0.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                {checkingConnection.health_checks && details ? (
                  <div className="border border-border-light rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody className="divide-y divide-border-light font-semibold text-text-primary">
                        <tr>
                          <td className="px-4 py-2.5 bg-slate-50/50 text-[10px] text-text-secondary uppercase">Last Status</td>
                          <td className="px-4 py-2.5">
                            {details.isHealthy ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Healthy
                              </span>
                            ) : (
                              <span className="text-red-500 font-bold flex items-center gap-1">
                                <X className="w-3.5 h-3.5" /> Unhealthy
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 bg-slate-50/50 text-[10px] text-text-secondary uppercase">Last Checked</td>
                          <td className="px-4 py-2.5 text-text-secondary font-medium">
                            {details.lastChecked ? new Date(details.lastChecked).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 bg-slate-50/50 text-[10px] text-text-secondary uppercase">Last Failed</td>
                          <td className="px-4 py-2.5 text-text-secondary font-medium">
                            {details.lastFailed ? new Date(details.lastFailed).toLocaleString() : 'Never'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 bg-slate-50/50 text-[10px] text-text-secondary uppercase">Failed Reason</td>
                          <td className="px-4 py-2.5 text-red-500 font-medium font-mono text-[11px]">
                            {details.lastFailedReason || 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 bg-slate-50/50 text-[10px] text-text-secondary uppercase">Uptime</td>
                          <td className="px-4 py-2.5 text-text-secondary font-medium">
                            {details.firstSucceeded ? 'Online since ' + new Date(details.firstSucceeded).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-muted text-xs font-semibold bg-slate-50/50 rounded border border-dashed border-border-light">
                    {!checkingConnection.health_checks 
                      ? "Enable background Health Checks to start getting diagnostic information." 
                      : "Waiting for first status poll results..."}
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-border-light mt-4">
                  <button
                    onClick={() => setCheckingConnection(null)}
                    className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-text-secondary font-bold text-xs uppercase"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
