import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, User, Activity, AlertCircle, ArrowLeft } from 'lucide-react';

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
      // Registration successful, redirect to login
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to register admin user. Make sure no other admin is registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark relative overflow-hidden px-4 py-12">
      {/* Decorative Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-xl shadow-brand-primary/20 mb-3">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
            Setup Admin Account
          </h2>
          <p className="text-sm text-text-muted mt-1">Configure your primary system administrator</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl border border-border-dark shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
          
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Admin Registration</h3>
            <Link to="/login" className="flex items-center text-xs text-text-muted hover:text-text-primary transition-colors duration-200">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
            </Link>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-brand-accent/20 bg-brand-accent/5 text-brand-accent text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 outline-none transition-all duration-200 placeholder:text-text-muted text-sm"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 outline-none transition-all duration-200 placeholder:text-text-muted text-sm"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 outline-none transition-all duration-200 placeholder:text-text-muted text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@konga.test"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 outline-none transition-all duration-200 placeholder:text-text-muted text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Password (Min 7 chars)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={7}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 outline-none transition-all duration-200 placeholder:text-text-muted text-sm"
                />
              </div>
            </div>

            {/* Password Confirm */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-dark/50 border border-border-dark focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 outline-none transition-all duration-200 placeholder:text-text-muted text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center text-sm"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
