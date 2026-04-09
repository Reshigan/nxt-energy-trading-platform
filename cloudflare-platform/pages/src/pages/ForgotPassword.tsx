import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiMail, FiLock, FiArrowLeft, FiCheck } from '../lib/fi-icons-shim';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../lib/api';
import { Button, Input } from '../components/ui';

export default function ForgotPassword() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [params] = useSearchParams();
  const resetMode = params.get('mode') === 'reset';
  const emailFromParam = params.get('email') || '';

  const [step, setStep] = useState<'request' | 'verify' | 'done'>(resetMode ? 'verify' : 'request');
  const [email, setEmail] = useState(emailFromParam);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErrors({ email: 'Email is required' }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErrors({ email: 'Invalid email address' }); return; }
    setLoading(true); setErrors({});
    try {
      await authAPI.forgotPassword(email);
      toast.success('Reset code sent to your email');
      setStep('verify');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send reset code');
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!otp.trim()) errs.otp = 'OTP code is required';
    if (!newPassword) errs.newPassword = 'Password is required';
    if (newPassword.length < 8) errs.newPassword = 'Minimum 8 characters';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setErrors({});
    try {
      await authAPI.resetPassword({ email, otp, new_password: newPassword });
      toast.success('Password reset successfully');
      setStep('done');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reset password');
    }
    setLoading(false);
  };

  const cardCls = `w-full max-w-md rounded-2xl p-8 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.06]'} shadow-xl`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#0B1120]' : 'bg-[#EEF1F6]'}`} role="main" aria-label="Password reset">
      <div className={cardCls}>
        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <FiMail className="w-6 h-6 text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forgot Password</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Enter your email and we'll send you a reset code</p>
            </div>
            <Input label="Email Address" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors({}); }} error={errors.email} placeholder="you@company.co.za" icon={<FiMail className="w-4 h-4" />} required />
            <Button type="submit" fullWidth loading={loading}>Send Reset Code</Button>
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors">
              <FiArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleReset} className="space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <FiLock className="w-6 h-6 text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Enter the code sent to <strong>{email}</strong></p>
            </div>
            <Input label="Reset Code (OTP)" value={otp} onChange={e => { setOtp(e.target.value); setErrors({}); }} error={errors.otp} placeholder="Enter 6-digit code" required />
            <Input label="New Password" type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setErrors({}); }} error={errors.newPassword} placeholder="Minimum 8 characters" icon={<FiLock className="w-4 h-4" />} required />
            <Input label="Confirm Password" type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setErrors({}); }} error={errors.confirmPassword} placeholder="Re-enter password" icon={<FiLock className="w-4 h-4" />} required />
            <Button type="submit" fullWidth loading={loading}>Reset Password</Button>
            <button type="button" onClick={() => setStep('request')} className="flex items-center justify-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors w-full">
              <FiArrowLeft className="w-3.5 h-3.5" /> Use different email
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <FiCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Password Reset</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your password has been successfully reset. You can now log in with your new password.</p>
            <Link to="/login">
              <Button fullWidth>Go to Login</Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
