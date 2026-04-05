import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiZap } from 'react-icons/fi';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';

const ROLES = [
  { value: 'trader', label: 'Energy Trader' },
  { value: 'ipp', label: 'Independent Power Producer' },
  { value: 'offtaker', label: 'Offtaker / Buyer' },
  { value: 'carbon_fund', label: 'Carbon Fund' },
  { value: 'epc', label: 'EPC Contractor' },
  { value: 'advisor', label: 'Financial Advisor' },
];

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
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
      const res = await authAPI.register(payload);
      login(res.data.data.token, {
        id: res.data.data.id,
        email: form.email,
        role: form.role as 'trader',
        company_name: form.company_name,
        kyc_status: 'pending',
      });
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl glass p-8"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center mr-3">
            <FiZap className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">NXT Energy</h1>
        </div>

        <h2 className="text-xl font-semibold text-center mb-2">Create Account</h2>
        <p className="text-sm text-slate-400 text-center mb-6">Step {step} of 3</p>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-cyan-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-300">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company Name *</label>
                  <input className={inputClass} value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CIPC Registration Number *</label>
                  <input className={inputClass} value={form.registration_number} onChange={(e) => updateField('registration_number', e.target.value)} placeholder="e.g. 2024/123456/07" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SARS Tax Number *</label>
                  <input className={inputClass} value={form.tax_number} onChange={(e) => updateField('tax_number', e.target.value)} placeholder="10 digits" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">VAT Number</label>
                  <input className={inputClass} value={form.vat_number} onChange={(e) => updateField('vat_number', e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role *</label>
                  <select className={inputClass} value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">BBBEE Level</label>
                  <select className={inputClass} value={form.bbbee_level} onChange={(e) => updateField('bbbee_level', e.target.value)}>
                    <option value="">Select level</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((l) => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all">
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-300">Contact & Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contact Person *</label>
                  <input className={inputClass} value={form.contact_person} onChange={(e) => updateField('contact_person', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email *</label>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone *</label>
                  <input className={inputClass} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+27..." required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password *</label>
                  <input type="password" className={inputClass} value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Min 8 characters" required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Physical Address *</label>
                <textarea className={inputClass} rows={2} value={form.physical_address} onChange={(e) => updateField('physical_address', e.target.value)} required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Back</button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all">Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-slate-300">Regulatory Information (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SA ID Number</label>
                  <input className={inputClass} value={form.sa_id_number} onChange={(e) => updateField('sa_id_number', e.target.value)} placeholder="13 digits" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">NERSA Licence</label>
                  <input className={inputClass} value={form.nersa_licence} onChange={(e) => updateField('nersa_licence', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">FSCA Licence</label>
                  <input className={inputClass} value={form.fsca_licence} onChange={(e) => updateField('fsca_licence', e.target.value)} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs">
                After registration, our auto-validation pipeline will verify your CIPC registration, SARS tax number, FICA compliance, and sanctions screening. KYC documents can be uploaded from your dashboard.
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Back</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50">
                  {loading ? 'Registering...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-cyan-400 hover:text-cyan-300">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
