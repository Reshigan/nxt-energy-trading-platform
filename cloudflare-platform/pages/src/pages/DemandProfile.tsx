import React, { useState, useEffect, useCallback } from 'react';
import { FiUpload, FiBarChart2, FiZap, FiSend, FiCheck, FiLoader, FiRefreshCw, FiArrowRight, FiArrowLeft } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { demandAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';
import { formatZAR, formatMWh } from '../lib/format';

interface DemandProfile {
  id: string;
  name: string;
  monthly_kwh: number;
  peak_demand_kw: number;
  off_peak_pct: number;
  annual_cost_cents: number;
  created_at: string;
}

interface AIMatch {
  id: string;
  project_name: string;
  tech: string;
  capacity_mw: number;
  price_cents_kwh: number;
  savings_pct: number;
  match_score: number;
}

const STEPS = [
  { label: 'Upload Bills', icon: FiUpload, description: 'Upload your electricity bills for analysis' },
  { label: 'Profile View', icon: FiBarChart2, description: 'Review your demand profile and consumption patterns' },
  { label: 'AI Matching', icon: FiZap, description: 'AI matches you with optimal energy projects' },
  { label: 'Express Interest', icon: FiSend, description: 'Express interest in matched projects' },
] as const;

export default function DemandProfile() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expressing, setExpressing] = useState<string | null>(null);
  const [profile, setProfile] = useState<DemandProfile | null>(null);
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [expressedIds, setExpressedIds] = useState<Set<string>>(new Set());
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', peak_mw: '', baseload_mw: '', region: 'Gauteng' });
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Bill upload fields
  const [billMonth, setBillMonth] = useState('');
  const [billKwh, setBillKwh] = useState('');
  const [billAmountCents, setBillAmountCents] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await demandAPI.getProfiles();
      const profiles = res.data?.data;
      if (Array.isArray(profiles) && profiles.length > 0) {
        setProfile(profiles[0]);
        setStep(1);
      }
    } catch { setError('Failed to load demand profiles.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleCreateProfile = async () => {
    if (!profileForm.name.trim() || !profileForm.peak_mw) { toast.error('Name and peak demand required'); return; }
    setCreatingProfile(true);
    try {
      const res = await demandAPI.createProfile({ name: profileForm.name, peak_mw: Number(profileForm.peak_mw), baseload_mw: Number(profileForm.baseload_mw) || 0, region: profileForm.region });
      if (res.data?.success || res.data?.data) { toast.success('Profile created'); setShowCreateProfile(false); setProfileForm({ name: '', peak_mw: '', baseload_mw: '', region: 'Gauteng' }); loadProfile(); }
      else toast.error(res.data?.error || 'Failed to create profile');
    } catch { toast.error('Failed to create profile'); }
    setCreatingProfile(false);
  };

  const handleUploadBill = async () => {
    if (!billMonth || !billKwh || !billAmountCents) {
      toast.error('All fields are required');
      return;
    }
    setUploading(true);
    try {
      let profileId = profile?.id;
      if (!profileId) {
        const createRes = await demandAPI.createProfile({ name: 'My Demand Profile' });
        profileId = createRes.data?.data?.id;
        if (!profileId) { toast.error('Failed to create profile'); setUploading(false); return; }
      }
      const res = await demandAPI.uploadBill(profileId, {
        month: billMonth,
        kwh: parseFloat(billKwh),
        amount_cents: Math.round(parseFloat(billAmountCents) * 100),
      });
      if (res.data?.success) {
        toast.success('Bill uploaded successfully');
        setBillMonth(''); setBillKwh(''); setBillAmountCents('');
        await loadProfile();
      } else {
        toast.error(res.data?.error || 'Failed to upload bill');
      }
    } catch { toast.error('Failed to upload bill'); }
    setUploading(false);
  };

  const handleAnalyze = async () => {
    if (!profile?.id) { toast.error('No profile to analyze'); return; }
    setAnalyzing(true);
    try {
      const res = await demandAPI.analyze(profile.id);
      if (res.data?.data?.matches) {
        setMatches(res.data.data.matches);
        setStep(2);
        toast.success('AI matching complete');
      } else {
        toast.error(res.data?.error || 'Analysis returned no matches');
      }
    } catch { toast.error('Failed to run AI matching'); }
    setAnalyzing(false);
  };

  const handleExpressInterest = async (matchId: string) => {
    if (!profile?.id) return;
    setExpressing(matchId);
    try {
      const res = await demandAPI.expressInterest(profile.id, { match_id: matchId, message: interestMessage || undefined });
      if (res.data?.success) {
        toast.success('Interest expressed successfully');
        setExpressedIds(prev => new Set([...prev, matchId]));
      } else {
        toast.error(res.data?.error || 'Failed to express interest');
      }
    } catch { toast.error('Failed to express interest'); }
    setExpressing(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Demand Profile page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Demand Profile</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Upload bills, view your profile, get AI matches, express interest</p>
        </div>
        <button onClick={loadProfile} className="p-2.5 rounded-xl bg-slate-200 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/[0.1] transition-colors" aria-label="Refresh demand profile">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadProfile} />}

      {/* Step Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Demand profile steps" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {STEPS.map((s, i) => (
          <button key={s.label} role="tab" aria-selected={step === i} onClick={() => setStep(i)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${step === i ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : step > i ? c('bg-emerald-500/10 text-emerald-400', 'bg-emerald-50 text-emerald-600') : c('bg-white/[0.04] text-slate-400', 'bg-slate-100 text-slate-500')}`}>
            {step > i ? <FiCheck className="w-4 h-4" aria-hidden="true" /> : <s.icon className="w-4 h-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-20" />)}</div>
      ) : (
        <>
          {/* Step 0: Upload Bills */}
          {step === 0 && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Upload Electricity Bill</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Enter your bill details to build your demand profile.</p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label htmlFor="dp-month" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Bill Month</label>
                  <input id="dp-month" type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)} aria-label="Bill month"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                </div>
                <div>
                  <label htmlFor="dp-kwh" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Consumption (kWh)</label>
                  <input id="dp-kwh" type="number" value={billKwh} onChange={e => setBillKwh(e.target.value)} placeholder="e.g. 1500" aria-label="Consumption in kWh"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                </div>
                <div>
                  <label htmlFor="dp-amount" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Amount (R)</label>
                  <input id="dp-amount" type="number" value={billAmountCents} onChange={e => setBillAmountCents(e.target.value)} placeholder="e.g. 2500.00" aria-label="Bill amount in Rand"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleUploadBill} disabled={uploading} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2" aria-label="Upload bill">
                    {uploading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiUpload className="w-4 h-4" />} Upload Bill
                  </button>
                  {profile && (
                    <button onClick={() => setStep(1)} className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${c('bg-white/[0.06] text-slate-300', 'bg-slate-100 text-slate-600')} flex items-center gap-2`} aria-label="Next step">
                      Next <FiArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Profile View */}
          {step === 1 && (
            <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              {!profile ? (
                <EmptyState title="No demand profile" description="Upload your electricity bills first to build a demand profile." />
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Monthly Usage', value: formatMWh(profile.monthly_kwh / 1000) },
                      { label: 'Peak Demand', value: `${profile.peak_demand_kw} kW` },
                      { label: 'Off-Peak %', value: `${profile.off_peak_pct}%` },
                      { label: 'Annual Cost', value: formatZAR(profile.annual_cost_cents) },
                    ].map((kpi, i) => (
                      <div key={kpi.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 60}ms both` }}>
                        <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(0)} className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${c('bg-white/[0.06] text-slate-300', 'bg-slate-100 text-slate-600')} flex items-center gap-2`} aria-label="Previous step">
                      <FiArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={handleAnalyze} disabled={analyzing} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2" aria-label="Run AI matching">
                      {analyzing ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiZap className="w-4 h-4" />} Run AI Matching
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: AI Matching */}
          {step === 2 && (
            <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              {matches.length === 0 ? (
                <EmptyState title="No matches found" description="Run AI matching to find optimal energy projects for your demand profile." />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matches.map((m, i) => (
                      <div key={m.id} className={`cp-card !p-5 cursor-pointer transition-all ${c('!bg-[#151F32] !border-white/[0.06]', '')} ${selectedMatch === m.id ? 'ring-2 ring-blue-500/40' : ''}`}
                        onClick={() => { setSelectedMatch(m.id); setStep(3); }}
                        role="button" aria-label={`Select match ${m.project_name}`}
                        style={{ animation: `cardFadeUp 400ms ease ${200 + i * 80}ms both` }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.project_name}</h4>
                            <p className="text-xs text-slate-400">{m.tech} &middot; {m.capacity_mw} MW</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${m.match_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                            {m.match_score}% match
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div><p className="text-xs text-slate-400">Price/kWh</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200 mono">{formatZAR(m.price_cents_kwh)}</p></div>
                          <div><p className="text-xs text-slate-400">Savings</p><p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mono">{m.savings_pct}%</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${c('bg-white/[0.06] text-slate-300', 'bg-slate-100 text-slate-600')} flex items-center gap-2`} aria-label="Previous step">
                      <FiArrowLeft className="w-4 h-4" /> Back
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Express Interest */}
          {step === 3 && (
            <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Express Interest</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                {selectedMatch ? `Send interest for match: ${matches.find(m => m.id === selectedMatch)?.project_name || selectedMatch}` : 'Select a match from the previous step.'}
              </p>
              {selectedMatch ? (
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label htmlFor="dp-message" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Message (optional)</label>
                    <textarea id="dp-message" value={interestMessage} onChange={e => setInterestMessage(e.target.value)} placeholder="Add a message to the project developer..." rows={3} aria-label="Interest message"
                      className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border resize-none ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${c('bg-white/[0.06] text-slate-300', 'bg-slate-100 text-slate-600')} flex items-center gap-2`} aria-label="Previous step">
                      <FiArrowLeft className="w-4 h-4" /> Back
                    </button>
                    {expressedIds.has(selectedMatch) ? (
                      <span className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <FiCheck className="w-4 h-4" /> Interest Sent
                      </span>
                    ) : (
                      <button onClick={() => handleExpressInterest(selectedMatch)} disabled={expressing === selectedMatch} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2" aria-label="Send interest">
                        {expressing === selectedMatch ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />} Express Interest
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState title="No match selected" description="Go back and select a project match to express interest." />
              )}
            </div>
          )}
        </>
      )}

      <Modal isOpen={showCreateProfile} onClose={() => setShowCreateProfile(false)} title="Create Demand Profile">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Profile Name</label>
            <input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Johannesburg Industrial" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Peak Demand (MW)</label>
              <input type="number" value={profileForm.peak_mw} onChange={e => setProfileForm(p => ({ ...p, peak_mw: e.target.value }))} placeholder="500" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Baseload (MW)</label>
              <input type="number" value={profileForm.baseload_mw} onChange={e => setProfileForm(p => ({ ...p, baseload_mw: e.target.value }))} placeholder="200" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Region</label>
            <select value={profileForm.region} onChange={e => setProfileForm(p => ({ ...p, region: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
              <option>Gauteng</option><option>Western Cape</option><option>KwaZulu-Natal</option><option>Eastern Cape</option><option>Limpopo</option><option>Free State</option><option>North West</option><option>Mpumalanga</option><option>Northern Cape</option>
            </select></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreateProfile(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateProfile} loading={creatingProfile}>Create Profile</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
