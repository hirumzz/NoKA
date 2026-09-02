import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users as UsersIcon, 
  Trash2, 
  Shield, 
  AlertCircle,
  Plus,
  X
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
}

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { confirm } = useConfirm();
  const isAdmin = !!(currentUser?.admin || currentUser?.role === 'admin' || currentUser?.role === 'superadmin');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    role: 'developer'
  });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (id: number, newRole: string) => {
    setError('');
    try {
      await axios.patch(`/api/users/${id}`, { role: newRole });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (id: number) => {
    const ok = await confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this administrative user? This account will permanently lose access.',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    setError('');
    try {
      await axios.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    setError('');
    try {
      await axios.patch(`/api/users/${id}`, { active: !currentStatus });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (addForm.password !== addForm.passwordConfirm) {
      return setAddError('Passwords do not match');
    }
    if (addForm.password.length < 7) {
      return setAddError('Password must be at least 7 characters');
    }
    setAdding(true);
    try {
      await axios.post('/api/auth/signup', {
        username: addForm.username,
        email: addForm.email,
        password: addForm.password,
        password_confirmation: addForm.passwordConfirm,
        firstName: addForm.firstName,
        lastName: addForm.lastName,
        role: addForm.role
      });
      setShowAddModal(false);
      setAddForm({ username: '', email: '', password: '', passwordConfirm: '', firstName: '', lastName: '', role: 'developer' });
      fetchUsers();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddModal(false);
    };
    if (showAddModal) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAddModal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Users</h2>
          <p className="text-xs text-text-secondary mt-1">Manage administrative accounts and roles for this NOKA console instance</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-brand-primary text-white px-4 py-2 rounded text-xs font-bold hover:bg-brand-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            ADD USER
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Users List Table */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            Loading users...
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Username</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-indigo-100 object-cover" />
                        ) : (
                          <div className="p-2 rounded bg-indigo-50 text-indigo-600">
                            <UsersIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <Link to={`/users/${u.id}`} className="font-bold text-sm block text-blue-600 hover:underline">
                            {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'No Name'}
                          </Link>
                          <span className="text-[10px] text-text-muted font-mono block select-all">User ID: {u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      <Link to={`/users/${u.id}`} className="text-blue-600 hover:underline">
                        {u.username}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-text-secondary">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-text-muted" />
                        {isAdmin ? (
                          <select
                            disabled={currentUser?.id === u.id}
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="px-2 py-1 rounded border border-border-light bg-slate-50 text-xs font-bold text-text-primary outline-none focus:border-brand-primary disabled:opacity-65"
                          >
                            <option value="admin">Administrator</option>
                            <option value="viewer">Viewer</option>
                            <option value="developer">Developer</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold capitalize">
                            {u.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={currentUser?.id === u.id}
                          onClick={() => handleToggleActive(u.id, u.active)}
                          className={`relative inline-flex h-5 w-12 items-center rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={u.active ? 'Disable user' : 'Enable user'}
                        >
                          <span className={`absolute ${u.active ? 'left-1 text-white' : 'right-1 text-slate-500'} text-[9px] font-bold select-none pointer-events-none uppercase`}>
                            {u.active ? 'YES' : 'NO'}
                          </span>
                          <span
                            className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                              u.active ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin ? (
                          <button
                            disabled={currentUser?.id === u.id}
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary disabled:opacity-35 disabled:cursor-not-allowed"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-text-muted font-medium italic">Read-only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs font-medium">
            No administrative users found.
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col"
            style={{ maxHeight: '85vh' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-brand-primary" />
                Create New User
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded p-1 transition-colors border border-transparent hover:border-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar">
              {addError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              
              <form id="add-user-form" onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">First Name</label>
                    <input 
                      type="text" 
                      value={addForm.firstName} 
                      onChange={e => setAddForm({...addForm, firstName: e.target.value})}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded outline-none focus:border-brand-primary transition-colors bg-slate-50 focus:bg-white"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Last Name</label>
                    <input 
                      type="text" 
                      value={addForm.lastName} 
                      onChange={e => setAddForm({...addForm, lastName: e.target.value})}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded outline-none focus:border-brand-primary transition-colors bg-slate-50 focus:bg-white"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={addForm.username} 
                    onChange={e => setAddForm({...addForm, username: e.target.value})}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded outline-none focus:border-brand-primary transition-colors bg-slate-50 focus:bg-white font-mono"
                    placeholder="e.g. john.doe"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    required 
                    value={addForm.email} 
                    onChange={e => setAddForm({...addForm, email: e.target.value})}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded outline-none focus:border-brand-primary transition-colors bg-slate-50 focus:bg-white"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password <span className="text-red-500">*</span></label>
                    <input 
                      type="password" 
                      required 
                      minLength={7}
                      value={addForm.password} 
                      onChange={e => setAddForm({...addForm, password: e.target.value})}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded outline-none focus:border-brand-primary transition-colors bg-slate-50 focus:bg-white font-mono"
                      placeholder="Min. 7 chars"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                    <input 
                      type="password" 
                      required 
                      minLength={7}
                      value={addForm.passwordConfirm} 
                      onChange={e => setAddForm({...addForm, passwordConfirm: e.target.value})}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded outline-none focus:border-brand-primary transition-colors bg-slate-50 focus:bg-white font-mono"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">System Role <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={addForm.role}
                    onChange={e => setAddForm({...addForm, role: e.target.value})}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded outline-none focus:border-brand-primary transition-colors bg-slate-50 focus:bg-white font-semibold"
                  >
                    <option value="admin">Administrator</option>
                    <option value="developer">Developer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                    <strong className="text-slate-700">Administrator</strong> has full access. <strong className="text-slate-700">Developer</strong> can manage routes and plugins but cannot delete them or change global settings. <strong className="text-slate-700">Viewer</strong> has read-only access.
                  </p>
                </div>
              </form>
            </div>
            
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-slate-800 transition-colors"
                disabled={adding}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-user-form"
                disabled={adding}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-primary border border-transparent rounded hover:bg-brand-primary/90 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
              >
                {adding && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
