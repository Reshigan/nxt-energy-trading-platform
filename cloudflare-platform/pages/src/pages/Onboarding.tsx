import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiFileText, FiShield, FiCheck, FiArrowRight, FiArrowLeft, FiLoader, FiUploadCloud } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI, popiaAPI } from '../lib/api';
import { Button, Input, Select } from '../components/ui';

const STEPS = [
  { key: 'company', label: 'Company Details', icon: FiUser },
  { key: 'documents', label: 'Documents', icon: FiFileText },
  { key: 'compliance', label: 'Compliance', icon: FiShield },
  { key: 'review', label: 'Review & Submit', icon: FiCheck },
] as const;

const ENTITY_TYPES = [
  { value: 'pty_ltd', label: 'Pty Ltd' },
  { value: 'public', label: 'Public Company' },
  { value: 'npc', label: 'Non-Profit Company' },
  { value: 'cc', label: 'Close Corporation' },
  { value: 'sole_prop', label: 'Sole Proprietor' },
];

const ROLES = [
  { value: 'generator', label: 'Generator / IPP' },
  { value: 'trader', label: 'Trader' },
  { value: 'offtaker', label: 'Offtaker' },
  { value: 'ipp_developer', label: 'IPP Developer' },
  { value: 'carbon_fund', label: 'Carbon Fund' },
];

interface FormData {
  company_name: string;
  registration_number: string;
  vat_number: string;
  entity_type: string;
  role: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  popia_consent: boolean;
  terms_accepted: boolean;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    company_name: '', registration_number: '', vat_number: '', entity_type: '', role: '',
    address: '', contact_person: '', contact_email: '', contact_phone: '',
    popia_consent: false, terms_accepted: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [docs, setDocs] = useState<{ cipc: File | null; bbbee: File | null; tax: File | null }>({ cipc: null, bbbee: null, tax: null });

  const update = useCallback((field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const validateStep = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (step === 0) {
      if (!form.company_name.trim()) errs.company_name = 'Required';
      if (!form.registration_number.trim()) errs.registration_number = 'Required';
      if (!form.entity_type) errs.entity_type = 'Required';
      if (!form.role) errs.role = 'Required';
      if (!form.contact_person.trim()) errs.contact_person = 'Required';
      if (!form.contact_email.trim()) errs.contact_email = 'Required';
    }
    if (step === 2) {
      if (!form.popia_consent) errs.popia_consent = 'POPIA consent required';
      if (!form.terms_accepted) errs.terms_accepted = 'You must accept the terms';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validateStep()) setStep(s => Math.min(s + 1, 3)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      await authAPI.updateProfile({
        company_name: form.company_name,
        registration_number: form.registration_number,
        vat_number: form.vat_number,
        entity_type: form.entity_type,
        address: form.address,
        contact_person: form.contact_person,
        contact_phone: form.contact_phone,
      });
      if (form.popia_consent) await popiaAPI.giveConsent(true);
      await authAPI.completeOnboarding();
      toast.success('Onboarding complete! Welcome to NXT Energy.');
      navigate('/');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to complete onboarding');
    }
    setSubmitting(false);
  };

  const handleFileChange = (key: 'cipc' | 'bbbee' | 'tax') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDocs(prev => ({ ...prev, [key]: file }));
  };

