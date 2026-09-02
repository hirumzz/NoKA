import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Trash2, 
  Edit3, 
  AlertCircle,
  CheckCircle,
  X,
  Info,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  admin: boolean;
  active: boolean;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  node?: number; // Active connection ID
  createdAt: string;
  updatedAt: string;
}

interface ConnectionData {
  id: number;
  name: string;
  kong_admin_url: string;
}

export const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { confirm } = useConfirm();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Edit states
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [activeConnection, setActiveConnection] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [role, setRole] = useState('admin');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  useEffect(() => {
    fetchUserData();
    fetchConnections();
  }, [id]);

  const fetchUserData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/users/${id}`);
      const data = response.data;
      setUser(data);
      
      // Initialize edit fields
      setUsername(data.username || '');
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setEmail(data.email || '');
      setAvatar(data.avatar || '');
      setActiveConnection(data.node || '');
      setIsActive(data.active);
      setRole(data.role || 'admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch user details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await axios.get('/api/connections');
      setConnections(response.data || []);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
        setSuccess('Avatar loaded! Click Save Changes to update your profile.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (password && password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    setSuccess('');
    try {
      await axios.patch(`/api/users/${id}`, {
        username,
        firstName,
        lastName,
        email,
        avatar,
        node: activeConnection === '' ? null : Number(activeConnection),
        active: isActive,
        role,
        password: password || undefined
      });
      
      setSuccess('User updated successfully');
      setEditMode(false);
      setPassword('');
      setPasswordConfirm('');
      fetchUserData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user profile? This account will permanently lose access.',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`/api/users/${id}`);
      navigate('/users');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
        Loading user profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        User not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl font-sans">
      {/* Page Header (Breadcrumbs style) */}
      <div className="bg-slate-100 p-6 rounded-md">
        <h1 className="text-xl font-bold tracking-tight text-slate-700">User profile</h1>
        <div className="text-xs font-medium text-emerald-500 mt-1">
          users <span className="text-slate-400">/ profile</span>
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

      <div className="flex flex-col md:flex-row gap-8 mt-8">
        {/* Title and Buttons Area */}
        <div className="flex-1 flex justify-between items-start mb-6 md:mb-0">
          <h2 className="text-3xl font-bold text-slate-700">{user.username}</h2>
          
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button 
                  onClick={handleSave}
                  className="px-4 py-1.5 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> SAVE
                </button>
                <button 
                  onClick={() => setEditMode(false)}
                  className="px-4 py-1.5 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> CANCEL
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setEditMode(true)}
                  className="px-4 py-1.5 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> EDIT
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={currentUser?.id === user.id}
                  className="px-4 py-1.5 flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white text-xs font-bold rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> DELETE
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-12 mt-4">
        {/* Avatar Section */}
        <div className="w-full md:w-64 flex-shrink-0 flex justify-center md:justify-start">
          <div className="w-48 h-48 rounded-full border border-slate-200 border-dashed p-2 flex items-center justify-center bg-white shadow-sm overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            ) : (
              <svg className="w-32 h-32 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="flex-1 w-full max-w-2xl">
          {!editMode ? (
            <div className="space-y-6 text-sm text-slate-600">
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">Username</div>
                <div className="col-span-2">{user.username}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">First Name</div>
                <div className="col-span-2">{user.firstName || '-'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">Last Name</div>
                <div className="col-span-2">{user.lastName || '-'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">Avatar Photo</div>
                <div className="col-span-2 text-slate-400">Not specified</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">Email</div>
                <div className="col-span-2 text-emerald-600 font-medium">{user.email}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">Role</div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-300 text-white text-[10px] font-bold uppercase">
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">Created at</div>
                <div className="col-span-2">{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-100 pb-3">
                <div className="font-semibold text-slate-500">Last update</div>
                <div className="col-span-2">{new Date(user.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info Block */}
              <div className="bg-slate-50 rounded-t border border-slate-200">
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Info
                </div>
                <div className="p-4 space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">Username</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="col-span-2 w-full px-3 py-1.5 border-b-2 border-emerald-400 focus:border-emerald-500 outline-none bg-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">First Name</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="col-span-2 w-full px-3 py-1.5 border-b border-slate-300 focus:border-emerald-400 outline-none bg-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="col-span-2 w-full px-3 py-1.5 border-b border-slate-300 focus:border-emerald-400 outline-none bg-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">Avatar Photo</label>
                    <div className="col-span-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="text-xs w-full px-3 py-1.5 border border-slate-300 rounded bg-transparent"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Select an image to upload and update your profile photo.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="col-span-2 w-full px-3 py-1.5 border-b border-slate-300 focus:border-emerald-400 outline-none bg-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">Active connection</label>
                    <select 
                      value={activeConnection}
                      onChange={(e) => setActiveConnection(e.target.value === '' ? '' : Number(e.target.value))}
                      className="col-span-2 w-full px-3 py-1.5 border-b border-slate-300 focus:border-emerald-400 outline-none bg-transparent text-slate-600"
                    >
                      <option value="">-- No Active Connection --</option>
                      {connections.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} | {c.kong_admin_url}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="bg-slate-100 p-4 rounded border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Is this user active?</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-5 w-12 items-center rounded-sm transition-colors ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute ${isActive ? 'left-1 text-white' : 'right-1 text-slate-500'} text-[9px] font-bold select-none pointer-events-none uppercase`}>
                    {isActive ? 'YES' : 'NO'}
                  </span>
                  <span
                    className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                      isActive ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Role */}
              <div className="bg-slate-50 p-4 rounded border border-slate-200 grid grid-cols-1 sm:grid-cols-3 items-center">
                <span className="text-xs font-semibold text-slate-600">User Role <span className="text-red-500">*</span></span>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="col-span-2 w-full px-3 py-1.5 border-b border-slate-300 focus:border-emerald-400 outline-none bg-transparent text-slate-600"
                  disabled={currentUser?.id === user.id}
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {/* Security Block */}
              <div className="bg-slate-50 rounded border border-slate-200">
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Security
                </div>
                <div className="p-4 space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">Password</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep unchanged"
                      className="col-span-2 w-full px-3 py-1.5 border-b border-slate-300 focus:border-emerald-400 outline-none bg-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                    <label className="font-semibold text-slate-600 text-xs">Password Confirmation</label>
                    <input 
                      type="password" 
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="col-span-2 w-full px-3 py-1.5 border-b border-slate-300 focus:border-emerald-400 outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
