import React, { useEffect, useState } from 'react';
import { conciergeAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

type StepDef = { step: number; title: string; description: string; page: string };

export default function ConciergeBanner() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(6);
  const [stepDef, setStepDef] = useState<StepDef | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    conciergeAPI.getStatus().then((r) => {
      const data = r.data?.data;
      if (data?.active) {
        setActive(true);
        setCurrentStep(data.current_step || 1);
        setTotalSteps(data.total_steps || 6);
        setStepDef(data.step_definition || null);
        setCompletedSteps(data.completed_steps || []);
      }
    }).catch(() => {});
  }, []);

  const handleDismiss = () => {
    conciergeAPI.dismiss().then(() => setDismissed(true)).catch(() => {});
  };

  const handleGo = () => {
    if (stepDef?.page) navigate(stepDef.page);
  };

  if (!active || dismissed) return null;

  const progressPct = Math.round((completedSteps.length / totalSteps) * 100);

  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-sm font-semibold">First Deal Concierge</span>
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">Step {currentStep} of {totalSteps}</span>
          </div>
          {stepDef && (
            <>
              <h3 className="text-white font-medium text-lg">{stepDef.title}</h3>
              <p className="text-slate-300 text-sm mt-1">{stepDef.description}</p>
            </>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 max-w-xs bg-slate-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs text-slate-400">{progressPct}% complete</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleGo} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
              {stepDef?.title?.includes('Sign') ? 'Sign Now' : stepDef?.title?.includes('Negotiate') ? 'Open Deal Room' : 'Continue'}
            </button>
            <button onClick={handleDismiss} className="text-slate-400 hover:text-white text-sm px-3 py-1.5">Dismiss</button>
          </div>
        </div>
        <div className="flex gap-1 ml-4">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${completedSteps.includes(s) ? 'bg-green-500 text-white' : s === currentStep ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