  const cardCls = `rounded-2xl p-6 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.06]'} shadow-sm`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="min-h-screen flex items-center justify-center p-4" role="main" aria-label="Onboarding wizard">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Welcome to NXT Energy</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Complete your profile to start trading</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                i === step ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' :
                i < step ? 'bg-emerald-500/10 text-emerald-500' :
                isDark ? 'bg-white/[0.04] text-slate-500' : 'bg-slate-100 text-slate-400'
              }`}>
                {i < step ? <FiCheck className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-emerald-500' : isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className={cardCls}>
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Company Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Company Name" value={form.company_name} onChange={e => update('company_name', e.target.value)} error={errors.company_name} required />
                  <Input label="CIPC Registration Number" value={form.registration_number} onChange={e => update('registration_number', e.target.value)} error={errors.registration_number} required />
                  <Input label="VAT Number" value={form.vat_number} onChange={e => update('vat_number', e.target.value)} helpText="Optional" />
                  <Select label="Entity Type" options={ENTITY_TYPES} value={form.entity_type} onChange={e => update('entity_type', e.target.value)} error={errors.entity_type} placeholder="Select type" />
                  <Select label="Platform Role" options={ROLES} value={form.role} onChange={e => update('role', e.target.value)} error={errors.role} placeholder="Select role" />
                  <Input label="Contact Person" value={form.contact_person} onChange={e => update('contact_person', e.target.value)} error={errors.contact_person} required />
                  <Input label="Contact Email" type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} error={errors.contact_email} required />
                  <Input label="Contact Phone" type="tel" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} />
                </div>
                <Input label="Physical Address" value={form.address} onChange={e => update('address', e.target.value)} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload Documents</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upload required KYC documents for verification.</p>
                {[
                  { key: 'cipc' as const, label: 'CIPC Certificate', desc: 'Company registration certificate' },
                  { key: 'bbbee' as const, label: 'B-BBEE Certificate', desc: 'Broad-Based Black Economic Empowerment certificate' },
                  { key: 'tax' as const, label: 'Tax Clearance', desc: 'SARS tax clearance certificate' },
                ].map(doc => (
                  <div key={doc.key} className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50 border border-black/[0.04]'}`}>
                    <FiUploadCloud className="w-6 h-6 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{doc.label}</p>
                      <p className="text-xs text-slate-400">{doc.desc}</p>
                      {docs[doc.key] && <p className="text-xs text-emerald-500 mt-1">{docs[doc.key]!.name}</p>}
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.jpg,.png" onChange={handleFileChange(doc.key)} className="hidden" aria-label={`Upload ${doc.label}`} />
                      <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                        {docs[doc.key] ? 'Replace' : 'Upload'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compliance</h2>
                <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.popia_consent} onChange={e => update('popia_consent', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">POPIA Consent</p>
                      <p className="text-xs text-slate-400">I consent to the processing of personal information in accordance with the Protection of Personal Information Act (POPIA).</p>
                    </div>
                  </label>
                  {errors.popia_consent && <p className="text-xs text-rose-500 ml-7" role="alert">{errors.popia_consent}</p>}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.terms_accepted} onChange={e => update('terms_accepted', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Terms & Conditions</p>
                      <p className="text-xs text-slate-400">I have read and accept the <a href="/terms" className="text-blue-500 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</a>.</p>
                    </div>
                  </label>
                  {errors.terms_accepted && <p className="text-xs text-rose-500 ml-7" role="alert">{errors.terms_accepted}</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review & Submit</h2>
                <div className="space-y-3 text-sm">
                  {[
                    ['Company', form.company_name],
                    ['Registration', form.registration_number],
                    ['Entity Type', ENTITY_TYPES.find(e => e.value === form.entity_type)?.label || form.entity_type],
                    ['Role', ROLES.find(r => r.value === form.role)?.label || form.role],
                    ['Contact', form.contact_person],
                    ['Email', form.contact_email],
                    ['Documents', [docs.cipc && 'CIPC', docs.bbbee && 'B-BBEE', docs.tax && 'Tax'].filter(Boolean).join(', ') || 'None uploaded'],
                    ['POPIA', form.popia_consent ? 'Consented' : 'Not consented'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="ghost" onClick={prevStep} disabled={step === 0} icon={<FiArrowLeft className="w-4 h-4" />}>Back</Button>
          {step < 3 ? (
            <Button onClick={nextStep} icon={<FiArrowRight className="w-4 h-4" />}>Continue</Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} icon={<FiCheck className="w-4 h-4" />}>Complete Setup</Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
