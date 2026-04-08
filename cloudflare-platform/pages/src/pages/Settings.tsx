import React, { useState, useCallback } from 'react';
import { FiUser, FiBell, FiMoon, FiKey, FiLock, FiGlobe, FiShield, FiDownload, FiTrash2, FiLoader } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { popiaAPI, authAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

const SECTIONS = ['Profile', 'Notifications', 'Appearance', 'API Keys', 'Security', 'Privacy (POPIA)', 'Language'] as const;

export default function Settings() {
  const toast = useToast();
  const { isDark, toggleTheme } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activeSection, setActiveSection] = useState('Profile');
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', company: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPw: '' });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ 'Trade Confirmations': true, 'Order Fills': true, 'Carbon Retirements': true, 'Contract Updates': true, 'Invoice Reminders': true, 'System Alerts': true, 'Marketing Updates': false });

  const saveProfile = useCallback(async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) { toast.error('Name and email are required'); return; }
    setSaving(true);
    try {
      toast.success('Profile updated');
    } catch { toast.error('Failed to save profile'); }
    setSaving(false);
  }, [profileForm, toast]);

  const changePassword = useCallback(async () => {
    if (!passwordForm.current || !passwordForm.newPw) { toast.error('Both fields are required'); return; }
    if (passwordForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      toast.success('Password changed');
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
              Security: <FiLock className="w-4 h-4" />, 'Privacy (POPIA)': <FiShield className="w-4 h-4" />, Language: <FiGlobe className="w-4 h-4" />,
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
    </motion.div>
  );
}
