import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiZap } from '../lib/fi-icons-shim';
import { authAPI } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

const ROLES = [
  { value: 'trader', label: 'Energy Trader' },
  { value: 'ipp', label: 'Independent Power Producer' },
  { value: 'offtaker', label: 'Offtaker / Buyer' },
  { value: 'carbon_fund', label: 'Carbon Fund' },
  { value: 'epc', label: 'EPC Contractor' },
  { value: 'advisor', label: 'Financial Advisor' },
];

export default function Register() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '', registration_number: '', tax_number: '', vat_number: '',
    role: 'trader', contact_person: '', email: '', password: '', phone: '',
    physical_address: '', sa_id_number: '', bbbee_level: '', nersa_licence: '', fsca_licence: '',
  });

  const updateField = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        bbbee_level: form.bbbee_level ? parseInt(form.bbbee_level, 10) : undefined,
        vat_number: form.vat_number || undefined,
        sa_id_number: form.sa_id_number || undefined,
        nersa_licence: form.nersa_licence || undefined,
        fsca_licence: form.fsca_licence || undefined,
      };
      await authAPI.register(payload);
      toast.success('Registration successful! Please check your email for a verification code.');
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`min-h-screen flex items-center justify-center px-4 py-8 ${isDark ? 'bg-[#0B1221]' : 'bg-[#EEF1F6]'}`}>
      <div className="w-full max-w-2xl" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/25">
            <FiZap className="text-white w-5 h-5" />
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>NXT Energy</h1>
        </div>

        <h2 className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Create Account</h2>
        <p className="text-sm text-slate-500 text-center mb-6">Step {step} of 3</p>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-blue-500' : isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />
          ))}
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-company" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Company Name *</label>
                  <input id="reg-company" className={inputClass} value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="reg-cipc" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">CIPC Registration Number *</label>
                  <input id="reg-cipc" className={inputClass} value={form.registration_number} onChange={(e) => updateField('registration_number', e.target.value)} placeholder="e.g. 2024/123456/07" required />
                </div>
                <div>
                  <label htmlFor="reg-tax" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">SARS Tax Number *</label>
                  <input id="reg-tax" className={inputClass} value={form.tax_number} onChange={(e) => updateField('tax_number', e.target.value)} placeholder="10 digits" required />
                </div>
                <div>
                  <label htmlFor="reg-vat" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">VAT Number</label>
                  <input id="reg-vat" className={inputClass} value={form.vat_number} onChange={(e) => updateField('vat_number', e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label htmlFor="reg-role" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Role *</label>
                  <select id="reg-role" className={inputClass} value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-bbbee" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">BBBEE Level</label>
                  <select id="reg-bbbee" className={inputClass} value={form.bbbee_level} onChange={(e) => updateField('bbbee_level', e.target.value)}>
                    <option value="">Select level</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((l) => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-bold rounded-2xl transition-all">
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Contact & Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-contact" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Contact Person *</label>
                  <input id="reg-contact" className={inputClass} value={form.contact_person} onChange={(e) => updateField('contact_person', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Email *</label>
                  <input id="reg-email" type="email" className={inputClass} value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="reg-phone" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Phone *</label>
                  <input id="reg-phone" className={inputClass} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+27..." required />
                </div>
                <div>
                  <label htmlFor="reg-password" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Password *</label>
                  <input id="reg-password" type="password" className={inputClass} value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Min 8 characters" required />
                </div>
              </div>
              <div>
                <label htmlFor="reg-address" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Physical Address *</label>
                <textarea id="reg-address" className={inputClass} rows={2} value={form.physical_address} onChange={(e) => updateField('physical_address', e.target.value)} required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className={`flex-1 py-3 rounded-2xl font-semibold transition-colors ${isDark ? 'bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Back</button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-bold rounded-2xl transition-all">Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Regulatory Information (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-said" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">SA ID Number</label>
                  <input id="reg-said" className={inputClass} value={form.sa_id_number} onChange={(e) => updateField('sa_id_number', e.target.value)} placeholder="13 digits" />
                </div>
                <div>
                  <label htmlFor="reg-nersa" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">NERSA Licence</label>
                  <input id="reg-nersa" className={inputClass} value={form.nersa_licence} onChange={(e) => updateField('nersa_licence', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="reg-fsca" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">FSCA Licence</label>
                  <input id="reg-fsca" className={inputClass} value={form.fsca_licence} onChange={(e) => updateField('fsca_licence', e.target.value)} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 text-xs border border-blue-500/10">
                After registration, our auto-validation pipeline will verify your CIPC registration, SARS tax number, FICA compliance, and sanctions screening. KYC documents can be uploaded from your dashboard.
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className={`flex-1 py-3 rounded-2xl font-semibold transition-colors ${isDark ? 'bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Back</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-bold rounded-2xl transition-all disabled:opacity-50">
                  {loading ? 'Registering...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-blue-500 hover:text-blue-600 font-semibold">Sign In</Link>
        </p>
      </div>
    </motion.div>
  );
}
