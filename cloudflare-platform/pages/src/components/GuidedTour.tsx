import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FiX, FiArrowRight, FiArrowLeft } from 'react-icons/fi';

const TOUR_STEPS = [
  { target: '[data-tour="dashboard"]', title: 'Welcome to NXT', content: 'This is your Dashboard — it shows your financial overview, market trends, and AI-powered insights.', position: 'bottom' as const },
  { target: '[data-tour="role-switcher"]', title: 'Switch Roles', content: 'Switch between roles here to see the platform from different perspectives — generator, trader, offtaker, and more.', position: 'bottom' as const },
  { target: '[data-tour="nav-trading"]', title: 'Trading Desk', content: 'The Trading Desk is where you buy and sell energy with real-time order matching.', position: 'right' as const },
  { target: '[data-tour="nav-carbon"]', title: 'Carbon Credits', content: 'Track your carbon credits, write options, and manage your carbon fund here.', position: 'right' as const },
  { target: '[data-tour="nav-ipp"]', title: 'IPP Projects', content: 'Manage IPP projects from development through to COD with milestone tracking.', position: 'right' as const },
  { target: '[data-tour="nav-contracts"]', title: 'Digital Contracts', content: 'Create and sign contracts digitally — from LOI to execution with SHA-256 integrity.', position: 'right' as const },
  { target: '[data-tour="nav-compliance"]', title: 'Compliance', content: 'Your compliance status and statutory checks are always visible here.', position: 'right' as const },
  { target: '[data-tour="nav-settings"]', title: 'All Set!', content: "You're all set. Complete your full registration to unlock trading.", position: 'right' as const },
];

export default function GuidedTour() {
  const { isDark } = useTheme();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('nxt_tour_completed');
    if (!completed) setVisible(true);
  }, []);

  const dismiss = () => { setVisible(false); localStorage.setItem('nxt_tour_completed', 'true'); };
  const next = () => { if (step < TOUR_STEPS.length - 1) setStep(step + 1); else dismiss(); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  if (!visible) return null;
  const s = TOUR_STEPS[step];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9990]" onClick={dismiss} />
      <div className={`fixed z-[9991] w-80 p-5 rounded-2xl shadow-2xl ${isDark ? 'bg-[#0d1b2a] border border-white/[0.08] text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Step {step + 1} of {TOUR_STEPS.length}</span>
          <button onClick={dismiss} className="p-1 rounded-lg hover:bg-white/10"><FiX className="w-4 h-4" /></button>
        </div>
        <h3 className="text-lg font-bold mb-2">{s.title}</h3>
        <p className={`text-sm mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.content}</p>
        <div className="flex items-center justify-between">
          <button onClick={prev} disabled={step === 0} className={`flex items-center gap-1 text-sm font-medium disabled:opacity-30 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><FiArrowLeft className="w-3.5 h-3.5" /> Back</button>
          <button onClick={next} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
            {step === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'} <FiArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
