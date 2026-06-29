import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, User, AlertCircle, ArrowLeft } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/register', {
        username,
        email,
        password,
        password_confirmation: passwordConfirm,
        firstName,
        lastName
      });
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to register admin user. Make sure no other admin is registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src="/conga.svg" alt="NOKA Logo" className="w-16 h-16 object-contain mb-3" />
          <h2 className="text-3xl font-extrabold tracking-wider text-brand-primary font-montserrat uppercase">
            NOKA
          </h2>
          <p className="text-xs text-text-secondary mt-1 font-bold uppercase tracking-wider">Nocta Kong Admin</p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-lg border border-border-light card-shadow">
          <div className="flex items-center justify-between mb-6 border-b border-border-light pb-4">
            <h3 className="text-lg font-bold text-text-primary uppercase tracking-wide">Register Admin</h3>
            <Link to="/login" className="flex items-center text-xs font-bold text-text-secondary hover:text-brand-primary transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
            </Link>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="w-full px-3 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium transition-colors"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className="w-full px-3 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium transition-colors"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@noka.test"
                  className="w-full pl-10 pr-4 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Password (Min 7 chars)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={7}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium transition-colors"
                />
              </div>
            </div>

            {/* Password Confirm */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs shadow-sm hover:scale-[1.005] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer uppercase tracking-wider"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Administrator'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
