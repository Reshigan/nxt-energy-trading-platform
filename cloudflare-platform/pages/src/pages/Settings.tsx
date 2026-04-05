import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSettings, FiDownload, FiSave, FiShield, FiBell, FiUser, FiGlobe, FiDatabase } from 'react-icons/fi';
import { useAuthStore } from '../lib/store';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function Settings() {
  const tc = useThemeClasses();
  const { user, activeRole } = useAuthStore();
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({ name: user?.company_name || '', email: user?.email || '', phone: '', timezone: 'Africa/Johannesburg' });
  const [notifications, setNotifications] = useState({ email_trades: true, email_contracts: true, email_compliance: false, push_trades: true, push_alerts: true, push_settlements: false });
  const [trading, setTrading] = useState({ default_market: 'solar', order_confirmation: true, auto_hedge: false, max_order_size: '1000', fee_display: 'inclusive' });
  const [security, setSecurity] = useState({ two_factor: false, session_timeout: '24', ip_whitelist: '' });
  const [display, setDisplay] = useState({ theme: 'dark', currency: 'ZAR', date_format: 'DD/MM/YYYY', language: 'en' });

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const inputClass = `w-full px-3 py-2 ${tc.input} rounded-lg text-sm`;
  const labelClass = 'block text-xs text-slate-500 dark:text-slate-400 mb-1';
  const toggleClass = (on: boolean) => `relative w-10 h-5 rounded-full transition-colors cursor-pointer ${on ? 'bg-[#d4e157]' : 'bg-slate-700'}`;

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button type="button" className={toggleClass(checked)} onClick={() => onChange(!checked)}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>Settings</h1>
        <div className="flex gap-2">
          <button className={`flex items-center gap-1 px-3 py-1.5 ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} text-slate-400 rounded-lg text-xs hover:text-slate-900 dark:hover:text-white`}>
            <FiDownload className="w-3 h-3" /> Export Data
          </button>
          <button onClick={handleSave} className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg text-sm font-medium">
            <FiSave className="w-3.5 h-3.5" /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <div className={`${tc.cardBg} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <FiUser className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Profile</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Full Name</label>
            <input className={inputClass} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+27..." />
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <select className={inputClass} value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
              <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className={`${tc.cardBg} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <FiBell className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'email_trades', label: 'Email — Trade Confirmations' },
            { key: 'email_contracts', label: 'Email — Contract Updates' },
            { key: 'email_compliance', label: 'Email — Compliance Alerts' },
            { key: 'push_trades', label: 'Push — Trade Notifications' },
            { key: 'push_alerts', label: 'Push — System Alerts' },
            { key: 'push_settlements', label: 'Push — Settlement Updates' },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm">{n.label}</span>
              <Toggle checked={notifications[n.key as keyof typeof notifications]} onChange={(v) => setNotifications({ ...notifications, [n.key]: v })} />
            </div>
          ))}
        </div>
      </div>

      {/* Trading Preferences */}
      <div className={`${tc.cardBg} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <FiSettings className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Trading Preferences</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Default Market</label>
            <select className={inputClass} value={trading.default_market} onChange={(e) => setTrading({ ...trading, default_market: e.target.value })}>
              {['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Max Order Size (MWh)</label>
            <input className={inputClass} type="number" value={trading.max_order_size} onChange={(e) => setTrading({ ...trading, max_order_size: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Fee Display</label>
            <select className={inputClass} value={trading.fee_display} onChange={(e) => setTrading({ ...trading, fee_display: e.target.value })}>
              <option value="inclusive">Fee Inclusive</option>
              <option value="exclusive">Fee Exclusive</option>
              <option value="separate">Show Separately</option>
            </select>
          </div>
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Order Confirmation Dialog</span>
              <Toggle checked={trading.order_confirmation} onChange={(v) => setTrading({ ...trading, order_confirmation: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-Hedge Positions</span>
              <Toggle checked={trading.auto_hedge} onChange={(v) => setTrading({ ...trading, auto_hedge: v })} />
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className={`${tc.cardBg} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <FiShield className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Security</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
            <span className="text-sm">Two-Factor Authentication</span>
            <Toggle checked={security.two_factor} onChange={(v) => setSecurity({ ...security, two_factor: v })} />
          </div>
          <div>
            <label className={labelClass}>Session Timeout (hours)</label>
            <select className={inputClass} value={security.session_timeout} onChange={(e) => setSecurity({ ...security, session_timeout: e.target.value })}>
              {['1', '4', '8', '12', '24', '48'].map((h) => <option key={h} value={h}>{h} hours</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>IP Whitelist (comma-separated, leave empty for all)</label>
            <input className={inputClass} placeholder="e.g., 196.22.0.0/16, 41.0.0.0/8" value={security.ip_whitelist} onChange={(e) => setSecurity({ ...security, ip_whitelist: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Display */}
      <div className={`${tc.cardBg} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <FiGlobe className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Display & Localization</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Theme</label>
            <select className={inputClass} value={display.theme} onChange={(e) => setDisplay({ ...display, theme: e.target.value })}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select className={inputClass} value={display.currency} onChange={(e) => setDisplay({ ...display, currency: e.target.value })}>
              <option value="ZAR">ZAR (R)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date Format</label>
            <select className={inputClass} value={display.date_format} onChange={(e) => setDisplay({ ...display, date_format: e.target.value })}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Language</label>
            <select className={inputClass} value={display.language} onChange={(e) => setDisplay({ ...display, language: e.target.value })}>
              <option value="en">English</option>
              <option value="af">Afrikaans</option>
              <option value="zu">isiZulu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className={`${tc.cardBg} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <FiDatabase className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Data Export</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Trade History', desc: 'All executed trades as CSV', icon: '📊' },
            { label: 'Contract Documents', desc: 'All documents as ZIP', icon: '📄' },
            { label: 'Compliance Report', desc: 'Full compliance export', icon: '🛡️' },
            { label: 'Carbon Credits', desc: 'Credit inventory report', icon: '🌍' },
            { label: 'Invoice Archive', desc: 'All invoices as PDF bundle', icon: '🧾' },
            { label: 'Audit Log', desc: 'Complete audit trail', icon: '📋' },
          ].map((ex) => (
            <button key={ex.label} className={`p-4 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} hover:bg-slate-800 transition-colors text-left`}>
              <div className="text-2xl mb-2">{ex.icon}</div>
              <div className="font-medium text-sm">{ex.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ex.desc}</div>
              <div className="flex items-center gap-1 text-xs text-blue-400 mt-2">
                <FiDownload className="w-3 h-3" /> Download
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
