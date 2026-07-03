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
  const { user: currentUser, setUser } = useAuth();
  const isAdmin = !!(currentUser?.admin || currentUser?.role === 'admin');
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

    // Build payload, keeping fields from all auth types so they aren't deleted from the DB when switching types
    const payload: Record<string, any> = {
      name: editName,
      kong_admin_url: editUrl,
      type: editType,
      netdata_url: editNetdataUrl,
      kong_api_key: editApiKey,
      username: editUsername,
      password: editPassword,
      jwt_algorithm: editJwtAlgorithm,
      jwt_key: editJwtKey,
      jwt_secret: editJwtSecret,
    };

    try {
      await axios.put(`/api/connections/${editingConnection.id}`, payload);

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
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary-hover shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> ADD CONNECTION
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-brand-primary">
              <h3 className="text-base font-bold text-brand-primary uppercase tracking-wide">New Connection</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Auth Type Hint */}
            <p className="text-xs text-text-muted px-6 pt-3 pb-1">Choose a connection type.</p>

            {/* Auth Type Tabs */}
            <div className="flex border-b border-border-light px-6">
              {(['default', 'key_auth', 'jwt', 'basic_auth'] as const).map((t) => {
                const labels: Record<string, string> = { default: 'DEFAULT', key_auth: 'KEY AUTH', jwt: 'JWT AUTH', basic_auth: 'BASIC AUTH' };
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors ${
                      active
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-transparent text-text-secondary hover:text-brand-primary'
                    }`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* Type description banner */}
            <div className="mx-6 mt-4 px-4 py-3 bg-[#d4edda] border border-[#c3e6cb] rounded text-xs text-[#155724] leading-relaxed">
              {type === 'default' && (
                <>
                  Konga will connect directly to Kong's admin API.<br />
                  This method is mainly suitable for demo scenarios or internal access (ex. localhost).<br />
                  <span>Kong's admin API <span className="text-red-600 font-semibold">should not</span> be publicly exposed.</span>
                </>
              )}
              {type === 'key_auth' && (
                <>
                  Konga will connect to Kong's admin via an exposed "loop-back" API using key authentication.<br />
                  <a href="https://getkong.org/docs/latest/secure-admin-api/#kong-api-loopback" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Check out how to setup an API key based "loop-back" API.</a>
                </>
              )}
              {type === 'jwt' && (
                <>
                  Konga will connect to Kong's admin via an exposed "loop-back" API using JWT authentication.<br />
                  <a href="https://getkong.org/docs/latest/secure-admin-api/#kong-api-loopback" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Check out how to setup a JWT based "loop-back" API.</a>
                </>
              )}
              {type === 'basic_auth' && (
                <>
                  Konga will connect to Kong's admin via an exposed "loop-back" API using Basic authentication.<br />
                  <a href="https://getkong.org/docs/latest/secure-admin-api/#kong-api-loopback" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Check out how to setup a Basic Auth based "loop-back" API.</a>
                </>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAddConnection} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kong Staging Node"
                  className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                />
              </div>

              {/* URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  {type === 'default' ? 'Kong Admin URL' : 'Loopback API URL'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. http://34.34.218.153:8001"
                  className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                />
              </div>

              {/* KEY AUTH fields */}
              {type === 'key_auth' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">
                    API KEY <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter API key"
                      className="w-full px-3 py-2 pr-10 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                    />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* JWT AUTH fields */}
              {type === 'jwt' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">Algorithm</label>
                    <select
                      value={jwtAlgorithm}
                      onChange={(e) => setJwtAlgorithm(e.target.value)}
                      className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                    >
                      <option value="HS256">HS256</option>
                      <option value="RS256">RS256</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={jwtKey}
                      onChange={(e) => setJwtKey(e.target.value)}
                      placeholder="The JWT identification key"
                      className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Secret <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showJwtSecret ? 'text' : 'password'}
                        required
                        value={jwtSecret}
                        onChange={(e) => setJwtSecret(e.target.value)}
                        placeholder="The JWT secret"
                        className="w-full px-3 py-2 pr-10 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                      />
                      <button type="button" onClick={() => setShowJwtSecret(!showJwtSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                        {showJwtSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* BASIC AUTH fields */}
              {type === 'basic_auth' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3 py-2 pr-10 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 mt-2 bg-brand-primary text-white font-bold text-sm uppercase tracking-wide rounded flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-colors"
              >
                <Check className="w-4 h-4" /> CREATE CONNECTION
              </button>
            </form>
          </div>
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
                        <h4 
                          onClick={() => openEditModal(conn)}
                          className="font-bold text-sm text-text-primary cursor-pointer hover:text-brand-primary hover:underline flex items-center gap-1.5"
                        >
                          {conn.name}
                          {isAdmin && <Settings className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100" />}
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
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary cursor-pointer"
                        title="Delete Connection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

      {/* Update Connection Modal */}
      {editingConnection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-brand-primary">
              <h3 className="text-base font-bold text-brand-primary uppercase tracking-wide">
                {isAdmin ? 'Update Connection' : 'Connection Details (Read-Only)'}
              </h3>
              <button onClick={() => setEditingConnection(null)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Auth Type Hint */}
            <p className="text-xs text-text-muted px-6 pt-3 pb-1">Choose a connection type.</p>

            {/* Auth Type Tabs */}
            <div className="flex border-b border-border-light px-6">
              {(['default', 'key_auth', 'jwt', 'basic_auth'] as const).map((t) => {
                const labels: Record<string, string> = { default: 'DEFAULT', key_auth: 'KEY AUTH', jwt: 'JWT AUTH', basic_auth: 'BASIC AUTH' };
                const active = editType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => isAdmin && setEditType(t)}
                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors ${
                      active
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-transparent text-text-secondary hover:text-brand-primary'
                    } ${!isAdmin ? 'cursor-default' : ''}`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* Type description banner */}
            <div className="mx-6 mt-4 px-4 py-3 bg-[#d4edda] border border-[#c3e6cb] rounded text-xs text-[#155724] leading-relaxed">
              {editType === 'default' && (
                <>
                  Konga will connect directly to Kong's admin API.<br />
                  This method is mainly suitable for demo scenarios or internal access (ex. localhost).<br />
                  <span>Kong's admin API <span className="text-red-600 font-semibold">should not</span> be publicly exposed.</span>
                </>
              )}
              {editType === 'key_auth' && (
                <>
                  Konga will connect to Kong's admin via an exposed "loop-back" API using key authentication.<br />
                  <a href="https://getkong.org/docs/latest/secure-admin-api/#kong-api-loopback" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Check out how to setup an API key based "loop-back" API.</a>
                </>
              )}
              {editType === 'jwt' && (
                <>
                  Konga will connect to Kong's admin via an exposed "loop-back" API using JWT authentication.<br />
                  <a href="https://getkong.org/docs/latest/secure-admin-api/#kong-api-loopback" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Check out how to setup a JWT based "loop-back" API.</a>
                </>
              )}
              {editType === 'basic_auth' && (
                <>
                  Konga will connect to Kong's admin via an exposed "loop-back" API using Basic authentication.<br />
                  <a href="https://getkong.org/docs/latest/secure-admin-api/#kong-api-loopback" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Check out how to setup a Basic Auth based "loop-back" API.</a>
                </>
              )}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleUpdateConnection} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  readOnly={!isAdmin}
                  value={editName}
                  onChange={(e) => isAdmin && setEditName(e.target.value)}
                  className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary read-only:bg-slate-50 read-only:text-text-secondary"
                />
              </div>

              {/* URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  {editType === 'default' ? 'Kong Admin URL' : 'Loopback API URL'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  readOnly={!isAdmin}
                  value={editUrl}
                  onChange={(e) => isAdmin && setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary read-only:bg-slate-50 read-only:text-text-secondary"
                />
              </div>

              {/* KEY AUTH */}
              {editType === 'key_auth' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">
                    API KEY <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showEditApiKey ? 'text' : 'password'}
                      required
                      readOnly={!isAdmin}
                      value={editApiKey}
                      onChange={(e) => isAdmin && setEditApiKey(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary read-only:bg-slate-50 read-only:text-text-secondary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditApiKey(!showEditApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showEditApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* JWT AUTH */}
              {editType === 'jwt' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">Algorithm</label>
                    <select
                      disabled={!isAdmin}
                      value={editJwtAlgorithm}
                      onChange={(e) => isAdmin && setEditJwtAlgorithm(e.target.value)}
                      className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary disabled:bg-slate-50 disabled:text-text-secondary"
                    >
                      <option value="HS256">HS256</option>
                      <option value="RS256">RS256</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={!isAdmin}
                      value={editJwtKey}
                      onChange={(e) => isAdmin && setEditJwtKey(e.target.value)}
                      className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary read-only:bg-slate-50 read-only:text-text-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Secret <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditJwtSecret ? 'text' : 'password'}
                        required
                        readOnly={!isAdmin}
                        value={editJwtSecret}
                        onChange={(e) => isAdmin && setEditJwtSecret(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary read-only:bg-slate-50 read-only:text-text-secondary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditJwtSecret(!showEditJwtSecret)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        {showEditJwtSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* BASIC AUTH */}
              {editType === 'basic_auth' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={!isAdmin}
                      value={editUsername}
                      onChange={(e) => isAdmin && setEditUsername(e.target.value)}
                      className="w-full px-3 py-2 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary read-only:bg-slate-50 read-only:text-text-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        required
                        readOnly={!isAdmin}
                        value={editPassword}
                        onChange={(e) => isAdmin && setEditPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border-b border-border-light bg-transparent text-sm outline-none focus:border-brand-primary read-only:bg-slate-50 read-only:text-text-secondary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit */}
              {isAdmin ? (
                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-brand-primary text-white font-bold text-sm uppercase tracking-wide rounded flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" /> UPDATE CONNECTION
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingConnection(null)}
                  className="w-full py-3 mt-4 bg-slate-200 text-text-primary font-bold text-sm uppercase tracking-wide rounded flex items-center justify-center gap-2 hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  CLOSE
                </button>
              )}
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
