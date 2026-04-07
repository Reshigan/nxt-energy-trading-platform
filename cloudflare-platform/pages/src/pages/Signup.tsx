import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiZap, FiArrowRight, FiArrowLeft, FiCheck, FiMail } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

type Step = 1 | 2 | 3;

export default function Signup() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({ company_name: '', full_name: '', email: '', password: '', participant_type: 'generator' });
  const [otp, setOtp] = useState('');
  const [profile, setProfile] = useState({ cipc_number: '', bbbee_level: '1', province: 'Gauteng', first_action: 'trade' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bg = isDark ? 'bg-[#0a1628]' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-[#0f1d32] border-white/[0.06]' : 'bg-white border-slate-200';
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm ${isDark ? 'bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500/50' : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'} focus:outline-none focus:ring-1 focus:ring-blue-500/20`;
  const labelCls = `block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

  const handleStep1 = async () => {
    if (!form.company_name || !form.full_name || !form.email || !form.password) { setError('All fields are required'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error?.message || 'Registration failed'); }
      setStep(2);
    } catch (e: any) { setError(e.message || 'Registration failed'); }
    setLoading(false);
  };

  const handleStep2 = async () => {
    if (otp.length !== 6) { setError('Enter a 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/register/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, otp }) });
      if (!res.ok) throw new Error('Invalid code');
      setStep(3);
    } catch (e: any) { setError(e.message || 'Verification failed'); }
    setLoading(false);
  };

  const handleStep3 = () => { navigate('/'); };

  const provinces = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'];

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
      <div className={`w-full max-w-md rounded-2xl border ${cardBg} p-8`}>
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <FiZap className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">NXT Energy</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s < step ? 'bg-blue-600 text-white' : s === step ? 'bg-blue-600 text-white' : isDark ? 'bg-white/[0.06] text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                {s < step ? <FiCheck className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-blue-500' : isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Create Account</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Get started in 30 seconds</p>
            <div className="space-y-4">
              <div><label className={labelCls}>Company Name</label><input className={inputCls} value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="e.g. TerraVolt Energy" /></div>
              <div><label className={labelCls}>Your Name</label><input className={inputCls} value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="e.g. Reshigan Govender" /></div>
              <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@company.co.za" /></div>
              <div><label className={labelCls}>Password</label><input className={inputCls} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 characters" /></div>
              <div><label className={labelCls}>Participant Type</label>
                <select className={inputCls} value={form.participant_type} onChange={e => setForm({...form, participant_type: e.target.value})}>
                  <option value="generator">Generator</option><option value="trader">Trader</option><option value="offtaker">Offtaker</option>
                  <option value="ipp_developer">IPP Developer</option><option value="carbon_fund">Carbon Fund</option><option value="lender">Lender</option>
                </select>
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                By creating an account, you agree to the <Link to="/terms" className="text-blue-500 hover:underline">Terms & Conditions</Link> and <Link to="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
              </div>
              <button onClick={handleStep1} disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Creating...' : <><span>Create Account</span><FiArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <FiMail className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-1 text-center">Verify Email</h2>
            <p className={`text-sm mb-6 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>We sent a 6-digit code to {form.email}</p>
            <div className="space-y-4">
              <input className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" maxLength={6} />
              <button onClick={handleStep2} disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button onClick={() => setStep(1)} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                <FiArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Quick Profile</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>This takes about 2 minutes</p>
            <div className="space-y-4">
              <div><label className={labelCls}>CIPC Registration Number</label><input className={inputCls} value={profile.cipc_number} onChange={e => setProfile({...profile, cipc_number: e.target.value})} placeholder="e.g. 2024/123456/07" /></div>
              <div><label className={labelCls}>BBBEE Level</label>
                <select className={inputCls} value={profile.bbbee_level} onChange={e => setProfile({...profile, bbbee_level: e.target.value})}>
                  {[1,2,3,4,5,6,7,8].map(l => <option key={l} value={String(l)}>Level {l}</option>)}
                  <option value="non-compliant">Non-compliant</option>
                </select>
              </div>
              <div><label className={labelCls}>Province</label>
                <select className={inputCls} value={profile.province} onChange={e => setProfile({...profile, province: e.target.value})}>
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>What do you want to do first?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{v:'trade',l:'Trade Energy'},{v:'carbon',l:'Manage Carbon'},{v:'ipp',l:'Track IPP Projects'},{v:'contracts',l:'Sign Contracts'}].map(opt => (
                    <button key={opt.v} onClick={() => setProfile({...profile, first_action: opt.v})}
                      className={`p-3 rounded-xl text-sm font-medium border ${profile.first_action === opt.v ? 'border-blue-500 bg-blue-500/10 text-blue-400' : isDark ? 'border-white/[0.06] text-slate-400 hover:bg-white/[0.04]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleStep3} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2">
                Enter Platform <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className={`mt-6 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
