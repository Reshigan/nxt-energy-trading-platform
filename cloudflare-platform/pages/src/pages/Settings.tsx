import React, { useState, useCallback } from 'react';
import { FiUser, FiBell, FiMoon, FiKey, FiLock, FiGlobe, FiShield, FiDownload, FiTrash2, FiLoader, FiSmartphone, FiCreditCard } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { popiaAPI, authAPI, subscriptionsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { formatZAR } from '../lib/format';
import { motion } from 'framer-motion';
import Modal from '../components/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';

const SECTIONS = ['Profile', 'Notifications', 'Appearance', 'Security', '2FA', 'Billing', 'API Keys', 'Privacy (POPIA)', 'Language'] as const;

export default function Settings() {
  const toast = useToast();
  const { isDark, toggleTheme } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activeSection, setActiveSection] = useState('Profile');
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', company: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPw: '' });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ 'Trade Confirmations': true, 'Order Fills': true, 'Carbon Retirements': true, 'Contract Updates': true, 'Invoice Reminders': true, 'System Alerts': true, 'Marketing Updates': false });
  // F7: 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState<{ secret?: string; qr_url?: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [enabling2FA, setEnabling2FA] = useState(false);
  // F11: Billing state
  const [billingLoading, setBillingLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<{ plan_name?: string; status?: string; billing_cycle?: string; next_billing?: string } | null>(null);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; price: number; features: string[] }>>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveProfile = useCallback(async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) { toast.error('Name and email are required'); return; }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ name: profileForm.name, email: profileForm.email, company_name: profileForm.company, phone: profileForm.phone });
      if (res.data?.success) toast.success('Profile updated');
      else toast.error(res.data?.error || 'Failed to save profile');
    } catch { toast.error('Failed to save profile'); }
    setSaving(false);
  }, [profileForm, toast]);

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) { toast.error('All fields required'); return; }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setChangingPw(true);
    try {
      const res = await authAPI.changePassword({ current_password: pwForm.current, new_password: pwForm.newPw });
      if (res.data?.success) { toast.success('Password changed'); setShowChangePassword(false); setPwForm({ current: '', newPw: '', confirm: '' }); }
      else toast.error(res.data?.error || 'Failed to change password');
    } catch { toast.error('Failed to change password'); }
    setChangingPw(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await authAPI.updateProfile({ status: 'deleted' });
      if (res.data?.success) { toast.success('Account deleted'); window.location.href = '/'; }
      else toast.error(res.data?.error || 'Failed to delete account');
    } catch { toast.error('Failed to delete account'); }
    setDeleting(false);
  };

  const changePassword = useCallback(async () => {
    if (!passwordForm.current || !passwordForm.newPw) { toast.error('Both fields are required'); return; }
    if (passwordForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res = await authAPI.changePassword({ current_password: passwordForm.current, new_password: passwordForm.newPw });
      if (res.data?.success) toast.success('Password changed');
      else toast.error(res.data?.error || 'Failed to change password');
    } catch { toast.error('Failed to change password'); }
    setSaving(false);
    setPasswordForm({ current: '', newPw: '' });
  }, [passwordForm, toast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Settings page">
      <div style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className={`cp-card !p-3 h-fit ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} role="tablist" aria-label="Settings sections" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          {SECTIONS.map(s => {
            const icons: Record<string, React.ReactNode> = {
              Profile: <FiUser className="w-4 h-4" />, Notifications: <FiBell className="w-4 h-4" />,
              Appearance: <FiMoon className="w-4 h-4" />, 'API Keys': <FiKey className="w-4 h-4" />,
              Security: <FiLock className="w-4 h-4" />, '2FA': <FiSmartphone className="w-4 h-4" />, Billing: <FiCreditCard className="w-4 h-4" />, 'Privacy (POPIA)': <FiShield className="w-4 h-4" />, Language: <FiGlobe className="w-4 h-4" />,
            };
            return (
              <button key={s} role="tab" aria-selected={activeSection === s} onClick={() => setActiveSection(s)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === s ? c('bg-white/[0.08] text-white', 'bg-blue-50 text-blue-700') : c('text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]', 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}`}>
                {icons[s]} {s}
              </button>
            );
          })}
        </nav>

        <div className="lg:col-span-3">
          {activeSection === 'Profile' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Profile Settings</h3>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label htmlFor="settings-name" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Full Name</label>
                  <input id="settings-name" type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" aria-label="Full name"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                </div>
                <div>
                  <label htmlFor="settings-email" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                  <input id="settings-email" type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} placeholder="Your email" aria-label="Email address"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                </div>
                <div>
                  <label htmlFor="settings-company" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Company</label>
                  <input id="settings-company" type="text" value={profileForm.company} onChange={e => setProfileForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" aria-label="Company"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                </div>
                <div>
                  <label htmlFor="settings-phone" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Phone</label>
                  <input id="settings-phone" type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="+27 11 123 4567" aria-label="Phone number"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                </div>
                <button onClick={saveProfile} disabled={saving} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2" aria-label="Save profile">
                  {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : null} Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'Notifications' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Notification Preferences</h3>
              <div className="space-y-4">
                {['Trade Confirmations', 'Order Fills', 'Carbon Retirements', 'Contract Updates', 'Invoice Reminders', 'System Alerts', 'Marketing Updates'].map(n => (
                  <div key={n} className={`flex items-center justify-between py-3 px-4 rounded-xl ${c('bg-white/[0.02]', 'bg-slate-50')}`}>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{n}</span>
                    <button onClick={() => setNotifPrefs(p => ({ ...p, [n]: !p[n] }))} role="switch" aria-checked={notifPrefs[n] ?? false} aria-label={`Toggle ${n}`} className={`relative w-10 h-6 rounded-full transition-colors ${notifPrefs[n] ? 'bg-blue-500' : c('bg-white/[0.08]', 'bg-slate-200')}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifPrefs[n] ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'Appearance' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Appearance</h3>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Theme</label>
                  <div className="flex gap-3">
                    {['Light', 'Dark', 'System'].map(t => (
                      <button key={t} onClick={() => { if ((t === 'Dark' && !isDark) || (t === 'Light' && isDark)) toggleTheme(); }}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                          (t === 'Dark' && isDark) || (t === 'Light' && !isDark)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : c('border-white/[0.06] text-slate-400 hover:border-white/[0.12]', 'border-black/[0.06] text-slate-500 hover:border-black/[0.12]')
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Security' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Security</h3>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label htmlFor="settings-current-pw" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Current Password</label>
                  <input id="settings-current-pw" type="password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" aria-label="Current password"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400')}`} />
                </div>
                <div>
                  <label htmlFor="settings-new-pw" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">New Password</label>
                  <input id="settings-new-pw" type="password" value={passwordForm.newPw} onChange={e => setPasswordForm(p => ({ ...p, newPw: e.target.value }))} placeholder="Enter new password" aria-label="New password"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400')}`} />
                </div>
                <button onClick={changePassword} disabled={saving} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2" aria-label="Change password">
                  {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : null} Change Password
                </button>
              </div>
            </div>
          )}

          {activeSection === 'Privacy (POPIA)' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Privacy & POPIA Compliance</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Protection of Personal Information Act (POPIA) — your data rights under South African law.</p>
              <div className="space-y-4 max-w-lg">
                <div className={`p-4 rounded-xl ${c('bg-white/[0.04]', 'bg-slate-50')}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiShield className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Data Processing Consent</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    By using this platform, you consent to the processing of your personal information in accordance with POPIA. You may withdraw consent at any time.
                  </p>
                  <div className="flex gap-2">
                        <button onClick={async () => { try { await popiaAPI.giveConsent(true, '1.0'); toast.success('Consent given'); } catch {
          toast.error('Failed to update consent');
        } }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
                      Give Consent
                    </button>
                        <button onClick={async () => { try { await popiaAPI.giveConsent(false); toast.success('Consent withdrawn'); } catch {
          toast.error('Failed to withdraw consent');
        } }}
                      className={`px-4 py-2 rounded-xl text-xs font-medium ${c('bg-white/[0.06] text-slate-300', 'bg-slate-100 text-slate-600')}`}>
                      Withdraw Consent
                    </button>
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${c('bg-white/[0.04]', 'bg-slate-50')}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiDownload className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Export My Data (Section 23)</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Download all personal data we hold about you. This includes profile, trades, contracts, and audit records.
                  </p>
                  <button onClick={async () => {
                    try {
                      const res = await popiaAPI.exportData();
                      const blob = new Blob([JSON.stringify(res.data?.data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'popia-data-export.json';
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
      toast.error('Failed to export data');
    }
                  }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-1">
                    <FiDownload className="w-3 h-3" /> Export All Data
                  </button>
                </div>

                <div className={`p-4 rounded-xl border border-red-500/20 ${c('bg-red-500/5', 'bg-red-50')}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiTrash2 className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">Request Data Erasure (Section 24)</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Request deletion of all your personal data. This action is irreversible and may affect your ability to use the platform.
                  </p>
                  <button onClick={async () => {
                    if (confirm('Are you sure you want to request data erasure? This action cannot be undone.')) {
                      try { await popiaAPI.requestErasure(true, 'User requested via settings'); } catch {
      toast.error('Failed to submit erasure request');
    }
                    }
                  }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all flex items-center gap-1">
                    <FiTrash2 className="w-3 h-3" /> Request Erasure
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* F7: 2FA Section */}
          {activeSection === '2FA' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Add an extra layer of security to your account with TOTP-based 2FA.</p>
              <div className="space-y-4 max-w-lg">
                {twoFAEnabled ? (
                  <div className={`p-4 rounded-xl ${c('bg-emerald-500/10', 'bg-emerald-50')}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FiShield className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">2FA is enabled</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Your account is protected with two-factor authentication.</p>
                    <button onClick={async () => {
                      const pw = prompt('Enter your password to disable 2FA:');
                      if (!pw) return;
                      try {
                        const res = await authAPI.disable2FA(pw);
                        if (res.data?.success) { setTwoFAEnabled(false); toast.success('2FA disabled'); }
                        else toast.error(res.data?.error || 'Failed to disable 2FA');
                      } catch { toast.error('Failed to disable 2FA'); }
                    }} className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all">
                      Disable 2FA
                    </button>
                  </div>
                ) : twoFASetup ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl ${c('bg-white/[0.04]', 'bg-slate-50')}`}>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">Scan this QR code with your authenticator app:</p>
                      {twoFASetup.qr_url && <img src={twoFASetup.qr_url} alt="2FA QR Code" className="w-48 h-48 mx-auto mb-3 rounded-lg" />}
                      {twoFASetup.secret && (
                        <div className="text-center">
                          <p className="text-xs text-slate-400 mb-1">Or enter this secret manually:</p>
                          <code className="text-sm font-mono bg-slate-100 dark:bg-white/[0.06] px-3 py-1 rounded select-all">{twoFASetup.secret}</code>
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="2fa-code" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Enter verification code</label>
                      <input id="2fa-code" type="text" maxLength={6} value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))} placeholder="000000" aria-label="2FA verification code"
                        className={`w-full px-4 py-2.5 rounded-xl text-sm text-center tracking-[0.3em] font-mono outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400')}`} />
                    </div>
                    <button onClick={async () => {
                      if (twoFACode.length !== 6) { toast.error('Enter a 6-digit code'); return; }
                      setEnabling2FA(true);
                      try {
                        const res = await authAPI.verify2FA(twoFACode);
                        if (res.data?.success) { setTwoFAEnabled(true); setTwoFASetup(null); setTwoFACode(''); toast.success('2FA enabled successfully'); }
                        else toast.error(res.data?.error || 'Invalid code');
                      } catch { toast.error('Failed to verify code'); }
                      setEnabling2FA(false);
                    }} disabled={enabling2FA || twoFACode.length !== 6}
                      className="w-full px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                      {enabling2FA ? <FiLoader className="w-4 h-4 animate-spin" /> : null} Verify & Enable 2FA
                    </button>
                  </div>
                ) : (
                  <button onClick={async () => {
                    try {
                      const res = await authAPI.enable2FA();
                      if (res.data?.data) setTwoFASetup(res.data.data);
                      else toast.error('Failed to initiate 2FA setup');
                    } catch { toast.error('Failed to start 2FA setup'); }
                  }} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2">
                    <FiSmartphone className="w-4 h-4" /> Set Up 2FA
                  </button>
                )}
              </div>
            </div>
          )}

          {/* F11: Billing Section */}
          {activeSection === 'Billing' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Billing & Subscription</h3>
              <div className="space-y-4">
                {currentPlan ? (
                  <div className={`p-4 rounded-xl ${c('bg-white/[0.04]', 'bg-slate-50')}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Current Plan: {currentPlan.plan_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${currentPlan.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500'}`}>{currentPlan.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Billing cycle: {currentPlan.billing_cycle} | Next billing: {currentPlan.next_billing || 'N/A'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active subscription. Choose a plan below.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(plans.length > 0 ? plans : [
                    { id: 'starter', name: 'Starter', price: 0, features: ['5 trades/month', 'Basic analytics', 'Email support'] },
                    { id: 'professional', name: 'Professional', price: 299900, features: ['Unlimited trades', 'Advanced analytics', 'Priority support', 'API access'] },
                    { id: 'enterprise', name: 'Enterprise', price: 999900, features: ['Everything in Pro', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee'] },
                  ]).map(plan => (
                    <div key={plan.id} className={`p-4 rounded-xl border transition-all ${currentPlan?.plan_name === plan.name ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : c('border-white/[0.06] bg-white/[0.02]', 'border-black/[0.06] bg-white')}`}>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{plan.name}</h4>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{plan.price === 0 ? 'Free' : `R ${(plan.price / 100).toLocaleString('en-ZA')}`}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                      <ul className="mt-3 space-y-1">
                        {plan.features.map(f => <li key={f} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><span className="text-emerald-500">&#10003;</span> {f}</li>)}
                      </ul>
                      <button onClick={async () => {
                        setBillingLoading(true);
                        try {
                          const res = await subscriptionsAPI.subscribe({ plan_id: plan.id });
                          if (res.data?.success) { toast.success(`Subscribed to ${plan.name}`); setCurrentPlan({ plan_name: plan.name, status: 'active', billing_cycle: 'monthly' }); }
                          else toast.error(res.data?.error || 'Failed to subscribe');
                        } catch { toast.error('Failed to subscribe'); }
                        setBillingLoading(false);
                      }} disabled={billingLoading || currentPlan?.plan_name === plan.name}
                        className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                          currentPlan?.plan_name === plan.name ? c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-400') : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                        }`}>
                        {currentPlan?.plan_name === plan.name ? 'Current Plan' : 'Subscribe'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(activeSection === 'API Keys' || activeSection === 'Language') && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">{activeSection}</h3>
              <p className="text-sm text-slate-400">
                {activeSection === 'API Keys' ? 'Manage your API keys from the Developer Portal page.' : 'Language settings coming soon. Currently English only.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} title="Change Password">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Current Password</label>
            <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">New Password</label>
            <input type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} placeholder="At least 8 characters" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Confirm Password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Re-enter new password" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowChangePassword(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleChangePassword} loading={changingPw}>Change Password</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} onConfirm={handleDeleteAccount} title="Delete Account" description="This will permanently delete your account and all associated data. This action cannot be undone." confirmLabel="Delete Account" variant="danger" loading={deleting} />
    </motion.div>
  );
}
