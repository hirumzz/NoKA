import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4 relative">
      <div className="w-full max-w-md">
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
          <h3 className="text-lg font-bold text-text-primary mb-6 uppercase tracking-wide">Sign In</h3>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Username or Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin or admin@noka.test"
                  className="w-full pl-10 pr-4 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium placeholder:text-text-muted transition-colors"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium placeholder:text-text-muted transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs shadow-sm hover:scale-[1.005] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer uppercase tracking-wider"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Setup Redirect Link */}
          <div className="text-center mt-6 text-xs font-medium text-text-secondary">
            First time setting up?{' '}
            <Link to="/register" className="text-brand-primary hover:text-brand-primary-hover font-bold transition-colors">
              Create Admin Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
