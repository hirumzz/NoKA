import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  User, 
  Key, 
  Lock, 
  Shield, 
  Plug, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { CommentsSection } from '../components/CommentsSection';

interface Consumer {
  id: string;
  username?: string;
  custom_id?: string;
  tags?: string[];
  created_at: number;
}

interface KeyAuthCred {
  id: string;
  key: string;
  created_at: number;
}

interface BasicAuthCred {
  id: string;
  username: string;
  created_at: number;
}

interface JwtCred {
  id: string;
  key: string;
  secret: string;
  algorithm: string;
  rsa_public_key?: string;
  created_at: number;
}

interface Oauth2Cred {
  id: string;
  name: string;
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  created_at: number;
}

interface HmacAuthCred {
  id: string;
  username: string;
  secret: string;
  created_at: number;
}

interface AclGroup {
  id: string;
  group: string;
  created_at: number;
}

export const ConsumerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'credentials' | 'acls'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit details fields
  const [username, setUsername] = useState('');
  const [customId, setCustomId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Credentials list states
  const [keyAuths, setKeyAuths] = useState<KeyAuthCred[]>([]);
  const [basicAuths, setBasicAuths] = useState<BasicAuthCred[]>([]);
  const [jwts, setJwts] = useState<JwtCred[]>([]);
  const [oauth2s, setOauth2s] = useState<Oauth2Cred[]>([]);
  const [hmacAuths, setHmacAuths] = useState<HmacAuthCred[]>([]);
  const [acls, setAcls] = useState<AclGroup[]>([]);

  // Add credential form fields
  const [showAddCredForm, setShowAddCredForm] = useState<string | null>(null); // key-auth, basic-auth, jwt, oauth2, hmac-auth, acl
  const [newApiKey, setNewApiKey] = useState('');
  const [newBasicUser, setNewBasicUser] = useState('');
  const [newBasicPass, setNewBasicPass] = useState('');
  const [newJwtKey, setNewJwtKey] = useState('');
  const [newJwtSecret, setNewJwtSecret] = useState('');
  const [newJwtAlgorithm, setNewJwtAlgorithm] = useState('HS256');
  const [newJwtRsaPublicKey, setNewJwtRsaPublicKey] = useState('');
  const [newOauthName, setNewOauthName] = useState('');
  const [newOauthId, setNewOauthId] = useState('');
  const [newOauthSecret, setNewOauthSecret] = useState('');
  const [newOauthRedirectUris, setNewOauthRedirectUris] = useState('');
  const [newHmacUser, setNewHmacUser] = useState('');
  const [newHmacSecret, setNewHmacSecret] = useState('');
  const [newAclGroup, setNewAclGroup] = useState('');

  // Visibility states for forms
  const [showCredBasicPass, setShowCredBasicPass] = useState(false);
  const [showCredJwtSecret, setShowCredJwtSecret] = useState(false);
  const [showCredOauthSecret, setShowCredOauthSecret] = useState(false);
  const [showCredHmacSecret, setShowCredHmacSecret] = useState(false);

  // Visibility states for lists (using maps of credential ID to boolean)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  const toggleRevealSecret = (credId: string) => {
    setRevealedSecrets(prev => ({ ...prev, [credId]: !prev[credId] }));
  };

  useEffect(() => {
    fetchConsumerDetails();
  }, [id]);

  const fetchConsumerDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/kong/consumers/${id}`);
      const data = response.data;
      setConsumer(data);
      setUsername(data.username || '');
      setCustomId(data.custom_id || '');
      setTagsInput(data.tags ? data.tags.join(', ') : '');

      // Load sub-resources parallel
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch consumer details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubResources = async () => {
    try {
      const [keyResp, basicResp, jwtResp, oauthResp, hmacResp, aclResp] = await Promise.all([
        axios.get(`/api/kong/consumers/${id}/key-auth`).catch(() => ({ data: { data: [] } })),
        axios.get(`/api/kong/consumers/${id}/basic-auth`).catch(() => ({ data: { data: [] } })),
        axios.get(`/api/kong/consumers/${id}/jwt`).catch(() => ({ data: { data: [] } })),
        axios.get(`/api/kong/consumers/${id}/oauth2`).catch(() => ({ data: { data: [] } })),
        axios.get(`/api/kong/consumers/${id}/hmac-auth`).catch(() => ({ data: { data: [] } })),
        axios.get(`/api/kong/consumers/${id}/acls`).catch(() => ({ data: { data: [] } }))
      ]);
      setKeyAuths(keyResp.data?.data || []);
      setBasicAuths(basicResp.data?.data || []);
      setJwts(jwtResp.data?.data || []);
      setOauth2s(oauthResp.data?.data || []);
      setHmacAuths(hmacResp.data?.data || []);
      setAcls(aclResp.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const parsedTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t !== '') : [];

    const payload: any = {};
    if (username) payload.username = username;
    if (customId) payload.custom_id = customId;
    payload.tags = parsedTags;

    try {
      await axios.patch(`/api/kong/consumers/${id}`, payload);
      setSuccess('Details updated successfully!');
      fetchConsumerDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update consumer details');
    }
  };

  // Credentials add handlers
  const handleAddKeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: any = {};
      if (newApiKey) payload.key = newApiKey;
      await axios.post(`/api/kong/consumers/${id}/key-auth`, payload);
      setNewApiKey('');
      setShowAddCredForm(null);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate API Key');
    }
  };

  const handleAddBasicAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBasicUser || !newBasicPass) return;
    setError('');
    try {
      await axios.post(`/api/kong/consumers/${id}/basic-auth`, {
        username: newBasicUser,
        password: newBasicPass
      });
      setNewBasicUser('');
      setNewBasicPass('');
      setShowCredBasicPass(false);
      setShowAddCredForm(null);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add Basic Auth credentials');
    }
  };

  const handleAddJwt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload: any = {};
    if (newJwtKey) payload.key = newJwtKey;
    if (newJwtSecret) payload.secret = newJwtSecret;
    payload.algorithm = newJwtAlgorithm;
    if (newJwtAlgorithm === 'RS256' && newJwtRsaPublicKey) {
      payload.rsa_public_key = newJwtRsaPublicKey;
    }

    try {
      await axios.post(`/api/kong/consumers/${id}/jwt`, payload);
      setNewJwtKey('');
      setNewJwtSecret('');
      setNewJwtAlgorithm('HS256');
      setNewJwtRsaPublicKey('');
      setShowCredJwtSecret(false);
      setShowAddCredForm(null);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add JWT credentials');
    }
  };

  const handleAddOauth2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOauthName) return;
    setError('');
    const payload: any = { name: newOauthName };
    if (newOauthId) payload.client_id = newOauthId;
    if (newOauthSecret) payload.client_secret = newOauthSecret;
    const uris = newOauthRedirectUris ? newOauthRedirectUris.split(',').map(u => u.trim()).filter(u => u !== '') : [];
    payload.redirect_uris = uris;

    try {
      await axios.post(`/api/kong/consumers/${id}/oauth2`, payload);
      setNewOauthName('');
      setNewOauthId('');
      setNewOauthSecret('');
      setNewOauthRedirectUris('');
      setShowCredOauthSecret(false);
      setShowAddCredForm(null);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add OAuth2 credentials');
    }
  };

  const handleAddHmacAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload: any = {};
    if (newHmacUser) payload.username = newHmacUser;
    if (newHmacSecret) payload.secret = newHmacSecret;

    try {
      await axios.post(`/api/kong/consumers/${id}/hmac-auth`, payload);
      setNewHmacUser('');
      setNewHmacSecret('');
      setShowCredHmacSecret(false);
      setShowAddCredForm(null);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add HMAC credentials');
    }
  };

  const handleAddAclGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAclGroup) return;
    setError('');
    try {
      await axios.post(`/api/kong/consumers/${id}/acls`, { group: newAclGroup });
      setNewAclGroup('');
      setShowAddCredForm(null);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign group');
    }
  };

  // Delete credentials
  const handleDeleteCred = async (type: string, credId: string) => {
    if (!window.confirm('Are you sure you want to delete this credential?')) return;
    setError('');
    try {
      await axios.delete(`/api/kong/consumers/${id}/${type}/${credId}`);
      fetchSubResources();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete credential');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
        Loading consumer details...
      </div>
    );
  }

  if (!consumer) {
    return (
      <div className="p-6 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        Consumer not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Back nav & Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <Link to="/consumers" className="p-2 rounded border border-border-light hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <User className="w-5 h-5 text-brand-primary" /> 
            {consumer.username || consumer.custom_id || 'Unnamed Consumer'}
          </h2>
          <span className="text-[10px] text-text-muted font-mono font-medium block mt-0.5">Consumer ID: {consumer.id}</span>
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

      {/* Tabs list */}
      <div className="flex border-b border-border-light gap-2">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all uppercase tracking-wider ${
            activeTab === 'details' 
              ? 'border-brand-primary text-brand-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Details & Comments
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all uppercase tracking-wider ${
            activeTab === 'credentials' 
              ? 'border-brand-primary text-brand-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Credentials
        </button>
        <button
          onClick={() => setActiveTab('acls')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all uppercase tracking-wider ${
            activeTab === 'acls' 
              ? 'border-brand-primary text-brand-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          ACL Groups
        </button>
      </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm max-w-xl">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">Edit Details</h3>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Custom ID</label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="e.g. user_12345"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. premium, beta-user"
                  className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-brand-primary text-white font-bold text-xs uppercase hover:bg-brand-primary-hover shadow-sm transition-all"
              >
                Save Details
              </button>
            </form>
          </div>

          {/* Audit Comments Section */}
          <div className="max-w-xl">
            <CommentsSection referenceId={consumer.id} referenceType="consumer" />
          </div>
        </div>
      )}

      {/* Tab: Credentials */}
      {activeTab === 'credentials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Key Auth API Keys */}
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Key className="w-4 h-4 text-brand-primary" /> API Keys (Key-Auth)
              </h3>
              <button
                onClick={() => setShowAddCredForm(showAddCredForm === 'key-auth' ? null : 'key-auth')}
                className="p-1 rounded border border-border-light hover:bg-slate-50 text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showAddCredForm === 'key-auth' && (
              <form onSubmit={handleAddKeyAuth} className="p-3 bg-slate-50 rounded border border-border-light space-y-2 animate-slideDown">
                <label className="text-[9px] font-bold text-text-secondary uppercase">Custom API Key (optional)</label>
                <input
                  type="text"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary"
                />
                <div className="flex gap-1.5 justify-end">
                  <button type="button" onClick={() => setShowAddCredForm(null)} className="px-2.5 py-1 text-[10px] border rounded bg-white font-bold uppercase">Cancel</button>
                  <button type="submit" className="px-2.5 py-1 text-[10px] bg-brand-primary text-white rounded font-bold uppercase">Submit</button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light text-xs">
              {keyAuths.length > 0 ? (
                keyAuths.map(c => (
                  <div key={c.id} className="py-2.5 flex justify-between items-center gap-2">
                    <span className="font-mono bg-slate-50 px-2 py-1 border rounded select-all font-medium text-text-secondary truncate">{c.key}</span>
                    <button onClick={() => handleDeleteCred('key-auth', c.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-text-muted text-xs italic py-2">No API keys registered.</div>
              )}
            </div>
          </div>

          {/* Basic Auth */}
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-brand-primary" /> Basic Auth
              </h3>
              <button
                onClick={() => setShowAddCredForm(showAddCredForm === 'basic-auth' ? null : 'basic-auth')}
                className="p-1 rounded border border-border-light hover:bg-slate-50 text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showAddCredForm === 'basic-auth' && (
              <form onSubmit={handleAddBasicAuth} className="p-3 bg-slate-50 rounded border border-border-light space-y-3 animate-slideDown">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Username</label>
                  <input
                    type="text"
                    required
                    value={newBasicUser}
                    onChange={(e) => setNewBasicUser(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Password</label>
                  <div className="relative">
                    <input
                      type={showCredBasicPass ? 'text' : 'password'}
                      required
                      value={newBasicPass}
                      onChange={(e) => setNewBasicPass(e.target.value)}
                      className="w-full px-2 py-1.5 pr-8 rounded border border-border-light bg-white text-xs outline-none focus:border-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredBasicPass(!showCredBasicPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showCredBasicPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button type="button" onClick={() => setShowAddCredForm(null)} className="px-2.5 py-1 text-[10px] border rounded bg-white font-bold uppercase">Cancel</button>
                  <button type="submit" className="px-2.5 py-1 text-[10px] bg-brand-primary text-white rounded font-bold uppercase">Submit</button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light text-xs font-semibold">
              {basicAuths.length > 0 ? (
                basicAuths.map(c => (
                  <div key={c.id} className="py-2.5 flex justify-between items-center gap-2">
                    <div>
                      <p className="text-text-primary">Username: <span className="font-mono text-text-secondary select-all font-medium">{c.username}</span></p>
                    </div>
                    <button onClick={() => handleDeleteCred('basic-auth', c.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-text-muted text-xs italic py-2">No Basic Auth credentials registered.</div>
              )}
            </div>
          </div>

          {/* JWT Credentials */}
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-brand-primary" /> JWT Credentials
              </h3>
              <button
                onClick={() => setShowAddCredForm(showAddCredForm === 'jwt' ? null : 'jwt')}
                className="p-1 rounded border border-border-light hover:bg-slate-50 text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showAddCredForm === 'jwt' && (
              <form onSubmit={handleAddJwt} className="p-3 bg-slate-50 rounded border border-border-light space-y-3 animate-slideDown">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Key / ISS (optional)</label>
                  <input
                    type="text"
                    value={newJwtKey}
                    onChange={(e) => setNewJwtKey(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Algorithm</label>
                  <select
                    value={newJwtAlgorithm}
                    onChange={(e) => setNewJwtAlgorithm(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none font-semibold text-text-primary"
                  >
                    <option value="HS256">HS256</option>
                    <option value="RS256">RS256</option>
                  </select>
                </div>
                {newJwtAlgorithm === 'RS256' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-text-secondary uppercase">RSA Public Key (PEM format)</label>
                    <textarea
                      required
                      rows={3}
                      value={newJwtRsaPublicKey}
                      onChange={(e) => setNewJwtRsaPublicKey(e.target.value)}
                      placeholder="-----BEGIN PUBLIC KEY-----\n..."
                      className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none font-mono"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Secret (optional)</label>
                  <div className="relative">
                    <input
                      type={showCredJwtSecret ? 'text' : 'password'}
                      value={newJwtSecret}
                      onChange={(e) => setNewJwtSecret(e.target.value)}
                      placeholder={newJwtAlgorithm === 'RS256' ? "RSA Private Key (PEM format) if HS256 not used" : "Leave empty to auto-generate"}
                      className="w-full px-2 py-1.5 pr-8 rounded border border-border-light bg-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredJwtSecret(!showCredJwtSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showCredJwtSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button type="button" onClick={() => setShowAddCredForm(null)} className="px-2.5 py-1 text-[10px] border rounded bg-white font-bold uppercase">Cancel</button>
                  <button type="submit" className="px-2.5 py-1 text-[10px] bg-brand-primary text-white rounded font-bold uppercase">Submit</button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light text-xs font-semibold">
              {jwts.length > 0 ? (
                jwts.map(c => (
                  <div key={c.id} className="py-2.5 flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-text-primary font-bold flex items-center gap-2">
                        Key: <span className="font-mono text-text-secondary select-all font-medium">{c.key}</span>
                        <span className="px-1.5 py-0.25 rounded border border-indigo-200 bg-indigo-50 text-indigo-600 text-[9px] uppercase font-bold">{c.algorithm || 'HS256'}</span>
                      </p>
                      {c.secret && (
                        <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5">
                          Secret: <span className="font-mono font-medium text-text-secondary select-all">
                            {revealedSecrets[c.id] ? c.secret : '••••••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealSecret(c.id)}
                            className="text-text-muted hover:text-text-secondary"
                          >
                            {revealedSecrets[c.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </p>
                      )}
                      {c.rsa_public_key && <p className="text-[9px] text-text-muted mt-0.5 truncate font-mono">Public Key configured</p>}
                    </div>
                    <button onClick={() => handleDeleteCred('jwt', c.id)} className="text-red-500 hover:text-red-700 p-1 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-text-muted text-xs italic py-2">No JWT credentials registered.</div>
              )}
            </div>
          </div>

          {/* OAuth2 Credentials */}
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Plug className="w-4 h-4 text-brand-primary" /> OAuth2 Credentials
              </h3>
              <button
                onClick={() => setShowAddCredForm(showAddCredForm === 'oauth2' ? null : 'oauth2')}
                className="p-1 rounded border border-border-light hover:bg-slate-50 text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showAddCredForm === 'oauth2' && (
              <form onSubmit={handleAddOauth2} className="p-3 bg-slate-50 rounded border border-border-light space-y-3 animate-slideDown">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Application Name</label>
                  <input
                    type="text"
                    required
                    value={newOauthName}
                    onChange={(e) => setNewOauthName(e.target.value)}
                    placeholder="e.g. My Application"
                    className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Redirect URIs (comma separated)</label>
                  <input
                    type="text"
                    required
                    value={newOauthRedirectUris}
                    onChange={(e) => setNewOauthRedirectUris(e.target.value)}
                    placeholder="e.g. http://localhost/callback"
                    className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Client ID (optional)</label>
                  <input
                    type="text"
                    value={newOauthId}
                    onChange={(e) => setNewOauthId(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Client Secret (optional)</label>
                  <div className="relative">
                    <input
                      type={showCredOauthSecret ? 'text' : 'password'}
                      value={newOauthSecret}
                      onChange={(e) => setNewOauthSecret(e.target.value)}
                      placeholder="Leave empty to auto-generate"
                      className="w-full px-2 py-1.5 pr-8 rounded border border-border-light bg-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredOauthSecret(!showCredOauthSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showCredOauthSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button type="button" onClick={() => setShowAddCredForm(null)} className="px-2.5 py-1 text-[10px] border rounded bg-white font-bold uppercase">Cancel</button>
                  <button type="submit" className="px-2.5 py-1 text-[10px] bg-brand-primary text-white rounded font-bold uppercase">Submit</button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light text-xs font-semibold">
              {oauth2s.length > 0 ? (
                oauth2s.map(c => (
                  <div key={c.id} className="py-2.5 flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-text-primary font-bold">{c.name}</p>
                      <p className="text-[10px] text-text-muted mt-0.5 font-mono truncate">ID: {c.client_id}</p>
                      {c.client_secret && (
                        <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5">
                          Secret: <span className="font-mono font-medium text-text-secondary select-all">
                            {revealedSecrets[c.id] ? c.client_secret : '••••••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealSecret(c.id)}
                            className="text-text-muted hover:text-text-secondary"
                          >
                            {revealedSecrets[c.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </p>
                      )}
                      {c.redirect_uris && c.redirect_uris.length > 0 && (
                        <p className="text-[9px] text-text-muted mt-0.5 truncate">Redirects: {c.redirect_uris.join(', ')}</p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteCred('oauth2', c.id)} className="text-red-500 hover:text-red-700 p-1 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-text-muted text-xs italic py-2">No OAuth2 credentials registered.</div>
              )}
            </div>
          </div>

          {/* HMAC Auth Credentials */}
          <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Key className="w-4 h-4 text-brand-primary" /> HMAC-Auth Credentials
              </h3>
              <button
                onClick={() => setShowAddCredForm(showAddCredForm === 'hmac-auth' ? null : 'hmac-auth')}
                className="p-1 rounded border border-border-light hover:bg-slate-50 text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showAddCredForm === 'hmac-auth' && (
              <form onSubmit={handleAddHmacAuth} className="p-3 bg-slate-50 rounded border border-border-light space-y-3 animate-slideDown">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Username</label>
                  <input
                    type="text"
                    required
                    value={newHmacUser}
                    onChange={(e) => setNewHmacUser(e.target.value)}
                    placeholder="Enter HMAC Username"
                    className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-secondary uppercase">Secret (optional)</label>
                  <div className="relative">
                    <input
                      type={showCredHmacSecret ? 'text' : 'password'}
                      value={newHmacSecret}
                      onChange={(e) => setNewHmacSecret(e.target.value)}
                      placeholder="Leave empty to auto-generate"
                      className="w-full px-2 py-1.5 pr-8 rounded border border-border-light bg-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredHmacSecret(!showCredHmacSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showCredHmacSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button type="button" onClick={() => setShowAddCredForm(null)} className="px-2.5 py-1 text-[10px] border rounded bg-white font-bold uppercase">Cancel</button>
                  <button type="submit" className="px-2.5 py-1 text-[10px] bg-brand-primary text-white rounded font-bold uppercase">Submit</button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light text-xs font-semibold">
              {hmacAuths.length > 0 ? (
                hmacAuths.map(c => (
                  <div key={c.id} className="py-2.5 flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-text-primary font-bold">Username: <span className="font-mono text-text-secondary select-all font-medium">{c.username}</span></p>
                      {c.secret && (
                        <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5">
                          Secret: <span className="font-mono font-medium text-text-secondary select-all">
                            {revealedSecrets[c.id] ? c.secret : '••••••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealSecret(c.id)}
                            className="text-text-muted hover:text-text-secondary"
                          >
                            {revealedSecrets[c.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteCred('hmac-auth', c.id)} className="text-red-500 hover:text-red-700 p-1 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-text-muted text-xs italic py-2">No HMAC credentials registered.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tab: ACL Groups */}
      {activeTab === 'acls' && (
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4 max-w-lg">
          <div className="flex justify-between items-center border-b border-border-light pb-2">
            <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brand-primary" /> ACL Group Memberships
            </h3>
            <button
              onClick={() => setShowAddCredForm(showAddCredForm === 'acl' ? null : 'acl')}
              className="p-1 rounded border border-border-light hover:bg-slate-50 text-brand-primary"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showAddCredForm === 'acl' && (
            <form onSubmit={handleAddAclGroup} className="p-3 bg-slate-50 rounded border border-border-light space-y-2 animate-slideDown">
              <label className="text-[9px] font-bold text-text-secondary uppercase">Group Name</label>
              <input
                type="text"
                required
                value={newAclGroup}
                onChange={(e) => setNewAclGroup(e.target.value)}
                placeholder="e.g. premium"
                className="w-full px-2 py-1.5 rounded border border-border-light bg-white text-xs outline-none"
              />
              <div className="flex gap-1.5 justify-end">
                <button type="button" onClick={() => setShowAddCredForm(null)} className="px-2.5 py-1 text-[10px] border rounded bg-white font-bold uppercase">Cancel</button>
                <button type="submit" className="px-2.5 py-1 text-[10px] bg-brand-primary text-white rounded font-bold uppercase">Submit</button>
              </div>
            </form>
          )}

          <div className="divide-y divide-border-light text-xs font-semibold">
            {acls.length > 0 ? (
              acls.map(c => (
                <div key={c.id} className="py-2.5 flex justify-between items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded border border-brand-primary/20 bg-brand-primary/5 text-brand-primary text-[10px] uppercase font-bold">{c.group}</span>
                  <button onClick={() => handleDeleteCred('acls', c.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-text-muted text-xs italic py-2">No ACL group memberships registered.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
