import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [disabledModalOpen, setDisabledModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await axios.get('/info');
        setSignupEnabled(!!response.data?.signup_enabled);
      } catch (err) {
        console.error('Failed to fetch info:', err);
      }
    };
    fetchInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShake(false);
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      
      const errMsg = err.response?.data?.message || err.message;
      
      if (errMsg === 'ACCOUNT_DISABLED') {
        setDisabledModalOpen(true);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500); // reset shake animation
        addToast('error', errMsg || 'Invalid username or password', 'Login Failed');
      }
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
        <div className={`bg-white p-8 rounded-lg border border-border-light card-shadow ${shake ? 'animate-shake' : ''}`}>
          <h3 className="text-lg font-bold text-text-primary mb-6 uppercase tracking-wide">Sign In</h3>

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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded border border-border-light bg-slate-50 focus:border-brand-primary outline-none text-xs font-medium placeholder:text-text-muted transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
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
          {signupEnabled && (
            <div className="text-center mt-6 text-xs font-medium text-text-secondary">
              First time setting up?{' '}
              <Link to="/register" className="text-brand-primary hover:text-brand-primary-hover font-bold transition-colors">
                Create Admin Account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Disabled Account Modal */}
      {disabledModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl border border-border-light w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-center text-lg font-bold text-text-primary mb-2">Account Disabled</h3>
              <p className="text-center text-xs text-text-secondary leading-relaxed">
                Your account has been deactivated by an administrator. You cannot log in or access the NOKA console at this time.
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setDisabledModalOpen(false)}
                  className="px-6 py-2.5 rounded bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
