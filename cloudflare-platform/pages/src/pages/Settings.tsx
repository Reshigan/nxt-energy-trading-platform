import React, { useState } from 'react';
import { FiUser, FiBell, FiMoon, FiKey, FiLock, FiGlobe } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

const sections = ['Profile', 'Notifications', 'Appearance', 'API Keys', 'Security', 'Language'];

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activeSection, setActiveSection] = useState('Profile');
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      <div style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={`cp-card !p-3 h-fit ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          {sections.map(s => {
            const icons: Record<string, React.ReactNode> = {
              Profile: <FiUser className="w-4 h-4" />, Notifications: <FiBell className="w-4 h-4" />,
              Appearance: <FiMoon className="w-4 h-4" />, 'API Keys': <FiKey className="w-4 h-4" />,
              Security: <FiLock className="w-4 h-4" />, Language: <FiGlobe className="w-4 h-4" />,
            };
            return (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === s ? c('bg-white/[0.08] text-white', 'bg-blue-50 text-blue-700') : c('text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]', 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}`}>
                {icons[s]} {s}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3">
          {activeSection === 'Profile' && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Profile Settings</h3>
              <div className="space-y-4 max-w-lg">
                {[
                  { label: 'Full Name', placeholder: 'Platform Admin', type: 'text' },
                  { label: 'Email', placeholder: 'admin@et.vantax.co.za', type: 'email' },
                  { label: 'Company', placeholder: 'NXT Energy Trading', type: 'text' },
                  { label: 'Phone', placeholder: '+27 11 123 4567', type: 'tel' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                  </div>
                ))}
                <button onClick={save} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25">
                  {saved ? 'Saved!' : 'Save Changes'}
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
                    <button className={`relative w-10 h-6 rounded-full transition-colors ${n !== 'Marketing Updates' ? 'bg-blue-500' : c('bg-white/[0.08]', 'bg-slate-200')}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${n !== 'Marketing Updates' ? 'left-5' : 'left-1'}`} />
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
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Current Password</label>
                  <input type="password" placeholder="Enter current password"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400')}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">New Password</label>
                  <input type="password" placeholder="Enter new password"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400')}`} />
                </div>
                <button onClick={save} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25">
                  {saved ? 'Updated!' : 'Change Password'}
                </button>
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
    </div>
  );
}
