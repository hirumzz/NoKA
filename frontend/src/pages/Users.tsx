import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users as UsersIcon, 
  Trash2, 
  Shield, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    if (!window.confirm('Are you sure you want to delete this administrative user?')) return;
    setError('');
    try {
      await axios.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Users</h2>
          <p className="text-xs text-text-secondary mt-1">Manage administrative accounts and roles for this NOKA console instance</p>
        </div>
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
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={currentUser?.id === u.id}
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 rounded border border-border-light hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors text-text-secondary disabled:opacity-35 disabled:cursor-not-allowed"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
    </div>
  );
};
