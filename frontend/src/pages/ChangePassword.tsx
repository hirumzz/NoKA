import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, ShieldCheck, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export const ChangePassword: React.FC = () => {
  const { user, setUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password validation checks
  const hasMinLength = password.length >= 7;
  const passwordsMatch = password.length > 0 && password === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('Password must be at least 7 characters long');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/change-initial-password', {
        password,
        password_confirmation: passwordConfirm,
      });

      if (response.data?.user) {
        setUser(response.data.user);
      } else if (user) {
        setUser({ ...user, require_password_change: false });
      }

      addToast('success', 'Password successfully updated! Welcome to NOKA.', 'Account Secured');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to update password. Please try again.';
      setError(msg);
      addToast('error', msg, 'Update Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4 relative">
      <div className="w-full max-w-md">
        {/* Brand Logo */}
        <div className="flex flex-col items-center justify-center mb-8 animate-fadeIn">
          <h1 className="text-4xl font-black text-brand-primary tracking-wider">NOKA</h1>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mt-1">Nocta Kong Admin</p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-xl border border-border-light shadow-xl animate-scaleUp">
          <div className="flex items-center gap-3 mb-6 border-b border-border-light pb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">Set Permanent Password</h3>
              <p className="text-xs text-text-muted mt-0.5">Please update your temporary password to secure your account.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new permanent password"
                  className="w-full pl-9 pr-10 py-2.5 rounded border border-border-light text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all text-text-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-10 py-2.5 rounded border border-border-light text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all text-text-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checklist Rules */}
            <div className="p-3 bg-slate-50 rounded-lg border border-border-light space-y-2 mt-2">
              <div className="flex items-center gap-2 text-xs">
                {hasMinLength ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={`text-[11px] font-medium ${hasMinLength ? 'text-emerald-800' : 'text-text-secondary'}`}>
                  At least 7 characters long
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {passwordsMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className={`text-[11px] font-medium ${passwordsMatch ? 'text-emerald-800' : 'text-text-secondary'}`}>
                  Passwords match
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !hasMinLength || !passwordsMatch}
              className="w-full py-3 mt-4 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs shadow-sm hover:scale-[1.005] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer uppercase tracking-wider"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Save & Proceed to Dashboard'
              )}
            </button>

            {/* Sign out link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={logout}
                className="text-xs text-text-muted hover:text-red-500 font-semibold transition-colors cursor-pointer"
              >
                Sign out instead
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
