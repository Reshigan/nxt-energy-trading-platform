import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiMail, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../lib/api';
import { Button, Input } from '../components/ui';

export default function VerifyEmail() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [params] = useSearchParams();
  const emailFromParam = params.get('email') || '';

  const [email, setEmail] = useState(emailFromParam);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (emailFromParam && !otp) {
      // Auto-send verification email
      authAPI.sendVerification(emailFromParam).catch(() => {});
    }
  }, [emailFromParam]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { setError('Please enter the verification code'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.verifyEmail({ email, otp });
      setVerified(true);
      toast.success('Email verified successfully!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid or expired code';
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setResending(true);
    try {
      await authAPI.sendVerification(email);
      toast.success('Verification code sent!');
    } catch { toast.error('Failed to resend code'); }
    setResending(false);
  };

  const cardCls = `w-full max-w-md rounded-2xl p-8 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.06]'} shadow-xl`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#0B1120]' : 'bg-[#EEF1F6]'}`} role="main" aria-label="Email verification">
      <div className={cardCls}>
        {verified ? (
          <div className="text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <FiCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Verified</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your email has been verified. You can now access all platform features.</p>
            <Link to="/"><Button fullWidth>Go to Dashboard</Button></Link>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <FiMail className="w-6 h-6 text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify Your Email</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {email ? <>We sent a code to <strong>{email}</strong></> : 'Enter your email to receive a verification code'}
              </p>
            </div>
            {!emailFromParam && (
              <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.co.za" icon={<FiMail className="w-4 h-4" />} required />
            )}
            <Input label="Verification Code" value={otp} onChange={e => { setOtp(e.target.value); setError(''); }} placeholder="Enter 6-digit code" error={error} required />
            {error && !otp && (
              <div className="flex items-center gap-2 text-xs text-rose-500">
                <FiAlertCircle className="w-3.5 h-3.5" /> {error}
              </div>
            )}
            <Button type="submit" fullWidth loading={loading}>Verify Email</Button>
            <div className="text-center">
              <button type="button" onClick={handleResend} disabled={resending} className="text-sm text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50">
                {resending ? 'Sending...' : "Didn't receive a code? Resend"}
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
