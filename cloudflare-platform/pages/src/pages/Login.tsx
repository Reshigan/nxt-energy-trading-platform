import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiZap, FiMail, FiLock } from 'react-icons/fi';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      login(res.data.data.token, res.data.data.user);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-8"
      >
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center mr-3">
            <FiZap className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">NXT Energy</h1>
        </div>

        <h2 className="text-xl font-semibold text-center mb-6">Sign In</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="you@company.co.za"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-cyan-400 hover:text-cyan-300">Register</Link>
        </p>
      </motion.div>
    </div>
  );
}
