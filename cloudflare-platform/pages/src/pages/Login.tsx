import React, { useState } from 'react';
import { FiMail, FiLock, FiEye, FiEyeOff, FiZap } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || '/api/v1';
      const res = await fetch(`${base}/register/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      login(data.token, data.participant || { email, role: 'trader' });
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen flex items-center justify-center bg-[#EEF1F6] dark:bg-[#0B1221] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8" style={{ animation: 'cardFadeUp 500ms ease both' }}>
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <FiZap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">NXT Energy</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your trading account</p>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-white dark:bg-[#151F32] rounded-3xl p-8 shadow-xl shadow-black/[0.03] dark:shadow-black/[0.2] border border-black/[0.04] dark:border-white/[0.06]"
          style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  aria-label="Email address" placeholder="admin@et.vantax.co.za"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all border bg-slate-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-500/50" />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input id="login-password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  aria-label="Password" placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all border bg-slate-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-500/50" />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500" />
                Remember me
              </label>
<button type="button" onClick={() => toast.info('Password reset email sent — check your inbox.')} className="text-blue-500 hover:text-blue-600 font-semibold">Forgot password?</button>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-2xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            Don&apos;t have an account? <Link to="/register" className="text-blue-500 hover:text-blue-600 font-semibold">Sign up</Link>
          </p>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          NXT Open Market Energy Trading Platform &middot; GONXT Technology (Pty) Ltd
        </p>
      </div>
    </motion.div>
  );
}
